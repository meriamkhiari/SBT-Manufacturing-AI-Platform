"""Central configuration for the Integration Portal Gateway."""

GATEWAY_PORT = 5050

TASKS = {
    "task1": {
        "id": "task1",
        "name": "SBT Vision Intelligence Hub",
        "short_name": "SBT Vision",
        "description": (
            "Quality-control system for electrical connectors with automatic "
            "PDF documentation extraction and real-time visual inspection."
        ),
        "icon": "Cpu",
        "color": "#2563eb",
        "iframe_url": "http://localhost:5000",
        "backend_url": "http://localhost:5000",
        "health_path": "/",
        "tech_stack": ["Flask", "MongoDB", "Gemini 2.5 Flash", "PDF.js"],
        "features": [
            "Automatic PDF diagram extraction via LLM",
            "Real-time visual inspection (Gemini 2.5 Flash)",
            "100-point scoring (reference + ports + colours)",
            "94.7% accuracy on colour detection",
        ],
        "metrics": {
            "inspections_hour": 45,
            "accuracy": 94.7,
            "uptime": 99.4,
            "avg_latency_ms": 1200,
        },
    },
    "task2": {
        "id": "task2",
        "name": "QualityVision A2A",
        "short_name": "QualityVision",
        "description": (
            "Visual defect detection on painted electrical boxes via a "
            "multi-agent pipeline with detailed Explainable AI."
        ),
        "icon": "ScanSearch",
        "color": "#0891b2",
        "iframe_url": "http://localhost:8000",
        "backend_url": "http://localhost:8000",
        "health_path": "/api/health/",
        "tech_stack": ["Flask", "React", "Claude Vision", "MCP", "XAI"],
        "features": [
            "5-agent A2A + MCP pipeline",
            "Claude Vision (claude-sonnet) with XAI v2.0",
            "4 defect classes detected",
            "SHAP + Counterfactual explanations",
        ],
        "metrics": {
            "detections_processed": 156,
            "avg_confidence": 0.87,
            "xai_quality": "excellent",
            "defects_found": 42,
        },
    },
    "task3": {
        "id": "task3",
        "name": "SBT Intelligence",
        "short_name": "SBT Intelligence",
        "description": (
            "Automated B2B prospecting with web search, intelligent scraping "
            "and a graph of company relationships."
        ),
        "icon": "Network",
        "color": "#1e40af",
        "iframe_url": "http://localhost:5002",
        "backend_url": "http://localhost:5002",
        "health_path": "/",
        "tech_stack": ["LangGraph", "Neo4j", "Claude", "FastAPI", "SQLite"],
        "features": [
            "3 agents: Target Searcher, Scrapper, Marketing",
            "Smart extraction (emails, country, LinkedIn, phone)",
            "Neo4j graph of company relationships",
            "Country detection via 4 methods",
        ],
        "metrics": {
            "companies_scraped": 40,
            "emails_found": 32,
            "countries_detected": 38,
            "linkedin_found": 18,
        },
    },
}
