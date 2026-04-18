
import json
from agents.shared import push_log, metrics_tracker

def run(run_id: str, ref_cavity_map: dict, user_cavity_map: dict) -> dict:
    """
    AGENT : JudgeMatch
    Role: Compare the real-time captured connector with the existing and known connectors, 
           give a matching score and a verdict with justification.
    Inputs: ref_cavity_map, user_cavity_map, Shared Context Dict
    """
    metrics_tracker.start_timer(run_id, "JudgeMatch")
    push_log(run_id, "Judging match between reference and user photo...", "agent")
    
    if not ref_cavity_map:
        push_log(run_id, "Reference data missing. Cannot judge.", "warn")
        metrics_tracker.stop_timer(run_id, "JudgeMatch")
        return {"verdict": "REFERENCE_MISSING", "score": 0, "justification": "The technical reference data from MongoDB is missing."}
        
    if not user_cavity_map:
        push_log(run_id, "User photo data missing. Cannot judge.", "warn")
        metrics_tracker.stop_timer(run_id, "JudgeMatch")
        return {"verdict": "USER_PHOTO_DATA_MISSING", "score": 0, "justification": "The camera feed analysis failed to extract any data."}

    score = 0
    justifications = []
    
    # Connector type (20 points)
    ref_ref = ref_cavity_map.get("reference", "").lower()
    user_ref = user_cavity_map.get("connector_type", "").lower()
    
    # Check for direct match or if user_ref contains ref_ref
    if ref_ref == user_ref or ref_ref in user_ref or user_ref in ref_ref:
        score += 20
        justifications.append(f"Connector model {ref_ref} matches.")
    else:
        # If model name doesn't match but ports match perfectly, we can still pass with a warning
        justifications.append(f"Model mismatch in description: expected {ref_ref}, found {user_ref}.")
        
    # Number of ports (20 points)
    ref_num_ports = ref_cavity_map.get("num_ports", 0)
    user_num_ports = user_cavity_map.get("num_ports", 0)
    if ref_num_ports == user_num_ports:
        score += 20
        justifications.append(f"Correct port count: {ref_num_ports}.")
    else:
        justifications.append(f"Port count mismatch: expected {ref_num_ports}, found {user_num_ports}.")
        
    # Port colors and order (60 points)
    ref_ports = ref_cavity_map.get("ports", [])
    user_ports = user_cavity_map.get("ports", [])
    
    # Try multiple orientations to handle mirroring/rotation
    best_port_score = 0
    best_justification = ""
    
    # Normal order
    normal_score = 0
    total_ref_ports = len(ref_ports)
    if total_ref_ports > 0:
        for ref_p in ref_ports:
            user_p = next((up for up in user_ports if up.get("port_num") == ref_p.get("port_num")), None)
            if user_p:
                ref_color = (ref_p.get("color") or "").lower()
                user_color = (user_p.get("color") or "").lower()
                if ref_color == user_color:
                    normal_score += 1
        best_port_score = (normal_score / total_ref_ports) * 60
        best_justification = f"Port sequence matched {normal_score}/{total_ref_ports} in normal orientation."

    # Reverse order (Mirroring check)
    reverse_score = 0
    if total_ref_ports > 0:
        for i, ref_p in enumerate(ref_ports):
            # Map ref port i to user port (total_ref_ports - i)
            mirrored_num = total_ref_ports - i
            user_p = next((up for up in user_ports if up.get("port_num") == mirrored_num), None)
            if user_p:
                ref_color = (ref_p.get("color") or "").lower()
                user_color = (user_p.get("color") or "").lower()
                if ref_color == user_color:
                    reverse_score += 1
        rev_val = (reverse_score / total_ref_ports) * 60
        if rev_val > best_port_score:
            best_port_score = rev_val
            best_justification = f"Mirroring detected: sequence matched {reverse_score}/{total_ref_ports} in reversed orientation."

    score += best_port_score
    justifications.append(best_justification)

    verdict = "OK" if score >= 80 else "FAIL"
    
    if score < 40: # If even the port count or most colors are wrong
        verdict = "NEW_CONNECTOR_NEEDED"
        justifications.append("This connector's PDF is missing or it is a completely different model.")
        
    result = {
        "verdict": verdict,
        "score": round(score, 2),
        "justification": " | ".join(justifications),
        "ref_cavity_map": ref_cavity_map,
        "user_cavity_map": user_cavity_map
    }
    
    push_log(run_id, f"Match Verdict: {verdict} (Score: {score}/100)", "success")
    metrics_tracker.stop_timer(run_id, "JudgeMatch")
    return result
