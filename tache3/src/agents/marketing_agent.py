"""
Marketing Agent — Pipeline complet intégré.

Étapes exécutées dans l'ordre :
  1. Chargement de toutes les entreprises Neo4j
  2. Scoring multidimensionnel (temperature=0, déterministe)
  3. Analyse Tier 1 / Tier 2 / Concurrents via Claude Sonnet
  4. XAI automatique pour TOUTES les entreprises scorées  ← mis en cache
  5. Plan de ciblage stratégique
  6. Pitchs personnalisés (top 10, enrichis par le XAI)
  7. Persistance Neo4j + export JSON + CSV

Après exécution : Dashboard, Marketing et XAI sont tous alimentés.
La page XAI retourne instantanément depuis le cache — aucune re-génération.
"""

import asyncio
import csv
import json
import os
import re
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

import anthropic
from loguru import logger

from src.config import settings
from src.scoring.scorer import score_company
from src.scoring.xai import explain_company
from src.storage.graph_store import GraphStore

# ── Paths ──────────────────────────────────────────────────────────────────────
# Override possible via SBT_EXPORT_DIR (utilisé par run_for_integration.py).

EXPORT_DIR   = Path(os.environ.get("SBT_EXPORT_DIR", "data/exports"))
RESULTS_FILE = EXPORT_DIR / "marketing_results_latest.json"


# ── Claude client ──────────────────────────────────────────────────────────────

def _get_claude() -> anthropic.AsyncAnthropic:
    return anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)


# ── LLM helpers ───────────────────────────────────────────────────────────────

def _extract_json(text: str) -> dict:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            try:
                return json.loads(m.group())
            except json.JSONDecodeError:
                pass
    return {}


async def _llm(prompt: str, smart: bool = True, max_tokens: int = 2048) -> dict:
    model = settings.claude_smart_model if smart else settings.claude_fast_model
    try:
        msg = await _get_claude().messages.create(
            model=model,
            max_tokens=max_tokens,
            temperature=0,
            messages=[{"role": "user", "content": prompt}],
        )
        return _extract_json(msg.content[0].text)
    except Exception as e:
        logger.error(f"[Marketing/_llm] {model}: {e}")
        return {}


# ── Formatage ──────────────────────────────────────────────────────────────────

def _fmt(companies: list[dict], max_desc: int = 200) -> str:
    """
    Riche format pour le LLM marketing : on passe TOUTES les infos
    issues des deux agents amont (searcher → snippet/score, scrapper → contacts/mentions)
    pour que l'analyse soit ancrée dans des données réelles, pas génériques.
    """
    lines = []
    for c in companies:
        name = c.get("name", "N/A")
        # ── ligne principale
        parts = [f"• **{name}**"]

        # tier + pays (vient du scrapper)
        if c.get("tier"):
            tier_label = {1: "Tier 1 (fabricant coffrets)",
                          2: "Tier 2 (assembleur/intégrateur)",
                          3: "Tier 3 (concurrent)"}.get(c["tier"], f"Tier {c['tier']}")
            parts.append(tier_label)
        if c.get("country"):
            parts.append(f"📍 {c['country']}")

        # signaux scoring (searcher)
        if c.get("score_final") is not None:
            parts.append(f"score={c['score_final']}/100")
        elif c.get("confidence") is not None:
            parts.append(f"confidence={c['confidence']}")

        # contacts (scrapper)
        contacts = []
        if c.get("email"):    contacts.append(f"email:{c['email']}")
        if c.get("phone"):    contacts.append(f"tél:{c['phone']}")
        if c.get("linkedin"): contacts.append(f"linkedin:✓")
        if contacts:
            parts.append(" / ".join(contacts))

        # mentions issues du graphe Neo4j (scrapper a détecté qui mentionne qui)
        mentions = c.get("mentions_in") or c.get("mentioned_by_count")
        if mentions:
            parts.append(f"cité par {mentions} autres")

        head = " | ".join(parts)

        # ── description (snippet du searcher + extraction LLM du scrapper)
        desc_lines = []
        if c.get("description"):
            desc_lines.append(f"   {c['description'][:max_desc]}")
        if c.get("address"):
            desc_lines.append(f"   adresse: {c['address']}")
        if c.get("website"):
            desc_lines.append(f"   site: {c['website']}")

        block = head + ("\n" + "\n".join(desc_lines) if desc_lines else "")
        lines.append(block)
    return "\n\n".join(lines) or "Aucune entreprise"


def _country(address: str | None, website: str | None = None, fallback: str = "France") -> str:
    if website:
        try:
            host = urlparse(website).netloc.lower().replace("www.", "")
            for tld, c in {".it":"Italie",".de":"Allemagne",".es":"Espagne",".fr":"France",
                           ".ma":"Maroc",".tn":"Tunisie",".ro":"Roumanie",".bg":"Bulgarie",
                           ".pl":"Pologne",".pt":"Portugal",".be":"Belgique",".nl":"Pays-Bas"}.items():
                if host.endswith(tld):
                    return c
        except Exception:
            pass
    if address:
        a = address.lower()
        for country, kws in {
            "Italie":   ["itali","milano","roma","torino"],
            "Espagne":  ["spain","españa","madrid","barcelona"],
            "Allemagne":["deutsch","germany","münchen","berlin"],
            "Maroc":    ["maroc","casablanca","tanger","rabat"],
            "Tunisie":  ["tunisie","tunis","sfax","sousse"],
        }.items():
            if any(k in a for k in kws):
                return country
    return fallback


# ── Prompts ────────────────────────────────────────────────────────────────────

_P_TIER1 = """\
Tu es un expert stratégie commerciale B2B industrielle.
SBT (Tunisie) fabrique des câblages électriques et cherche à devenir sous-traitant de fabricants européens.

Fabricants Tier 1 identifiés (coffrets/armoires électriques) — données réelles scrapées :
{companies}

Analyse et retourne UNIQUEMENT un JSON valide. Pour CHAQUE prospect tu dois noter 4 critères de 0 à 100 et JUSTIFIER chaque note avec un fait observable dans les données fournies (pas de phrase générique).

{{
  "top_prospects": [
    {{
      "name": "...",
      "priority": "haute|moyenne|faible",
      "scores": {{
        "fit_metier":      {{"value": 85, "why": "fabrique des coffrets BT — coeur de cible SBT, citation : 'armoires électriques basse tension' dans description"}},
        "joignabilite":    {{"value": 70, "why": "email contact + LinkedIn présents, téléphone manquant"}},
        "notoriete":       {{"value": 60, "why": "cité par 3 autres sociétés du graphe (mentions_in=3)"}},
        "potentiel_volume":{{"value": 90, "why": "groupe international (présence dans X pays selon description)"}}
      }},
      "score_global": 76,
      "score_global_why": "moyenne pondérée + bonus joignabilité confirmée — fit métier dominant",
      "reason": "pourquoi SBT devrait les contacter (1-2 phrases ancrées dans les données)",
      "contact_angle": "angle d'approche concret pour CETTE entreprise (référence à un détail spécifique de sa description)"
    }}
  ],
  "summary": "synthèse du potentiel Tier 1 en 2-3 phrases"
}}

Critères de priorité :
- haute  = score_global ≥ 75 ET fit_metier ≥ 70
- moyenne = 50 ≤ score_global < 75
- faible = score_global < 50

Règle absolue : chaque "why" doit citer un fait observable dans les données ci-dessus
(pays, score initial, mentions, contacts présents/absents, mots-clés de la description).
INTERDICTION de phrases vides ("entreprise prometteuse", "marché porteur", etc.).
"""

_P_TIER2 = """\
Tu es un expert stratégie commerciale B2B industrielle.
SBT (Tunisie) cherche des partenaires assembleurs/intégrateurs (Tier 2) pour sous-traiter le câblage.

Assembleurs/intégrateurs Tier 2 — données réelles scrapées :
{companies}

Pour CHAQUE prospect tu dois noter 4 critères de 0 à 100 avec JUSTIFICATION ancrée.

{{
  "top_prospects": [
    {{
      "name": "...",
      "priority": "haute|moyenne|faible",
      "scores": {{
        "complementarite": {{"value": 85, "why": "activité câblage industriel = même métier que SBT, citation précise du site"}},
        "joignabilite":    {{"value": 70, "why": "email pro + téléphone trouvés (signal de joignabilité directe)"}},
        "ancrage_marche":  {{"value": 60, "why": "PME locale italienne (Tier 2), score initial searcher=78/100"}},
        "potentiel_synergie": {{"value": 80, "why": "mentionné par 2 fabricants du graphe (proximité de l'écosystème)"}}
      }},
      "score_global": 74,
      "score_global_why": "fort fit métier + bonne joignabilité — partenaire commercialement actionnable",
      "reason": "synergies possibles avec SBT, ancrées dans une donnée spécifique",
      "contact_angle": "angle concret personnalisé"
    }}
  ],
  "summary": "synthèse du potentiel Tier 2 en 2 phrases"
}}

Règle absolue : chaque "why" doit citer un fait observable dans les données ci-dessus.
"""

_P_COMPETITORS = """\
Tu es un expert en intelligence compétitive industrielle.
SBT (Tunisie, câblage électrique) face à ces concurrents (donnees réelles) :
{companies}

Retourne UNIQUEMENT un JSON valide. Pour CHAQUE concurrent, donne 3 scores (0-100) avec justification ancrée.

{{
  "competitor_analysis": [
    {{
      "name": "...",
      "country": "...",
      "threat_level": "haute|moyenne|faible",
      "scores": {{
        "menace_directe":   {{"value": 80, "why": "même métier (câblage industriel) — citation précise depuis description"}},
        "force_industrielle": {{"value": 90, "why": "groupe X salariés + Y sites mentionnés"}},
        "vulnerabilite_face_sbt": {{"value": 60, "why": "structure lourde, coûts opérationnels élevés vs SBT nearshore"}}
      }},
      "threat_score": 76,
      "threat_score_why": "menace réelle mais SBT garde un avantage prix/réactivité",
      "strengths": "points forts ancrés dans la description (1 phrase)",
      "sbt_advantage": "avantage CONCRET de SBT face à ce concurrent (pas générique)"
    }}
  ],
  "competitive_summary": "positionnement compétitif de SBT en 2-3 phrases ancrées dans les données"
}}

Règle absolue : chaque "why" doit citer un fait observable dans les données ci-dessus.
"""

_P_TARGETING = """\
Tu es Marc, directeur du développement commercial chez Smart Brain Technologie (Tunisie, câblage électrique industriel et faisceaux).
Tu prépares un plan d'attaque commercial concret en t'appuyant UNIQUEMENT sur les entreprises réellement scrapées et qualifiées par les deux agents amont (recherche web + extraction structurée).

DONNÉES RÉELLES À EXPLOITER — ne pas en inventer d'autres :

▸ FABRICANTS (Tier 1) — cibles directes pour devenir leur sous-traitant câblage :
{tier1_top}

▸ ASSEMBLEURS / INTÉGRATEURS (Tier 2) — cibles partenariat / sous-traitance industrielle :
{tier2_top}

Pour chaque prospect tu disposes de signaux concrets :
- pays (filtré strictement par l'agent scrapper)
- score (calculé par l'agent searcher sur la pertinence du contenu)
- email/téléphone/linkedin si trouvés (signal de joignabilité)
- description issue du site réel
- nombre de fois où l'entreprise est citée par d'autres (signal de notoriété graphe)

Construis un plan en 3 priorités basé sur ces données. Critères :
• priorité 1 = forte joignabilité (contacts trouvés) + forte notoriété (mentions) + score élevé → action sous 7 jours
• priorité 2 = un signal fort manquant → action ce mois
• priorité 3 = à creuser → action 1-3 mois

Retourne UNIQUEMENT un JSON valide :
{{
  "priorité_1": {{
    "entreprises": ["nom1", "nom2", ...],
    "action": "action très concrète cette semaine (qui contacter, par quel canal, avec quel argument personnalisé)",
    "message_cle": "argument commercial principal qui parle SPÉCIFIQUEMENT à ce groupe"
  }},
  "priorité_2": {{
    "entreprises": ["..."],
    "action": "action ce mois",
    "message_cle": "..."
  }},
  "priorité_3": {{
    "entreprises": ["..."],
    "action": "action 1-3 mois",
    "message_cle": "..."
  }},
  "conseil_global": "conseil stratégique 2-3 phrases ancré dans les données : pays dominants observés, opportunités du graphe, angle de différenciation"
}}
"""

_P_PITCH = """\
Expert prospection B2B industrielle — génère un pitch sur mesure.

SBT (Tunisie) propose :
• Câblage électrique industriel + faisceaux
• Assemblage coffrets de comptage
• Sous-traitance pour fabricants européens
• Coûts 40-50% inférieurs à l'Europe, normes CE/RoHS, livraison rapide

Prospect :
- Nom      : {name}
- Activité : {description}
- Adresse  : {address}
- Email    : {email}
- Tier     : {tier_label}
- Pays     : {country}
- Score    : {score}/100
- Priorité : {priority}

Retourne UNIQUEMENT un JSON valide :
{{
  "subject":         "Objet email accrocheur et personnalisé (max 12 mots)",
  "pitch_email":     "Email complet 3-4 paragraphes, professionnel, personnalisé. LANGUE : {lang}",
  "pitch_linkedin":  "Message LinkedIn 3-4 phrases, direct, engageant. LANGUE : {lang}",
  "key_argument":    "Argument clé adapté à CETTE entreprise spécifiquement (1 phrase percutante)",
  "follow_up":       "Relance si pas de réponse après 7 jours (1-2 phrases)"
}}

Personnalise avec le nom, l'activité, le besoin concret que SBT peut combler.
"""

_LANG_MAP = {
    "Italie": "italien", "Allemagne": "allemand", "Espagne": "espagnol",
    "France": "français", "Portugal": "portugais", "Belgique": "français",
    "Pays-Bas": "anglais", "Maroc": "français", "Tunisie": "français",
}

_TIER_LABELS = {
    1: "Fabricant coffrets électriques",
    2: "Assembleur / intégrateur",
    3: "Concurrent câblage",
}


# ── Pipeline principal ─────────────────────────────────────────────────────────

async def run_marketing(sector: str = "câblage électrique industriel") -> dict:
    logger.info("=" * 60)
    logger.info("MARKETING AGENT — Pipeline intégré démarrage")
    logger.info("=" * 60)

    EXPORT_DIR.mkdir(parents=True, exist_ok=True)

    # ── 1. Chargement des entreprises ──────────────────────────────────────────
    with GraphStore() as gs:
        tier1_raw = gs.get_companies_by_tier(1)
        tier2_raw = gs.get_companies_by_tier(2)
        tier3_raw = gs.get_companies_by_tier(3)

    all_raw = tier1_raw + tier2_raw + tier3_raw
    logger.info(f"[Marketing] T1={len(tier1_raw)} T2={len(tier2_raw)} T3={len(tier3_raw)} total={len(all_raw)}")

    if not all_raw:
        logger.warning("[Marketing] Aucune entreprise — arrêt")
        empty = _empty_result("Aucune entreprise. Lancez Searcher + Scrapper d'abord.")
        _save_results(empty)
        return empty

    # ── 2. Scoring intégré (temperature=0 → stable) ────────────────────────────
    logger.info(f"[Marketing] Étape 1/6 — Scoring de {len(all_raw)} entreprises")
    scored_map: dict[str, dict] = {}

    for i, company in enumerate(all_raw):
        name = company.get("name", "")
        # Skip si déjà scoré (score_final non nul)
        if company.get("score_final") is not None:
            scored_map[name] = company
            logger.debug(f"[Scoring] {name} — déjà scoré ({company['score_final']}/100), skip")
            continue

        try:
            scores = await score_company(
                name=name,
                description=company.get("description", ""),
                country=company.get("country", ""),
                tier=company.get("tier", 0),
                sector=sector,
                email=company.get("email", ""),
                linkedin=company.get("linkedin", ""),
            )
            with GraphStore() as gs:
                gs.update_company_scores(name, scores)
            company = {**company, **{
                "score_final":       scores["final"],
                "score_relevance":   scores["relevance"],
                "score_potential":   scores["potential"],
                "score_competition": scores["competition"],
                "score_market":      scores["market"],
            }}
            logger.info(f"[Scoring] {i+1}/{len(all_raw)} {name} → {scores['final']}/100")
        except Exception as e:
            logger.warning(f"[Scoring] Erreur {name}: {e}")

        scored_map[name] = company

    # Rebuild tier lists with scores
    tier1 = [scored_map[c["name"]] for c in tier1_raw if c["name"] in scored_map]
    tier2 = [scored_map[c["name"]] for c in tier2_raw if c["name"] in scored_map]
    tier3 = [scored_map[c["name"]] for c in tier3_raw if c["name"] in scored_map]

    # Sort by score desc
    tier1.sort(key=lambda c: c.get("score_final") or 0, reverse=True)
    tier2.sort(key=lambda c: c.get("score_final") or 0, reverse=True)
    tier3.sort(key=lambda c: c.get("score_final") or 0, reverse=True)

    # ── 3. Analyse tiers ───────────────────────────────────────────────────────
    logger.info("[Marketing] Étape 2/6 — Analyse Tier 1")
    tier1_analysis: dict = {}
    if tier1:
        tier1_analysis = await _llm(_P_TIER1.format(companies=_fmt(tier1[:20])))
        logger.info(f"[Marketing] Tier1 → {len(tier1_analysis.get('top_prospects', []))} prospects")

    logger.info("[Marketing] Étape 3/6 — Analyse Tier 2")
    tier2_analysis: dict = {}
    if tier2:
        tier2_analysis = await _llm(_P_TIER2.format(companies=_fmt(tier2[:20])))
        logger.info(f"[Marketing] Tier2 → {len(tier2_analysis.get('top_prospects', []))} prospects")

    logger.info("[Marketing] Étape 4/6 — Analyse Concurrents")
    competitor_analysis: dict = {}
    if tier3:
        competitor_analysis = await _llm(
            _P_COMPETITORS.format(companies=_fmt(tier3[:15])), smart=False
        )

    # ── 4. XAI — toutes entreprises scorées (avant pitchs pour les enrichir) ────
    logger.info(f"[Marketing] Étape 5/7 — XAI pour {len(scored_map)} entreprises scorées")
    xai_results: dict[str, dict] = {}
    xai_total = len(scored_map)

    # Rate limit: 8 000 output tokens/min. max_tokens=2000 → max 4 calls/min → 15s gap
    _XAI_DELAY = 15  # seconds between XAI calls

    for xai_idx, (company_name, company) in enumerate(scored_map.items()):
        score_final = company.get("score_final")
        if score_final is None:
            continue  # pas encore scorée, skip

        # Délai pour rester sous la limite de débit (sauf pour le 1er appel)
        if xai_idx > 0:
            await asyncio.sleep(_XAI_DELAY)

        scores = {
            "relevance":   company.get("score_relevance"),
            "potential":   company.get("score_potential"),
            "competition": company.get("score_competition"),
            "market":      company.get("score_market"),
            "final":       score_final,
        }
        try:
            xai = await explain_company(company, scores)
            xai_results[company_name] = xai
            try:
                with GraphStore() as gs:
                    gs.update_company_xai(company_name, xai)
            except Exception as e:
                logger.warning(f"[XAI] Neo4j save failed for {company_name}: {e}")
            logger.info(
                f"[XAI] {xai_idx+1}/{xai_total} {company_name} "
                f"→ {xai.get('recommendation','?')} ({xai.get('confidence',0)*100:.0f}%)"
            )
        except Exception as e:
            logger.warning(f"[XAI] Erreur pour {company_name}: {e}")

    logger.info(f"[Marketing] XAI terminé — {len(xai_results)}/{xai_total} entreprises analysées")

    # ── 5. Plan de ciblage ─────────────────────────────────────────────────────
    logger.info("[Marketing] Étape 6/7 — Plan de ciblage")
    t1_top = json.dumps(tier1_analysis.get("top_prospects", [])[:5], ensure_ascii=False)
    t2_top = json.dumps(tier2_analysis.get("top_prospects", [])[:5], ensure_ascii=False)
    targeting_plan: dict = {}
    if t1_top != "[]" or t2_top != "[]":
        targeting_plan = await _llm(_P_TARGETING.format(tier1_top=t1_top, tier2_top=t2_top))

    # ── 6. Pitchs pour les top prospects (enrichis par XAI) ───────────────────
    logger.info("[Marketing] Étape 7/7 — Pitchs personnalisés")

    # Collect top prospects (haute + moyenne, max 10)
    top_prospects: list[tuple[dict, int]] = []
    for p in tier1_analysis.get("top_prospects", []):
        if p.get("priority") in ("haute", "moyenne"):
            cdata = scored_map.get(p["name"])
            if cdata:
                top_prospects.append((cdata, 1, p.get("priority"), p.get("contact_angle", "")))
    for p in tier2_analysis.get("top_prospects", []):
        if p.get("priority") in ("haute", "moyenne"):
            cdata = scored_map.get(p["name"])
            if cdata:
                top_prospects.append((cdata, 2, p.get("priority"), p.get("contact_angle", "")))

    # Fallback: if no top prospects from LLM, use highest-scored companies
    if not top_prospects:
        logger.warning("[Marketing] Aucun top_prospect LLM — fallback sur scores")
        for c in sorted(all_raw, key=lambda x: x.get("score_final") or 0, reverse=True)[:10]:
            top_prospects.append((scored_map.get(c["name"], c), c.get("tier", 1), "moyenne", ""))

    pitches: list[dict] = []

    for company, tier_num, priority, contact_angle in top_prospects[:10]:
        name    = company.get("name", "")
        country = company.get("country") or _country(company.get("address"), company.get("website"))
        lang    = _LANG_MAP.get(country, "français")

        # Enrichir le pitch avec le meilleur angle XAI si disponible
        xai_angle = xai_results.get(name, {}).get("best_angle", "")
        effective_angle = contact_angle or xai_angle

        pitch_result = await _llm(
            _P_PITCH.format(
                name=name,
                description=(company.get("description") or "N/A")[:200],
                address=company.get("address", "N/A"),
                email=company.get("email", "N/A"),
                tier_label=_TIER_LABELS.get(tier_num, "Entreprise"),
                country=country,
                score=company.get("score_final", "N/A"),
                priority=priority,
                lang=lang,
            ),
            smart=True,
            max_tokens=1500,
        )

        if pitch_result:
            pitch_result.update({
                "company":       name,
                "tier":          tier_num,
                "priority":      priority,
                "contact_angle": effective_angle,
                # Attacher le résumé XAI au pitch pour la page Marketing
                "xai_summary":   xai_results.get(name, {}).get("summary", ""),
                "xai_reco":      xai_results.get(name, {}).get("recommendation", ""),
            })
            pitches.append(pitch_result)

            key_arg = pitch_result.get("key_argument", "")
            if key_arg:
                try:
                    with GraphStore() as gs:
                        gs.update_company_pitch(name, key_arg)
                except Exception as e:
                    logger.warning(f"[Marketing] pitch_angle save failed for {name}: {e}")

            logger.info(f"[Marketing] Pitch ✓ {name} ({country}, {priority})")

    logger.info(f"[Marketing] {len(pitches)} pitchs générés")

    # ── 6. Export CSV ──────────────────────────────────────────────────────────
    export_path = ""
    if pitches:
        export_path = _export_csv(pitches, scored_map)

    # ── 7. Strategy summary ────────────────────────────────────────────────────
    strategy_summary = (
        targeting_plan.get("conseil_global")
        or tier1_analysis.get("summary")
        or tier2_analysis.get("summary")
        or f"{len(pitches)} pitchs générés pour {len(all_raw)} entreprises scorées."
    )

    results = {
        "tier1_analysis":      tier1_analysis,
        "tier2_analysis":      tier2_analysis,
        "competitor_analysis": competitor_analysis,
        "targeting_plan":      targeting_plan,
        "pitches":             pitches,
        "xai_results":         xai_results,
        "tier1_companies":     tier1,
        "tier2_companies":     tier2,
        "competitors":         tier3,
        "strategy_summary":    strategy_summary,
        "export_path":         export_path,
        "generated_at":        datetime.now().isoformat(),
        "stats": {
            "total_companies": len(all_raw),
            "scored":          len([c for c in all_raw if scored_map.get(c["name"], {}).get("score_final") is not None]),
            "pitches":         len(pitches),
            "xai":             len(xai_results),
            "high_priority":   len([c for c in all_raw if (scored_map.get(c["name"], {}).get("score_final") or 0) >= 70]),
        },
    }

    _save_results(results)
    logger.success("[Marketing] Pipeline complet terminé ✓")
    return results


# ── Persistance ────────────────────────────────────────────────────────────────

def _save_results(results: dict) -> None:
    """Persist marketing results to JSON so they survive Flask restarts."""
    try:
        EXPORT_DIR.mkdir(parents=True, exist_ok=True)
        with open(RESULTS_FILE, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2, default=str)
        logger.debug(f"[Marketing] Résultats sauvegardés → {RESULTS_FILE}")
    except Exception as e:
        logger.warning(f"[Marketing] Impossible de sauvegarder les résultats: {e}")


def load_results() -> dict:
    """Load latest marketing results from disk (used by Flask on startup)."""
    if RESULTS_FILE.exists():
        try:
            with open(RESULTS_FILE, encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"[Marketing] Impossible de charger les résultats: {e}")
    return {}


# ── Export CSV ─────────────────────────────────────────────────────────────────

def _export_csv(pitches: list[dict], companies_map: dict) -> str:
    date_str  = datetime.now().strftime("%Y%m%d_%H%M")
    filepath  = str(EXPORT_DIR / f"prospects_SBT_{date_str}.csv")
    fieldnames = [
        "priorité", "tier", "nom", "pays", "score",
        "email", "téléphone", "site", "linkedin",
        "objet_email", "argument_clé", "pitch_email", "pitch_linkedin", "relance",
    ]
    with open(filepath, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for pitch in pitches:
            name  = pitch.get("company", "")
            cdata = companies_map.get(name, {})
            writer.writerow({
                "priorité":       pitch.get("priority", ""),
                "tier":           pitch.get("tier", ""),
                "nom":            name,
                "pays":           cdata.get("country", ""),
                "score":          cdata.get("score_final", ""),
                "email":          cdata.get("email", ""),
                "téléphone":      cdata.get("phone", ""),
                "site":           cdata.get("website", ""),
                "linkedin":       cdata.get("linkedin", ""),
                "objet_email":    pitch.get("subject", ""),
                "argument_clé":   pitch.get("key_argument", "").replace(",", " "),
                "pitch_email":    pitch.get("pitch_email", "").replace("\n", " ").replace(",", " "),
                "pitch_linkedin": pitch.get("pitch_linkedin", "").replace(",", " "),
                "relance":        pitch.get("follow_up", "").replace(",", " "),
            })
    logger.success(f"[Marketing] CSV → {filepath} ({len(pitches)} lignes)")
    return filepath


def _empty_result(msg: str) -> dict:
    return {
        "tier1_analysis": {}, "tier2_analysis": {}, "competitor_analysis": {},
        "targeting_plan": {}, "pitches": [], "tier1_companies": [],
        "tier2_companies": [], "competitors": [], "strategy_summary": msg,
        "export_path": "", "generated_at": datetime.now().isoformat(),
        "stats": {"total_companies": 0, "scored": 0, "pitches": 0, "high_priority": 0},
    }


# ── Entrypoint ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_marketing())
