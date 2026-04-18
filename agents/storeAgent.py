
import json
import uuid
import datetime
import subprocess

from .shared import (
    push_log,
    call_openrouter,
    OPENROUTER_KEY,
    MONGO_URI, MONGO_DB, MONGO_COLL, MCP_BIN,
)

# ── Tool definition given to the LLM ─────────────────────────────────────
_INSERT_TOOL = {
    "type": "function",
    "function": {
        "name": "insert_document",
        "description": (
            "Insert a document into a MongoDB collection via the MCP server. "
            "Use this to persist the validated terminal block data."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "database":   {"type": "string", "description": "MongoDB database name"},
                "collection": {"type": "string", "description": "MongoDB collection name"},
                "document":   {"type": "object", "description": "The document to insert"},
            },
            "required": ["database", "collection", "document"],
        },
    },
}

_SYSTEM_PROMPT = (
    "You are a database storage agent. You will receive a document that must be "
    "persisted to MongoDB. You MUST call the insert_document tool to store it. "
    "Do not summarise or explain — just call the tool immediately."
)


# ── MCP stdio transport ───────────────────────────────────────────────────

def _spawn_mcp() -> subprocess.Popen:
    """Spawn mongodb-mcp-server, trying binary then npx (with shell on Windows)."""
    kwargs = dict(
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    for cmd, shell in [
        ([MCP_BIN, "--connectionString", MONGO_URI], False),
        (["npx", "-y", "mongodb-mcp-server", "--connectionString", MONGO_URI], True),
        (["npx", "-y", "mongodb-mcp-server", "--connectionString", MONGO_URI], False),
    ]:
        try:
            return subprocess.Popen(cmd, shell=shell, **kwargs)
        except FileNotFoundError:
            continue
    raise RuntimeError(
        "mongodb-mcp-server not found. Run: npm install -g mongodb-mcp-server"
    )


def _mcp_stdio_insert(document: dict, database: str, collection: str) -> dict:
    """
    Spawn mongodb-mcp-server, discover available tools via tools/list,
    then call the correct insert tool (name varies by MCP server version).

    Tool name candidates (tried in order of preference):
      insert-many  — official MongoDB MCP server (mongodb-js/mongodb-mcp-server)
      insert-one   — older/alternative builds
      insertOne    — community MCP servers (1RB/mongo-mcp, ryaker/mongodb-mcp-server)
    """
    proc = _spawn_mcp()

    def send(msg: dict) -> None:
        proc.stdin.write(json.dumps(msg) + "\n")
        proc.stdin.flush()

    def recv_for_id(expected_id) -> dict:
        """Skip notifications; return only the message matching expected_id."""
        while True:
            line = proc.stdout.readline()
            if not line:
                stderr_tail = ""
                try:
                    stderr_tail = proc.stderr.read(500)
                except Exception:
                    pass
                raise RuntimeError(
                    f"MCP server closed stdout unexpectedly. stderr: {stderr_tail}"
                )
            line = line.strip()
            if not line:
                continue
            try:
                msg = json.loads(line)
            except json.JSONDecodeError:
                continue  # skip startup banners / non-JSON lines
            if msg.get("id") is None:
                continue  # notification — skip
            if str(msg.get("id")) != str(expected_id):
                continue  # different request — skip
            return msg

    try:
        # 1. Initialize handshake
        send({
            "jsonrpc": "2.0", "id": 1, "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "a2a-flask-storeAgent", "version": "1.0"},
            },
        })
        recv_for_id(1)

        # 2. Initialized notification (no response)
        send({"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}})

        # 3. Discover available tools
        send({"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}})
        tools_resp = recv_for_id(2)
        available_tools = {
            t["name"] for t in tools_resp.get("result", {}).get("tools", [])
        }

        # 4. Pick the correct insert tool and build arguments accordingly
        #    insert-many  → documents: [doc]   (official MongoDB MCP server)
        #    insert-one   → document:  doc     (older builds)
        #    insertOne    → document:  doc     (community servers)
        INSERT_CANDIDATES = [
            ("insert-many", {"database": database, "collection": collection, "documents": [document]}),
            ("insert-one",  {"database": database, "collection": collection, "document": document}),
            ("insertOne",   {"collection": collection, "document": document}),
        ]

        chosen_tool = None
        chosen_args = None
        for name, args in INSERT_CANDIDATES:
            if name in available_tools:
                chosen_tool = name
                chosen_args = args
                break

        if chosen_tool is None:
            raise RuntimeError(
                f"No insert tool found in MCP server. "
                f"Available tools: {sorted(available_tools)}"
            )

        # 5. Call the chosen tool
        call_id = str(uuid.uuid4())
        send({
            "jsonrpc": "2.0", "id": call_id,
            "method": "tools/call",
            "params": {"name": chosen_tool, "arguments": chosen_args},
        })
        result = recv_for_id(call_id)

        if "error" in result:
            raise RuntimeError(f"MCP tool error: {result['error']}")

        return {"tool_used": chosen_tool, **result.get("result", {})}

    finally:
        try:
            proc.stdin.close()
        except Exception:
            pass
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except Exception:
            proc.kill()


def _parse_inserted_id(mcp_result: dict) -> str:
    """
    Extract the insertedId from an MCP tools/call result.
    Handles multiple response shapes:
      - insert-many  → insertedIds: {"0": "..."} or insertedCount + first id
      - insert-one   → insertedId: "..."
      - insertOne    → insertedId: "..."
    """
    if not mcp_result:
        return "unknown"

    # Direct top-level keys (some versions)
    if "insertedId" in mcp_result:
        return str(mcp_result["insertedId"])
    if "insertedIds" in mcp_result:
        ids = mcp_result["insertedIds"]
        if isinstance(ids, dict):
            return str(next(iter(ids.values()), "unknown"))
        if isinstance(ids, list) and ids:
            return str(ids[0])

    # Content blocks (most common — text JSON inside content array)
    for block in mcp_result.get("content", []):
        text = block.get("text", "") if isinstance(block, dict) else str(block)
        if not text:
            continue
        try:
            inner = json.loads(text)
            if isinstance(inner, dict):
                # insert-one / insertOne shape
                for key in ("insertedId", "_id", "id"):
                    if key in inner:
                        return str(inner[key])
                # insert-many shape
                if "insertedIds" in inner:
                    ids = inner["insertedIds"]
                    if isinstance(ids, dict):
                        return str(next(iter(ids.values()), "unknown"))
                    if isinstance(ids, list) and ids:
                        return str(ids[0])
                return str(inner)[:120]
            return str(inner)[:120]
        except Exception:
            return text.strip()[:120]

    if isinstance(mcp_result, str):
        return mcp_result[:120]

    return str(mcp_result)[:120]


# ── Public entry point ────────────────────────────────────────────────────

def run(run_id: str, data: dict) -> dict:
    """
    LLM-agent loop: OpenRouter decides to call insert_document,
    Flask executes it via MCP stdio, result fed back to LLM for confirmation.
    """
    push_log(run_id, "STORE AGENT: OpenRouter LLM Agent + MongoDB MCP", "agent")
    push_log(run_id, "Model: openrouter/free | MCP transport: stdio")

    has_error = "validation_error" in data
    now       = datetime.datetime.utcnow().isoformat() + "Z"

    # -- Build document ----------------------------------------------------
    if has_error:
        push_log(run_id, f"Error indicator from ValidateAgent: {data['validation_error']}", "error")
        push_log(run_id, "Instructing LLM agent to store failure record...", "warn")
        doc = {
            "pipeline_status":       "failed",
            "validation_error":      data["validation_error"],
            "reference":             data.get("reference", "unknown"),
            "raw_terminals":         data.get("terminals", []),
            "corrections_attempted": data.get("corrections", []),
            "created_at":            now,
            "source":                "a2a_pipeline_final",
            "version":               "4.0",
        }
    else:
        push_log(run_id, "Valid data received - instructing LLM agent to store document...")
        doc = {
            "pipeline_status": "success",
            "reference":       data["reference"],
            "terminals":       data["terminals"],
            "total_ports":     sum(len(t.get("ports", [])) for t in data.get("terminals", [])),
            "corrections":     data.get("corrections", []),
            "created_at":      now,
            "source":          "a2a_pipeline_final",
            "version":         "4.0",
        }

    user_msg = (
        f"Store the following document in the '{MONGO_DB}' database, "
        f"'{MONGO_COLL}' collection:\n\n{json.dumps(doc, indent=2)}"
    )

    # ── Step 1: LLM decides to call insert_document ───────────────────────
    push_log(run_id, "Step 1 — Sending document to LLM with MCP tool definition…")

    choice1 = call_openrouter(
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user",   "content": user_msg},
        ],
        run_id=run_id,
        label="StoreAgent/decide",
        max_tokens=1024,
        temperature=0,
        tools=[_INSERT_TOOL],
        tool_choice="required",
    )

    finish     = choice1.get("finish_reason", "")
    tool_calls = choice1.get("message", {}).get("tool_calls", [])
    push_log(run_id, f"LLM responded — finish_reason: {finish} | tool_calls: {len(tool_calls)}")

    if not tool_calls:
        raise RuntimeError(
            f"LLM did not call insert_document — finish={finish}, "
            f"content={choice1.get('message',{}).get('content','')[:200]}"
        )

    tc      = tool_calls[0]
    tc_id   = tc.get("id", "tc_0")
    tc_name = tc["function"]["name"]
    tc_args = json.loads(tc["function"]["arguments"])

    push_log(run_id, f"Step 2 — LLM called: {tc_name}({list(tc_args.keys())})", "success")
    push_log(run_id, "Spawning mongodb-mcp-server (stdio) → insert-one…")

    # ── Step 2: Execute via MCP stdio ─────────────────────────────────────
    mcp_result  = _mcp_stdio_insert(
        document   = tc_args.get("document",   doc),
        database   = tc_args.get("database",   MONGO_DB),
        collection = tc_args.get("collection", MONGO_COLL),
    )
    push_log(run_id, f"Tool used: {mcp_result.get('tool_used', '?')} | raw: {str(mcp_result)[:200]}")
    inserted_id = _parse_inserted_id(mcp_result)
    push_log(run_id, f"MCP insert succeeded: _id={inserted_id}", "success")

    # ── Step 3: Feed result back to LLM for confirmation ──────────────────
    push_log(run_id, "Step 3 — Returning MCP result to LLM for confirmation…")

    choice2 = call_openrouter(
        messages=[
            {"role": "system",    "content": _SYSTEM_PROMPT},
            {"role": "user",      "content": user_msg},
            {"role": "assistant", "content": None, "tool_calls": tool_calls},
            {
                "role":         "tool",
                "tool_call_id": tc_id,
                "content":      json.dumps({"insertedId": inserted_id, "status": "success"}),
            },
        ],
        run_id=run_id,
        label="StoreAgent/confirm",
        max_tokens=256,
        temperature=0,
    )
    confirmation = choice2.get("message", {}).get("content", "")
    if confirmation:
        push_log(run_id, f"LLM confirmation: {confirmation[:200]}", "success")

    push_log(run_id, f"Collection: {MONGO_DB}.{MONGO_COLL} | Timestamp: {now}")

    return {
        "insertedId":       inserted_id,
        "database":         MONGO_DB,
        "collection":       MONGO_COLL,
        "timestamp":        now,
        "pipeline_status":  "failed" if has_error else "success",
        "reference":        data.get("reference", ""),
        "terminals":        len(data.get("terminals", [])),
        "total_ports":      doc.get("total_ports", 0),
        "terminals_data":   data.get("terminals", []),
        "corrections":      data.get("corrections", []),
        "validation_error": data.get("validation_error"),
        "mcp_transport":    "stdio",
        "llm_tool_call":    tc_name,
    }