

import json
from flask import Blueprint, request, jsonify
from .shared import OPENROUTER_KEY, call_openrouter, call_gemini, GEMINI_KEY

bp = Blueprint("extractAgent", __name__)

# -- Reference description used in scoring prompt --
REFERENCE_DESC = (
    "A close-up photo of a real electrical terminal block (6 or 9 circular ports "
    "in a 2x3 or 3x3 grid) with actual insulated wires physically inserted into "
    "the metal clamp contacts inside the ports. The block is gray, white, or brown "
    "plastic. Visible metallic contacts/clamps inside the holes confirm real wire "
    "insertion. Wire colors include blue, white, red, black, grey, orange, yellow, "
    "brown. The entire block face must be visible and in focus."
)

# -- Disqualifying patterns --
_REJECT_CRITERIA = (
    "AUTOMATICALLY score 0 and set hasConnector=false for ANY of these:\n"
    "- Diagram or illustration with colored circles/dots drawn on the block "
    "(not real wires - colored filled circles are reference cards, not photos)\n"
    "- Blade connectors, housing plugs, Molex-style or JST connectors "
    "(any connector that is NOT a circular-port terminal block)\n"
    "- Only a single wire or cable visible with no terminal block in frame\n"
    "- Extreme partial close-up where fewer than 4 ports are visible\n"
    "- Damage/defect inspection shots (red circles, annotations highlighting faults)\n"
    "- No metallic clamp contacts visible inside the port holes (empty block or diagram)\n"
    "- Wires bundled outside a connector but not inserted into a terminal block\n"
)


@bp.post("/api/agent1/score")
def score():
    """
    Receives a base64 JPEG from the browser, sends it to OpenRouter free model
    with a scoring prompt, returns JSON: {score, hasConnector, reason}.
    """
    if not GEMINI_KEY:
        return jsonify({"error": "GEMINI_KEY not set in .env"}), 500

    body      = request.get_json(force=True)
    image_b64 = body.get("imageB64", "")
    if not image_b64:
        return jsonify({"error": "imageB64 is required"}), 400

    messages = [{
        "role": "user",
        "content": [
            {
                "type":      "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"},
            },
            {
                "type": "text",
                "text": (
                    "You are selecting the best image for automated wire-color extraction.\n\n"
                    f"IDEAL IMAGE: {REFERENCE_DESC}\n\n"
                    f"{_REJECT_CRITERIA}\n"
                    "SCORING GUIDE (after applying reject criteria above):\n"
                    "  90-100 - Full block face visible, all ports clear, real wires inserted, "
                    "metallic contacts visible, good lighting, minimal angle distortion\n"
                    "  60-89  - Block visible with real wires but partially cropped, "
                    "slight blur, or minor obstruction\n"
                    "  30-59  - Block present but wires hard to distinguish or heavily cropped\n"
                    "  1-29   - Block barely visible or wires absent\n"
                    "  0      - Matches any AUTOMATIC REJECT criterion above\n\n"
                    'Reply ONLY with this exact JSON - no extra text:\n'
                    '{"score":<0-100>,"hasConnector":true/false,"reason":"one short sentence"}'
                ),
            },
        ],
    }]

    # Vision scoring → use Gemini directly (free, reliable, vision-capable).
    # Build Gemini-style prompt parts: image + text.
    prompt_text = messages[0]["content"][1]["text"]
    gemini_parts = [
        {"inline_data": {"mime_type": "image/jpeg", "data": image_b64}},
        {"text": prompt_text},
    ]

    try:
        text = call_gemini(
            prompt_parts=gemini_parts,
            run_id="__agent1_score__",
            label="ExtractAgent/score",
        )
        text = text.replace("```json", "").replace("```", "").strip() or "{}"
        return jsonify(json.loads(text))

    except RuntimeError as e:
        msg = str(e)
        if "rate limit" in msg.lower() or "429" in msg:
            return jsonify({"error": "RATE_LIMIT"}), 429
        return jsonify({"error": msg}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500