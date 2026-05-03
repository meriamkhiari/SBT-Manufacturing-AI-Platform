"""
QualityVision — Flask Backend v2
Orchestrateur A2A avec vraies task cards et MCP resource management.
"""
import os
import sys
import base64
import asyncio
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env", override=True)
except ImportError:
    pass

from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

# Configuration
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from mcp.protocol import AgentContext, AgentRole, broker
from agents import (
    PreprocessingAgent, VisionAgent, ValidationAgent,
    SeverityAgent, ReportAgent, CLASS_NAMES, CLASS_DESCRIPTIONS,
)

# Flask app
app = Flask(__name__, static_folder='frontend/dist', static_url_path='')
CORS(app)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 20 * 1024 * 1024  # 20MB max
app.config['DATASET_SAMPLES_DIR'] = BASE_DIR / 'dataset_samples'
app.config['DATASET_LABELS_DIR'] = BASE_DIR / 'dataset_labels'
app.config['MEDIA_DIR'] = BASE_DIR / 'media'
app.config['ANTHROPIC_API_KEY'] = os.getenv('ANTHROPIC_API_KEY')
if not app.config['ANTHROPIC_API_KEY']:
    # En production, on ne devrait jamais avoir de clé en dur.
    # On laisse une erreur claire si la clé manque.
    app.logger.warning("ANTHROPIC_API_KEY non configurée dans l'environnement.")

# Créer les dossiers nécessaires
app.config['MEDIA_DIR'].mkdir(exist_ok=True)

# ── Instanciation & enregistrement des agents ──────────────────────────────────
_pre = PreprocessingAgent()
_vis = VisionAgent(api_key=app.config['ANTHROPIC_API_KEY'])
_val = ValidationAgent()
_sev = SeverityAgent()
_rep = ReportAgent()

broker.register(AgentRole.PREPROCESSOR, _pre)
broker.register(AgentRole.VISION, _vis)
broker.register(AgentRole.VALIDATOR, _val)
broker.register(AgentRole.SEVERITY, _sev)
broker.register(AgentRole.REPORTER, _rep)


# ── Helpers ────────────────────────────────────────────────────────────────────
def load_yolo_labels(filename: str) -> list:
    """Charge les annotations YOLO OBB depuis dataset_labels/"""
    stem = Path(filename).stem
    label_path = app.config['DATASET_LABELS_DIR'] / f"{stem}.txt"
    if not label_path.exists():
        return []
    annotations = []
    for line in label_path.read_text().strip().splitlines():
        parts = line.strip().split()
        if len(parts) < 9:
            continue
        class_id = int(parts[0])
        coords = list(map(float, parts[1:9]))
        xs, ys = coords[0::2], coords[1::2]
        annotations.append({
            "class_id": class_id,
            "class_name": CLASS_NAMES.get(class_id, f"class_{class_id}"),
            "bbox": {"x": min(xs), "y": min(ys), "w": max(xs) - min(xs), "h": max(ys) - min(ys)},
            "obb_points": coords,
        })
    return annotations


def run_pipeline(ctx: AgentContext) -> dict:
    """
    Orchestrateur A2A v2 — crée des task cards pour chaque handoff,
    utilise les MCP tools via le broker, publie des ressources.
    """
    async def _run():
        pid = ctx.pipeline_id

        # Broadcast pipeline start
        await broker.broadcast({"event": "pipeline_start", "pipeline_id": pid})

        # ── Task 1: ORCHESTRATOR → PREPROCESSOR ──
        t1 = broker.create_task(
            AgentRole.ORCHESTRATOR, AgentRole.PREPROCESSOR, pid,
            input_refs=[f"qv://{pid}/raw_image"],
            metadata={"filename": ctx.image_filename, "mime": ctx.image_mime},
        )
        await _pre.run(ctx, task=t1)

        # ── Task 2: PREPROCESSOR → VISION ──
        t2 = broker.create_task(
            AgentRole.PREPROCESSOR, AgentRole.VISION, pid,
            input_refs=[f"qv://{pid}/image_meta"],
            metadata={"model": "claude-sonnet-4-20250514", "xai": True},
        )
        await _vis.run(ctx, task=t2)

        if ctx.vision_result.get("error") and not ctx.vision_result.get("detections"):
            return None

        # ── Task 3: VISION → VALIDATOR ──
        t3 = broker.create_task(
            AgentRole.VISION, AgentRole.VALIDATOR, pid,
            input_refs=[f"qv://{pid}/detections", f"qv://{pid}/xai"],
        )
        await _val.run(ctx, task=t3)

        # ── Task 4: VALIDATOR → SEVERITY ──
        t4 = broker.create_task(
            AgentRole.VALIDATOR, AgentRole.SEVERITY, pid,
            input_refs=[f"qv://{pid}/validated"],
        )
        await _sev.run(ctx, task=t4)

        # ── Task 5: SEVERITY → REPORTER ──
        t5 = broker.create_task(
            AgentRole.SEVERITY, AgentRole.REPORTER, pid,
            input_refs=[f"qv://{pid}/severity", f"qv://{pid}/xai"],
        )
        await _rep.run(ctx, task=t5)

        # Broadcast pipeline end
        await broker.broadcast({
            "event": "pipeline_end",
            "pipeline_id": pid,
            "verdict": ctx.severity_result.get("verdict")
        })
        return ctx.final_report

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(asyncio.run, _run())
                return future.result()
        else:
            return loop.run_until_complete(_run())
    except RuntimeError:
        return asyncio.run(_run())


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route('/api/analyze/', methods=['POST'])
def analyze_image():
    """POST /api/analyze/ — Pipeline A2A complet sur image uploadée."""
    if 'file' not in request.files:
        return jsonify({"error": "Aucun fichier envoyé"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Nom de fichier vide"}), 400
    
    content = file.read()
    if len(content) > 20 * 1024 * 1024:
        return jsonify({"error": "Image trop grande (max 20MB)"}), 413
    
    mime = file.content_type or 'image/jpeg'
    if not mime.startswith('image/'):
        return jsonify({"error": "Fichier doit être une image"}), 400

    b64 = base64.standard_b64encode(content).decode()
    ctx = AgentContext(
        image_b64=b64,
        image_mime=mime,
        image_filename=secure_filename(file.filename) or 'upload.jpg',
        user_context=request.form.get('context', '') or '',
    )
    
    report = run_pipeline(ctx)
    if report is None:
        err = ctx.vision_result.get('error', 'unknown')
        if 'auth' in str(err).lower():
            return jsonify({"error": "Clé API Anthropic invalide"}), 401
        if 'rate' in str(err).lower():
            return jsonify({"error": "Limite de taux API. Réessayez."}), 429
        return jsonify({"error": f"Erreur pipeline: {err}"}), 500
    
    return jsonify(report)


@app.route('/api/analyze/sample/<filename>', methods=['GET'])
def analyze_sample(filename):
    """GET /api/analyze/sample/<filename> — Pipeline A2A sur sample dataset."""
    img_path = app.config['DATASET_SAMPLES_DIR'] / filename
    if not img_path.exists():
        return jsonify({"error": f"Image '{filename}' non trouvée"}), 404
    
    content = img_path.read_bytes()
    b64 = base64.standard_b64encode(content).decode()
    ctx = AgentContext(
        image_b64=b64,
        image_mime='image/jpeg',
        image_filename=filename,
        user_context=request.args.get('context', ''),
    )
    
    report = run_pipeline(ctx)
    if report is None:
        return jsonify({"error": "Erreur pipeline vision"}), 500
    
    return jsonify({
        **report,
        "filename": filename,
        "image_url": f"/samples/{filename}",
        "ground_truth": load_yolo_labels(filename),
    })


@app.route('/api/samples/', methods=['GET'])
def list_samples():
    """GET /api/samples/ — Liste toutes les images du dataset."""
    samples_dir = app.config['DATASET_SAMPLES_DIR']
    if not samples_dir.exists():
        return jsonify({"samples": []})
    
    images = []
    for f in sorted(samples_dir.glob("*.jpg")):
        labels = load_yolo_labels(f.name)
        images.append({
            "filename": f.name,
            "url": f"/samples/{f.name}",
            "ground_truth": labels,
            "defect_count": len(labels),
        })
    
    return jsonify({"samples": images})


@app.route('/api/samples/<filename>/labels', methods=['GET'])
def sample_labels(filename):
    """GET /api/samples/<filename>/labels — Ground truth YOLO OBB."""
    return jsonify({
        "filename": filename,
        "annotations": load_yolo_labels(filename),
        "classes": CLASS_DESCRIPTIONS,
    })


@app.route('/api/classes/', methods=['GET'])
def get_classes():
    """GET /api/classes/ — Liste des classes de défauts."""
    return jsonify({
        "classes": CLASS_DESCRIPTIONS,
        "class_ids": CLASS_NAMES
    })


@app.route('/api/agents/', methods=['GET'])
def get_agents():
    """GET /api/agents/ — Retourne les agents, leur agent card A2A et les tools MCP exposés."""
    return jsonify({
        "protocol": "MCP A2A v2.0",
        "agents": broker.agent_list(),
        "capabilities": broker.list_capabilities(),
        "mcp_tools": broker.list_tools(),
        "mcp_resources": broker.list_resources(),
        "mcp_stats": broker.get_stats(),
        "pipeline": [
            {"step": 1, "agent": "preprocessor", "role": "Analyse image + MCP tool analyze_image_quality"},
            {"step": 2, "agent": "vision", "role": "Claude Vision XAI + MCP tool detect_defects"},
            {"step": 3, "agent": "validator", "role": "NMS + filtrage + MCP tool validate_detections"},
            {"step": 4, "agent": "severity", "role": "Règles métier + MCP tool classify_severity"},
            {"step": 5, "agent": "reporter", "role": "Rapport final + XAI global + MCP tool generate_report"},
        ],
    })


@app.route('/api/health/', methods=['GET'])
def health():
    """GET /api/health/ — Statut de l'API."""
    return jsonify({
        "status": "ok",
        "version": "2.0.0",
        "framework": "Flask + React",
        "model": "claude-sonnet-4-20250514",
        "protocol": "MCP A2A v2.0",
        "agents": broker.agent_list(),
        "mcp_stats": broker.get_stats(),
    })


@app.route('/samples/<filename>', methods=['GET'])
def serve_sample(filename):
    """Sert les images du dataset."""
    samples_dir = app.config['DATASET_SAMPLES_DIR']
    return send_from_directory(samples_dir, filename)


# ── Serve React Frontend ───────────────────────────────────────────────────────

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    """Sert le frontend React (build statique)."""
    if path and (BASE_DIR / 'frontend' / 'dist' / path).exists():
        return send_from_directory(BASE_DIR / 'frontend' / 'dist', path)
    return send_from_directory(BASE_DIR / 'frontend' / 'dist', 'index.html')


# ── Main ───────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    print("🔬 QualityVision A2A — Flask Backend")
    print(f"✓ {len(broker.agent_list())} agents enregistrés: {broker.agent_list()}")
    print(f"✓ {len(broker.list_tools())} MCP tools disponibles")
    print("")
    app.run(host='0.0.0.0', port=8000, debug=True)
