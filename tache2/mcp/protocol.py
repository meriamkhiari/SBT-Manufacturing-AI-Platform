"""
MCP (Model Context Protocol) — Simulation complète v2.0
Implémente:
  - Tool Registry (outils exposés par chaque agent)
  - Resource Manager (contexte partagé typé par URI)
  - Capability Discovery (agents annoncent leurs capacités)
  - A2A Task Cards (handoff formel entre agents avec état)
  - Message Bus avec hooks et observabilité complète
"""

import uuid
import time
import asyncio
from typing import Any, Callable, Optional
from dataclasses import dataclass, field
from enum import Enum


# ══════════════════════════════════════════════════════════════════════════════
# Enums
# ══════════════════════════════════════════════════════════════════════════════

class AgentRole(str, Enum):
    PREPROCESSOR = "preprocessor"
    VISION       = "vision"
    VALIDATOR    = "validator"
    SEVERITY     = "severity"
    REPORTER     = "reporter"
    ORCHESTRATOR = "orchestrator"


class MessageType(str, Enum):
    REQUEST     = "request"
    RESPONSE    = "response"
    ERROR       = "error"
    BROADCAST   = "broadcast"
    HANDOFF     = "handoff"
    TOOL_CALL   = "tool_call"
    TOOL_RESULT = "tool_result"
    CAPABILITY  = "capability"


class TaskStatus(str, Enum):
    PENDING   = "pending"
    RUNNING   = "running"
    COMPLETED = "completed"
    FAILED    = "failed"


# ══════════════════════════════════════════════════════════════════════════════
# MCP Tool & Resource
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class MCPTool:
    name: str
    description: str
    input_schema: dict
    owner: AgentRole
    calls: int   = 0
    total_ms: float = 0.0

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "inputSchema": self.input_schema,
            "owner": self.owner.value,
            "stats": {"calls": self.calls, "avg_ms": round(self.total_ms / max(self.calls, 1), 1)},
        }


@dataclass
class MCPResource:
    uri: str
    name: str
    mime_type: str
    content: Any
    created_by: AgentRole
    created_at: float = field(default_factory=time.time)

    def to_dict(self) -> dict:
        return {
            "uri": self.uri,
            "name": self.name,
            "mimeType": self.mime_type,
            "createdBy": self.created_by.value,
            "createdAt": self.created_at,
        }


# ══════════════════════════════════════════════════════════════════════════════
# A2A Task Cards
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class A2ATask:
    """Task Card A2A — unité de travail handoffée entre agents (Google A2A spec)."""
    id: str               = field(default_factory=lambda: str(uuid.uuid4())[:12])
    pipeline_id: str      = ""
    from_agent: AgentRole = AgentRole.ORCHESTRATOR
    to_agent: AgentRole   = AgentRole.PREPROCESSOR
    status: TaskStatus    = TaskStatus.PENDING
    created_at: float     = field(default_factory=time.time)
    started_at: float     = 0.0
    completed_at: float   = 0.0
    input_refs: list      = field(default_factory=list)
    output_refs: list     = field(default_factory=list)
    metadata: dict        = field(default_factory=dict)
    error: str            = ""

    def start(self):
        self.status = TaskStatus.RUNNING
        self.started_at = time.time()

    def complete(self, output_refs=None):
        self.status = TaskStatus.COMPLETED
        self.completed_at = time.time()
        if output_refs:
            self.output_refs = output_refs

    def fail(self, error: str):
        self.status = TaskStatus.FAILED
        self.completed_at = time.time()
        self.error = error

    def duration_ms(self) -> float:
        if self.completed_at and self.started_at:
            return round((self.completed_at - self.started_at) * 1000, 1)
        return 0.0

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "pipeline_id": self.pipeline_id,
            "from": self.from_agent.value,
            "to": self.to_agent.value,
            "status": self.status.value,
            "duration_ms": self.duration_ms(),
            "input_refs": self.input_refs,
            "output_refs": self.output_refs,
            "metadata": self.metadata,
            "error": self.error,
        }


# ══════════════════════════════════════════════════════════════════════════════
# MCP Message
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class MCPMessage:
    id: str              = field(default_factory=lambda: str(uuid.uuid4())[:8])
    type: MessageType    = MessageType.REQUEST
    sender: AgentRole    = AgentRole.ORCHESTRATOR
    recipient: AgentRole = AgentRole.ORCHESTRATOR
    correlation_id: str  = field(default_factory=lambda: str(uuid.uuid4())[:12])
    timestamp: float     = field(default_factory=time.time)
    payload: dict        = field(default_factory=dict)
    metadata: dict       = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "type": self.type.value,
            "sender": self.sender.value,
            "recipient": self.recipient.value,
            "correlation_id": self.correlation_id,
            "timestamp": self.timestamp,
            "payload": self.payload,
            "metadata": self.metadata,
        }


# ══════════════════════════════════════════════════════════════════════════════
# Agent Context
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class AgentContext:
    pipeline_id: str           = field(default_factory=lambda: str(uuid.uuid4())[:12])
    image_b64: str             = ""
    image_mime: str            = "image/jpeg"
    image_filename: str        = ""
    user_context: str          = ""
    preprocessing_result: dict = field(default_factory=dict)
    vision_result: dict        = field(default_factory=dict)
    validation_result: dict    = field(default_factory=dict)
    severity_result: dict      = field(default_factory=dict)
    final_report: dict         = field(default_factory=dict)
    xai_result: dict           = field(default_factory=dict)
    agent_logs: list           = field(default_factory=list)
    errors: list               = field(default_factory=list)
    start_time: float          = field(default_factory=time.time)
    a2a_tasks: list            = field(default_factory=list)

    def log(self, agent: AgentRole, message: str, level: str = "info"):
        self.agent_logs.append({
            "agent":      agent.value,
            "message":    message,
            "level":      level,
            "elapsed_ms": round((time.time() - self.start_time) * 1000, 1),
        })

    def elapsed_ms(self) -> float:
        return round((time.time() - self.start_time) * 1000, 1)


# ══════════════════════════════════════════════════════════════════════════════
# MCP Broker
# ══════════════════════════════════════════════════════════════════════════════

class MCPBroker:
    """
    Broker MCP complet:
    - Tool registry (outils exposés par chaque agent)
    - Resource manager (ressources partagées par URI)
    - Capability discovery (agent cards)
    - A2A task tracking (handoff lifecycle)
    - Message bus avec hooks
    """

    def __init__(self):
        self._agents: dict       = {}   # AgentRole -> agent
        self._tools: dict        = {}   # tool_name -> MCPTool
        self._resources: dict    = {}   # uri -> MCPResource
        self._capabilities: dict = {}   # AgentRole -> dict
        self._message_log: list  = []
        self._task_log: list     = []   # list[A2ATask]
        self._hooks: list        = []

    # ── Registration ──────────────────────────────────────────────────────────

    def register(self, role: AgentRole, agent: Any):
        self._agents[role] = agent
        if hasattr(agent, "capabilities"):
            self._capabilities[role] = agent.capabilities()
        if hasattr(agent, "mcp_tools"):
            for tool in agent.mcp_tools():
                self._tools[tool.name] = tool
        tool_names = [t.name for t in (agent.mcp_tools() if hasattr(agent, "mcp_tools") else [])]
        print(f"[MCP] ✓ {role.value} | tools: {tool_names}")

    def add_hook(self, fn: Callable):
        self._hooks.append(fn)

    # ── Tool System ───────────────────────────────────────────────────────────

    async def call_tool(self, tool_name: str, input_data: dict, caller: AgentRole) -> dict:
        tool = self._tools.get(tool_name)
        if not tool:
            return {"error": f"Tool '{tool_name}' not found"}
        t0 = time.time()
        agent = self._agents.get(tool.owner)
        result = {}
        if agent and hasattr(agent, f"tool_{tool_name}"):
            fn = getattr(agent, f"tool_{tool_name}")
            result = await fn(input_data)
        else:
            result = {"error": f"Handler 'tool_{tool_name}' not implemented"}
        elapsed = (time.time() - t0) * 1000
        tool.calls += 1
        tool.total_ms += elapsed
        self._message_log.append({
            "type": "tool_call", "tool": tool_name,
            "caller": caller.value, "owner": tool.owner.value,
            "elapsed_ms": round(elapsed, 1),
        })
        return result

    # ── Resource Manager ─────────────────────────────────────────────────────

    def publish_resource(self, resource: MCPResource):
        self._resources[resource.uri] = resource

    def get_resource(self, uri: str) -> Optional[MCPResource]:
        return self._resources.get(uri)

    def list_resources(self) -> list:
        return [r.to_dict() for r in self._resources.values()]

    # ── A2A Tasks ─────────────────────────────────────────────────────────────

    def create_task(self, from_agent: AgentRole, to_agent: AgentRole,
                    pipeline_id: str, input_refs=None, metadata=None) -> A2ATask:
        task = A2ATask(
            pipeline_id=pipeline_id,
            from_agent=from_agent,
            to_agent=to_agent,
            input_refs=input_refs or [],
            metadata=metadata or {},
        )
        self._task_log.append(task)
        self._message_log.append({
            "type": "handoff", "task_id": task.id,
            "from": from_agent.value, "to": to_agent.value, "status": "pending",
        })
        return task

    def get_task_log(self) -> list:
        return [t.to_dict() for t in self._task_log]

    # ── Message Bus ───────────────────────────────────────────────────────────

    async def send(self, msg: MCPMessage) -> Optional[MCPMessage]:
        self._message_log.append(msg.to_dict())
        for hook in self._hooks:
            try:
                hook(msg)
            except Exception:
                pass
        agent = self._agents.get(msg.recipient)
        if agent is None:
            return MCPMessage(
                type=MessageType.ERROR,
                sender=AgentRole.ORCHESTRATOR,
                recipient=msg.sender,
                correlation_id=msg.correlation_id,
                payload={"error": f"Agent '{msg.recipient}' not registered"},
            )
        if hasattr(agent, "handle"):
            return await agent.handle(msg)
        return None

    async def broadcast(self, payload: dict, sender: AgentRole = AgentRole.ORCHESTRATOR):
        msg = MCPMessage(type=MessageType.BROADCAST, sender=sender,
                         recipient=AgentRole.ORCHESTRATOR, payload=payload)
        results = []
        for role, agent in self._agents.items():
            if role == sender:
                continue
            msg.recipient = role
            if hasattr(agent, "handle"):
                r = await agent.handle(msg)
                if r:
                    results.append(r)
        return results

    # ── Introspection ─────────────────────────────────────────────────────────

    def get_message_log(self):  return list(self._message_log)
    def agent_list(self):       return [r.value for r in self._agents]
    def list_tools(self):       return [t.to_dict() for t in self._tools.values()]
    def list_capabilities(self): return {r.value: c for r, c in self._capabilities.items()}

    def get_stats(self) -> dict:
        return {
            "agents": len(self._agents),
            "tools": len(self._tools),
            "resources": len(self._resources),
            "messages": len(self._message_log),
            "tasks": len(self._task_log),
        }


# Singleton broker partagé
broker = MCPBroker()
