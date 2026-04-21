
import json
from .shared import push_log, call_gemini

# -- Vision prompt --
_VISION_PROMPT = (
    "You are analyzing a technical image of electrical terminal blocks.\n"
    "Analyze every 6-port or 9-port terminal block with colored wires visible.\n"
    "For each block:\n"
    "  - Sequential image_number (1, 2, ...)\n"
    "  - Short description\n"
    "  - Ports: Top row 1-3, Middle 4-6, Bottom 7-9 (if 9-port)\n"
    "  - Wire color per port - ONLY these values: "
    "blue, white, yellow, black, gray, red, orange, green, brown, empty\n"
    "  - Detect metallic objects in port holes - those mean a cable is present\n\n"
    "Return ONLY clean JSON, no markdown:\n"
    '{"terminals":[{"image_number":1,"description":"...","ports":'
    '[{"port":1,"color":"..."},{"port":2,"color":"..."},{"port":3,"color":"..."},'
    '{"port":4,"color":"..."},{"port":5,"color":"..."},{"port":6,"color":"..."}]}]}\n'
    'If nothing detected: {"terminals":[]}'
)


def run(run_id: str, image_data_url: str, reference: str) -> dict:
    """
    Call Gemini Vision with the connector image.
    Merge the detected reference into the output.
    Returns: {reference, terminals: [...]}
    """
    push_log(run_id, "=== DETECT AGENT: Gemini Vision Analyzer ===", "agent")
    push_log(run_id, f"Image: ~{round(len(image_data_url) / 1024)} KB | Model: gemini-2.5-flash")

    base64_data = image_data_url.split(",")[1] if "," in image_data_url else image_data_url
    mime_type   = "image/png" if image_data_url.startswith("data:image/png") else "image/jpeg"

    raw = call_gemini(
        prompt_parts=[
            {"inline_data": {"mime_type": mime_type, "data": base64_data}},
            {"text": _VISION_PROMPT},
        ],
        run_id=run_id,
        label="vision",
    )

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        raise RuntimeError(
            f"DetectAgent: Gemini returned invalid JSON - {e}\nRaw (first 300): {raw[:300]}"
        )

    merged = {"reference": reference, "terminals": parsed.get("terminals", [])}
    push_log(run_id, f"Detected {len(merged['terminals'])} terminal block(s)")
    push_log(run_id, f"Reference merged: {reference}", "success")
    push_log(run_id, "-> DetectAgent handing off to ValidateAgent", "handoff")
    return merged
