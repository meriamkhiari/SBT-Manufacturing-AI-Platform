"""Proxy /api/task2/* → tache2 backend."""
from flask import Blueprint, jsonify

from config import TASKS
from routes._proxy import proxy

bp = Blueprint("task2", __name__, url_prefix="/api/task2")
TARGET = TASKS["task2"]["backend_url"]


@bp.route("/info", methods=["GET"])
def info():
    return jsonify({"success": True, "task": TASKS["task2"]})


@bp.route("/", defaults={"subpath": ""},
          methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
@bp.route("/<path:subpath>",
          methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
def forward(subpath: str):
    return proxy(TARGET, subpath)
