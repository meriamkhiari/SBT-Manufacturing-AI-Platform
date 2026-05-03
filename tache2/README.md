# 🔬 QualityVision A2A — Flask + React

Détection de défauts visuels sur boîtes électriques peintes via pipeline **multi-agents A2A + MCP** avec **XAI détaillé**.

> ⚡ **Démarrage rapide** : [QUICK_START.md](QUICK_START.md)

## 🏗️ Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | **Flask 3.0** + Flask-CORS |
| Frontend | **React 18** + Vite |
| IA | **Claude Vision** (claude-sonnet-4) |
| Architecture | **A2A** (Agent-to-Agent) + **MCP** (Model Context Protocol) |
| XAI | **Feature Importance + Counterfactual + SHAP + Visual Analysis** |

## 🤖 Pipeline A2A (5 agents)

```
[Image]
  ↓
PreprocessingAgent  → métadonnées, qualité image
  ↓
VisionAgent         → Claude Vision AI + XAI détaillé
  ↓
ValidationAgent     → filtrage, NMS (IoU>0.7), cohérence
  ↓
SeverityAgent       → reclassification métier, verdict
  ↓
ReportAgent         → rapport complet consolidé + XAI global
  ↓
[JSON Report]       → servi par Flask API → affiché par React
```

## 🔍 XAI (Explainable AI) - Version 2.0 Enhanced

Le système fournit des **explications détaillées et précises** pour chaque détection.

📖 **Documentation XAI complète** : [XAI_DOCUMENTATION.md](XAI_DOCUMENTATION.md)

### Pour chaque défaut détecté :

- **Primary Feature** : Caractéristique visuelle principale MESURABLE
- **Contributing Features** : Liste de features avec DÉTAILS PRÉCIS et mesures
- **Visual Evidence** : Indices visuels EXHAUSTIFS (couleur RGB, texture, forme, ombres, reflets)
- **Spatial Context** : Position EXACTE avec repères visuels et mesures en cm
- **Counterfactual** : Changement PRÉCIS nécessaire pour éliminer le défaut
- **Confidence Reason** : Explication DÉTAILLÉE avec facteurs quantifiables
- **Severity Justification** : Justification COMPLÈTE de la sévérité
- **Comparison to Normal** : Comparaison PRÉCISE avec état normal (RGB, mesures)
- **Measurement Confidence** : Confiance dans les mesures visuelles

### Métriques XAI calculées :

- **Feature Importance** : Scores SHAP-like par feature visuelle
- **Uncertainty Score** : Niveau d'incertitude de la détection
- **Visibility Factor** : Facteur de visibilité du défaut
- **Detection Quality** : excellent / good / fair / poor
- **Defect Area** : Pourcentage de surface affectée

### XAI Global :

- **Decision Basis** : Facteurs QUANTIFIÉS guidant l'évaluation
- **Uncertainty Factors** : Facteurs avec IMPACT CHIFFRÉ
- **Image Quality Impact** : Impact PRÉCIS sur l'analyse
- **Detection Statistics** : Statistiques complètes (surface, taille, distribution)
- **Aggregate Feature Importance** : Scores moyens par feature
- **Detection Quality Summary** : Analyse de qualité globale
- **XAI Recommendations** : Recommandations basées sur l'analyse

## 📁 Structure

```
qualityvision/
├── app.py                    # Application Flask principale
├── requirements.txt          # Dépendances Python
├── start.sh / start.bat      # Production
├── start_dev.sh / .bat       # Développement
├── README.md
├── DEMARRAGE.md             # Doc complète
├── DEMARRAGE_WINDOWS.md     # Guide Windows
│
├── agents/                   # 5 agents A2A
│   ├── preprocessing_agent.py
│   ├── vision_agent.py       # ← XAI détaillé amélioré
│   ├── validation_agent.py
│   ├── severity_agent.py
│   └── report_agent.py       # ← Consolidation XAI
│
├── mcp/                      # Protocole MCP
│   └── protocol.py           # MCPBroker, A2A Tasks, Resources
│
├── frontend/                 # React app (Vite)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   └── api/
│   └── dist/                 # Build React
│
├── dataset_samples/          # 14 images JPG
└── dataset_labels/           # Annotations YOLO OBB
```

## 🚀 Lancement

### Windows

#### Mode Développement (hot reload)
```cmd
pip install -r requirements.txt
start_dev.bat
```
- Flask → http://localhost:8000
- React → http://localhost:3000

#### Mode Production
```cmd
pip install -r requirements.txt
start.bat
```
- Application complète → http://localhost:8000

📖 **Guide Windows complet** : [DEMARRAGE_WINDOWS.md](DEMARRAGE_WINDOWS.md)

---

### Linux / macOS

#### Mode Développement
```bash
pip install -r requirements.txt
chmod +x start_dev.sh
./start_dev.sh
```

#### Mode Production
```bash
pip install -r requirements.txt
chmod +x start.sh
./start.sh
```

📖 **Documentation complète** : [DEMARRAGE.md](DEMARRAGE.md)

## 📡 API Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/analyze/` | Pipeline A2A sur image uploadée |
| `GET` | `/api/analyze/sample/<filename>/` | Pipeline A2A sur sample dataset |
| `GET` | `/api/samples/` | Liste des images du dataset |
| `GET` | `/api/samples/<filename>/labels` | Ground truth YOLO OBB |
| `GET` | `/api/agents/` | Agents MCP enregistrés |
| `GET` | `/api/health/` | Statut API |
| `GET` | `/samples/<filename>` | Sert les images du dataset |

## 🔑 Clé API

La clé est déjà configurée. Pour utiliser la vôtre :
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```
