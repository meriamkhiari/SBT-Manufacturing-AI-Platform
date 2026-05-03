import json
import os
import sqlite3
from pathlib import Path

# Chemin absolu basé sur la position du fichier — insensible au répertoire courant.
# Override possible via la variable d'environnement SBT_DB_PATH (utilisé par
# run_for_integration.py pour pointer sur integration/data/raw/staging.db).
_DEFAULT_DB = Path(__file__).resolve().parent.parent.parent / "data" / "raw" / "staging.db"
DB_PATH = Path(os.environ.get("SBT_DB_PATH", str(_DEFAULT_DB)))


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialise les tables et applique les migrations. À appeler UNE SEULE FOIS au démarrage."""
    with get_connection() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS search_results (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            url         TEXT,
            domain      TEXT,
            title       TEXT,
            snippet     TEXT,
            query       TEXT,
            tier_guess  INTEGER,
            tier_final  INTEGER,
            score       INTEGER,
            source      TEXT,
            status      TEXT DEFAULT 'pending'
        );

        CREATE INDEX IF NOT EXISTS idx_sr_status ON search_results(status);
        CREATE INDEX IF NOT EXISTS idx_sr_score  ON search_results(score DESC);

        CREATE TABLE IF NOT EXISTS raw_company (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            name      TEXT,
            phone     TEXT,
            email     TEXT,
            website   TEXT,
            raw_json  TEXT,
            status    TEXT DEFAULT 'pending'
        );
        """)

        # Migration unique : ajouter la colonne linkedin si elle n'existe pas
        try:
            conn.execute("ALTER TABLE raw_company ADD COLUMN linkedin TEXT DEFAULT ''")
        except sqlite3.OperationalError:
            pass  # Colonne déjà présente


def save_search_result(
    url: str,
    domain: str,
    title: str = "",
    snippet: str = "",
    query: str = "",
    tier_guess: int = 0,
    tier_final: int = 0,
    score: int = 0,
    source: str = "ddg",
):
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO search_results
                (url, domain, title, snippet, query,
                 tier_guess, tier_final, score, source, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
            """,
            (url, domain, title, snippet, query,
             tier_guess, tier_final, score, source),
        )


def get_pending_search_results(limit: int = 50) -> list[sqlite3.Row]:
    with get_connection() as conn:
        cursor = conn.execute(
            """
            SELECT * FROM search_results
            WHERE status = 'pending'
            ORDER BY score DESC
            LIMIT ?
            """,
            (limit,),
        )
        return cursor.fetchall()


def mark_search_result(url: str, status: str):
    """Met à jour le statut d'un résultat (ex: 'scraped', 'error', 'done')."""
    with get_connection() as conn:
        conn.execute(
            "UPDATE search_results SET status = ? WHERE url = ?",
            (status, url),
        )


def get_known_domains() -> set[str]:
    """Retourne les domaines déjà présents dans search_results."""
    with get_connection() as conn:
        rows = conn.execute("SELECT DISTINCT domain FROM search_results").fetchall()
        return {row["domain"] for row in rows if row["domain"]}


def save_raw_company(data: dict):
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO raw_company (name, phone, email, website, linkedin, raw_json, status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')
            """,
            (
                data.get("name"),
                data.get("phone"),
                data.get("email"),
                data.get("website"),
                data.get("linkedin", ""),
                json.dumps(data, ensure_ascii=False),
            ),
        )


def delete_by_status(status: str) -> int:
    """
    Supprime les entrées search_results et raw_company ayant le statut donné.
    Retourne le nombre total de lignes supprimées.
    """
    total = 0
    with get_connection() as conn:
        cur = conn.execute(
            "DELETE FROM search_results WHERE status = ?", (status,)
        )
        total += cur.rowcount
        cur = conn.execute(
            "DELETE FROM raw_company WHERE status = ?", (status,)
        )
        total += cur.rowcount
    return total


def delete_pending() -> int:
    """Supprime toutes les entrées en statut 'pending'."""
    return delete_by_status("pending")


def delete_errors() -> int:
    """Supprime toutes les entrées en statut 'error'."""
    return delete_by_status("error")


# ── Generic listing helpers (used by /api/sqlite/*) ────────────────────────────

def list_search_results(
    status: str | None = None,
    domain: str | None = None,
    tier: int | None = None,
    min_score: int = 0,
    limit: int = 100,
    offset: int = 0,
) -> dict:
    """Paginated list of search_results with optional filters."""
    where = ["score >= ?"]
    params: list = [min_score]
    if status:
        where.append("status = ?")
        params.append(status)
    if domain:
        where.append("domain LIKE ?")
        params.append(f"%{domain}%")
    if tier is not None:
        where.append("tier_final = ?")
        params.append(tier)
    where_sql = " AND ".join(where)

    with get_connection() as conn:
        total = conn.execute(
            f"SELECT COUNT(*) FROM search_results WHERE {where_sql}", params
        ).fetchone()[0]
        rows = conn.execute(
            f"""
            SELECT id, url, domain, title, snippet, query,
                   tier_guess, tier_final, score, source, status
            FROM search_results
            WHERE {where_sql}
            ORDER BY score DESC, id DESC
            LIMIT ? OFFSET ?
            """,
            params + [limit, offset],
        ).fetchall()
    return {
        "rows": [dict(r) for r in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


def list_raw_companies(
    status: str | None = None,
    search: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> dict:
    """Paginated list of raw_company with optional filters."""
    where = ["1=1"]
    params: list = []
    if status:
        where.append("status = ?")
        params.append(status)
    if search:
        where.append("(name LIKE ? OR website LIKE ? OR email LIKE ?)")
        like = f"%{search}%"
        params.extend([like, like, like])
    where_sql = " AND ".join(where)

    with get_connection() as conn:
        total = conn.execute(
            f"SELECT COUNT(*) FROM raw_company WHERE {where_sql}", params
        ).fetchone()[0]
        rows = conn.execute(
            f"""
            SELECT id, name, phone, email, website, linkedin, raw_json, status
            FROM raw_company
            WHERE {where_sql}
            ORDER BY id DESC
            LIMIT ? OFFSET ?
            """,
            params + [limit, offset],
        ).fetchall()

    out = []
    for r in rows:
        d = dict(r)
        # Parse raw_json so the frontend gets the full enriched payload
        try:
            d["raw"] = json.loads(d.pop("raw_json") or "{}")
        except (ValueError, TypeError):
            d["raw"] = {}
        out.append(d)

    return {"rows": out, "total": total, "limit": limit, "offset": offset}
