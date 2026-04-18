
import json
from agents.shared import push_log, metrics_tracker

def run(run_id: str, ref_data: dict, user_data: dict) -> bool:
    """
    AGENT : pipelineEvaluator
    Role: Make sure the data put in MongoDB matches the data structure 
           of the user's real time connector camera.
    """
    metrics_tracker.start_timer(run_id, "pipelineEvaluator")
    push_log(run_id, "Evaluating data structure consistency...", "agent")
    
    if ref_data is None:
        push_log(run_id, "Reference data is missing, cannot evaluate", "error")
        metrics_tracker.stop_timer(run_id, "pipelineEvaluator")
        return False
        
    if user_data is None:
        push_log(run_id, "User photo data is missing, cannot evaluate", "error")
        metrics_tracker.stop_timer(run_id, "pipelineEvaluator")
        return False

    # Required keys in both
    ref_keys = set(ref_data.keys())
    user_keys = set(user_data.keys())
    
    # Expected keys in ref_data (based on Part A extraction)
    expected_ref_keys = {"reference", "num_ports", "ports"}
    # Expected keys in user_data (based on describeUser)
    expected_user_keys = {"connector_type", "num_ports", "ports"}
    
    is_valid = True
    
    # Check if ref_data is valid
    if not expected_ref_keys.issubset(ref_keys):
        missing = expected_ref_keys - ref_keys
        push_log(run_id, f"Reference data missing keys: {missing}", "error")
        is_valid = False
        
    # Check if user_data is valid
    if not expected_user_keys.issubset(user_keys):
        missing = expected_user_keys - user_keys
        push_log(run_id, f"User photo data missing keys: {missing}", "error")
        is_valid = False
        
    # If both are valid, check structure of ports
    if is_valid:
        ref_ports = ref_data.get("ports", [])
        user_ports = user_data.get("ports", [])
        
        if not isinstance(ref_ports, list) or not isinstance(user_ports, list):
            push_log(run_id, "Ports data structure mismatch: expected list", "error")
            is_valid = False
        else:
            push_log(run_id, "Data structures are consistent for comparison", "success")
            
    metrics_tracker.stop_timer(run_id, "pipelineEvaluator")
    return is_valid
