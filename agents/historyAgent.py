
import datetime
from pymongo import MongoClient
from agents.shared import MONGO_URI, MONGO_DB, HISTORY_COLL

def log_action(action_type: str, details: str, user: str = "anonymous"):
    """
    AGENT : historyAgent
    Role: Track user actions with timestamps and store them in MongoDB.
    """
    try:
        client = MongoClient(MONGO_URI)
        db = client[MONGO_DB]
        coll = db[HISTORY_COLL]
        
        entry = {
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "user": user,
            "action": action_type,
            "details": details
        }
        
        coll.insert_one(entry)
        return True
    except Exception as e:
        print(f"Error logging history: {e}")
        return False

def get_recent_history(limit: int = 50):
    """
    Retrieve the most recent user actions.
    """
    try:
        client = MongoClient(MONGO_URI)
        db = client[MONGO_DB]
        coll = db[HISTORY_COLL]
        
        cursor = coll.find().sort("timestamp", -1).limit(limit)
        return list(cursor)
    except Exception as e:
        print(f"Error fetching history: {e}")
        return []
