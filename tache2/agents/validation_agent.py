"""
Agent 3 — ValidationAgent v2
A2A: Lit detections depuis MCP resource, publie validated_detections
MCP Tools: validate_detections, run_nms
"""
import time
from mcp.protocol import (
    AgentRole, MCPMessage, MCPTool, MCPResource,
    MessageType, AgentContext, broker
)

VALID_CLASS_IDS = {0, 1, 2, 3}
MIN_CONFIDENCE  = 0.35
IOU_THRESHOLD   = 0.70


def _iou(a: dict, b: dict) -> float:
    ax1, ay1 = a["x"], a["y"]
    ax2, ay2 = ax1 + a["w"], ay1 + a["h"]
    bx1, by1 = b["x"], b["y"]
    bx2, by2 = bx1 + b["w"], by1 + b["h"]
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    if ix2 <= ix1 or iy2 <= iy1:
        return 0.0
    inter = (ix2 - ix1) * (iy2 - iy1)
    union = (ax2-ax1)*(ay2-ay1) + (bx2-bx1)*(by2-by1) - inter
    return inter / union if union > 0 else 0.0


def _nms(detections: list, iou_threshold: float) -> list:
    sorted_dets = sorted(detections, key=lambda d: d.get("confidence", 0), reverse=True)
    kept = []
    for det in sorted_dets:
        overlap = any(
            k.get("class_name") == det.get("class_name") and _iou(k["bbox"], det["bbox"]) > iou_threshold
            for k in kept
        )
        if not overlap:
            kept.append(det)
    return kept


class ValidationAgent:
    role = AgentRole.VALIDATOR

    def capabilities(self) -> dict:
        return {
            "name": "ValidationAgent",
            "version": "2.0",
            "description": "Validation géométrique, filtrage confiance, NMS",
            "inputs": ["application/json+detections"],
            "outputs": ["application/json+validated-detections"],
        }

    def mcp_tools(self) -> list:
        return [
            MCPTool(
                name="validate_detections",
                description=(
                    "Fait le ménage dans les défauts détectés à l'étape précédente avant de les "
                    "remonter à l'opérateur. Trois actions principales : écarter les détections "
                    "dont le système n'est pas suffisamment sûr (en-dessous d'un seuil de "
                    "confiance configurable), fusionner les doublons quand plusieurs cadres se "
                    "chevauchent et désignent en réalité le même défaut, et vérifier que chaque "
                    "détection est cohérente (la classe existe, le cadre est bien dans l'image). "
                    "À la fin, calcule un indicateur de fiabilité qui mesure la part des "
                    "détections retenues après ce filtrage."
                ),
                input_schema={
                    "type": "object",
                    "properties": {
                        "detections_uri": {"type": "string"},
                        "min_confidence": {"type": "number", "default": 0.35},
                        "iou_threshold": {"type": "number", "default": 0.70},
                    },
                    "required": ["detections_uri"],
                },
                owner=self.role,
            )
        ]

    async def tool_validate_detections(self, input_data: dict) -> dict:
        """Handler MCP tool — peut être appelé par n'importe quel agent."""
        uri = input_data.get("detections_uri", "")
        resource = broker.get_resource(uri)
        if not resource:
            return {"error": f"Resource '{uri}' not found"}
        detections = resource.content.get("detections", [])
        valid, rejected = [], []
        for i, d in enumerate(detections):
            reasons = []
            if d.get("class_id") not in VALID_CLASS_IDS:
                reasons.append(f"class_id invalide")
            if float(d.get("confidence", 0)) < MIN_CONFIDENCE:
                reasons.append(f"confiance trop faible ({d.get('confidence', 0):.2f})")
            bb = d.get("bbox", {})
            for k in ["x", "y", "w", "h"]:
                v = float(bb.get(k, -1))
                if not (0.0 <= v <= 1.0):
                    reasons.append(f"bbox.{k} hors limites")
                    break
            if bb.get("w", 0) * bb.get("h", 0) < 0.0001:
                reasons.append("bbox trop petite")
            if reasons:
                rejected.append({"index": i, "class_name": d.get("class_name"), "reasons": reasons})
            else:
                valid.append(d)
        before_nms = len(valid)
        valid = _nms(valid, IOU_THRESHOLD)
        return {
            "validated": valid,
            "rejected": rejected,
            "nms_removed": before_nms - len(valid),
        }

    async def handle(self, msg: MCPMessage) -> MCPMessage:
        return MCPMessage(
            type=MessageType.RESPONSE,
            sender=self.role,
            recipient=msg.sender,
            correlation_id=msg.correlation_id,
            payload={"status": "acknowledged", "agent": self.role.value},
        )

    async def run(self, ctx: AgentContext, task=None) -> AgentContext:
        t0 = time.time()
        ctx.log(self.role, "Validation via MCP tool validate_detections")

        if task:
            task.start()

        det_uri = f"qv://{ctx.pipeline_id}/detections"
        result = await broker.call_tool(
            "validate_detections",
            {"detections_uri": det_uri, "min_confidence": MIN_CONFIDENCE, "iou_threshold": IOU_THRESHOLD},
            caller=self.role,
        )

        valid       = result.get("validated", [])
        rejected    = result.get("rejected", [])
        nms_removed = result.get("nms_removed", 0)

        reliability = max(0.1, round(1.0 - 0.1 * len(rejected) - 0.05 * nms_removed, 2))

        elapsed = round((time.time() - t0) * 1000, 1)
        ctx.validation_result = {
            "validated_detections": valid,
            "validated_count":      len(valid),
            "rejected_count":       len(rejected),
            "rejected_details":     rejected,
            "nms_removed":          nms_removed,
            "reliability_score":    reliability,
            "elapsed_ms":           elapsed,
        }

        val_uri = f"qv://{ctx.pipeline_id}/validated"
        broker.publish_resource(MCPResource(
            uri=val_uri, name="validated_detections",
            mime_type="application/json",
            content=ctx.validation_result, created_by=self.role,
        ))

        if task:
            task.complete(output_refs=[val_uri])

        ctx.log(self.role,
            f"Validation: {len(valid)} validées, {len(rejected)} rejetées, "
            f"{nms_removed} NMS, fiabilité={reliability}")
        return ctx
