
import json
from .shared import push_log, call_gemini

# -- Vision prompt --
_VISION_PROMPT = (
    "You are analyzing a technical image of electrical terminal blocks.\n"
    "IMPORTANT: Look carefully for ANY terminal block with circular ports arranged in rows.\n"
    "Even if the image quality is not perfect, if you can see:\n"
    "  - A plastic block (gray, white, or brown)\n"
    "  - Circular holes/ports arranged in rows (typically 2x3 or 3x3 grid)\n"
    "  - Colored wires OR metallic contacts visible in the ports\n"
    "Then you MUST detect it and analyze it.\n\n"
    "BE GENEROUS in detection - if there's ANY indication of a terminal block, analyze it.\n"
    "Even partial views, slightly blurry images, or unclear wire colors should be analyzed.\n\n"
    "For each block found:\n"
    "  - Sequential image_number (1, 2, ...)\n"
    "  - Short description\n"
    "  - Ports: Top row 1-3, Middle 4-6, Bottom 7-9 (if 9-port)\n"
    "  - Wire color per port - ONLY these values: "
    "blue, white, yellow, black, gray, red, orange, green, brown, empty\n"
    "  - If you see a metallic object or wire in a port, it is NOT empty\n"
    "  - If a port hole is dark/black but you can see something inside, assume a wire is present\n"
    "  - If you cannot determine the color clearly, make your best guess from the available colors\n\n"
    "Return ONLY clean JSON, no markdown:\n"
    '{"terminals":[{"image_number":1,"description":"...","ports":'
    '[{"port":1,"color":"..."},{"port":2,"color":"..."},{"port":3,"color":"..."},'
    '{"port":4,"color":"..."},{"port":5,"color":"..."},{"port":6,"color":"..."}]}]}\n'
    'If absolutely nothing detected: {"terminals":[]}\n\n'
    'CRITICAL: Only return empty terminals if you are 100% certain there is NO terminal block visible in the image.\n'
    'When in doubt, attempt to analyze what you see rather than returning empty results.'
)


def run(run_id: str, image_data_url: str, reference: str) -> dict:
    """
    Call Gemini Vision with the connector image.
    Merge the detected reference into the output.
    Returns: {reference, terminals: [...]}
    """
    push_log(run_id, "=== DETECT AGENT: Gemini Vision Analyzer ===", "agent")
    
    # Log image metadata for debugging
    image_size_kb = round(len(image_data_url) / 1024)
    push_log(run_id, f"Image size: ~{image_size_kb} KB")
    
    base64_data = image_data_url.split(",")[1] if "," in image_data_url else image_data_url
    mime_type   = "image/png" if image_data_url.startswith("data:image/png") else "image/jpeg"
    
    push_log(run_id, f"Image format: {mime_type} | Model: gemini-2.5-flash")
    
    # Validate base64 data
    if len(base64_data) < 100:
        push_log(run_id, "WARNING: Image data seems too small, might be corrupted", "warn")

    raw = call_gemini(
        prompt_parts=[
            {"inline_data": {"mime_type": mime_type, "data": base64_data}},
            {"text": _VISION_PROMPT},
        ],
        run_id=run_id,
        label="vision",
    )

    cleaned = (raw or "").strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```", 2)[1] if cleaned.count("```") >= 2 else cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as e:
        push_log(run_id, f"DetectAgent: Gemini returned non-JSON. Error: {e}", "error")
        push_log(run_id, f"Raw response (first 500 chars): {cleaned[:500]}", "error")
        parsed = {"terminals": []}

    merged = {"reference": reference, "terminals": parsed.get("terminals", [])}
    
    num_terminals = len(merged['terminals'])
    if num_terminals == 0:
        push_log(run_id, "WARNING: No terminal blocks detected by Gemini Vision", "warn")
        push_log(run_id, "This could indicate: poor image quality, wrong image type, or model issue", "warn")
    else:
        push_log(run_id, f"Successfully detected {num_terminals} terminal block(s)", "success")
    
    push_log(run_id, f"Reference merged: {reference}", "success")
    push_log(run_id, "-> DetectAgent handing off to ValidateAgent", "handoff")
    return merged
