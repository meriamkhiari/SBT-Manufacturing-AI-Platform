
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
 
def call_gemini(prompt_parts: list, run_id: str, label: str) -> str:
    """
    Call Gemini 2.5 Flash with the given content parts list.
    Returns the raw response text (JSON fences stripped).
    """
    if not GEMINI_KEY:
        raise RuntimeError("GEMINI_API_KEY not set in .env")
 
    url = (
        "https://generativelanguage.googleapis.com/v1beta"
        f"/models/gemini-2.5-flash:generateContent?key={GEMINI_KEY}"
    )
    payload = {
        "contents": [{"parts": prompt_parts}],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 4096},
    }
    push_log(run_id, f"Calling Gemini 2.5 Flash ({label})…")
    r = req_lib.post(url, json=payload, timeout=90)
    
    # Simple cost estimation: $0.0001 per call (placeholder)
    metrics_tracker.add_cost(0.0001)

    if not r.ok:
        err = r.json().get("error", {}).get("message", r.text)
        raise RuntimeError(f"Gemini ({label}) {r.status_code}: {err}")
    raw = r.json()["candidates"][0]["content"]["parts"][0]["text"]
    return raw.replace("```json", "").replace("```", "").strip()
 
 
def call_openrouter(
    messages: list,
    run_id: str,
    label: str,
    *,
    max_tokens: int = 4096,
    temperature: float = 0.1,
    tools: list | None = None,
    tool_choice: str | None = None,
) -> dict:
    """
    Call OpenRouter free model.
    Returns the full first choice dict so callers can inspect
    finish_reason, tool_calls, and content.
    """
    if not OPENROUTER_KEY:
        raise RuntimeError("OPENROUTER_API_KEY not set in .env")
 
    push_log(run_id, f"Calling OpenRouter free model ({label})…")
 
    body: dict = {
        "model":       "openrouter/free",
        "temperature": temperature,
        "max_tokens":  max_tokens,
        "messages":    messages,
    }
    if tools:
        body["tools"]       = tools
        body["tool_choice"] = tool_choice or "auto"
 
    # Serialize body as UTF-8 bytes explicitly to avoid latin-1 codec errors
    # when prompts contain non-ASCII characters (em dashes, accents, etc.).
    # HTTP headers must be ASCII-safe, so non-ASCII is stripped from X-Title.
    safe_label = label.encode("ascii", errors="ignore").decode("ascii")
 
    r = req_lib.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENROUTER_KEY}",
            "Content-Type":  "application/json; charset=utf-8",
            "HTTP-Referer":  "https://example.com",
            "X-Title":       f"A2A Cable Pipeline - {safe_label}",
        },
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        timeout=60,
    )
    
    # Simple cost estimation: $0.0001 per call (placeholder)
    metrics_tracker.add_cost(0.0001)

    if r.status_code == 429:
        raise RuntimeError(f"OpenRouter rate limit ({label}) -- retry later")
    if not r.ok:
        raise RuntimeError(f"OpenRouter ({label}) {r.status_code}: {r.text[:200]}")
 
    payload = r.json()
 
    # OpenRouter may return HTTP 200 with an error body instead of choices,
    # e.g. {"error": {"code": 429, "message": "..."}} on provider-level failures.
    if "error" in payload:
        err  = payload["error"]
        code = err.get("code", "")
        msg  = err.get("message", str(err))[:300]
        if code == 429 or "rate" in str(msg).lower():
            raise RuntimeError(f"OpenRouter rate limit ({label}) -- retry later")
        raise RuntimeError(f"OpenRouter ({label}) provider error {code}: {msg}")
 
    if not payload.get("choices"):
        raise RuntimeError(
            f"OpenRouter ({label}) returned no choices. "
            f"Full response: {str(payload)[:400]}"
        )
 
    return payload["choices"][0]