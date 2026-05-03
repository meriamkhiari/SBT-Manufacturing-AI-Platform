"""Gateway route blueprints — one proxy per integrated task."""
from .task1 import bp as task1_bp
from .task2 import bp as task2_bp
from .task3 import bp as task3_bp
from .auth  import bp as auth_bp, seed_default_admin

__all__ = ["task1_bp", "task2_bp", "task3_bp", "auth_bp", "seed_default_admin"]
