
import json
import os
import uuid
import queue
import datetime
import threading

import requests as req_lib
from dotenv import load_dotenv

load_dotenv()

# -- Config ----------------------------------------------------------------
OPENROUTER_KEY = os.getenv("OPENROUTER_KEY")
GEMINI_KEY     = os.getenv("GEMINI_KEY")
MONGO_URI      = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB       = os.getenv("MONGO_DB", "cable_db")
MONGO_COLL     = os.getenv("MONGO_COLL", "terminals")
HISTORY_COLL   = os.getenv("HISTORY_COLL", "user_history")
MCP_BIN        = os.getenv("MCP_BIN", "mongodb-mcp-server")

# -- MCP Tool Registry (Shared Tool Dispatch) ------------------------------

class MCPToolRegistry:
    def __init__(self):
        self.tools = {}

    def register(self, name, func):
        self.tools[name] = func

    def call(self, name, *args, **kwargs):
        if name not in self.tools:
            raise ValueError(f"Tool {name} not found")
        return self.tools[name](*args, **kwargs)

mcp_registry = MCPToolRegistry()

# -- Latency & Cost Instrumentation ---------------------------------------

class MetricsTracker:
    def __init__(self):
        self.start_times = {}
        self.metrics = {}
        self.costs = 0.0

    def start_timer(self, run_id, label):
        self.start_times[(run_id, label)] = datetime.datetime.now()

    def stop_timer(self, run_id, label):
        start_time = self.start_times.pop((run_id, label), None)
        if start_time:
            elapsed = (datetime.datetime.now() - start_time).total_seconds()
            if run_id not in self.metrics:
                self.metrics[run_id] = []
            self.metrics[run_id].append({"label": label, "elapsed": elapsed})
            return elapsed
        return 0

    def add_cost(self, cost):
        self.costs += cost

    def get_metrics(self, run_id):
        return self.metrics.get(run_id, [])

    def get_total_cost(self):
        return self.costs

metrics_tracker = MetricsTracker()

# -- In-memory run store ---------------------------------------------------
_runs: dict     = {}
_runs_lock      = threading.Lock()
 
 
def create_run() -> str:
    rid = str(uuid.uuid4())
    with _runs_lock:
        _runs[rid] = {
            "status":    "running",
            "log_queue": queue.Queue(),
            "result":    None,
        }
    return rid
 
 
def push_log(run_id: str, msg: str, level: str = "info") -> None:
    ts = datetime.datetime.utcnow().strftime("%H:%M:%S")
    with _runs_lock:
        if run_id in _runs:
            _runs[run_id]["log_queue"].put({"ts": ts, "msg": msg, "level": level})
 
 
def finish_run(run_id: str, status: str, result=None) -> None:
    with _runs_lock:
        if run_id in _runs:
            _runs[run_id]["status"] = status
            _runs[run_id]["result"] = result
            _runs[run_id]["log_queue"].put(None)   # SSE sentinel
 
 
def get_run(run_id: str) -> dict | None:
    with _runs_lock:
        return _runs.get(run_id)
 
 
# -- Shared API callers ----------------------------------------------------
 
def call_gemini(prompt_parts: list, run_id: str, label: str, _retry: int = 0) -> str:
    """
    Call Gemini 2.5 Flash with the given content parts list.
    Returns the raw response text (JSON fences stripped).
    
    NO AUTO-RETRY - Fails immediately on rate limit.
    """
    if not GEMINI_KEY:
        raise RuntimeError("GEMINI_API_KEY not set in .env")
 
    url = (
        "https://generativelanguage.googleapis.com/v1beta"
        f"/models/gemini-2.5-flash:generateContent?key={GEMINI_KEY}"
    )
    payload = {
        "contents": [{"parts": prompt_parts}],
        "generationConfig": {
            "temperature":      0.1,
            "maxOutputTokens":  4096,
            # Disable Gemini 2.5 "thinking" mode — otherwise it spends all tokens
            # on internal reasoning and returns an empty response.
            "thinkingConfig":   {"thinkingBudget": 0},
        },
    }
    push_log(run_id, f"Calling Gemini 2.5 Flash ({label})...")
    try:
        r = req_lib.post(url, json=payload, timeout=90)
    except req_lib.RequestException as e:
        raise RuntimeError(f"Gemini ({label}) network error: {e}")

    metrics_tracker.add_cost(0.0001)

    if not r.ok:
        try:
            err = r.json().get("error", {}).get("message", r.text)
        except Exception:
            err = r.text[:300]
        
        if r.status_code == 429:
            raise RuntimeError(f"Gemini ({label}) rate limit exceeded - please wait and try again. {err}")
        raise RuntimeError(f"Gemini ({label}) {r.status_code}: {err}")

    j = r.json()
    candidates = j.get("candidates") or []
    if not candidates:
        raise RuntimeError(f"Gemini ({label}) returned no candidates: {str(j)[:300]}")
    content = candidates[0].get("content") or {}
    parts   = content.get("parts") or []
    if not parts or "text" not in parts[0]:
        # Block reason or empty response
        finish = candidates[0].get("finishReason", "?")
        raise RuntimeError(f"Gemini ({label}) empty response (finish={finish})")
    raw = parts[0]["text"]
    return raw.replace("```json", "").replace("```", "").strip()
 
 
_OPENROUTER_MODEL = "openai/gpt-oss-120b:free"


def call_openrouter(
    messages: list,
    run_id: str,
    label: str,
    *,
    max_tokens: int = 4096,
    temperature: float = 0.1,
    tools: list | None = None,
    tool_choice: str | None = None,
    _retry: int = 0,
) -> dict:
    """
    Call OpenRouter (Llama 3.3 70B free).
    Returns the full first choice dict (OpenAI-compatible) so callers can
    inspect finish_reason, tool_calls, and content.

    On 429 rate-limit, automatically retries up to 2 times with backoff.
    """
    if not OPENROUTER_KEY:
        raise RuntimeError("OPENROUTER_KEY not set in .env")

    push_log(run_id, f"Calling OpenRouter ({_OPENROUTER_MODEL}) for {label}...")

    body: dict = {
        "model":       _OPENROUTER_MODEL,
        "temperature": temperature,
        "max_tokens":  max_tokens,
        "messages":    messages,
    }
    if tools:
        body["tools"]       = tools
        body["tool_choice"] = tool_choice or "auto"

    safe_label = label.encode("ascii", errors="ignore").decode("ascii")
    headers = {
        "Authorization": f"Bearer {OPENROUTER_KEY}",
        "Content-Type":  "application/json; charset=utf-8",
        "HTTP-Referer":  "https://sbt-vision.local",
        "X-Title":       f"SBT Cable Pipeline - {safe_label}",
    }

    try:
        r = req_lib.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
            timeout=60,
        )
    except req_lib.RequestException as e:
        raise RuntimeError(f"OpenRouter ({label}) network error: {e}")

    metrics_tracker.add_cost(0.0001)

    # ---- Auto-retry on rate limit (free tier) ----
    def _is_rate_limit() -> bool:
        if r.status_code == 429:
            return True
        try:
            j = r.json()
        except Exception:
            return False
        if "error" in j:
            err = j["error"]
            return err.get("code") == 429 or "rate" in str(err.get("message", "")).lower()
        return False

    if _is_rate_limit() and _retry < 2:
        import time
        wait = 4 * (_retry + 1)
        push_log(run_id, f"OpenRouter rate-limited, retrying in {wait}s...", "warn")
        time.sleep(wait)
        return call_openrouter(
            messages, run_id, label,
            max_tokens=max_tokens, temperature=temperature,
            tools=tools, tool_choice=tool_choice, _retry=_retry + 1,
        )

    if r.status_code == 429:
        raise RuntimeError(f"OpenRouter rate limit ({label}) -- retry later")
    if not r.ok:
        raise RuntimeError(f"OpenRouter ({label}) {r.status_code}: {r.text[:200]}")

    payload = r.json()

    if "error" in payload:
        err  = payload["error"]
        code = err.get("code", "")
        msg  = err.get("message", str(err))[:300]
        raise RuntimeError(f"OpenRouter ({label}) provider error {code}: {msg}")

    if not payload.get("choices"):
        raise RuntimeError(
            f"OpenRouter ({label}) returned no choices. "
            f"Full response: {str(payload)[:400]}"
        )

    return payload["choices"][0]