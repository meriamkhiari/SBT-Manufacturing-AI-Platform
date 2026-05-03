"""
Script de test pour vérifier que l'application Flask fonctionne correctement
"""
import sys
from pathlib import Path

def test_imports():
    """Test que tous les imports fonctionnent"""
    print("🧪 Test des imports...")
    try:
        from mcp.protocol import broker, AgentRole, AgentContext
        print("  ✅ MCP protocol importé")
        
        from agents import (
            PreprocessingAgent, VisionAgent, ValidationAgent,
            SeverityAgent, ReportAgent, CLASS_NAMES, CLASS_DESCRIPTIONS
        )
        print("  ✅ Agents importés")
        
        import flask
        print("  ✅ Flask importé")
        
        return True
    except Exception as e:
        print(f"  ❌ Erreur d'import: {e}")
        return False


def test_agents_registration():
    """Test que les agents sont bien enregistrés"""
    print("\n🧪 Test de l'enregistrement des agents...")
    try:
        # Import app pour déclencher l'enregistrement des agents
        from app import app
        from mcp.protocol import broker
        
        # Vérifier que le broker a des agents
        agents = broker.agent_list()
        print(f"  ✅ {len(agents)} agents enregistrés: {agents}")
        
        # Vérifier les tools MCP
        tools = broker.list_tools()
        print(f"  ✅ {len(tools)} MCP tools disponibles")
        for tool in tools:
            print(f"     - {tool['name']} ({tool['owner']})")
        
        # Vérifier les capabilities
        caps = broker.list_capabilities()
        print(f"  ✅ {len(caps)} capabilities déclarées")
        
        return len(agents) >= 5 and len(tools) >= 5
    except Exception as e:
        print(f"  ❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_xai_features():
    """Test que les features XAI sont présentes"""
    print("\n🧪 Test des features XAI...")
    try:
        from agents.vision_agent import XAI_FEATURE_WEIGHTS, _compute_xai_scores
        
        print(f"  ✅ {len(XAI_FEATURE_WEIGHTS)} classes avec feature weights")
        
        # Test de calcul XAI
        test_detection = {
            "class_name": "boites_liees",
            "confidence": 0.85,
            "bbox": {"x": 0.1, "y": 0.2, "w": 0.15, "h": 0.10},
            "xai_explanation": {
                "primary_feature": "Test feature",
                "contributing_features": ["f1", "f2"],
                "counterfactual": "Test counterfactual",
                "visual_evidence": "Test evidence",
                "spatial_context": "Test context",
                "severity_justification": "Test justification",
                "comparison_to_normal": "Test comparison",
                "measurement_confidence": "Test measurement",
                "confidence_reason": "Test reason"
            }
        }
        
        xai_scores = _compute_xai_scores(test_detection)
        
        required_fields = [
            "feature_importance", "top_feature", "shap_score",
            "visibility_factor", "confidence_tier", "uncertainty_score",
            "narrative_explanation", "counterfactual", "visual_evidence",
            "spatial_context", "severity_justification", "comparison_to_normal",
            "measurement_confidence", "confidence_reason", "defect_area_percent",
            "detection_quality"
        ]
        
        missing = [f for f in required_fields if f not in xai_scores]
        if missing:
            print(f"  ⚠️  Champs XAI manquants: {missing}")
        else:
            print(f"  ✅ Tous les champs XAI présents ({len(required_fields)} champs)")
        
        print(f"  ✅ SHAP score: {xai_scores['shap_score']}")
        print(f"  ✅ Detection quality: {xai_scores['detection_quality']}")
        print(f"  ✅ Uncertainty score: {xai_scores['uncertainty_score']}")
        
        return len(missing) == 0
    except Exception as e:
        print(f"  ❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_flask_routes():
    """Test que les routes Flask sont définies"""
    print("\n🧪 Test des routes Flask...")
    try:
        from app import app
        
        routes = []
        for rule in app.url_map.iter_rules():
            if rule.endpoint != 'static':
                routes.append(f"{rule.methods} {rule.rule}")
        
        print(f"  ✅ {len(routes)} routes définies:")
        for route in sorted(routes):
            print(f"     {route}")
        
        required_routes = [
            '/api/analyze/',
            '/api/samples/',
            '/api/agents/',
            '/api/health/',
        ]
        
        all_routes_str = ' '.join(routes)
        missing = [r for r in required_routes if r not in all_routes_str]
        
        if missing:
            print(f"  ⚠️  Routes manquantes: {missing}")
            return False
        else:
            print(f"  ✅ Toutes les routes requises présentes")
            return True
            
    except Exception as e:
        print(f"  ❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_dataset():
    """Test que le dataset est présent"""
    print("\n🧪 Test du dataset...")
    try:
        samples_dir = Path("dataset_samples")
        labels_dir = Path("dataset_labels")
        
        if not samples_dir.exists():
            print(f"  ❌ Dossier {samples_dir} introuvable")
            return False
        
        if not labels_dir.exists():
            print(f"  ❌ Dossier {labels_dir} introuvable")
            return False
        
        samples = list(samples_dir.glob("*.jpg"))
        labels = list(labels_dir.glob("*.txt"))
        
        print(f"  ✅ {len(samples)} images trouvées")
        print(f"  ✅ {len(labels)} fichiers de labels trouvés")
        
        return len(samples) > 0
    except Exception as e:
        print(f"  ❌ Erreur: {e}")
        return False


def main():
    """Lance tous les tests"""
    print("=" * 60)
    print("🔬 QualityVision A2A — Tests de Validation")
    print("=" * 60)
    
    results = {
        "Imports": test_imports(),
        "Agents Registration": test_agents_registration(),
        "XAI Features": test_xai_features(),
        "Flask Routes": test_flask_routes(),
        "Dataset": test_dataset(),
    }
    
    print("\n" + "=" * 60)
    print("📊 Résultats des tests:")
    print("=" * 60)
    
    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    total = len(results)
    passed = sum(results.values())
    
    print("\n" + "=" * 60)
    print(f"🎯 Score: {passed}/{total} tests réussis ({passed/total*100:.0f}%)")
    print("=" * 60)
    
    if passed == total:
        print("\n✅ Tous les tests sont passés ! L'application est prête.")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) échoué(s). Vérifiez les erreurs ci-dessus.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
