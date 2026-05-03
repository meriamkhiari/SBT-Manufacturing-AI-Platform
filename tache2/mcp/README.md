# 🔗 MCP (Model Context Protocol) — Documentation

## Vue d'ensemble

Le **Model Context Protocol (MCP)** est le protocole de communication entre les agents A2A de QualityVision.

**Fichier principal** : `protocol.py`

## Composants MCP

### 1. Enums

#### AgentRole
Rôles des agents dans le système :
```python
class AgentRole(str, Enum):
    PREPROCESSOR = "preprocessor"
    VISION       = "vision"
    VALIDATOR    = "validator"
    SEVERITY     = "severity"
    REPORTER     = "reporter"
    ORCHESTRATOR = "orchestrator"
```

#### MessageType
Types de messages échangés :
```python
class MessageType(str, Enum):
    REQUEST     = "request"
    RESPONSE    = "response"
    ERROR       = "error"
    BROADCAST   = "broadcast"
    HANDOFF     = "handoff"
    TOOL_CALL   = "tool_call"
    TOOL_RESULT = "tool_result"
    CAPABILITY  = "capability"
```

#### TaskStatus
États des tâches A2A :
```python
class TaskStatus(str, Enum):
    PENDING   = "pending"
    RUNNING   = "running"
    COMPLETED = "completed"
    FAILED    = "failed"
```

### 2. MCPTool

Représente un outil exposé par un agent.

```python
@dataclass
class MCPTool:
    name: str                # Nom de l'outil
    description: str         # Description
    input_schema: dict       # Schéma JSON des inputs
    owner: AgentRole         # Agent propriétaire
    calls: int = 0           # Nombre d'appels
    total_ms: float = 0.0    # Temps total d'exécution
```

**Exemple** :
```python
tool = MCPTool(
    name="detect_defects",
    description="Détecte les défauts via Claude Vision",
    input_schema={
        "type": "object",
        "properties": {
            "image_meta_uri": {"type": "string"},
            "user_context": {"type": "string"}
        },
        "required": ["image_meta_uri"]
    },
    owner=AgentRole.VISION
)
```

### 3. MCPResource

Représente une ressource partagée entre agents.

```python
@dataclass
class MCPResource:
    uri: str                 # URI unique (ex: qv://pipeline_id/resource_name)
    name: str                # Nom de la ressource
    mime_type: str           # Type MIME
    content: Any             # Contenu (dict, list, etc.)
    created_by: AgentRole    # Agent créateur
    created_at: float        # Timestamp de création
```

**Exemple** :
```python
resource = MCPResource(
    uri="qv://abc123/detections",
    name="detections",
    mime_type="application/json",
    content={"detections": [...]},
    created_by=AgentRole.VISION,
    created_at=time.time()
)
```

### 4. A2ATask

Représente une tâche handoffée entre agents (Google A2A spec).

```python
@dataclass
class A2ATask:
    id: str                  # ID unique
    pipeline_id: str         # ID du pipeline
    from_agent: AgentRole    # Agent source
    to_agent: AgentRole      # Agent destination
    status: TaskStatus       # État actuel
    created_at: float        # Timestamp création
    started_at: float        # Timestamp démarrage
    completed_at: float      # Timestamp fin
    input_refs: list         # URIs des inputs
    output_refs: list        # URIs des outputs
    metadata: dict           # Métadonnées
    error: str               # Message d'erreur si échec
```

**Lifecycle** :
```python
task = broker.create_task(...)  # PENDING
task.start()                     # RUNNING
task.complete(output_refs=[...]) # COMPLETED
# ou
task.fail("error message")       # FAILED
```

### 5. MCPMessage

Représente un message échangé entre agents.

```python
@dataclass
class MCPMessage:
    id: str                  # ID unique
    type: MessageType        # Type de message
    sender: AgentRole        # Agent émetteur
    recipient: AgentRole     # Agent destinataire
    correlation_id: str      # ID de corrélation
    timestamp: float         # Timestamp
    payload: dict            # Contenu du message
    metadata: dict           # Métadonnées
```

**Exemple** :
```python
msg = MCPMessage(
    type=MessageType.REQUEST,
    sender=AgentRole.ORCHESTRATOR,
    recipient=AgentRole.VISION,
    payload={"action": "detect", "image_uri": "..."}
)
```

### 6. AgentContext

Contexte partagé entre tous les agents d'un pipeline.

```python
@dataclass
class AgentContext:
    pipeline_id: str                # ID unique du pipeline
    image_b64: str                  # Image en base64
    image_mime: str                 # Type MIME de l'image
    image_filename: str             # Nom du fichier
    user_context: str               # Contexte utilisateur
    preprocessing_result: dict      # Résultat PreprocessingAgent
    vision_result: dict             # Résultat VisionAgent
    validation_result: dict         # Résultat ValidationAgent
    severity_result: dict           # Résultat SeverityAgent
    final_report: dict              # Rapport final
    xai_result: dict                # Résultats XAI
    agent_logs: list                # Logs des agents
    errors: list                    # Erreurs
    start_time: float               # Timestamp de démarrage
    a2a_tasks: list                 # Liste des tâches A2A
```

**Méthodes** :
```python
ctx.log(agent, message, level="info")  # Ajouter un log
ctx.elapsed_ms()                        # Temps écoulé en ms
```

### 7. MCPBroker

Broker central qui gère tous les composants MCP.

```python
class MCPBroker:
    def __init__(self):
        self._agents: dict       = {}  # AgentRole -> agent
        self._tools: dict        = {}  # tool_name -> MCPTool
        self._resources: dict    = {}  # uri -> MCPResource
        self._capabilities: dict = {}  # AgentRole -> dict
        self._message_log: list  = []  # Historique des messages
        self._task_log: list     = []  # Historique des tâches
        self._hooks: list        = []  # Hooks d'observabilité
```

#### Registration

```python
# Enregistrer un agent
broker.register(role: AgentRole, agent: Any)

# Ajouter un hook
broker.add_hook(fn: Callable)
```

#### Tool System

```python
# Appeler un outil
result = await broker.call_tool(
    tool_name: str,
    input_data: dict,
    caller: AgentRole
)
```

#### Resource Manager

```python
# Publier une ressource
broker.publish_resource(resource: MCPResource)

# Récupérer une ressource
resource = broker.get_resource(uri: str)

# Lister toutes les ressources
resources = broker.list_resources()
```

#### A2A Tasks

```python
# Créer une tâche
task = broker.create_task(
    from_agent: AgentRole,
    to_agent: AgentRole,
    pipeline_id: str,
    input_refs: list = None,
    metadata: dict = None
)

# Récupérer l'historique des tâches
tasks = broker.get_task_log()
```

#### Message Bus

```python
# Envoyer un message
response = await broker.send(msg: MCPMessage)

# Broadcast à tous les agents
results = await broker.broadcast(
    payload: dict,
    sender: AgentRole = AgentRole.ORCHESTRATOR
)
```

#### Introspection

```python
# Liste des agents enregistrés
agents = broker.agent_list()

# Liste des outils
tools = broker.list_tools()

# Liste des capabilities
caps = broker.list_capabilities()

# Statistiques
stats = broker.get_stats()

# Historique des messages
messages = broker.get_message_log()
```

## Utilisation

### 1. Initialisation

```python
from mcp.protocol import broker, AgentRole
from agents import PreprocessingAgent, VisionAgent, ...

# Enregistrer les agents
broker.register(AgentRole.PREPROCESSOR, PreprocessingAgent())
broker.register(AgentRole.VISION, VisionAgent(api_key="..."))
broker.register(AgentRole.VALIDATOR, ValidationAgent())
broker.register(AgentRole.SEVERITY, SeverityAgent())
broker.register(AgentRole.REPORTER, ReportAgent())
```

### 2. Créer un Pipeline

```python
from mcp.protocol import AgentContext

ctx = AgentContext(
    image_b64="...",
    image_mime="image/jpeg",
    image_filename="test.jpg",
    user_context="Boîte électrique peinte"
)
```

### 3. Exécuter avec A2A Tasks

```python
# Task 1: ORCHESTRATOR → PREPROCESSOR
t1 = broker.create_task(
    AgentRole.ORCHESTRATOR,
    AgentRole.PREPROCESSOR,
    ctx.pipeline_id,
    input_refs=[f"qv://{ctx.pipeline_id}/raw_image"]
)
await preprocessing_agent.run(ctx, task=t1)

# Task 2: PREPROCESSOR → VISION
t2 = broker.create_task(
    AgentRole.PREPROCESSOR,
    AgentRole.VISION,
    ctx.pipeline_id,
    input_refs=[f"qv://{ctx.pipeline_id}/image_meta"]
)
await vision_agent.run(ctx, task=t2)

# ... autres tâches
```

### 4. Utiliser les MCP Tools

```python
# Appeler un outil via le broker
result = await broker.call_tool(
    "detect_defects",
    {
        "image_meta_uri": f"qv://{ctx.pipeline_id}/image_meta",
        "user_context": "Boîte électrique"
    },
    caller=AgentRole.ORCHESTRATOR
)
```

### 5. Publier et Récupérer des Ressources

```python
# Publier une ressource
broker.publish_resource(MCPResource(
    uri=f"qv://{ctx.pipeline_id}/detections",
    name="detections",
    mime_type="application/json",
    content={"detections": [...]},
    created_by=AgentRole.VISION
))

# Récupérer une ressource
resource = broker.get_resource(f"qv://{ctx.pipeline_id}/detections")
detections = resource.content
```

### 6. Envoyer des Messages

```python
# Message REQUEST
msg = MCPMessage(
    type=MessageType.REQUEST,
    sender=AgentRole.ORCHESTRATOR,
    recipient=AgentRole.VISION,
    payload={"action": "detect"}
)
response = await broker.send(msg)

# Broadcast
await broker.broadcast({
    "event": "pipeline_start",
    "pipeline_id": ctx.pipeline_id
})
```

### 7. Introspection

```python
# Statistiques du broker
stats = broker.get_stats()
print(f"Agents: {stats['agents']}")
print(f"Tools: {stats['tools']}")
print(f"Resources: {stats['resources']}")
print(f"Messages: {stats['messages']}")
print(f"Tasks: {stats['tasks']}")

# Historique des tâches
tasks = broker.get_task_log()
for task in tasks:
    print(f"{task['from']} → {task['to']}: {task['status']}")

# Historique des messages
messages = broker.get_message_log()
for msg in messages:
    print(f"{msg['type']}: {msg['sender']} → {msg['recipient']}")
```

## Patterns d'Utilisation

### Pattern 1 : Agent avec MCP Tool

```python
class MyAgent:
    role = AgentRole.MY_AGENT
    
    def mcp_tools(self) -> list:
        return [
            MCPTool(
                name="my_tool",
                description="Description",
                input_schema={...},
                owner=self.role
            )
        ]
    
    async def tool_my_tool(self, input_data: dict) -> dict:
        # Implémentation de l'outil
        return {"result": "..."}
    
    async def run(self, ctx: AgentContext, task=None):
        if task:
            task.start()
        
        # Traitement
        result = await self.process(ctx)
        
        # Publier ressource
        broker.publish_resource(MCPResource(...))
        
        if task:
            task.complete(output_refs=[...])
        
        return ctx
```

### Pattern 2 : Appel d'Outil Inter-Agents

```python
# Agent A appelle un outil de l'Agent B
result = await broker.call_tool(
    "agent_b_tool",
    {"param": "value"},
    caller=AgentRole.AGENT_A
)
```

### Pattern 3 : Ressources Chaînées

```python
# Agent A publie
broker.publish_resource(MCPResource(
    uri="qv://pipeline/step1",
    content={"data": "..."},
    created_by=AgentRole.AGENT_A
))

# Agent B lit
resource = broker.get_resource("qv://pipeline/step1")
data = resource.content

# Agent B publie
broker.publish_resource(MCPResource(
    uri="qv://pipeline/step2",
    content={"processed": data},
    created_by=AgentRole.AGENT_B
))
```

### Pattern 4 : A2A Task Lifecycle

```python
# Créer
task = broker.create_task(
    AgentRole.AGENT_A,
    AgentRole.AGENT_B,
    pipeline_id,
    input_refs=["qv://pipeline/input"],
    metadata={"priority": "high"}
)

# Démarrer
task.start()

# Traiter
try:
    result = await process()
    task.complete(output_refs=["qv://pipeline/output"])
except Exception as e:
    task.fail(str(e))

# Vérifier
print(f"Duration: {task.duration_ms()}ms")
print(f"Status: {task.status}")
```

## Singleton Broker

Le broker est un **singleton** partagé par toute l'application :

```python
from mcp.protocol import broker

# Même instance partout
broker.register(...)
broker.publish_resource(...)
```

## Observabilité

### Hooks

Ajouter des hooks pour observer les messages :

```python
def my_hook(msg: MCPMessage):
    print(f"Message: {msg.type} from {msg.sender}")

broker.add_hook(my_hook)
```

### Logs

Tous les messages et tâches sont loggés automatiquement :

```python
# Messages
messages = broker.get_message_log()

# Tâches
tasks = broker.get_task_log()
```

## Avantages MCP

1. ✅ **Découplage** : Agents indépendants
2. ✅ **Traçabilité** : Historique complet
3. ✅ **Réutilisabilité** : Tools partagés
4. ✅ **Observabilité** : Logs et stats
5. ✅ **Extensibilité** : Facile d'ajouter des agents
6. ✅ **Testabilité** : Agents testables individuellement
7. ✅ **Standardisation** : Protocole unifié

## Références

- **Google A2A** : Agent-to-Agent communication spec
- **MCP** : Model Context Protocol
- **SHAP** : SHapley Additive exPlanations

---

**Version** : 2.0  
**Agents** : 5  
**Tools** : 5  
**Resources** : 6 par pipeline
