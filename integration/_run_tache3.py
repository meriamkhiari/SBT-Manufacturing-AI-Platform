"""
Wrapper to start tache3 on port 5002 for the integration portal.
"""
import sys
import os
from pathlib import Path

# Add tache3 to Python path
ROOT = Path(__file__).resolve().parent.parent
TACHE3_DIR = ROOT / "tache3"
sys.path.insert(0, str(TACHE3_DIR))

# Change to tache3 directory
os.chdir(TACHE3_DIR)

# Import and run the Flask app
from src.web.app import app

if __name__ == "__main__":
    print("=" * 60)
    print(" TACHE3 - SBT Intelligence")
    print("=" * 60)
    print(" Listening on  : http://localhost:5002")
    print("=" * 60)
    app.run(
        host="0.0.0.0",
        port=5002,
        debug=False,
        threaded=True,
        use_reloader=False,
    )
