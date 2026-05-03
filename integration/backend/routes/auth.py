"""
Auth blueprint — login / signup / users for the integration portal.

Storage: MongoDB sbt_vision.users
Schema:
  { _id, email, username, password (bcrypt), fullname, role: 'admin'|'employee'|'pending' }

Session-based auth (Flask session cookie). Frontend reads /api/auth/me.
"""
from __future__ import annotations

import os
from datetime import datetime
from functools import wraps

from flask import Blueprint, jsonify, request, session
from pymongo import MongoClient
import bcrypt

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

MONGO_URI  = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB   = os.getenv("MONGO_DB", "sbt_vision")
USERS_COLL = "users"

DEFAULT_ADMIN_EMAIL    = "admin@sbt.com"
DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = "admin123"


# ── Helpers ──────────────────────────────────────────────────────────────────

def _users():
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
    return client[MONGO_DB][USERS_COLL]


def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _check(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        # Legacy plain-text passwords from tâche 1: compare directly,
        # then upgrade to bcrypt on next login.
        return password == hashed


def _public_user(u: dict) -> dict:
    return {
        "id":       str(u["_id"]),
        "email":    u.get("email") or u.get("username"),
        "username": u.get("username") or u.get("email"),
        "fullname": u.get("fullname", u.get("username", "User")),
        "role":     u.get("role", "pending"),
    }


def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Not authenticated"}), 401
        return f(*args, **kwargs)
    return wrapper


def admin_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if session.get("role") != "admin":
            return jsonify({"error": "Admin only"}), 403
        return f(*args, **kwargs)
    return wrapper


def seed_default_admin() -> None:
    """Always ensure admin@sbt.com exists with admin role. Called once on startup."""
    try:
        col = _users()
        existing = col.find_one({
            "$or": [
                {"email":    DEFAULT_ADMIN_EMAIL},
                {"username": DEFAULT_ADMIN_USERNAME},
            ]
        })
        if existing:
            # Make sure it's still an admin (don't reset password if user changed it).
            if existing.get("role") != "admin":
                col.update_one({"_id": existing["_id"]}, {"$set": {"role": "admin"}})
                print(f"[auth] Promoted existing {DEFAULT_ADMIN_EMAIL} to admin")
            return
        col.insert_one({
            "email":      DEFAULT_ADMIN_EMAIL,
            "username":   DEFAULT_ADMIN_USERNAME,
            "password":   _hash(DEFAULT_ADMIN_PASSWORD),
            "fullname":   "SBT Administrator",
            "role":       "admin",
            "created_at": datetime.utcnow().isoformat() + "Z",
        })
        print(f"[auth] Seeded default admin: {DEFAULT_ADMIN_EMAIL} / {DEFAULT_ADMIN_PASSWORD}")
    except Exception as e:
        print(f"[auth] Seed admin failed (Mongo down?): {e}")


# ── Routes ───────────────────────────────────────────────────────────────────

@bp.post("/login")
def login():
    body     = request.get_json(force=True, silent=True) or {}
    identity = (body.get("email") or body.get("username") or "").strip().lower()
    password = body.get("password") or ""
    if not identity or not password:
        return jsonify({"error": "Email and password required"}), 400

    col  = _users()
    user = col.find_one({"$or": [{"email": identity}, {"username": identity}]})
    if not user or not _check(password, user.get("password", "")):
        return jsonify({"error": "Invalid credentials"}), 401

    # Upgrade plain-text password to bcrypt on first successful login
    stored = user.get("password", "")
    if not stored.startswith("$2"):
        col.update_one({"_id": user["_id"]}, {"$set": {"password": _hash(password)}})

    role = user.get("role", "pending")
    if role == "pending":
        return jsonify({"error": "Account pending admin approval"}), 403

    session["user_id"]  = str(user["_id"])
    session["role"]     = role
    session["username"] = user.get("username") or user.get("email")
    session.permanent   = True

    return jsonify({"user": _public_user(user)})


@bp.post("/signup")
def signup():
    body     = request.get_json(force=True, silent=True) or {}
    email    = (body.get("email") or "").strip().lower()
    username = (body.get("username") or email).strip().lower()
    password = body.get("password") or ""
    fullname = (body.get("fullname") or username or "").strip()

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    col = _users()
    if col.find_one({"$or": [{"email": email}, {"username": username}]}):
        return jsonify({"error": "Account already exists"}), 409

    col.insert_one({
        "email":      email,
        "username":   username,
        "password":   _hash(password),
        "fullname":   fullname or username,
        "role":       "pending",
        "created_at": datetime.utcnow().isoformat() + "Z",
    })

    return jsonify({
        "message": "Account created. Awaiting admin approval.",
        "pending": True,
    }), 201


@bp.post("/logout")
def logout():
    session.clear()
    return jsonify({"ok": True})


@bp.get("/me")
def me():
    if "user_id" not in session:
        return jsonify({"user": None})
    from bson import ObjectId
    try:
        user = _users().find_one({"_id": ObjectId(session["user_id"])})
    except Exception:
        session.clear()
        return jsonify({"user": None})
    if not user:
        session.clear()
        return jsonify({"user": None})
    return jsonify({"user": _public_user(user)})


# ── Admin: manage users ──────────────────────────────────────────────────────

@bp.get("/users")
@admin_required
def list_users():
    users = [_public_user(u) for u in _users().find().sort("created_at", -1)]
    return jsonify({"users": users})


@bp.put("/users/<user_id>/role")
@admin_required
def set_role(user_id: str):
    from bson import ObjectId
    body = request.get_json(force=True, silent=True) or {}
    role = body.get("role")
    if role not in ("admin", "employee", "pending"):
        return jsonify({"error": "Invalid role"}), 400
    try:
        _users().update_one({"_id": ObjectId(user_id)}, {"$set": {"role": role}})
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    return jsonify({"ok": True})


@bp.delete("/users/<user_id>")
@admin_required
def delete_user(user_id: str):
    from bson import ObjectId
    try:
        _users().delete_one({"_id": ObjectId(user_id)})
    except Exception as e:
        return jsonify({"error": str(e)}), 400
    return jsonify({"ok": True})
