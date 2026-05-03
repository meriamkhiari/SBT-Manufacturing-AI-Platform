"""
reset_db.py — Vide complètement la base SQLite + Neo4j pour repartir de zéro.
Usage: python reset_db.py
"""

import sqlite3
from pathlib import Path

# ── 1. SQLite ─────────────────────────────────────────────────────────────────

DB_PATH = Path("data/raw/staging.db")

if DB_PATH.exists():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("DELETE FROM search_results")
        conn.execute("DELETE FROM raw_company")
        conn.execute("DELETE FROM sqlite_sequence WHERE name='search_results'")
        conn.execute("DELETE FROM sqlite_sequence WHERE name='raw_company'")
    print(f"✅ SQLite vidée  → {DB_PATH}")
else:
    print(f"⚠️  SQLite introuvable ({DB_PATH}) — ignorée")

# ── 2. Neo4j ──────────────────────────────────────────────────────────────────

try:
    from src.config import settings
    from neo4j import GraphDatabase

    driver = GraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_user, settings.neo4j_password),
    )
    with driver.session(database=settings.neo4j_database) as session:
        # Supprimer toutes les relations puis tous les nœuds
        result = session.run("MATCH ()-[r]->() DELETE r RETURN count(r) AS rels")
        rels   = result.single()["rels"]

        result = session.run("MATCH (n) DELETE n RETURN count(n) AS nodes")
        nodes  = result.single()["nodes"]

    driver.close()
    print(f"✅ Neo4j vidé    → {nodes} nœuds  |  {rels} relations supprimés")

except Exception as e:
    print(f"❌ Erreur Neo4j : {e}")

print("\n🎯 Reset terminé — vous pouvez relancer le pipeline complet.")
