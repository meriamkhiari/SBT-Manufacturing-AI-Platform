

import json
from .shared import push_log, call_openrouter


def _make_prompt(raw_json_str: str) -> str:
    return f"""You are a JSON validation and correction agent for an electrical cable assembly pipeline.

You will receive a JSON object produced by a vision model. Your job:
1. Check the JSON against these rules:
   - Top-level keys: "reference" (string - any alphanumeric format like GRP-XXXXXX, CAB123456, 00002-CAB0199180-FL-1, etc.) and "terminals" (array)
   - Each terminal: "image_number" (int), "description" (string), "ports" (array of 6 or 9 objects)
   - Each port: "port" (int, sequential from 1), "color" (one of: blue, white, yellow, black, gray, grey, red, orange, green, brown, empty)
2. Fix every error you can:
   - Wrong color names -> map to nearest allowed color (e.g. "light blue"->"blue", "beige"->"white", "violet"->"blue")
   - Missing port numbers -> add them sequentially
   - Extra whitespace / casing in colors -> normalize to lowercase
   - Missing description -> set "description": "terminal block"
   - Wrong port count (e.g. 7 ports) -> fix by padding with empty ports or trimming to reach 6 or 9
   - Reference format: Accept ANY alphanumeric reference (CAB123, GRP-456, 00002-CAB0199180-FL-1, etc.)
3. If the JSON is fundamentally broken and CANNOT be fixed (e.g. terminals array is empty AND
   cannot be inferred, or reference is "Reference not detected" or "Extraction error"), set the top-level key
   "validation_error" to a short human-readable explanation. Do NOT set this key if the data
   is valid or was successfully corrected.
4. Always include a "corrections" array at the top level listing every fix you made as short
   strings. Empty array [] if no fixes were needed.

IMPORTANT: 
- If reference is "Reference not detected" or "Extraction error", set validation_error to "Invalid or missing reference code"
- If terminals array is empty (no terminal blocks detected), set validation_error to "No terminal blocks detected in the input"
- If both reference and terminals are problematic, set validation_error to "No terminal blocks detected and invalid reference"

Return ONLY clean JSON -- no markdown, no explanation outside the JSON.

Input JSON:
{raw_json_str}"""


def run(run_id: str, data: dict) -> dict:
    """
    Send DetectAgent's output to OpenRouter for validation and auto-correction.
    Always returns a dict -- never raises (errors are embedded as validation_error).
    """
    push_log(run_id, "--- VALIDATE AGENT: OpenRouter Validator + Corrector ---", "agent")
    push_log(run_id, "Model: meta-llama/llama-3.3-70b:free | Sending JSON for validation/correction...")

    prompt = _make_prompt(json.dumps(data, indent=2))

    try:
        choice = call_openrouter(
            messages=[{"role": "user", "content": prompt}],
            run_id=run_id,
            label="ValidateAgent/validator",
            max_tokens=4096,
            temperature=0.1,
        )
        raw = choice.get("message", {}).get("content") or ""
        raw = raw.replace("```json", "").replace("```", "").strip()
    except RuntimeError as e:
        push_log(run_id, f"ValidateAgent: OpenRouter call failed -- {e}", "error")
        return {**data, "validation_error": f"Validator API error: {e}", "corrections": []}

    try:
        corrected = json.loads(raw)
    except json.JSONDecodeError as e:
        push_log(run_id, f"ValidateAgent: Could not parse corrector response -- {e}", "error")
        push_log(run_id, f"Raw (first 300): {raw[:300]}", "error")
        return {**data, "validation_error": f"Corrector returned invalid JSON: {e}", "corrections": []}

    # Log every correction the model made
    corrections = corrected.get("corrections", [])
    if corrections:
        push_log(run_id, f"Corrections applied ({len(corrections)}):", "warn")
        for c in corrections:
            push_log(run_id, f"  [EDIT] {c}", "warn")
    else:
        push_log(run_id, "No corrections needed -- JSON was already valid", "success")

    if "validation_error" in corrected:
        push_log(run_id, f"[!] Uncorrectable: {corrected['validation_error']}", "error")
        push_log(run_id, "-> ValidateAgent passing ERROR INDICATOR to StoreAgent", "handoff")
    else:
        push_log(run_id, "[OK] JSON validated and corrected", "success")
        push_log(run_id, "-> ValidateAgent handing off to StoreAgent", "handoff")

    return corrected