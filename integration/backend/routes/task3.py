"""Proxy /api/task3/* → tache3 backend."""
from flask import Blueprint, jsonify

from config import TASKS
from routes._proxy import proxy

bp = Blueprint("task3", __name__, url_prefix="/api/task3")
TARGET = TASKS["task3"]["backend_url"]


@bp.route("/info", methods=["GET"])
def info():
    return jsonify({"success": True, "task": TASKS["task3"]})


@bp.route("/", defaults={"subpath": ""},
          methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
@bp.route("/<path:subpath>",
          methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
def forward(subpath: str):
    return proxy(TARGET, subpath)
