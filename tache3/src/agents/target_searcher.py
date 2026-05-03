"""
Target Searcher — Phase 1 of the pipeline.

Accepts country + sector parameters from the UI (geolocation-driven).
Generates dynamic search queries via Claude, searches via Serper/MCP,
classifies via Claude Haiku, and applies STRICT country filtering.

No hardcoded queries — everything is driven by the selected country + sector.
"""

import asyncio
import json
import re
from urllib.parse import urlparse

import anthropic
from loguru import logger

from src.config import settings
from src.mcp.search_client import MCPSearchClient
from src.storage.database import init_db, save_search_result, get_known_domains
from src.storage.graph_store import GraphStore

# ── Claude singleton ──────────────────────────────────────────────────────────

_claude_sync: anthropic.Anthropic | None = None
_claude_async: anthropic.AsyncAnthropic | None = None


def _get_claude_sync() -> anthropic.Anthropic:
    global _claude_sync
    if _claude_sync is None:
        _claude_sync = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _claude_sync


def _get_claude_async() -> anthropic.AsyncAnthropic:
    global _claude_async
    if _claude_async is None:
        _claude_async = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _claude_async


# ── Default fallback queries (used only when no country/sector specified) ─────

_DEFAULT_TIER1 = [
    '"coffret de comptage" fabricant France',
    '"coffret Enedis" fabricant OR constructeur',
    '"metering cabinet" manufacturer Europe OEM',
    '"quadro elettrico" produttore Italia',
    '"cuadro eléctrico" fabricante España',
    '"Schaltschrank" Hersteller Deutschland',
]
_DEFAULT_TIER2 = [
    '"faisceau electrique" "coffret" sous-traitant OR assemblage',
    '"wiring harness" "meter cabinet" subcontractor',
    '"fascio elettrico" "quadro" terzista Italia',
    '"mazo de cables" subcontratista "cuadro eléctrico"',
]
_DEFAULT_COMPETITORS = [
    '"câblage électrique" Maroc fabricant',
    '"wiring harness" Morocco manufacturer',
    '"câblage" Tunisie sous-traitant',
    '"cable assembly" Romania OR Bulgaria manufacturer',
]

# ── Excluded domains ──────────────────────────────────────────────────────────

EXCLUDED_DOMAINS = {
    "linkedin.com", "facebook.com", "instagram.com", "youtube.com",
    "twitter.com", "x.com", "wikipedia.org", "amazon.com", "amazon.fr",
    "indeed.com", "glassdoor.com", "welcometothejungle.com",
    "usinenouvelle.com", "businesswire.com", "prnewswire.com",
    "achatmat.com", "directindustry.fr", "directindustry.com",
    "hellopro.fr", "kompass.com", "europages.fr", "societe.com",
    "manageo.fr", "verif.com", "alibaba.com", "indiamart.com",
    "exportersindia.com", "globenewswire.com", "enedis.fr",
    "lefigaro.fr", "lemonde.fr", "leroymerlin.fr", "cdiscount.com",
}

# ── Country keywords for strict filtering ─────────────────────────────────────

COUNTRY_KEYWORDS: dict[str, list[str]] = {
    "France":       ["france", "français", "française", "paris", "lyon", "marseille", "bordeaux", "toulouse"],
    "Italie":       ["italie", "italy", "italia", "italiano", "rome", "milan", "milano", "torino", "bologna"],
    "Espagne":      ["espagne", "spain", "españa", "español", "madrid", "barcelona", "valencia", "seville"],
    "Allemagne":    ["allemagne", "germany", "deutschland", "deutsch", "berlin", "munich", "hamburg", "frankfurt"],
    "Maroc":        ["maroc", "morocco", "marocain", "casablanca", "rabat", "tanger", "kenitra"],
    "Tunisie":      ["tunisie", "tunisia", "tunisien", "tunis", "sfax", "sousse", "monastir"],
    "Roumanie":     ["roumanie", "romania", "romanian", "bucharest", "cluj", "timisoara"],
    "Bulgarie":     ["bulgarie", "bulgaria", "bulgarian", "sofia", "plovdiv"],
    "Belgique":     ["belgique", "belgium", "belgie", "bruxelles", "brussels", "anvers", "antwerp"],
    "Suisse":       ["suisse", "switzerland", "schweiz", "svizzera", "geneve", "geneva", "zurich", "berne"],
    "Portugal":     ["portugal", "português", "lisbon", "lisboa", "porto", "braga"],
    "Pologne":      ["pologne", "poland", "polska", "warsaw", "warszawa", "krakow", "wroclaw"],
    "Royaume-Uni":  ["united kingdom", "uk", "britain", "england", "london", "manchester", "birmingham"],
    "Pays-Bas":     ["pays-bas", "netherlands", "nederland", "amsterdam", "rotterdam", "eindhoven"],
    "Autriche":     ["autriche", "austria", "österreich", "vienna", "wien", "graz"],
    "Turquie":      ["turquie", "turkey", "türkiye", "istanbul", "ankara", "izmir"],
    "Chine":        ["chine", "china", "chinois", "beijing", "shanghai", "shenzhen", "guangzhou"],
    "États-Unis":   ["united states", "usa", "american", "new york", "chicago", "los angeles"],
}

# ── TLD → Country mapping ──────────────────────────────────────────────────────

TLD_COUNTRY: dict[str, str] = {
    ".fr": "France", ".it": "Italie", ".es": "Espagne", ".de": "Allemagne",
    ".ma": "Maroc", ".tn": "Tunisie", ".ro": "Roumanie", ".bg": "Bulgarie",
    ".be": "Belgique", ".ch": "Suisse", ".pt": "Portugal", ".pl": "Pologne",
    ".co.uk": "Royaume-Uni", ".uk": "Royaume-Uni",
    ".nl": "Pays-Bas", ".at": "Autriche",
    ".tr": "Turquie", ".cn": "Chine",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def extract_domain(url: str) -> str:
    try:
        return urlparse(url).netloc.lower()
    except Exception:
        return ""


def is_valid_url(url: str) -> bool:
    if not url or not url.startswith("http"):
        return False
    domain = extract_domain(url)
    if not domain:
        return False
    for bad in EXCLUDED_DOMAINS:
        if bad in domain:
            return False
    if url.lower().endswith((".pdf", ".jpg", ".jpeg", ".png", ".zip")):
        return False
    return True


def deduplicate(results: list[dict]) -> list[dict]:
    seen: dict[str, dict] = {}
    for r in results:
        domain = r["domain"]
        if domain not in seen:
            seen[domain] = r
        elif len(r.get("snippet", "")) > len(seen[domain].get("snippet", "")):
            seen[domain] = r
    return list(seen.values())


def _guess_country_from_url_and_text(url: str, title: str, snippet: str) -> str | None:
    """Heuristic country detection from URL TLD + title/snippet text."""
    domain = extract_domain(url).replace("www.", "")
    for tld, country in TLD_COUNTRY.items():
        if domain.endswith(tld):
            return country
    combined = (title + " " + snippet).lower()
    scores: dict[str, int] = {}
    for country, keywords in COUNTRY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in combined)
        if score > 0:
            scores[country] = score
    if scores:
        return max(scores, key=scores.get)
    return None


def _extract_json(text: str) -> dict:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group())
        except json.JSONDecodeError:
            pass
    return {}


# ── Dynamic query generation via Claude ───────────────────────────────────────

_QUERY_GEN_PROMPT = """\
Tu génères des requêtes de recherche web pour trouver des entreprises B2B.

Contexte :
- Pays cible    : {country}
- Secteur cible : {sector}
- Objectif      : trouver des prospects pour SBT, une entreprise tunisienne de câblage électrique

Génère 6 requêtes réalistes pour chaque catégorie. Retourne UNIQUEMENT un JSON valide :
{{
  "tier1_queries": [
    "requête pour trouver fabricants/acheteurs principaux dans ce secteur en {country}",
    ...
  ],
  "tier2_queries": [
    "requête pour trouver sous-traitants/assembleurs dans ce secteur en {country}",
    ...
  ],
  "competitor_queries": [
    "requête pour trouver concurrents câblage low-cost",
    ...
  ]
}}

Règles :
- Utilise la langue locale du pays (français pour France, italien pour Italie, etc.)
- Inclus des termes techniques du secteur "{sector}"
- Inclus le nom de villes majeures du pays {country}
- tier1 = entreprises qui ACHÈTENT des prestations de câblage
- tier2 = entreprises qui sous-traitent ou intègrent
- competitor = câbleurs/faisceau low-cost qui concurrencent SBT
"""


async def generate_dynamic_queries(country: str, sector: str) -> dict[str, list[str]]:
    """Use Claude Haiku to generate search queries for a specific country + sector."""
    prompt = _QUERY_GEN_PROMPT.format(country=country, sector=sector)
    try:
        msg = await _get_claude_async().messages.create(
            model=settings.claude_fast_model,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        data = _extract_json(msg.content[0].text)
        tier1 = data.get("tier1_queries", [])
        tier2 = data.get("tier2_queries", [])
        comps = data.get("competitor_queries", [])
        if tier1 and tier2:
            logger.info(f"Queries générées: {len(tier1)} T1 | {len(tier2)} T2 | {len(comps)} concurrents")
            return {"tier1": tier1, "tier2": tier2, "competitors": comps}
    except Exception as e:
        logger.warning(f"Génération queries échouée: {e}")
    return {"tier1": _DEFAULT_TIER1, "tier2": _DEFAULT_TIER2, "competitors": _DEFAULT_COMPETITORS}


# ── LLM classification ────────────────────────────────────────────────────────

_CLASSIFY_PROMPT = """\
Classifie cette entreprise dans une supply chain.
Réponds UNIQUEMENT avec un objet JSON valide.

Labels :
- tier_1     : fabricant ou acheteur de {sector} (client potentiel principal)
- tier_2     : sous-traitant, assembleur, intégrateur (partenaire potentiel)
- competitor : câbleur/faisceau low-cost concurrent de SBT (Maroc/Tunisie/Roumanie/Bulgarie)
- unknown    : hors secteur ou information insuffisante

Entreprise :
Titre   : {title}
Snippet : {snippet}
Domaine : {domain}
Pays    : {country}

Format : {{"label": "tier_1", "confidence": 0.85, "reason": "..."}}
"""


def classify_by_llm(
    title: str,
    snippet: str,
    domain: str = "",
    country: str = "",
    sector: str = "câblage électrique",
) -> dict:
    """Classify a company via Claude Haiku (synchronous)."""
    prompt = _CLASSIFY_PROMPT.format(
        sector=sector, title=title, snippet=snippet,
        domain=domain, country=country,
    )
    try:
        msg = _get_claude_sync().messages.create(
            model=settings.claude_fast_model,
            max_tokens=256,
            messages=[{"role": "user", "content": prompt}],
        )
        data = _extract_json(msg.content[0].text)
        return {
            "label":      data.get("label", "unknown"),
            "confidence": float(data.get("confidence", 0.0)),
            "reason":     data.get("reason", "classification LLM"),
        }
    except Exception as e:
        return {"label": "unknown", "confidence": 0.0, "reason": f"erreur: {e}"}


def label_to_tier(label: str) -> int:
    return {"tier_1": 1, "tier_2": 2, "competitor": 3}.get(label, 0)


# ── Search collection ─────────────────────────────────────────────────────────

async def search_and_collect(
    queries: list[str],
    mcp_client: MCPSearchClient,
    max_per_query: int = 10,
) -> list[dict]:
    results = []
    for query in queries:
        logger.info(f"[Search] {query[:80]}")
        try:
            hits = await mcp_client.search(query, max_results=max_per_query)
            for r in hits:
                url     = r.get("url", "").strip()
                title   = r.get("title", "").strip()
                snippet = r.get("body", "").strip()
                if not is_valid_url(url):
                    continue
                results.append({
                    "title": title, "url": url,
                    "snippet": snippet,
                    "domain": extract_domain(url),
                    "query": query,
                })
        except Exception as e:
            logger.warning(f"Erreur search '{query[:40]}': {e}")
        await asyncio.sleep(settings.request_delay_seconds)
    return results


# ── Main pipeline ─────────────────────────────────────────────────────────────

async def run_pipeline(
    max_per_query: int = 10,
    country: str | None = None,
    sector: str | None = None,
) -> dict:
    """
    Full Target Searcher pipeline.

    Args:
        max_per_query: max Serper results per query
        country: strict country filter (e.g. "Italie") — only companies in this country
        sector: sector to search (e.g. "coffrets électriques industriels")
    """
    logger.info(f"=== Target Searcher — Démarrage | country={country} | sector={sector} ===")
    init_db()

    # Known domains (dedup)
    sqlite_domains = get_known_domains()
    try:
        with GraphStore() as gs:
            neo4j_domains = gs.get_known_domains()
    except Exception as e:
        logger.warning(f"Neo4j indisponible pour dédup: {e}")
        neo4j_domains = set()
    already_known = sqlite_domains | neo4j_domains

    # Generate queries
    effective_sector = sector or "câblage électrique industriel"
    if country and sector:
        logger.info(f"Génération de requêtes dynamiques pour {country} / {sector}...")
        queries = await generate_dynamic_queries(country, effective_sector)
    else:
        queries = {"tier1": _DEFAULT_TIER1, "tier2": _DEFAULT_TIER2, "competitors": _DEFAULT_COMPETITORS}

    # Collect search results
    async with MCPSearchClient() as client:
        logger.info("Étape 1/4 — Recherche prospects (Tier 1 + Tier 2)")
        tier1_raw = await search_and_collect(queries["tier1"], client, max_per_query)
        tier2_raw = await search_and_collect(queries["tier2"], client, max_per_query)

        logger.info("Étape 2/4 — Recherche concurrents")
        comp_raw  = await search_and_collect(queries["competitors"], client, max_per_query)

    all_raw = tier1_raw + tier2_raw + comp_raw
    logger.info(f"{len(all_raw)} résultats bruts collectés")

    # Deduplication
    logger.info("Étape 3/4 — Déduplication")
    deduped = deduplicate(all_raw)
    deduped = [r for r in deduped if r["domain"].replace("www.", "") not in already_known]
    logger.info(f"{len(deduped)} résultats après déduplication")

    # Classification + country filter
    logger.info("Étape 4/4 — Classification Claude + filtrage pays")
    final_results: list[dict] = []
    competitors:   list[dict] = []
    skipped_country = 0

    for r in deduped:
        # ── STRICT COUNTRY FILTER ──
        if country:
            guessed = _guess_country_from_url_and_text(r["url"], r["title"], r["snippet"])
            if guessed and guessed != country:
                skipped_country += 1
                logger.debug(f"Ignoré (pays={guessed}, cible={country}): {r['domain']}")
                continue

        classification = classify_by_llm(
            r["title"], r["snippet"], r["domain"],
            country=country or "", sector=effective_sector,
        )
        label      = classification["label"]
        confidence = classification["confidence"]
        reason     = classification["reason"]
        tier       = label_to_tier(label)

        if tier == 0:
            continue

        score = int(confidence * 100)
        save_search_result(
            url=r["url"], domain=r["domain"],
            title=r["title"], snippet=r["snippet"],
            query=r["query"], tier_guess=tier,
            tier_final=tier, score=score,
            source="serper_mcp",
        )

        entry = {
            "title":      r["title"],
            "url":        r["url"],
            "domain":     r["domain"],
            "query":      r["query"],
            "label":      label,
            "tier":       tier,
            "confidence": confidence,
            "reason":     reason,
            "score":      score,
            "country":    country,
        }
        final_results.append(entry)
        if tier == 3:
            competitors.append(entry)

        logger.info(
            f"{'CONCUR' if tier == 3 else f'Tier{tier}'} | "
            f"{r['domain']} | conf={confidence:.2f} | {reason[:60]}"
        )

    if country:
        logger.info(f"Filtre pays '{country}' — {skipped_country} résultats exclus")

    logger.success(
        f"{len(final_results)} résultats sauvegardés "
        f"({len(competitors)} concurrents)"
    )
    return {
        "results":     final_results,
        "competitors": competitors,
        "country":     country,
        "sector":      effective_sector,
    }


# ── CLI ───────────────────────────────────────────────────────────────────────

async def main_async():
    print("=== Target Searcher — Mode interactif ===")
    country = input("Pays cible (laisser vide = tous): ").strip() or None
    sector  = input("Secteur (laisser vide = défaut): ").strip() or None
    n       = input("Résultats par query [5]: ").strip()
    max_per = int(n) if n.isdigit() else 5

    data = await run_pipeline(max_per_query=max_per, country=country, sector=sector)
    results = data["results"]
    print(f"\n=== RÉSULTATS ({len(results)} total) ===")
    for i, r in enumerate(results[:20], 1):
        tag = "CONCUR" if r["tier"] == 3 else f"Tier{r['tier']}"
        print(f"{i:02d}. [{tag}] {r['domain']} | conf={r['confidence']:.2f} | {r['reason'][:60]}")


if __name__ == "__main__":
    asyncio.run(main_async())
