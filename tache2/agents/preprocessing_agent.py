"""
Agent 1 — PreprocessingAgent v2
A2A: Reçoit une task card de l'orchestrateur, publie une ressource MCP image_meta
MCP Tools exposés:
  - analyze_image_quality : analyse la qualité d'une image base64
"""

import base64
import io
import time
from mcp.protocol import (
    AgentRole, MCPMessage, MCPTool, MCPResource,
    MessageType, AgentContext, broker
)


class PreprocessingAgent:
    role = AgentRole.PREPROCESSOR

    # ── MCP Capability Declaration ────────────────────────────────────────────

    def capabilities(self) -> dict:
        return {
            "name": "PreprocessingAgent",
            "version": "2.0",
            "description": "Analyse qualité image, extraction métadonnées",
            "inputs": ["image/jpeg", "image/png", "image/webp"],
            "outputs": ["application/json+image-meta"],
        }

    def mcp_tools(self) -> list:
        return [
            MCPTool(
                name="analyze_image_quality",
                description=(
                    "Examine la photo avant l'analyse pour vérifier qu'elle est exploitable. "
                    "Mesure trois choses concrètes : à quel point l'image est claire ou sombre, "
                    "à quel point elle est nette ou floue, et sa taille en pixels. "
                    "Établit ensuite une note de qualité globale entre 0 et 100, et liste les "
                    "éventuelles recommandations (par exemple : « éclairage trop faible » ou "
                    "« image trop floue »). Cette première étape ne change rien à l'image — "
                    "elle prépare juste un compte-rendu utilisé par les agents suivants pour "
                    "ajuster leur niveau de confiance."
                ),
                input_schema={
                    "type": "object",
                    "properties": {
                        "image_b64": {"type": "string", "description": "Image en base64"},
                        "mime_type": {"type": "string", "default": "image/jpeg"},
                    },
                    "required": ["image_b64"],
                },
                owner=self.role,
            )
        ]

    # ── MCP Tool Handler ──────────────────────────────────────────────────────

    async def tool_analyze_image_quality(self, input_data: dict) -> dict:
        image_b64 = input_data.get("image_b64", "")
        try:
            image_bytes = base64.b64decode(image_b64)
            from PIL import Image, ImageStat
            img = Image.open(io.BytesIO(image_bytes))
            if img.mode != "RGB":
                img = img.convert("RGB")
            stat = ImageStat.Stat(img)
            brightness = sum(stat.mean[:3]) / 3
            contrast = sum(stat.stddev[:3]) / 3
            return {
                "width": img.size[0], "height": img.size[1],
                "brightness": round(brightness, 1), "contrast": round(contrast, 1),
                "size_kb": round(len(image_bytes) / 1024, 1),
            }
        except Exception as e:
            return {"error": str(e)}

    # ── A2A Message Handler ───────────────────────────────────────────────────

    async def handle(self, msg: MCPMessage) -> MCPMessage:
        return MCPMessage(
            type=MessageType.RESPONSE,
            sender=self.role,
            recipient=msg.sender,
            correlation_id=msg.correlation_id,
            payload={"status": "acknowledged", "agent": self.role.value},
        )

    # ── Main Pipeline Method ──────────────────────────────────────────────────

    async def run(self, ctx: AgentContext, task=None) -> AgentContext:
        t0 = time.time()
        ctx.log(self.role, "Démarrage pré-traitement — appel MCP tool analyze_image_quality")

        if task:
            task.start()

        # Appel via MCP tool registry (simulation protocole MCP)
        tool_result = await broker.call_tool(
            "analyze_image_quality",
            {"image_b64": ctx.image_b64, "mime_type": ctx.image_mime},
            caller=AgentRole.ORCHESTRATOR,
        )

        width    = tool_result.get("width", 0)
        height   = tool_result.get("height", 0)
        size_kb  = tool_result.get("size_kb", 0)
        brightness = tool_result.get("brightness", 128)
        contrast   = tool_result.get("contrast", 50)

        quality_score  = 1.0
        quality_issues = []

        if brightness < 30:
            quality_issues.append("image_trop_sombre");  quality_score -= 0.3
        elif brightness > 230:
            quality_issues.append("image_surexposee");   quality_score -= 0.2
        if contrast < 15:
            quality_issues.append("contraste_faible");   quality_score -= 0.2
        quality_score = max(0.1, round(quality_score, 2))

        elapsed = round((time.time() - t0) * 1000, 1)
        result = {
            "size_kb": size_kb, "width": width, "height": height,
            "mode": "RGB", "mime": ctx.image_mime,
            "quality_score": quality_score, "quality_issues": quality_issues,
            "brightness": brightness, "contrast": contrast,
            "elapsed_ms": elapsed,
        }
        ctx.preprocessing_result = result

        # Publier la ressource MCP
        resource_uri = f"qv://{ctx.pipeline_id}/image_meta"
        broker.publish_resource(MCPResource(
            uri=resource_uri, name="image_meta",
            mime_type="application/json",
            content=result, created_by=self.role,
        ))

        if task:
            task.complete(output_refs=[resource_uri])

        ctx.log(self.role, f"Image OK — {width}x{height}px, {size_kb}KB, qualité={quality_score} | resource={resource_uri}")
        return ctx
