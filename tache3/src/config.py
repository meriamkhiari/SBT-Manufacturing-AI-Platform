from pathlib import Path
from pydantic_settings import BaseSettings

# Force-load .env so it overrides empty Windows env vars (default load_dotenv keeps existing values).
try:
    from dotenv import load_dotenv
    _ENV = Path(__file__).resolve().parent.parent / ".env"
    if _ENV.exists():
        load_dotenv(_ENV, override=True)
except ImportError:
    pass


class Settings(BaseSettings):
    # === Neo4j Aura Cloud (instance 7b3df92d) ===
    neo4j_uri:      str = "neo4j+s://7b3df92d.databases.neo4j.io"
    neo4j_user:     str = "7b3df92d"
    neo4j_password: str = "EkqkJI5H7Pka918yc5wyMfNQjDyuXYPSAhP54Uhdnrg"
    neo4j_database: str = "7b3df92d"

    # === Claude API (LLM principal) ===
    anthropic_api_key: str = ""

    # === Modèles Claude ===
    claude_fast_model:  str = "claude-haiku-4-5-20251001"   # classification, extraction
    claude_smart_model: str = "claude-sonnet-4-6"           # analyse marketing, pitchs, XAI

    # === Serper (recherche web) ===
    serper_api_key: str = ""

    # === Pipeline ===
    request_delay_seconds:    int   = 2
    llm_confidence_threshold: float = 0.50
    scraping_concurrency:     int   = 3

    # === Scoring weights (must sum to 1.0) ===
    score_weight_relevance:  float = 0.35
    score_weight_potential:  float = 0.30
    score_weight_competition: float = 0.20
    score_weight_market:     float = 0.15

    class Config:
        env_file = ".env"


settings = Settings()
