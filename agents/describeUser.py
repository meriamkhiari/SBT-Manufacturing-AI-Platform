
import json
import base64
from agents.shared import call_gemini, push_log, metrics_tracker

def run(run_id: str, image_data_url: str, expected_reference: str) -> dict:
    """
    AGENT : describeUser
    Role: Use LLaVA (via Gemini) to generate a structured cavity map from the live user/production photo.
    Input: A real time camera opens up, is shown a connector, extracts the connector type in it, 
           number of ports, their colors and compares them to existing mongoDB connectors.
    """
    metrics_tracker.start_timer(run_id, "describeUser")
    push_log(run_id, f"Describing user photo (Expected: {expected_reference})...", "agent")
    
    # Strip base64 prefix
    if "," in image_data_url:
        b64 = image_data_url.split(",")[1]
    else:
        b64 = image_data_url

    prompt = f"""
    You are a QC Vision Agent. Analyze the provided image of an electrical connector.
    The operator expects this to be a {expected_reference} connector.
    
    IMPORTANT CONTEXT:
    1. The camera might be mirrored. 
    2. Look for the reference point/marker (usually a small notch, '1' mark, or specific shape) which is typically in the top-left to determine the correct port order.
    3. If the connector is upside down or rotated, mentally normalize it so the reference point is at the start.
    
    Extract the following structure in JSON:
    {{
        "connector_type": "string (Determine if it matches {expected_reference} or if it is a descriptive name like '6-port terminal block')",
        "num_ports": int,
        "orientation_detected": "string (normal, mirrored, rotated_180)",
        "ports": [
            {{"port_num": 1, "color": "string", "empty": boolean}},
            ...
        ]
    }}
    Be extremely precise with port colors and numbers. 
    Output ONLY the JSON.
    """

    parts = [
        {"text": prompt},
        {"inline_data": {"mime_type": "image/jpeg", "data": b64}}
    ]

    try:
        raw_json = call_gemini(parts, run_id, "describeUser")
        data = json.loads(raw_json)
        
        push_log(run_id, f"User photo analysis complete: Found {data.get('num_ports')} ports", "success")
        metrics_tracker.stop_timer(run_id, "describeUser")
        return data
        
    except Exception as e:
        push_log(run_id, f"Error describing user photo: {str(e)}", "error")
        metrics_tracker.stop_timer(run_id, "describeUser")
        return None
