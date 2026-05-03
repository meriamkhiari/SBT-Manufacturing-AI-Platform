"""
Multifactorial scoring engine — deterministic (temperature=0).

4 dimensions:
  relevance   (0.35) — secteur / pays
  potential   (0.30) — opportunité commerciale
  competition (0.20) — positionnement concurrentiel
  market      (0.15) — notoriété / certifications

Final = weighted average 0–100.
"""

import json
import re

import anthropic
from loguru import logger

from src.config import settings


def _get_claude() -> anthropic.AsyncAnthropic:
    return anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)


_SCORING_PROMPT = """\
Tu es un expert en scoring de prospects B2B industriel.
SBT est une entreprise tunisienne de câblage électrique cherchant des clients/partenaires européens.

Analyse cette entreprise et retourne UNIQUEMENT un objet JSON valide, sans aucun texte avant ou après, sans markdown.

Entreprise :
- Nom         : {name}
- Description : {description}
- Pays        : {country}
- Tier        : {tier} — {tier_label}
- Secteur     : {sector}
- Email       : {email}
- LinkedIn    : {linkedin}

Retourne exactement ce JSON (entiers 0-100) :
{{
  "relevance":   <int 0-100>,
  "potential":   <int 0-100>,
  "competition": <int 0-100>,
  "market":      <int 0-100>,
  "rationale": {{
    "relevance_reason":   "<1 phrase factuelle>",
    "potential_reason":   "<1 phrase factuelle>",
    "competition_reason": "<1 phrase factuelle>",
    "market_reason":      "<1 phrase factuelle>"
  }}
}}

Barèmes stricts :
- relevance   : 90-100=secteur câblage exact + pays cible | 70-89=secteur proche | 40-69=secteur connexe | <40=hors sujet
- potential   : 90-100=grande entreprise internationale | 70-89=entreprise établie | 40-69=PME | <40=très petite structure
- competition : 90-100=quasi-aucun concurrent low-cost | 50-70=concurrence modérée | <40=marché saturé (menace SBT)
- market      : 90-100=email + LinkedIn + certifications | 60-80=présence partielle | <40=peu de données
- Tier 1 (fabricants) : booster relevance et potential (+10 si actif dans coffrets)
- Tier 2 (sous-traitants) : booster potential et market
- Tier 3 (concurrents) : competition DOIT être bas (<50) si forte menace pour SBT
"""

_TIER_LABELS = {
    1: "Fabricant coffrets / armoires électriques",
    2: "Sous-traitant câblage / assembleur",
    3: "Concurrent câblage low-cost",
}


def _extract_json(raw: str) -> dict:
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if m:
            try:
                return json.loads(m.group())
            except json.JSONDecodeError:
                pass
    return {}


def _clamp(v, default: int = 50) -> int:
    if v is None:
        return default
    try:
        return max(0, min(100, int(v)))
    except (TypeError, ValueError):
        return default


async def score_company(
    name: str,
    description: str,
    country: str,
    tier: int,
    sector: str = "câblage électrique industriel",
    email: str = "",
    linkedin: str = "",
) -> dict:
    """Score one company. Returns deterministic scores (temperature=0)."""
    prompt = _SCORING_PROMPT.format(
        name=name or "N/A",
        description=(description or "N/A")[:400],
        country=country or "N/A",
        tier=tier,
        tier_label=_TIER_LABELS.get(tier, "Inconnu"),
        sector=sector,
        email=email or "N/A",
        linkedin=linkedin or "N/A",
    )

    try:
        msg = await _get_claude().messages.create(
            model=settings.claude_fast_model,
            max_tokens=600,
            temperature=0,          # deterministic — same input → same score
            messages=[{"role": "user", "content": prompt}],
        )
        data = _extract_json(msg.content[0].text)

        relevance   = _clamp(data.get("relevance"))
        potential   = _clamp(data.get("potential"))
        competition = _clamp(data.get("competition"))
        market      = _clamp(data.get("market"))

        final = round(
            relevance   * settings.score_weight_relevance
            + potential   * settings.score_weight_potential
            + competition * settings.score_weight_competition
            + market      * settings.score_weight_market
        )

        logger.debug(f"[Scorer] {name} → R={relevance} P={potential} C={competition} M={market} F={final}")
        return {
            "relevance":   relevance,
            "potential":   potential,
            "competition": competition,
            "market":      market,
            "final":       final,
            "rationale":   data.get("rationale", {}),
        }

    except Exception as e:
        logger.warning(f"[Scorer] Erreur {name}: {e}")
        return {"relevance": 50, "potential": 50, "competition": 50, "market": 50, "final": 50, "rationale": {}}
