
import json
from pymongo import MongoClient
from agents.shared import MONGO_URI, MONGO_DB, MONGO_COLL, push_log, metrics_tracker

def run(run_id: str, reference: str) -> dict:
    """
    Fetch the reference data from MongoDB.
    """
    push_log(run_id, "=== EXTRACT REFERENCE AGENT: Database Lookup ===", "agent")
    push_log(run_id, f"Searching MongoDB for reference: {reference}...")
    
    try:
        client = MongoClient(MONGO_URI)
        db = client[MONGO_DB]
        coll = db[MONGO_COLL]
        
        # Search for the reference in MongoDB
        # Part A stored it with a specific structure: { reference: "...", terminals: [{ ports: [...], total_ports: 9 }] }
        doc = coll.find_one({"reference": reference})
        
        if not doc:
            push_log(run_id, f"Reference {reference} not found in MongoDB", "warn")
            metrics_tracker.stop_timer(run_id, "extractReference")
            return None
        
        # Extract the necessary data for comparison (Part B expects num_ports and ports)
        # Based on the document structure: total_ports and ports are in terminals[0]
        terminals = doc.get("terminals", [])
        if not terminals:
            push_log(run_id, f"No terminal data found in reference {reference}", "error")
            metrics_tracker.stop_timer(run_id, "extractReference")
            return None
            
        first_terminal = terminals[0]
        
        # Map "port" to "port_num" for consistency with describeUser and JudgeMatch
        ref_ports = []
        for p in first_terminal.get("ports", []):
            ref_ports.append({
                "port_num": p.get("port", p.get("port_num")),
                "color": p.get("color")
            })
            
        extracted_data = {
            "reference": doc.get("reference"),
            "num_ports": doc.get("total_ports", 0),
            "ports": ref_ports
        }
            
        push_log(run_id, f"Reference data found for {reference} ({extracted_data['num_ports']} ports)", "success")
        metrics_tracker.stop_timer(run_id, "extractReference")
        return extracted_data
        
    except Exception as e:
        push_log(run_id, f"Error extracting reference: {str(e)}", "error")
        metrics_tracker.stop_timer(run_id, "extractReference")
        return None
