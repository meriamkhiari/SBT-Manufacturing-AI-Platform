
import json
import os
import subprocess
import threading

from flask import Flask, Response, jsonify, render_template, request, stream_with_context
from pymongo import MongoClient

from agents.shared import (
    GEMINI_KEY, MONGO_URI, MCP_BIN, OPENROUTER_KEY,
    MONGO_DB, MONGO_COLL,
    create_run, get_run,
)
from agents.extractAgent import bp as extractAgent_bp
from agents import historyAgent
import pipeline as pipeline_runner
import qc_pipeline_runner as qc_pipeline_runner

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev-secret-key-change-me")

# ── API ───────────────────────────────────────────────────────────────────
@app.post("/api/history/log")
def api_log_action():
    body = request.get_json(force=True)
    action = body.get("action")
    details = body.get("details")
    if not action:
        return jsonify({"error": "action required"}), 400
    
    historyAgent.log_action(action, details)
    return jsonify({"status": "ok"})

# ── Register blueprints ───────────────────────────────────────────────────
app.register_blueprint(extractAgent_bp)


# ── UI ────────────────────────────────────────────────────────────────────
@app.route("/")
@app.route("/home")
def home():
    return render_template(
        "home.html",
        keys_configured=bool(OPENROUTER_KEY and GEMINI_KEY),
    )


@app.route("/agent1")
def index():
    return render_template(
        "agent1.html",
        keys_configured=bool(OPENROUTER_KEY and GEMINI_KEY),
    )


@app.route("/qc_pipeline")
def qc_pipeline():
    return render_template(
        "qc_pipeline.html",
        keys_configured=bool(OPENROUTER_KEY and GEMINI_KEY),
    )


@app.route("/history")
def history():
    """
    Displays the user action history logs.
    """
    logs = historyAgent.get_recent_history(limit=100)
    return render_template(
        "history.html",
        logs=logs
    )


# ── QC Pipeline trigger ───────────────────────────────────────────────────
@app.get("/api/references")
def get_references():
    """
    Returns a list of all unique references stored in MongoDB.
    """
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
        db = client[MONGO_DB]
        coll = db[MONGO_COLL]
        
        # Get unique reference names
        refs = coll.distinct("reference")
        
        # Filter out None or empty
        refs = [r for r in refs if r]
        
        return jsonify({
            "references": sorted(refs),
            "db_info": {
                "database": MONGO_DB,
                "collection": MONGO_COLL,
                "count": coll.count_documents({})
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.post("/api/qc_pipeline/start")
def qc_pipeline_start():
    """
    QC Orchestration Pipeline trigger.
    """
    body           = request.get_json(force=True)
    image_data_url = body.get("imageDataUrl", "")
    reference      = body.get("reference", "")

    if not image_data_url:
        return jsonify({"error": "imageDataUrl is required"}), 400
    if not GEMINI_KEY:
        return jsonify({"error": "GEMINI_API_KEY not set in .env"}), 500

    run_id = create_run()
    threading.Thread(
        target=qc_pipeline_runner.run,
        args=(run_id, image_data_url, reference),
        daemon=True,
    ).start()

    return jsonify({"runId": run_id})


# ── Pipeline trigger ──────────────────────────────────────────────────────
@app.post("/api/pipeline/start")
def pipeline_start():
    """
    Called by ExtractAgent (browser) after scoring is done.
    Spawns the A2A pipeline in a daemon thread and returns the run_id
    immediately so the browser can subscribe to the SSE stream.
    """
    body           = request.get_json(force=True)
    image_data_url = body.get("imageDataUrl", "")
    reference      = body.get("reference", "")

    if not image_data_url:
        return jsonify({"error": "imageDataUrl is required"}), 400
    if not GEMINI_KEY:
        return jsonify({"error": "GEMINI_API_KEY not set in .env"}), 500

    run_id = create_run()
    threading.Thread(
        target=pipeline_runner.run,
        args=(run_id, image_data_url, reference),
        daemon=True,
    ).start()

    return jsonify({"runId": run_id})


# ── SSE live log stream ───────────────────────────────────────────────────
@app.get("/pipeline/stream/<run_id>")
def pipeline_stream(run_id: str):
    def generate():
        run = get_run(run_id)
        if run is None:
            yield f"data: {json.dumps({'msg': 'Run not found', 'level': 'error'})}\n\n"
            return

        import queue as _queue
        while True:
            run = get_run(run_id)
            if run is None:
                break
            try:
                item = run["log_queue"].get(timeout=30)
            except _queue.Empty:
                yield ": ping\n\n"
                continue

            if item is None:                          # sentinel — pipeline done
                final = get_run(run_id)
                yield f"data: {json.dumps({'__done__': True, 'status': final['status'], 'result': final['result']})}\n\n"
                break

            yield f"data: {json.dumps(item)}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Status poll ───────────────────────────────────────────────────────────
@app.get("/pipeline/status/<run_id>")
def pipeline_status(run_id: str):
    run = get_run(run_id)
    if run is None:
        return jsonify({"error": "Not found"}), 404
    return jsonify({"status": run["status"], "result": run["result"]})


# ── Health check ──────────────────────────────────────────────────────────
@app.get("/health")
def health():
    # MongoDB
    mongo_status = "unknown"
    try:
        MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000).admin.command("ping")
        mongo_status = "connected"
    except Exception as exc:
        mongo_status = f"error: {exc}"

    # MCP binary
    mcp_status = "unknown"
    try:
        res = subprocess.run([MCP_BIN, "--version"], capture_output=True, text=True, timeout=4)
        ver = (res.stdout or res.stderr or "").strip()[:40]
        mcp_status = f"available — {ver}" if ver else "available"
    except FileNotFoundError:
        try:
            subprocess.run(["npx", "mongodb-mcp-server", "--version"],
                           capture_output=True, timeout=8)
            mcp_status = "available via npx"
        except Exception:
            mcp_status = "⚠ not found — run: npm install -g mongodb-mcp-server"
    except Exception as exc:
        mcp_status = f"error: {exc}"

    return jsonify({
        "status":        "ok",
        "mongo":         mongo_status,
        "mcp_binary":    mcp_status,
        "mcp_transport": "stdio (subprocess per call)",
        "openrouter":    "key set" if OPENROUTER_KEY else "⚠ missing",
        "gemini":        "key set" if GEMINI_KEY     else "⚠ missing",
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000, threaded=True)
