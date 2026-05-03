"""
Integration Portal — Flask API Gateway.

Routes:
  /api/tasks               list all integrated tasks
  /api/tasks/<id>          single task descriptor
  /api/status              live health of every upstream
  /api/metrics             aggregated metrics
  /api/health              gateway self-check
  /api/task1/*             reverse-proxy → tache1 (port 5000)
  /api/task2/*             reverse-proxy → tache2 (port 8000)
  /api/task3/*             reverse-proxy → tache3 (port 5002)
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor

from flask import Flask, jsonify
from flask_cors import CORS
import requests

from datetime import timedelta
import os
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

from config import GATEWAY_PORT, TASKS
from routes import task1_bp, task2_bp, task3_bp, auth_bp, seed_default_admin
from sbt_data import SBT_DATA


def _probe(task: dict) -> str:
    """Return 'online' | 'degraded' | 'offline' for a single upstream."""
    try:
        url = task["backend_url"].rstrip("/") + task["health_path"]
        r = requests.get(url, timeout=3)
        return "online" if r.status_code < 400 else "degraded"
    except Exception:
        return "offline"


def create_app() -> Flask:
    # `static_folder` exposes the SBT shared design system at /static/sbt.css
    app = Flask(__name__, static_folder="static", static_url_path="/static")
    app.secret_key = os.getenv("PORTAL_SECRET_KEY")
    if not app.secret_key:
        if app.debug:
            app.secret_key = "sbt-portal-dev-secret-key"
            app.logger.warning("Using dev secret key. Set PORTAL_SECRET_KEY in production.")
        else:
            raise RuntimeError("PORTAL_SECRET_KEY must be set in production environment.")
    app.permanent_session_lifetime = timedelta(days=7)
    app.config.update(
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_HTTPONLY=True,
    )
    # Allow localhost + any LAN IP on :3000 (so phones on same Wi-Fi can connect)
    import re
    CORS(app, supports_credentials=True, origins=[
        re.compile(r"^http://localhost:3000$"),
        re.compile(r"^http://127\.0\.0\.1:3000$"),
        re.compile(r"^http://192\.168\.\d+\.\d+:3000$"),
        re.compile(r"^http://10\.\d+\.\d+\.\d+:3000$"),
    ])

    app.register_blueprint(auth_bp)
    app.register_blueprint(task1_bp)
    app.register_blueprint(task2_bp)
    app.register_blueprint(task3_bp)

    seed_default_admin()

    @app.route("/api/tasks", methods=["GET"])
    def list_tasks():
        return jsonify({"success": True, "tasks": list(TASKS.values())})

    @app.route("/api/tasks/<task_id>", methods=["GET"])
    def get_task(task_id: str):
        if task_id not in TASKS:
            return jsonify({"success": False, "error": "Task not found"}), 404
        return jsonify({"success": True, "task": TASKS[task_id]})

    @app.route("/api/status", methods=["GET"])
    def status():
        try:
            with ThreadPoolExecutor(max_workers=len(TASKS)) as pool:
                states = dict(zip(TASKS.keys(), pool.map(_probe, TASKS.values())))
            result = {
                tid: {
                    "name": t["name"],
                    "color": t["color"],
                    "backend": states.get(tid, "offline"),
                    "iframe_url": t["iframe_url"],
                }
                for tid, t in TASKS.items()
            }
            return jsonify({"success": True, "status": result})
        except Exception as e:
            return jsonify({"success": False, "error": str(e), "status": {}}), 200

    @app.route("/api/metrics", methods=["GET"])
    def metrics():
        return jsonify({
            "success": True,
            "metrics": {tid: TASKS[tid]["metrics"] for tid in TASKS},
        })

    @app.route("/api/sbt", methods=["GET"])
    def sbt():
        return jsonify({"success": True, "sbt": SBT_DATA})

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({
            "success": True,
            "service": "Integration Portal Gateway",
            "version": "2.0.0",
            "tasks": len(TASKS),
        })

    return app


app = create_app()


if __name__ == "__main__":
    print("=" * 60)
    print(" INTEGRATION PORTAL — FLASK GATEWAY")
    print("=" * 60)
    print(f" Listening on  : http://localhost:{GATEWAY_PORT}")
    print(" Proxy routes  :")
    for tid, task in TASKS.items():
        print(f"   /api/{tid}/*  ->  {task['backend_url']}")
    print("=" * 60)
    app.run(
        host="0.0.0.0",
        port=GATEWAY_PORT,
        debug=False,        # debug=True is single-threaded and reloads constantly
        threaded=True,      # handle concurrent /api/status polls without queuing
        use_reloader=False,
    )
