"""
XAI — Explainable AI module.

Generates structured human-readable explanations for why a company received
its scores, what factors influenced the result, and what action SBT should take.
Uses Claude Sonnet for deep, high-quality analysis.
"""

import asyncio
import json
import re

import anthropic
from loguru import logger

from src.config import settings


_XAI_PROMPT = """\
Tu es un expert senior en intelligence commerciale B2B industrielle et en IA explicable (XAI).
SBT est une entreprise tunisienne spécialisée dans la fabrication de câblage électrique, faisceaux automobiles et industriels.
SBT cherche à identifier des clients potentiels (Tier 1 — grands fabricants), des sous-traitants partenaires (Tier 2), et à surveiller ses concurrents (Tier 3).

Génère une analyse XAI COMPLÈTE et DÉTAILLÉE pour l'entreprise ci-dessous.
Retourne UNIQUEMENT un objet JSON valide, sans aucun texte avant ou après, sans markdown.

=== DONNÉES ENTREPRISE ===
{company_data}

=== SCORES CALCULÉS ===
- Pertinence sectorielle : {relevance}/100  (poids 35%)
- Potentiel business     : {potential}/100  (poids 30%)
- Contexte concurrentiel : {competition}/100 (poids 20%)
- Position marché        : {market}/100     (poids 15%)
- Score final pondéré    : {final}/100

=== SCHÉMA JSON DE RÉPONSE (respecte exactement ce schéma) ===
{{
  "recommendation": "HAUTE",
  "summary": "Résumé exécutif en 2-3 phrases : profil de l'entreprise, sa pertinence pour SBT, et le niveau de priorité",
  "analysis_complete": "Analyse approfondie en 6-8 phrases couvrant : le positionnement stratégique de l'entreprise, ses activités principales, sa présence géographique, son adéquation avec les capacités de SBT (câblage/faisceaux), les opportunités concrètes d'affaires, les risques potentiels, et la conclusion sur la priorité commerciale pour SBT",
  "score_explanation": {{
    "relevance": "Explication détaillée du score {relevance}/100 : quels éléments du secteur/activité de cette entreprise correspondent (ou non) aux produits SBT (câblage, faisceaux auto/industriel). Citez des indices précis tirés de la description.",
    "potential": "Explication détaillée du score {potential}/100 : estimation du volume d'affaires possible, présence internationale, taille de l'entreprise, besoins en câblage estimés, signaux de croissance ou de contraction.",
    "competition": "Explication détaillée du score {competition}/100 : niveau de concurrence sur ce segment, si cette entreprise est un concurrent direct, un partenaire ou un client, barrières à l'entrée, risques de cannibalisation.",
    "market": "Explication détaillée du score {market}/100 : dynamisme du marché/secteur de cette entreprise, tendances macro, risques géopolitiques, accessibilité du marché pour SBT."
  }},
  "factors": [
    {{
      "name": "Nom facteur clé 1 (ex: Secteur automobile, Présence multi-pays, Taille groupe)",
      "impact": "positif",
      "weight": 0.30,
      "explanation": "Explication factuelle et précise de ce facteur et comment il influence les scores"
    }},
    {{
      "name": "Nom facteur clé 2",
      "impact": "négatif",
      "weight": 0.20,
      "explanation": "..."
    }},
    {{
      "name": "Nom facteur clé 3",
      "impact": "neutre",
      "weight": 0.20,
      "explanation": "..."
    }},
    {{
      "name": "Nom facteur clé 4",
      "impact": "positif",
      "weight": 0.15,
      "explanation": "..."
    }},
    {{
      "name": "Nom facteur clé 5",
      "impact": "positif",
      "weight": 0.15,
      "explanation": "..."
    }}
  ],
  "strengths_sbt": [
    "Point fort #1 du point de vue de SBT : pourquoi cet aspect est une opportunité commerciale concrète pour SBT",
    "Point fort #2 : avantage compétitif ou opportunité spécifique que SBT peut exploiter avec cette entreprise",
    "Point fort #3 : synergies potentielles, besoins identifiés en câblage/faisceaux",
    "Point fort #4 : accessibilité, contacts, canaux d'approche disponibles"
  ],
  "weaknesses_sbt": [
    "Point faible #1 du point de vue de SBT : risque ou frein concret à la relation commerciale",
    "Point faible #2 : obstacle potentiel (taille, géographie, concurrence, manque de données)",
    "Point faible #3 : incertitude ou limitation dans l'analyse"
  ],
  "action": "Action commerciale PRÉCISE et CONCRÈTE que SBT devrait entreprendre dans les 30 prochains jours : canal (email/LinkedIn/appel/salon), message clé, interlocuteur cible, objectif de la prise de contact",
  "best_angle": "L'argument commercial principal et différenciateur adapté SPÉCIFIQUEMENT à cette entreprise : ce qui rend SBT unique et pertinent pour elle",
  "confidence": 0.75
}}

RÈGLES IMPÉRATIVES :
1. recommendation : HAUTE si final >= 70, MOYENNE si 40-69, FAIBLE si < 40
2. factors : exactement 4-5 facteurs, weights somme = 1.0
3. strengths_sbt : 3-5 points forts DEPUIS LA PERSPECTIVE DE SBT (opportunités pour SBT)
4. weaknesses_sbt : 2-4 faiblesses/risques DEPUIS LA PERSPECTIVE DE SBT
5. confidence : 0.3 si données très pauvres, 0.6 si données moyennes, 0.85+ si données riches
6. Sois FACTUEL, PRÉCIS, et adapté au contexte câblage/faisceaux industriel B2B
7. Ne jamais inventer des données non présentes — base-toi uniquement sur les données fournies
"""


async def explain_company(company: dict, scores: dict) -> dict:
    """
    Generate a full XAI explanation for a company's scores.

    Args:
        company: dict with name, country, tier, description, email, linkedin, address, website
        scores: dict with relevance, potential, competition, market, final, rationale

    Returns:
        dict with recommendation, summary, analysis_complete, score_explanation,
              factors, strengths_sbt, weaknesses_sbt, action, best_angle, confidence
    """
    company_lines = [
        f"- Nom        : {company.get('name', 'N/A')}",
        f"- Pays       : {company.get('country', 'N/A')}",
        f"- Tier       : {company.get('tier', 'N/A')}",
        f"- Activité   : {(company.get('description') or 'N/A')[:600]}",
        f"- Email      : {company.get('email', 'N/A')}",
        f"- LinkedIn   : {company.get('linkedin', 'N/A')}",
        f"- Adresse    : {company.get('address', 'N/A')}",
        f"- Site web   : {company.get('website', 'N/A')}",
    ]

    # Enrich with rationale if present
    rationale = scores.get("rationale", {})
    if rationale:
        company_lines.append("\n=== RAISONNEMENT DU SCORER ===")
        for key, val in rationale.items():
            company_lines.append(f"- {key}: {val}")

    prompt = _XAI_PROMPT.format(
        company_data="\n".join(company_lines),
        relevance=scores.get("relevance", 0),
        potential=scores.get("potential", 0),
        competition=scores.get("competition", 0),
        market=scores.get("market", 0),
        final=scores.get("final", 0),
    )

    # Retry on rate-limit (429) with exponential backoff
    _RETRY_WAITS = [30, 60, 120]  # seconds between retries

    raw = ""
    try:
        async with anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key) as client:
            for attempt, wait in enumerate([0] + _RETRY_WAITS):
                if wait:
                    logger.warning(f"[XAI] Rate limit pour {company.get('name')}, attente {wait}s (tentative {attempt+1}/4)")
                    await asyncio.sleep(wait)
                try:
                    msg = await client.messages.create(
                        model=settings.claude_smart_model,
                        max_tokens=2000,
                        temperature=0,
                        messages=[{"role": "user", "content": prompt}],
                    )
                    raw = msg.content[0].text.strip()
                    break  # succès
                except anthropic.RateLimitError:
                    if attempt == len(_RETRY_WAITS):
                        raise  # plus de tentatives
                    continue

        # Remove markdown code fences if present
        raw = re.sub(r'^```(?:json)?\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)
        raw = raw.strip()

        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            # Try to extract the outermost JSON object
            m = re.search(r'\{.*\}', raw, re.DOTALL)
            if m:
                try:
                    data = json.loads(m.group())
                except json.JSONDecodeError:
                    logger.warning(f"[XAI] JSON partiel pour {company.get('name')}, tentative de reconstruction")
                    data = {}
            else:
                data = {}

        # Backward-compat: if old format used "strengths"/"weaknesses", map them
        strengths_sbt  = data.get("strengths_sbt")  or data.get("strengths",  [])
        weaknesses_sbt = data.get("weaknesses_sbt") or data.get("weaknesses", [])

        return {
            "company":          company.get("name"),
            "recommendation":   data.get("recommendation", "MOYENNE"),
            "summary":          data.get("summary", ""),
            "analysis_complete": data.get("analysis_complete", ""),
            "score_explanation": data.get("score_explanation", {}),
            "factors":          data.get("factors", []),
            "strengths_sbt":    strengths_sbt,
            "weaknesses_sbt":   weaknesses_sbt,
            # keep old keys for backward-compat
            "strengths":        strengths_sbt,
            "weaknesses":       weaknesses_sbt,
            "action":           data.get("action", ""),
            "best_angle":       data.get("best_angle", ""),
            "confidence":       float(data.get("confidence", 0.5)),
            "scores":           scores,
        }

    except Exception as e:
        logger.error(f"[XAI] Erreur pour {company.get('name')}: {e}")
        return {
            "company":          company.get("name"),
            "recommendation":   "MOYENNE",
            "summary":          "Analyse XAI non disponible.",
            "analysis_complete": "",
            "score_explanation": {},
            "factors":          [],
            "strengths_sbt":    [],
            "weaknesses_sbt":   [],
            "strengths":        [],
            "weaknesses":       [],
            "action":           "Analyser manuellement.",
            "best_angle":       "",
            "confidence":       0.0,
            "scores":           scores,
        }
