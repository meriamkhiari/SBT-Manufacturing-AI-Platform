# 🤖 Agents A2A — Documentation

## Vue d'ensemble

Ce dossier contient les **5 agents A2A** du pipeline QualityVision :

1. **PreprocessingAgent** : Analyse de la qualité image
2. **VisionAgent** : Détection via Claude Vision + XAI
3. **ValidationAgent** : Validation et NMS
4. **SeverityAgent** : Reclassification métier
5. **ReportAgent** : Consolidation finale

## Architecture A2A

```
[Image] → PreprocessingAgent → VisionAgent → ValidationAgent → SeverityAgent → ReportAgent → [Report]
```

Chaque agent :
- ✅ Expose des **MCP Tools**
- ✅ Publie des **MCP Resources**
- ✅ Crée des **A2A Task Cards**
- ✅ Communique via le **MCP Broker**

## 1. PreprocessingAgent

**Fichier** : `preprocessing_agent.py`

### Rôle
Analyse les métadonnées et la qualité de l'image avant détection.

### MCP Tool
- `analyze_image_quality` : Analyse complète de l'image

### Inputs
- Image base64 + mime type

### Outputs
- Métadonnées : dimensions, taille, format
- Score de qualité (0-1)
- Problèmes détectés (flou, sous-exposition, etc.)

### Ressource MCP Publiée
- `qv://{pipeline_id}/image_meta`

### Exemple de sortie
```json
{
  "width": 2048,
  "height": 1536,
  "size_kb": 450,
  "format": "JPEG",
  "quality_score": 0.92,
  "quality_issues": [],
  "elapsed_ms": 45
}
```

## 2. VisionAgent

**Fichier** : `vision_agent.py`

### Rôle
Détection de défauts via Claude Vision avec XAI détaillé v2.0.

### MCP Tool
- `detect_defects` : Détection + explications XAI

### Inputs
- Ressource MCP `image_meta`
- Image base64
- Contexte utilisateur (optionnel)

### Outputs
- Détections avec bounding boxes
- **16 champs XAI par détection**
- XAI global avec métriques

### Ressources MCP Publiées
- `qv://{pipeline_id}/detections`
- `qv://{pipeline_id}/xai`

### XAI Features
Chaque détection inclut :
- `primary_feature` : Caractéristique principale
- `contributing_features` : Features secondaires
- `visual_evidence` : Indices visuels (couleur, texture, forme)
- `spatial_context` : Position exacte
- `counterfactual` : Changement nécessaire
- `confidence_reason` : Explication de la confiance
- `severity_justification` : Justification de la sévérité
- `comparison_to_normal` : Comparaison avec état normal
- `measurement_confidence` : Confiance dans les mesures

### Feature Weights
```python
XAI_FEATURE_WEIGHTS = {
    "boites_liees": {
        "visual_texture": 0.35,
        "spatial_proximity": 0.40,
        "color_uniformity": 0.15,
        "edge_sharpness": 0.10
    },
    # ... autres classes
}
```

### Exemple de sortie
```json
{
  "detections": [
    {
      "class_id": 0,
      "class_name": "boites_liees",
      "confidence": 0.92,
      "bbox": {"x": 0.1, "y": 0.2, "w": 0.3, "h": 0.15},
      "xai": {
        "feature_importance": {
          "visual_texture": 0.322,
          "spatial_proximity": 0.368
        },
        "shap_score": 0.230,
        "detection_quality": "excellent",
        "uncertainty_score": 0.15
      }
    }
  ]
}
```

## 3. ValidationAgent

**Fichier** : `validation_agent.py`

### Rôle
Validation géométrique, filtrage par confiance, NMS.

### MCP Tool
- `validate_detections` : Validation complète

### Inputs
- Ressource MCP `detections`

### Outputs
- Détections validées
- Détections rejetées avec raisons
- Nombre de détections supprimées par NMS
- Score de fiabilité

### Ressource MCP Publiée
- `qv://{pipeline_id}/validated`

### Règles de Validation
- ✅ `class_id` dans {0, 1, 2, 3}
- ✅ `confidence` >= 0.35
- ✅ `bbox` valide (x, y, w, h dans [0, 1])
- ✅ `bbox` taille minimale (> 0.01%)

### NMS (Non-Maximum Suppression)
- Seuil IoU : 0.70
- Garde la détection avec la plus haute confiance

### Exemple de sortie
```json
{
  "validated_detections": [...],
  "validated_count": 3,
  "rejected_count": 1,
  "nms_removed": 2,
  "reliability_score": 0.85
}
```

## 4. SeverityAgent

**Fichier** : `severity_agent.py`

### Rôle
Reclassification métier, calcul de criticité, verdict QC.

### MCP Tool
- `classify_severity` : Classification métier

### Inputs
- Ressource MCP `validated`

### Outputs
- Détections enrichies avec :
  - Sévérité reclassifiée (high/medium/low)
  - Score de criticité (0-100)
  - Action corrective
  - Flag bloquant
- Verdict global (ACCEPTÉ / À VÉRIFIER / REFUSÉ)
- Criticité globale

### Ressource MCP Publiée
- `qv://{pipeline_id}/severity`

### Règles Métier
```python
SEVERITY_RULES = {
    "boites_liees": {
        "base_severity": "high",
        "base_score": 85,
        "action": "Séparer immédiatement",
        "blocking": True
    },
    # ... autres classes
}
```

### Modificateurs
- Confiance >= 0.85 : +10 points
- Confiance < 0.50 : -20 points
- Surface > 15% : +8 points
- Surface < 2% : -8 points

### Verdicts
- **ACCEPTÉ** : Aucun défaut ou défauts mineurs
- **CONDITIONNELLEMENT ACCEPTÉ** : Défauts acceptables
- **À VÉRIFIER** : Défauts non-bloquants nécessitant inspection
- **REFUSÉ** : Défauts bloquants ou criticité >= 70

### Exemple de sortie
```json
{
  "enriched_detections": [...],
  "global_criticality": 82,
  "blocking_defects": ["boites_liees"],
  "verdict": "REFUSÉ",
  "verdict_reason": "Défauts bloquants: boites_liees"
}
```

## 5. ReportAgent

**Fichier** : `report_agent.py`

### Rôle
Consolidation finale avec XAI global et recommandations.

### MCP Tool
- `generate_report` : Génération du rapport final

### Inputs
- Toutes les ressources MCP du pipeline

### Outputs
- Rapport final consolidé avec :
  - Toutes les détections enrichies
  - XAI global avec métriques agrégées
  - Recommandations basées sur l'analyse
  - Statistiques du pipeline A2A
  - A2A task cards summary
  - MCP resources + tools stats

### Ressource MCP Publiée
- `qv://{pipeline_id}/final_report`

### XAI Global
- `aggregate_feature_importance` : Scores moyens par feature
- `detection_quality_summary` : Analyse de qualité globale
- `xai_recommendations` : Recommandations actionnables

### Recommandations
Catégories :
- `image_quality` : Améliorer les conditions d'acquisition
- `detection_reliability` : Vérification manuelle nécessaire
- `process_improvement` : Défauts récurrents
- `quality_alert` : Couverture de défauts élevée

### Exemple de sortie
```json
{
  "detections": [...],
  "total_defects": 3,
  "verdict": "REFUSÉ",
  "xai": {
    "aggregate_feature_importance": {...},
    "detection_quality_summary": {...},
    "xai_recommendations": [...]
  },
  "pipeline": {
    "total_ms": 8450,
    "a2a_tasks": [...],
    "mcp_resources": [...],
    "mcp_tools": [...]
  }
}
```

## Protocole MCP

### Tool Registry
Chaque agent expose ses tools via `mcp_tools()` :
```python
def mcp_tools(self) -> list:
    return [
        MCPTool(
            name="tool_name",
            description="Description",
            input_schema={...},
            owner=self.role
        )
    ]
```

### Resource Manager
Publication de ressources :
```python
broker.publish_resource(MCPResource(
    uri=f"qv://{pipeline_id}/resource_name",
    name="resource_name",
    mime_type="application/json",
    content={...},
    created_by=self.role
))
```

### A2A Task Cards
Création de tâches :
```python
task = broker.create_task(
    from_agent=AgentRole.AGENT1,
    to_agent=AgentRole.AGENT2,
    pipeline_id=pipeline_id,
    input_refs=[...],
    metadata={...}
)
task.start()
# ... traitement ...
task.complete(output_refs=[...])
```

### Capability Discovery
Chaque agent expose ses capabilities via `capabilities()` :
```python
def capabilities(self) -> dict:
    return {
        "name": "AgentName",
        "version": "2.0",
        "description": "Description",
        "inputs": [...],
        "outputs": [...]
    }
```

## Utilisation

### Enregistrement des Agents
```python
from mcp.protocol import broker, AgentRole
from agents import PreprocessingAgent, VisionAgent, ...

broker.register(AgentRole.PREPROCESSOR, PreprocessingAgent())
broker.register(AgentRole.VISION, VisionAgent(api_key="..."))
# ... autres agents
```

### Exécution du Pipeline
```python
from mcp.protocol import AgentContext

ctx = AgentContext(
    image_b64="...",
    image_mime="image/jpeg",
    image_filename="test.jpg"
)

# Exécution séquentielle
await preprocessing_agent.run(ctx)
await vision_agent.run(ctx)
await validation_agent.run(ctx)
await severity_agent.run(ctx)
await report_agent.run(ctx)

# Résultat final
report = ctx.final_report
```

## Personnalisation

### Ajouter une Classe de Défaut
1. Modifier `CLASS_NAMES` et `CLASS_DESCRIPTIONS` dans `vision_agent.py`
2. Ajouter les feature weights dans `XAI_FEATURE_WEIGHTS`
3. Ajouter les règles métier dans `SEVERITY_RULES` (`severity_agent.py`)

### Ajuster les Seuils
- **Confiance minimale** : `MIN_CONFIDENCE` dans `validation_agent.py`
- **Seuil NMS** : `IOU_THRESHOLD` dans `validation_agent.py`
- **Scores de sévérité** : `SEVERITY_RULES` dans `severity_agent.py`

### Modifier les Feature Weights
Ajuster les poids dans `XAI_FEATURE_WEIGHTS` (`vision_agent.py`) :
```python
XAI_FEATURE_WEIGHTS = {
    "ma_classe": {
        "feature_1": 0.40,  # 40% d'importance
        "feature_2": 0.30,  # 30% d'importance
        "feature_3": 0.20,  # 20% d'importance
        "feature_4": 0.10   # 10% d'importance
    }
}
```

## Tests

Chaque agent peut être testé individuellement :
```python
# Test PreprocessingAgent
agent = PreprocessingAgent()
ctx = AgentContext(image_b64="...", image_mime="image/jpeg")
await agent.run(ctx)
print(ctx.preprocessing_result)

# Test VisionAgent
agent = VisionAgent(api_key="...")
await agent.run(ctx)
print(ctx.vision_result)
print(ctx.xai_result)
```

## Dépendances

- `anthropic` : API Claude Vision
- `Pillow` : Traitement d'images
- `asyncio` : Exécution asynchrone

---

**Version** : 2.0  
**Agents** : 5  
**MCP Tools** : 5  
**XAI** : v2.0 Enhanced
