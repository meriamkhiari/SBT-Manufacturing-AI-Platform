"""
Agent 5 — ReportAgent v2
A2A: Consolide toutes les ressources MCP, génère le rapport final avec XAI complet
MCP Tools: generate_report
"""
import time
from mcp.protocol import (
    AgentRole, MCPMessage, MCPTool, MCPResource,
    MessageType, AgentContext, broker
)

CONFORMITY_MAP = {
    "ACCEPTÉ":                    "conforme",
    "CONDITIONNELLEMENT ACCEPTÉ": "a-verifier",
    "À VÉRIFIER":                 "a-verifier",
    "REFUSÉ":                     "non-conforme",
}


class ReportAgent:
    role = AgentRole.REPORTER

    def capabilities(self) -> dict:
        return {
            "name": "ReportAgent",
            "version": "2.0",
            "description": "Consolidation rapport final + XAI global",
            "inputs": ["application/json+severity-report", "application/json+xai"],
            "outputs": ["application/json+final-report"],
        }

    def mcp_tools(self) -> list:
        return [
            MCPTool(
                name="generate_report",
                description=(
                    "Rassemble les résultats produits par les quatre étapes précédentes en un "
                    "seul rapport cohérent destiné à l'interface utilisateur. Inclut le verdict "
                    "final sur la pièce, la liste détaillée des défauts trouvés avec leurs "
                    "explications, le temps total de l'analyse, et les actions correctives "
                    "recommandées. Y figure aussi un journal complet du parcours suivi par la "
                    "donnée à travers la chaîne de traitement, ce qui permet à n'importe qui de "
                    "rejouer ou d'auditer la décision après coup."
                ),
                input_schema={
                    "type": "object",
                    "properties": {
                        "pipeline_id": {"type": "string"},
                    },
                    "required": ["pipeline_id"],
                },
                owner=self.role,
            )
        ]

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
        ctx.log(self.role, "Génération rapport final — lecture ressources MCP")

        if task:
            task.start()

        # Lire toutes les ressources MCP publiées
        preproc  = ctx.preprocessing_result
        vision   = ctx.vision_result
        val      = ctx.validation_result
        severity = ctx.severity_result
        xai      = ctx.xai_result

        detections  = severity.get("enriched_detections", [])
        verdict     = severity.get("verdict", "À VÉRIFIER")
        conformity  = CONFORMITY_MAP.get(verdict, "a-verifier")

        confidences = [d.get("confidence", 0) for d in detections]
        avg_conf    = round(sum(confidences) / len(confidences), 3) if confidences else 0.0

        severity_dist = {"high": 0, "medium": 0, "low": 0}
        for d in detections:
            s = d.get("severity", "medium")
            severity_dist[s] = severity_dist.get(s, 0) + 1

        corrective_actions = list({
            d.get("corrective_action", "")
            for d in detections
            if d.get("corrective_action")
        })

        # A2A tasks summary
        a2a_tasks_summary = broker.get_task_log()

        # MCP resources summary
        mcp_resources = broker.list_resources()

        # MCP tools stats
        mcp_tools_stats = broker.list_tools()

        pipeline_steps = [
            {"agent": "preprocessor", "elapsed_ms": preproc.get("elapsed_ms", 0)},
            {"agent": "vision",       "elapsed_ms": vision.get("elapsed_ms", 0)},
            {"agent": "validator",    "elapsed_ms": val.get("elapsed_ms", 0)},
            {"agent": "severity",     "elapsed_ms": severity.get("elapsed_ms", 0)},
        ]
        total_ms = ctx.elapsed_ms()
        elapsed  = round((time.time() - t0) * 1000, 1)
        pipeline_steps.append({"agent": "reporter", "elapsed_ms": elapsed})

        # XAI global consolidé avec métriques détaillées
        xai_summary = {
            "method": "Feature Importance + Counterfactual Analysis + SHAP-like Scoring + Detailed Visual Measurements",
            "version": "2.0-enhanced",
            "model": "claude-sonnet-4-20250514",
            "global_decision_basis": xai.get("global_decision_basis", ""),
            "uncertainty_factors": xai.get("uncertainty_factors", []),
            "image_quality_impact": xai.get("image_quality_impact", ""),
            "detection_statistics": xai.get("detection_statistics", {}),
            "aggregate_metrics": xai.get("aggregate_metrics", {}),
            "per_detection_count": len(xai.get("per_detection_xai", [])),
            # Scores SHAP moyens par feature (agrégation)
            "aggregate_feature_importance": _aggregate_shap(detections),
            # Analyse de qualité des détections
            "detection_quality_summary": _analyze_detection_quality(detections),
            # Recommandations basées sur XAI
            "xai_recommendations": _generate_xai_recommendations(detections, xai),
        }

        ctx.final_report = {
            "detections":           detections,
            "total_defects":        len(detections),
            "conformity":           conformity,
            "verdict":              verdict,
            "verdict_reason":       severity.get("verdict_reason", ""),
            "assessment":           vision.get("assessment", ""),
            "inspection_notes":     vision.get("inspection_notes", ""),
            "global_criticality":   severity.get("global_criticality", 0),
            "avg_confidence":       avg_conf,
            "severity_distribution": severity_dist,
            "blocking_defects":     severity.get("blocking_defects", []),
            "corrective_actions":   corrective_actions,
            "image_quality_score":  preproc.get("quality_score", 1.0),
            "image_quality_issues": preproc.get("quality_issues", []),
            "image_dimensions": {
                "width":   preproc.get("width", 0),
                "height":  preproc.get("height", 0),
                "size_kb": preproc.get("size_kb", 0),
            },
            "validation": {
                "raw_detections": vision.get("raw_detection_count", 0),
                "validated":      val.get("validated_count", 0),
                "rejected":       val.get("rejected_count", 0),
                "nms_removed":    val.get("nms_removed", 0),
                "reliability":    val.get("reliability_score", 1.0),
            },
            # XAI complet
            "xai": xai_summary,
            # Pipeline A2A
            "pipeline": {
                "id":          ctx.pipeline_id,
                "total_ms":    total_ms,
                "steps":       pipeline_steps,
                "agent_logs":  ctx.agent_logs,
                "errors":      ctx.errors,
                "agents_used": ["preprocessor", "vision", "validator", "severity", "reporter"],
                "protocol":    "MCP A2A v2.0",
                # A2A task cards
                "a2a_tasks":   a2a_tasks_summary,
                # MCP resources publiées
                "mcp_resources": mcp_resources,
                # MCP tools utilisés
                "mcp_tools":   mcp_tools_stats,
                # Broker stats
                "mcp_stats":   broker.get_stats(),
            },
        }

        # Publier rapport final comme ressource MCP
        report_uri = f"qv://{ctx.pipeline_id}/final_report"
        broker.publish_resource(MCPResource(
            uri=report_uri, name="final_report",
            mime_type="application/json",
            content=ctx.final_report, created_by=self.role,
        ))

        if task:
            task.complete(output_refs=[report_uri])

        ctx.log(self.role, f"Rapport final: {len(detections)} défauts, verdict={verdict}, total={total_ms}ms")
        return ctx


def _aggregate_shap(detections: list) -> dict:
    """Agrège les scores XAI de toutes les détections pour une vue globale."""
    all_features: dict = {}
    count = 0
    for d in detections:
        xai = d.get("xai", {})
        fi = xai.get("feature_importance", {})
        for feat, score in fi.items():
            all_features[feat] = all_features.get(feat, 0) + score
        count += 1
    if count == 0:
        return {}
    return {k: round(v / count, 3) for k, v in sorted(all_features.items(), key=lambda x: -x[1])}


def _analyze_detection_quality(detections: list) -> dict:
    """Analyse la qualité globale des détections basée sur les métriques XAI."""
    if not detections:
        return {
            "overall_quality": "N/A",
            "confidence_stats": {},
            "visibility_stats": {},
            "uncertainty_stats": {},
        }
    
    confidences = [d.get("confidence", 0) for d in detections]
    visibilities = [d.get("xai", {}).get("visibility_factor", 0) for d in detections]
    uncertainties = [d.get("xai", {}).get("uncertainty_score", 0) for d in detections]
    
    avg_conf = sum(confidences) / len(confidences)
    avg_vis = sum(visibilities) / len(visibilities)
    avg_unc = sum(uncertainties) / len(uncertainties)
    
    # Déterminer la qualité globale
    if avg_conf >= 0.8 and avg_vis >= 0.7 and avg_unc <= 0.3:
        overall = "excellent"
    elif avg_conf >= 0.7 and avg_vis >= 0.5 and avg_unc <= 0.5:
        overall = "good"
    elif avg_conf >= 0.5 and avg_vis >= 0.3:
        overall = "fair"
    else:
        overall = "poor"
    
    return {
        "overall_quality": overall,
        "confidence_stats": {
            "average": round(avg_conf, 3),
            "min": round(min(confidences), 3),
            "max": round(max(confidences), 3),
            "high_confidence_ratio": round(sum(1 for c in confidences if c >= 0.8) / len(confidences), 3),
        },
        "visibility_stats": {
            "average": round(avg_vis, 3),
            "min": round(min(visibilities), 3),
            "max": round(max(visibilities), 3),
        },
        "uncertainty_stats": {
            "average": round(avg_unc, 3),
            "min": round(min(uncertainties), 3),
            "max": round(max(uncertainties), 3),
        },
    }


def _generate_xai_recommendations(detections: list, xai: dict) -> list:
    """Génère des recommandations basées sur l'analyse XAI."""
    recommendations = []
    
    # Analyse des facteurs d'incertitude
    uncertainty_factors = xai.get("uncertainty_factors", [])
    if uncertainty_factors:
        recommendations.append({
            "category": "image_quality",
            "priority": "high",
            "recommendation": f"Améliorer les conditions d'acquisition: {len(uncertainty_factors)} facteurs d'incertitude détectés",
            "details": uncertainty_factors,
        })
    
    # Analyse de la qualité des détections
    quality_dist = xai.get("aggregate_metrics", {}).get("detection_quality_distribution", {})
    poor_count = quality_dist.get("poor", 0)
    if poor_count > 0:
        recommendations.append({
            "category": "detection_reliability",
            "priority": "medium",
            "recommendation": f"{poor_count} détection(s) de faible qualité nécessitent une vérification manuelle",
            "details": "Confiance ou visibilité insuffisante pour validation automatique",
        })
    
    # Analyse des défauts par classe
    class_counts = {}
    for d in detections:
        cn = d.get("class_name", "unknown")
        class_counts[cn] = class_counts.get(cn, 0) + 1
    
    if class_counts:
        most_common = max(class_counts.items(), key=lambda x: x[1])
        if most_common[1] >= 2:
            recommendations.append({
                "category": "process_improvement",
                "priority": "high",
                "recommendation": f"Défaut récurrent détecté: {most_common[0]} ({most_common[1]} occurrences)",
                "details": "Analyse de cause racine recommandée pour ce type de défaut",
            })
    
    # Analyse de la couverture
    stats = xai.get("detection_statistics", {})
    coverage = stats.get("defect_coverage_percent", 0)
    if coverage > 20:
        recommendations.append({
            "category": "quality_alert",
            "priority": "critical",
            "recommendation": f"Couverture de défauts élevée ({coverage}% de la surface)",
            "details": "Produit fortement dégradé, inspection complète recommandée",
        })
    
    return recommendations
