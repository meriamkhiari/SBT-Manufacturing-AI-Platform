"""
Agent 2 — VisionAgent v2
A2A: Lit la ressource MCP image_meta, appelle Claude Vision (XAI réel), publie detections
MCP Tools exposés:
  - detect_defects : détection Claude Vision avec explainability
"""

import re
import json
import time
import anthropic
from mcp.protocol import (
    AgentRole, MCPMessage, MCPTool, MCPResource,
    MessageType, AgentContext, broker
)

CLASS_NAMES = {
    0: "boites_liees",
    1: "logo_illisible",
    2: "peinture_irreguliere",
    3: "trou_obstrue",
}

CLASS_DESCRIPTIONS = {
    "boites_liees":         "Boîtes collées/liées ensemble — défaut d'emballage",
    "logo_illisible":       "Logo ou étiquette illisible — défaut d'impression",
    "peinture_irreguliere": "Peinture irrégulière ou manquante — défaut de surface",
    "trou_obstrue":         "Trou obstrué ou bouché — défaut structurel",
}

# ── XAI Feature Weights (basés sur la littérature industrielle QC) ──────────
# Contribue à l'explication de chaque décision de détection
XAI_FEATURE_WEIGHTS = {
    "boites_liees":         {"visual_texture": 0.35, "spatial_proximity": 0.40, "color_uniformity": 0.15, "edge_sharpness": 0.10},
    "logo_illisible":       {"text_clarity": 0.50,  "contrast_ratio": 0.25,    "occlusion": 0.15,         "blur_factor": 0.10},
    "peinture_irreguliere": {"color_uniformity": 0.45, "surface_texture": 0.30, "reflection": 0.15,       "edge_sharpness": 0.10},
    "trou_obstrue":         {"hole_visibility": 0.40, "occlusion": 0.35,        "depth_cue": 0.15,        "contrast_ratio": 0.10},
}


def _build_prompt(ctx: AgentContext) -> str:
    preproc      = ctx.preprocessing_result
    quality_score = preproc.get("quality_score", 1.0)
    quality_issues = preproc.get("quality_issues", [])
    dims = ""
    if preproc.get("width"):
        dims = f" ({preproc['width']}x{preproc['height']}px)"
    ctx_note      = f'\nContexte produit: "{ctx.user_context}"' if ctx.user_context else ""
    quality_note  = ""
    if quality_issues:
        quality_note = f"\nNote qualité image: score={quality_score}, problèmes={', '.join(quality_issues)}."
    classes_desc = "\n".join(f"  - {k}: {v}" for k, v in CLASS_DESCRIPTIONS.items())

    return f"""Tu es un expert en contrôle qualité industriel pour la détection de défauts sur boîtes électriques peintes.{ctx_note}{quality_note}

Image analysée{dims}. Classes de défauts:
{classes_desc}

Analyse cette image et pour chaque défaut détecté, fournis une explication XAI TRÈS DÉTAILLÉE et PRÉCISE avec des remarques concrètes sur les caractéristiques visuelles observées.

Réponds UNIQUEMENT avec un objet JSON valide (sans backticks):
{{
  "detections": [
    {{
      "class_id": 0,
      "class_name": "boites_liees",
      "severity": "high",
      "confidence": 0.92,
      "bbox": {{"x": 0.1, "y": 0.2, "w": 0.3, "h": 0.15}},
      "details": "Description TRÈS PRÉCISE du défaut avec mesures visuelles approximatives",
      "location_description": "Position EXACTE dans l'image avec repères visuels (ex: 'coin supérieur gauche, à 2cm du bord, près de l'étiquette')",
      "xai_explanation": {{
        "primary_feature": "Caractéristique visuelle PRINCIPALE et MESURABLE qui a déclenché la détection (ex: 'Zone de contact de 3x2cm entre deux boîtes avec déformation visible de la peinture')",
        "contributing_features": [
          "Feature 1 avec DÉTAILS PRÉCIS (ex: 'Ligne de jonction irrégulière de 4cm de long avec variation de couleur')",
          "Feature 2 avec MESURES (ex: 'Écart de 0.5mm entre les surfaces avec accumulation de peinture')",
          "Feature 3 avec OBSERVATIONS (ex: 'Reflet lumineux anormal indiquant une surface non plane')"
        ],
        "counterfactual": "Changement PRÉCIS nécessaire pour éliminer le défaut (ex: 'Séparer les boîtes avec un écart minimum de 5mm et repeindre la zone de contact de 3x2cm')",
        "confidence_reason": "Explication DÉTAILLÉE de la confiance avec facteurs quantifiables (ex: 'Confiance élevée (92%) car: défaut visible sur 80% de sa surface, contraste de 45% avec zone saine, 3 indices visuels convergents')",
        "visual_evidence": "Liste EXHAUSTIVE des indices visuels MESURABLES (ex: 'Couleur: variation de 15% du RGB, Texture: rugosité 2x supérieure, Forme: déformation de 3mm, Ombre: zone sombre de 1x2cm, Reflet: anomalie sur 40% de la surface')",
        "spatial_context": "Contexte spatial PRÉCIS (ex: 'Défaut situé à 12cm du bord gauche, 8cm du haut, adjacent à l'étiquette bleue, dans zone de préhension')",
        "severity_justification": "Justification DÉTAILLÉE de la sévérité (ex: 'Sévérité HIGH car: impact fonctionnel (boîtes non séparables), risque client élevé, surface affectée >5cm², non réparable sur ligne')",
        "comparison_to_normal": "Comparaison PRÉCISE avec état normal (ex: 'État normal: surface lisse uniforme RGB(180,180,185), État observé: surface irrégulière RGB(165,170,180) avec bosses de 2mm')",
        "measurement_confidence": "Confiance dans les mesures (ex: 'Mesures visuelles précises à ±10% grâce à: bonne résolution (2048px), éclairage uniforme, angle de vue frontal')"
      }}
    }}
  ],
  "conformity": "non-conforme",
  "assessment": "Résumé qualité global DÉTAILLÉ en 3-4 phrases avec statistiques précises.",
  "inspection_notes": "Observations générales PRÉCISES avec recommandations concrètes.",
  "global_xai": {{
    "decision_basis": "Facteurs principaux QUANTIFIÉS ayant guidé l'évaluation (ex: '3 défauts HIGH détectés couvrant 15% surface totale, score criticité moyen 82/100')",
    "uncertainty_factors": [
      "Facteur 1 avec IMPACT CHIFFRÉ (ex: 'Reflet lumineux sur 5% de l'image réduisant confiance de 8%')",
      "Facteur 2 avec MESURE (ex: 'Zone d'ombre de 3x4cm masquant potentiellement 1 défaut supplémentaire')"
    ],
    "image_quality_impact": "Impact PRÉCIS de la qualité image sur l'analyse (ex: 'Résolution 2048x1536px (excellente): +15% confiance, Éclairage uniforme: +10% précision, Léger flou sur 10% surface: -5% détection petits défauts')",
    "detection_statistics": {{
      "total_surface_analyzed_percent": 95,
      "defect_coverage_percent": 12,
      "average_defect_size_cm2": 8.5,
      "confidence_distribution": {{"high": 2, "medium": 1, "low": 0}}
    }}
  }}
}}

Règles:
- class_id: 0=boites_liees, 1=logo_illisible, 2=peinture_irreguliere, 3=trou_obstrue
- severity: "high" | "medium" | "low"
- confidence: 0.0 à 1.0
- bbox: x,y = coin supérieur gauche (0-1), w,h = dimensions relatives (0-1)
- Si aucun défaut: detections=[], conformity="conforme"
"""


def _parse_response(text: str) -> dict:
    text = text.strip()
    text = re.sub(r'^```(?:json)?\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'\s*```$', '', text, flags=re.MULTILINE)
    text = text.strip()
    match = re.search(r'\{[\s\S]*\}', text)
    if not match:
        raise ValueError(f"No JSON found: {text[:300]}")
    return json.loads(match.group(0))


def _compute_xai_scores(detection: dict) -> dict:
    """
    Calcule les scores XAI réels et détaillés basés sur:
    1. Les features weights par classe
    2. La confidence de Claude
    3. La taille de la bbox (proxy de visibilité)
    4. L'explication narrative DÉTAILLÉE de Claude
    5. Métriques de précision et d'incertitude
    """
    class_name = detection.get("class_name", "")
    confidence = float(detection.get("confidence", 0.5))
    bb = detection.get("bbox", {})
    area = bb.get("w", 0.1) * bb.get("h", 0.1)
    xai_expl = detection.get("xai_explanation", {})

    weights = XAI_FEATURE_WEIGHTS.get(class_name, {
        "visual_feature": 0.4, "context": 0.3, "contrast": 0.2, "geometry": 0.1
    })

    # Score XAI par feature = weight * confidence * visibility_factor
    visibility = min(1.0, area / 0.05)  # normalise area sur 5% image
    feature_scores = {
        feat: round(w * confidence * (0.7 + 0.3 * visibility), 3)
        for feat, w in weights.items()
    }

    # Top contributing feature
    top_feature = max(feature_scores, key=feature_scores.get)

    # Shap-like global score (somme pondérée)
    shap_score = round(sum(feature_scores.values()) / len(feature_scores), 3)

    # Calcul de l'incertitude basée sur les facteurs
    uncertainty_score = round((1 - confidence) * 0.5 + (1 - visibility) * 0.3 + 0.2, 3)

    # Extraction des mesures précises depuis l'explication
    visual_evidence = xai_expl.get("visual_evidence", "")
    spatial_context = xai_expl.get("spatial_context", "")
    measurement_confidence = xai_expl.get("measurement_confidence", "")

    return {
        "feature_importance": feature_scores,
        "top_feature": top_feature,
        "shap_score": shap_score,
        "visibility_factor": round(visibility, 3),
        "confidence_tier": "high" if confidence >= 0.8 else "medium" if confidence >= 0.6 else "low",
        "uncertainty_score": uncertainty_score,
        # Explications détaillées de Claude
        "narrative_explanation": xai_expl.get("primary_feature", ""),
        "counterfactual": xai_expl.get("counterfactual", ""),
        "visual_evidence": visual_evidence,
        "contributing_features": xai_expl.get("contributing_features", []),
        "spatial_context": spatial_context,
        "severity_justification": xai_expl.get("severity_justification", ""),
        "comparison_to_normal": xai_expl.get("comparison_to_normal", ""),
        "measurement_confidence": measurement_confidence,
        "confidence_reason": xai_expl.get("confidence_reason", ""),
        # Métriques calculées
        "defect_area_percent": round(area * 100, 2),
        "detection_quality": "excellent" if confidence >= 0.85 and visibility >= 0.8 else 
                           "good" if confidence >= 0.7 and visibility >= 0.5 else
                           "fair" if confidence >= 0.5 else "poor",
    }


class VisionAgent:
    role = AgentRole.VISION

    def __init__(self, api_key: str):
        self.client = anthropic.Anthropic(api_key=api_key)

    def capabilities(self) -> dict:
        return {
            "name": "VisionAgent",
            "version": "2.0",
            "description": "Détection de défauts Claude Vision avec XAI intégré",
            "model": "claude-sonnet-4-20250514",
            "inputs": ["image/jpeg", "application/json+image-meta"],
            "outputs": ["application/json+detections", "application/json+xai"],
        }

    def mcp_tools(self) -> list:
        return [
            MCPTool(
                name="detect_defects",
                description=(
                    "Examine la photo en profondeur et identifie les défauts visibles parmi quatre "
                    "catégories possibles : boîtes collées entre elles, logo illisible, peinture "
                    "irrégulière, et trou obstrué. Pour chaque défaut repéré, dessine un cadre "
                    "autour de la zone concernée et rédige une explication détaillée qui répond "
                    "à plusieurs questions : qu'est-ce qui a été observé exactement, où c'est "
                    "situé sur l'image, en quoi cela diffère d'une pièce normale, à quel point "
                    "le système est sûr de son verdict, et qu'est-ce qu'il faudrait changer pour "
                    "que le défaut disparaisse. Cette étape produit aussi un résumé global qui "
                    "indique les zones d'incertitude et l'impact de la qualité de la photo sur "
                    "l'analyse."
                ),
                input_schema={
                    "type": "object",
                    "properties": {
                        "image_meta_uri": {"type": "string"},
                        "user_context": {"type": "string"},
                    },
                    "required": ["image_meta_uri"],
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
        ctx.log(self.role, "Appel Claude Vision (XAI activé) — lecture ressource MCP image_meta")

        if task:
            task.start()

        # Lire la ressource MCP publiée par PreprocessingAgent
        image_meta_uri = f"qv://{ctx.pipeline_id}/image_meta"
        meta_resource = broker.get_resource(image_meta_uri)
        if meta_resource:
            ctx.log(self.role, f"Ressource MCP lue: {image_meta_uri}")

        prompt = _build_prompt(ctx)

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=3000,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": ctx.image_mime,
                                "data": ctx.image_b64,
                            },
                        },
                        {"type": "text", "text": prompt},
                    ],
                }],
            )
        except anthropic.AuthenticationError as e:
            ctx.errors.append(f"VisionAgent: AuthenticationError — {e}")
            ctx.vision_result = {"error": "auth_error", "detections": []}
            if task: task.fail("auth_error")
            return ctx
        except anthropic.RateLimitError as e:
            ctx.errors.append(f"VisionAgent: RateLimitError — {e}")
            ctx.vision_result = {"error": "rate_limit", "detections": []}
            if task: task.fail("rate_limit")
            return ctx
        except Exception as e:
            ctx.errors.append(f"VisionAgent: {e}")
            ctx.vision_result = {"error": str(e), "detections": []}
            if task: task.fail(str(e))
            return ctx

        raw_text = "".join(b.text for b in response.content if b.type == "text")

        try:
            parsed = _parse_response(raw_text)
        except Exception as e:
            ctx.errors.append(f"VisionAgent parse: {e}")
            ctx.vision_result = {"error": f"parse_error: {e}", "raw": raw_text[:500], "detections": []}
            if task: task.fail(f"parse_error: {e}")
            return ctx

        elapsed = round((time.time() - t0) * 1000, 1)

        # Enrichir chaque détection avec XAI scores calculés
        detections = parsed.get("detections", [])
        for d in detections:
            d["description"] = CLASS_DESCRIPTIONS.get(d.get("class_name", ""), "")
            # Clamp bbox
            bb = d.get("bbox", {})
            for k in ["x", "y", "w", "h"]:
                bb[k] = max(0.0, min(1.0, float(bb.get(k, 0.05))))
            d["bbox"] = bb
            # XAI scores réels
            d["xai"] = _compute_xai_scores(d)

        # XAI global enrichi
        global_xai = parsed.get("global_xai", {})
        detection_stats = global_xai.get("detection_statistics", {})
        
        ctx.xai_result = {
            "global_decision_basis": global_xai.get("decision_basis", ""),
            "uncertainty_factors": global_xai.get("uncertainty_factors", []),
            "image_quality_impact": global_xai.get("image_quality_impact", ""),
            "detection_statistics": detection_stats,
            "per_detection_xai": [d.get("xai", {}) for d in detections],
            "model": "claude-sonnet-4-20250514",
            "xai_method": "Feature Importance + Counterfactual + SHAP-like scoring + Detailed Visual Analysis",
            "xai_version": "2.0-enhanced",
            # Métriques agrégées
            "aggregate_metrics": {
                "total_detections": len(detections),
                "avg_confidence": round(sum(d.get("confidence", 0) for d in detections) / max(len(detections), 1), 3),
                "avg_defect_area": round(sum(d.get("bbox", {}).get("w", 0) * d.get("bbox", {}).get("h", 0) for d in detections) / max(len(detections), 1) * 100, 2),
                "high_confidence_count": sum(1 for d in detections if d.get("confidence", 0) >= 0.8),
                "detection_quality_distribution": {
                    "excellent": sum(1 for d in detections if d.get("xai", {}).get("detection_quality") == "excellent"),
                    "good": sum(1 for d in detections if d.get("xai", {}).get("detection_quality") == "good"),
                    "fair": sum(1 for d in detections if d.get("xai", {}).get("detection_quality") == "fair"),
                    "poor": sum(1 for d in detections if d.get("xai", {}).get("detection_quality") == "poor"),
                }
            }
        }

        ctx.vision_result = {
            "detections":          detections,
            "conformity":          parsed.get("conformity", "a-verifier"),
            "assessment":          parsed.get("assessment", ""),
            "inspection_notes":    parsed.get("inspection_notes", ""),
            "raw_detection_count": len(detections),
            "elapsed_ms":          elapsed,
        }

        # Publier ressource MCP detections
        det_uri = f"qv://{ctx.pipeline_id}/detections"
        broker.publish_resource(MCPResource(
            uri=det_uri, name="detections",
            mime_type="application/json",
            content=ctx.vision_result, created_by=self.role,
        ))
        xai_uri = f"qv://{ctx.pipeline_id}/xai"
        broker.publish_resource(MCPResource(
            uri=xai_uri, name="xai_report",
            mime_type="application/json",
            content=ctx.xai_result, created_by=self.role,
        ))

        if task:
            task.complete(output_refs=[det_uri, xai_uri])

        ctx.log(self.role, f"Détections: {len(detections)} défauts, XAI généré pour chaque détection")
        return ctx


__all__ = ["VisionAgent", "CLASS_NAMES", "CLASS_DESCRIPTIONS"]
