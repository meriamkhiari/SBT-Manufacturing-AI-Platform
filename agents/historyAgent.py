
import datetime
from pymongo import MongoClient
from agents.shared import MONGO_URI, MONGO_DB, HISTORY_COLL

# -- Public methods --
def log_action(action: str, details: str = "", user: str = "anonymous"):
    """
    Log a generic user action to MongoDB.
    """
    try:
        client = MongoClient(MONGO_URI)
        db = client[MONGO_DB]
        db[HISTORY_COLL].insert_one({
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "user": user,
            "action": action,
            "details": details
        })
    except Exception as e:
        print(f"[!] historyAgent: Failed to log action: {e}")


def get_recent_history(limit: int = 100):
    """
    Fetch the most recent history logs from MongoDB.
    """
    try:
        client = MongoClient(MONGO_URI)
        db = client[MONGO_DB]
        return list(db[HISTORY_COLL].find().sort("timestamp", -1).limit(limit))
    except Exception as e:
        print(f"[!] historyAgent: Failed to fetch history: {e}")
        return []
