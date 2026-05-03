"""
Agent 4 — SeverityAgent v2
A2A: Lit validated_detections depuis MCP, publie severity_report
MCP Tools: classify_severity
"""
import time
from mcp.protocol import (
    AgentRole, MCPMessage, MCPTool, MCPResource,
    MessageType, AgentContext, broker
)

SEVERITY_RULES = {
    "boites_liees": {
        "base_severity": "high", "base_score": 85,
        "action": "Séparer immédiatement les boîtes liées avant expédition", "blocking": True,
    },
    "trou_obstrue": {
        "base_severity": "high", "base_score": 80,
        "action": "Déboucher le trou et contrôler la fonctionnalité structurelle", "blocking": True,
    },
    "peinture_irreguliere": {
        "base_severity": "medium", "base_score": 55,
        "action": "Renvoi en cabine de peinture pour retouche", "blocking": False,
    },
    "logo_illisible": {
        "base_severity": "medium", "base_score": 45,
        "action": "Réimpression de l'étiquette ou repositionnement", "blocking": False,
    },
}

CONFIDENCE_MODIFIERS = {
    (0.85, 1.01): +10,
    (0.70, 0.85): +0,
    (0.50, 0.70): -10,
    (0.35, 0.50): -20,
}


def _conf_mod(conf: float) -> int:
    for (lo, hi), mod in CONFIDENCE_MODIFIERS.items():
        if lo <= conf < hi:
            return mod
    return 0


def _reclassify(score: int) -> str:
    return "high" if score >= 70 else "medium" if score >= 45 else "low"


class SeverityAgent:
    role = AgentRole.SEVERITY

    def capabilities(self) -> dict:
        return {
            "name": "SeverityAgent",
            "version": "2.0",
            "description": "Reclassification sévérité métier + verdict QC",
            "inputs": ["application/json+validated-detections"],
            "outputs": ["application/json+severity-report"],
        }

    def mcp_tools(self) -> list:
        return [
            MCPTool(
                name="classify_severity",
                description=(
                    "Traduit les défauts détectés en une décision claire pour l'opérateur. "
                    "Chaque défaut reçoit une note de gravité qui combine trois éléments : "
                    "à quel point ce type de défaut est sérieux pour la pièce, à quel point "
                    "le système est sûr de l'avoir vu, et quelle surface il occupe sur l'image. "
                    "Toutes ces notes sont ensuite agrégées en une note de criticité globale "
                    "comprise entre 0 et 100, qui aboutit à l'un des quatre verdicts possibles : "
                    "« accepté », « accepté sous condition », « à vérifier » ou « refusé ». "
                    "L'étape produit également une liste d'actions correctives concrètes à "
                    "appliquer pour remettre la pièce en conformité."
                ),
                input_schema={
                    "type": "object",
                    "properties": {
                        "validated_uri": {"type": "string"},
                    },
                    "required": ["validated_uri"],
                },
                owner=self.role,
            )
        ]

    async def tool_classify_severity(self, input_data: dict) -> dict:
        uri = input_data.get("validated_uri", "")
        resource = broker.get_resource(uri)
        if not resource:
            return {"error": f"Resource '{uri}' not found"}
        validated = resource.content.get("validated_detections", [])
        enriched, blocking_defects = [], []
        global_criticality = 0

        for det in validated:
            class_name = det.get("class_name", "")
            rules = SEVERITY_RULES.get(class_name, {
                "base_severity": "medium", "base_score": 50,
                "action": "Inspection manuelle requise", "blocking": False,
            })
            conf = float(det.get("confidence", 0.7))
            raw_score = min(100, max(0, rules["base_score"] + _conf_mod(conf)))
            bb = det.get("bbox", {})
            area = bb.get("w", 0) * bb.get("h", 0)
            if area > 0.15:   raw_score = min(100, raw_score + 8)
            elif area < 0.02: raw_score = max(0, raw_score - 8)
            final_severity = _reclassify(raw_score)
            enriched.append({
                **det,
                "severity": final_severity,
                "criticality_score": raw_score,
                "corrective_action": rules["action"],
                "is_blocking": rules["blocking"],
                "original_severity": det.get("severity", "medium"),
                "severity_changed": det.get("severity", "medium") != final_severity,
            })
            global_criticality = max(global_criticality, raw_score)
            if rules["blocking"]:
                blocking_defects.append(class_name)

        if enriched:
            avg_score = sum(d["criticality_score"] for d in enriched) / len(enriched)
            global_criticality = round(0.6 * global_criticality + 0.4 * avg_score, 1)

        if blocking_defects or global_criticality >= 70:
            verdict = "REFUSÉ"
            reason = f"Défauts bloquants: {', '.join(set(blocking_defects))}" if blocking_defects else "Score criticité trop élevé"
        elif global_criticality >= 45:
            verdict = "À VÉRIFIER"
            reason = "Défauts non-bloquants nécessitant inspection manuelle"
        elif enriched:
            verdict = "CONDITIONNELLEMENT ACCEPTÉ"
            reason = "Défauts mineurs acceptables selon les tolérances"
        else:
            verdict = "ACCEPTÉ"
            reason = "Aucun défaut détecté — produit conforme"

        return {
            "enriched_detections": enriched,
            "global_criticality": global_criticality,
            "blocking_defects": list(set(blocking_defects)),
            "verdict": verdict,
            "verdict_reason": reason,
            "total_defects": len(enriched),
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
        ctx.log(self.role, "Reclassification via MCP tool classify_severity")

        if task:
            task.start()

        val_uri = f"qv://{ctx.pipeline_id}/validated"
        result = await broker.call_tool(
            "classify_severity",
            {"validated_uri": val_uri},
            caller=self.role,
        )

        elapsed = round((time.time() - t0) * 1000, 1)
        ctx.severity_result = {**result, "elapsed_ms": elapsed}

        sev_uri = f"qv://{ctx.pipeline_id}/severity"
        broker.publish_resource(MCPResource(
            uri=sev_uri, name="severity_report",
            mime_type="application/json",
            content=ctx.severity_result, created_by=self.role,
        ))

        if task:
            task.complete(output_refs=[sev_uri])

        verdict = result.get("verdict", "À VÉRIFIER")
        ctx.log(self.role, f"Verdict: {verdict} | criticité={result.get('global_criticality', 0)}")
        return ctx
