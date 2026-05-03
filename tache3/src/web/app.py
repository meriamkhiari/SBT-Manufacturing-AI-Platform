"""
Flask API — SBT Intelligence Platform.

All Jinja2 templates are replaced by a React SPA served from frontend/dist/.
This file exposes only JSON API endpoints + SSE stream + static file serving.
"""

import asyncio
import json
import threading
import time
from pathlib import Path
from collections import defaultdict

from flask import Flask, jsonify, request, Response, send_from_directory
from flask_cors import CORS
from loguru import logger

from src.storage.database import get_connection, init_db, get_pending_search_results, delete_pending, delete_errors
from src.storage.graph_store import GraphStore

# ── App setup ─────────────────────────────────────────────────────────────────

BASE_DIR   = Path(__file__).resolve().parent
DIST_DIR   = BASE_DIR.parent.parent / "frontend" / "dist"

app = Flask(__name__, static_folder=str(DIST_DIR), static_url_path="")
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialisation DB une seule fois au démarrage (pas à chaque requête)
init_db()

# ── Global state ──────────────────────────────────────────────────────────────

_task_status: dict[str, dict] = {
    "searcher":  {"running": False, "message": "Prêt", "progress": 0},
    "scrapper":  {"running": False, "message": "Prêt", "progress": 0},
    "marketing": {"running": False, "message": "Prêt", "progress": 0},
    "scoring":   {"running": False, "message": "Prêt", "progress": 0},
}
_pipeline_context: dict = {"country": None, "sector": None}

# Load persisted marketing results from disk (survives Flask restarts)
def _load_marketing_results() -> dict:
    from src.agents.marketing_agent import load_results
    return load_results()

_marketing_results: dict = _load_marketing_results()

# Per-company XAI lock — prevents simultaneous generation for same company
_xai_locks: dict[str, threading.Lock] = defaultdict(threading.Lock)
_xai_locks_mutex = threading.Lock()

# ── Connaissance SBT pour le chatbot ─────────────────────────────────────────

SBT_SYSTEM_PROMPT = """You are the official virtual assistant of **Smart Brain Technologie (SBT)**, an industrial subcontracting company based in Tunisia, specialized in electrical wiring harnesses and electrical cabinets.

## YOUR ROLE
You represent SBT with professionalism and expertise. You answer questions about the company, its services, products, equipment, location, partnerships, and industrial capabilities. You are knowledgeable, helpful, and concise.

## CRITICAL LANGUAGE RULE
**Always detect the language of the user's message and respond in that exact same language.**
- If user writes in French → respond in French
- If user writes in English → respond in English
- If user writes in Arabic → respond in Arabic (العربية)
- If user writes in German → respond in German
- If user writes in Italian → respond in Italian
- If user writes in Spanish → respond in Spanish
- If user writes in any other language → respond in that language
Never switch languages unless the user does.

## COMPLETE COMPANY KNOWLEDGE BASE

### IDENTITY
- **Full Name**: Smart Brain Technologie (SBT)
- **Type**: Industrial subcontracting company (B2B)
- **Specialization**: Electrical wiring harnesses (faisceaux de câblage électrique) & electrical cabinets/panels (armoires et coffrets électriques)
- **Country**: Tunisia
- **Founded**: To meet the growing market need for quality electrical subcontracting

### LOCATION & CONTACT
- **Address**: Route Oum Hachem, next to Grombalia, 8021 Beni Khalled, Nabeul, Tunisia (~40 minutes from Tunis)
- **Landline**: +216 71 601 295
- **Mobile**: +216 98 702 325
- **Email**: contact@smartbtechnologie.com
- **Website**: www.smartbtechnologie.com
- **Facebook**: facebook.com/smartbraintechno
- **LinkedIn**: Smart Brain Technologie

### CORE SERVICES (5 Manufacturing Processes)
1. **Cutting (Coupe)** — Precision wire/cable cutting operations to required lengths
2. **Crimping (Sertissage)** — Connector crimping with automatic and semi-automatic machines
3. **Ultrasonic Welding (Soudure ultrason)** — High-precision metal-to-metal ultrasonic bonding for electrical connections
4. **Assembly (Assemblage)** — Full wiring harness assembly and electrical cabinet assembly
5. **Electrical Quality Control (Contrôle électrique)** — Comprehensive testing and QA with dedicated lab

### EQUIPMENT & MACHINERY
**Crimping Machines:**
- KOMAX ALPHA 433 — Automatic crimping machine (1 unit) — high-speed precision crimping
- KOMAX GAMMA 333 — Automatic crimping machine (1 unit) — multi-crimp capability
- HANKE 944 — Crimping machine (1 unit)
- Mecal crimping machines — (5 units)
- 50 Mecal applicators — for connector variety

**Cutting & Stripping:**
- Schleuninger — Cut & strip device (1 unit)
- SCHLEUNIGER US2300 — Stripping machine (1 unit)
- SCHLEUNIGER STRIP 9380 — Cut & strip unit (1 unit)
- SCHLEUNIGER US 2015 — Stripping machine (1 unit)

**Specialized Equipment:**
- SCHUNK — Ultrasonic metal welding units (2 units)
- IMAJE — Industrial printing/marking machines (2 units)
- Metallographic laboratory — for microstructure analysis and quality certification

### PRODUCTS
- Electrical wiring harnesses (faisceaux de câblage) for automotive and industrial sectors
- Electrical cabinets and panels (armoires/coffrets électriques)
- Cable assemblies with connectors
- Custom electrical sub-assemblies

### WORKFORCE & EXPERTISE
Highly qualified team covering:
- Industrial engineering & process planning
- Cable cutting operations
- Crimping procedures & connector assembly
- Wiring harness assembly
- Electrical quality control & testing
- Metrology and laboratory analysis

### MISSION & VALUES
SBT was founded to **"meet market needs in electrical subcontracting"** leveraging deep industry experience. Core values:
- **Quality-first** manufacturing with rigorous QC at every step
- **Cutting-edge equipment** (KOMAX, SCHLEUNIGER, SCHUNK)
- **Competitive cost** from Tunisia with European quality standards
- **Reliability** as a trusted industrial partner

### MARKET POSITION & STRATEGY
SBT is a **B2B industrial subcontractor** targeting:
- Tier 1: European electrical panel/cabinet manufacturers (fabricants de coffrets électriques)
- Tier 2: Cable assembly subcontractors needing capacity
- Potential clients in France, Italy, Germany, Spain, Belgium, and other EU countries
- Value proposition: European-quality production at competitive Tunisian costs

### HOW TO PARTNER WITH SBT
- Contact via email: contact@smartbtechnologie.com
- Call: +216 71 601 295 or +216 98 702 325
- Visit: Route Oum Hachem, Beni Khalled, Nabeul, Tunisia

## RESPONSE GUIDELINES
- **Be concise but complete** — answer exactly what was asked
- **Use bullet points** for lists of services, equipment, or features
- **Be warm and professional** — you represent the company
- **If asked about pricing** → say prices depend on volume/specifications and invite them to contact directly
- **If asked something you don't know** → honestly say "I don't have that specific information" and direct to contact@smartbtechnologie.com
- **Never invent** certifications, client names, or data not in the knowledge base
- **For contact requests** → always provide the full contact details (phone + email + address)
"""


# ── Internal helpers ──────────────────────────────────────────────────────────

def _get_sqlite_stats() -> dict:
    with get_connection() as conn:
        total   = conn.execute("SELECT COUNT(*) FROM search_results").fetchone()[0]
        pending = conn.execute("SELECT COUNT(*) FROM search_results WHERE status='pending'").fetchone()[0]
        scraped = conn.execute("SELECT COUNT(*) FROM search_results WHERE status='scraped'").fetchone()[0]
        error   = conn.execute("SELECT COUNT(*) FROM search_results WHERE status='error'").fetchone()[0]
        raw_cnt = conn.execute("SELECT COUNT(*) FROM raw_company").fetchone()[0]
    return {"total": total, "pending": pending, "scraped": scraped, "error": error, "raw_companies": raw_cnt}


def _run_async_in_thread(agent_name: str, coro_func, **kwargs):
    """Run an async coroutine in a dedicated thread without blocking Flask."""
    def _target():
        _task_status[agent_name].update({"running": True, "message": "En cours...", "progress": 0})
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(coro_func(**kwargs))
            _task_status[agent_name].update({"message": "Terminé", "progress": 100})
        except Exception as e:
            logger.error(f"[{agent_name}] Erreur: {e}")
            _task_status[agent_name].update({"message": f"Erreur: {str(e)[:120]}", "progress": 0})
        finally:
            _task_status[agent_name]["running"] = False

    threading.Thread(target=_target, daemon=True).start()


# ── SSE ───────────────────────────────────────────────────────────────────────

@app.route("/api/stream/status")
def stream_status():
    """Server-Sent Events stream — pushes agent status every second."""
    def _generate():
        while True:
            payload = json.dumps(_task_status)
            yield f"data: {payload}\n\n"
            time.sleep(1)

    return Response(
        _generate(),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Stats & status ────────────────────────────────────────────────────────────

@app.route("/api/stats")
def api_stats():
    return jsonify(_get_sqlite_stats())


# ── SQLite raw access (full database visibility) ─────────────────────────────

@app.route("/api/sqlite/search-results")
def api_sqlite_search_results():
    """Paginated SQLite search_results.
    Query params: status, domain, tier, min_score, limit, offset
    """
    from src.storage.database import list_search_results
    try:
        data = list_search_results(
            status=request.args.get("status") or None,
            domain=request.args.get("domain") or None,
            tier=request.args.get("tier", type=int),
            min_score=request.args.get("min_score", default=0, type=int),
            limit=request.args.get("limit", default=100, type=int),
            offset=request.args.get("offset", default=0, type=int),
        )
        return jsonify(data)
    except Exception as e:
        logger.error(f"[sqlite/search-results] {e}")
        return jsonify({"rows": [], "total": 0, "error": str(e)}), 500


@app.route("/api/sqlite/raw-companies")
def api_sqlite_raw_companies():
    """Paginated SQLite raw_company with parsed raw_json payload.
    Query params: status, search, limit, offset
    """
    from src.storage.database import list_raw_companies
    try:
        data = list_raw_companies(
            status=request.args.get("status") or None,
            search=request.args.get("search") or None,
            limit=request.args.get("limit", default=100, type=int),
            offset=request.args.get("offset", default=0, type=int),
        )
        return jsonify(data)
    except Exception as e:
        logger.error(f"[sqlite/raw-companies] {e}")
        return jsonify({"rows": [], "total": 0, "error": str(e)}), 500


@app.route("/api/status")
def api_status():
    return jsonify(_task_status)


# ── Countries ─────────────────────────────────────────────────────────────────

@app.route("/api/countries")
def api_countries():
    """Return unique countries present in Neo4j."""
    try:
        with GraphStore() as gs:
            countries = gs.get_countries()
        return jsonify({"countries": countries})
    except Exception as e:
        logger.error(f"[countries] {e}")
        return jsonify({"countries": []})


# ── Companies ─────────────────────────────────────────────────────────────────

@app.route("/api/companies")
def api_companies():
    """
    Paginated company list with filters.
    Query params: tier, country, min_score, limit, offset
    """
    tier       = request.args.get("tier", type=int)
    country    = request.args.get("country")
    min_score  = request.args.get("min_score", default=0, type=int)
    limit      = request.args.get("limit", default=100, type=int)
    offset     = request.args.get("offset", default=0, type=int)

    try:
        with GraphStore() as gs:
            data = gs.get_all_companies_paginated(
                tier=tier, country=country,
                min_score=min_score, limit=limit, offset=offset,
            )
        return jsonify(data)
    except Exception as e:
        logger.error(f"[companies] {e}")
        return jsonify({"companies": [], "total": 0, "error": str(e)}), 500


@app.route("/api/companies/<path:name>")
def api_company_detail(name: str):
    """Return full details for one company."""
    try:
        with GraphStore() as gs:
            company = gs.get_company_by_name(name)
        if company is None:
            return jsonify({"error": "Entreprise non trouvée"}), 404
        return jsonify(company)
    except Exception as e:
        logger.error(f"[company_detail] {e}")
        return jsonify({"error": str(e)}), 500


# ── Delete pending / error companies ─────────────────────────────────────────

@app.route("/api/delete-status", methods=["DELETE"])
def api_delete_status():
    """
    Supprime les entrées ayant un statut donné.
    Body JSON: { "status": "pending" | "error" }
    """
    body   = request.json or {}
    status = body.get("status", "").strip().lower()

    if status not in ("pending", "error"):
        return jsonify({"error": "Statut invalide. Valeurs acceptées: 'pending', 'error'"}), 400

    try:
        from src.storage.database import delete_by_status
        deleted = delete_by_status(status)
        logger.info(f"[delete-status] {deleted} entrées '{status}' supprimées")
        return jsonify({"deleted": deleted, "status": status})
    except Exception as e:
        logger.error(f"[delete-status] {e}")
        return jsonify({"error": str(e)}), 500


# ── Chatbot SBT ───────────────────────────────────────────────────────────────

@app.route("/api/chat", methods=["POST"])
def api_chat():
    """
    Chatbot intelligent SBT — Claude Sonnet avec historique complet de conversation.

    Body JSON:
    {
        "message": "...",             # dernier message utilisateur
        "history": [                  # historique optionnel
            {"role": "user",      "content": "..."},
            {"role": "assistant", "content": "..."},
            ...
        ]
    }
    """
    body    = request.json or {}
    message = (body.get("message") or "").strip()
    history = body.get("history", [])   # liste de {role, content}

    if not message:
        return jsonify({"error": "Message vide"}), 400

    # Valider et nettoyer l'historique
    clean_history = []
    for turn in history:
        role    = turn.get("role", "")
        content = (turn.get("content") or "").strip()
        if role in ("user", "assistant") and content:
            clean_history.append({"role": role, "content": content})

    # Ajouter le message courant
    clean_history.append({"role": "user", "content": message})

    # S'assurer que le premier message est de l'utilisateur (exigence API Anthropic)
    if clean_history and clean_history[0]["role"] != "user":
        clean_history = [m for m in clean_history if m["role"] == "user" or
                         clean_history.index(m) > 0]

    try:
        import anthropic
        from src.config import Settings

        cfg    = Settings()
        client = anthropic.Anthropic(api_key=cfg.anthropic_api_key)

        response = client.messages.create(
            model="claude-sonnet-4-6",   # Modèle performant pour un chatbot de qualité
            max_tokens=1024,
            system=SBT_SYSTEM_PROMPT,
            messages=clean_history,
        )

        reply = response.content[0].text if response.content else "I could not generate a response."
        return jsonify({"reply": reply})

    except Exception as e:
        logger.error(f"[chat] {e}")
        return jsonify({
            "reply": (
                "I'm sorry, I'm temporarily unavailable. "
                "Please contact us directly at **contact@smartbtechnologie.com** "
                "or call **+216 71 601 295**."
            )
        })


# ── Email outreach generator ──────────────────────────────────────────────────

@app.route("/api/generate-email", methods=["POST"])
def api_generate_email():
    """
    Génère un email d'outreach personnalisé pour une entreprise cible.

    Body JSON:
    {
        "company": {
            "name": "...",
            "tier": 1,
            "country": "...",
            "description": "...",
            "website": "...",
            "email": "...",
            "score_final": 85,
            "xai_recommendation": "HAUTE",
            "xai_summary": "..."
        },
        "lang": "fr"   // optional: "fr" | "en" | "de" | "it" | "es" | "ar" | ...
    }
    """
    body    = request.json or {}
    company = body.get("company") or {}
    lang    = (body.get("lang") or "fr").strip().lower()

    if not company.get("name"):
        return jsonify({"error": "Nom de l'entreprise manquant"}), 400

    # Map language codes to language names
    lang_names = {
        "fr": "French", "en": "English", "de": "German", "it": "Italian",
        "es": "Spanish", "ar": "Arabic", "pt": "Portuguese", "nl": "Dutch",
        "pl": "Polish",  "ru": "Russian", "zh": "Chinese",  "ja": "Japanese",
        "tr": "Turkish", "sv": "Swedish", "da": "Danish",   "fi": "Finnish",
        "ro": "Romanian","hu": "Hungarian","cs": "Czech",   "el": "Greek",
    }
    lang_name = lang_names.get(lang, "French")

    tier_labels = {1: "electrical cabinet / panel manufacturer", 2: "cable assembly subcontractor", 3: "competitor"}
    tier_label  = tier_labels.get(company.get("tier"), "industrial company")

    prompt = f"""You are a senior business development expert at Smart Brain Technologie (SBT), a Tunisian industrial subcontractor specialized in electrical wiring harnesses and electrical cabinets.

Write a **personalized, professional B2B outreach email** in **{lang_name}** to the following prospect company.

## PROSPECT COMPANY DATA
- **Name**: {company.get("name", "N/A")}
- **Type**: {tier_label}
- **Country**: {company.get("country", "N/A")}
- **Description**: {company.get("description", "N/A")}
- **Website**: {company.get("website", "N/A")}
- **Prospect Score**: {company.get("score_final", "N/A")}/100
- **XAI Recommendation**: {company.get("xai_recommendation", "N/A")}
- **XAI Summary**: {company.get("xai_summary", "N/A")}

## SBT PROFILE (sender)
- **Company**: Smart Brain Technologie (SBT)
- **Location**: Beni Khalled, Nabeul, Tunisia
- **Specialization**: Electrical wiring harnesses & electrical cabinets
- **Key Equipment**: KOMAX Alpha 433, KOMAX Gamma 333, SCHUNK ultrasonic welding, SCHLEUNIGER
- **Value Proposition**: European-quality production at competitive Tunisian costs
- **Contact**: contact@smartbtechnologie.com | +216 71 601 295 | www.smartbtechnologie.com

## EMAIL REQUIREMENTS
1. Write ONLY in {lang_name} — no other language
2. Subject line included at the top (formatted as: **Objet:** or **Subject:** depending on language)
3. Professional, warm, and concise (max 200 words for the body)
4. Personalize based on the company's profile, country, and type
5. Highlight SBT's relevant capabilities matching this prospect
6. End with a clear call-to-action (schedule a call or meeting)
7. Signature: include name placeholder [Votre nom], title, SBT contacts
8. Do NOT invent specific client names, certifications, or false claims

Write the complete email now:"""

    try:
        import anthropic
        from src.config import Settings

        cfg    = Settings()
        client = anthropic.Anthropic(api_key=cfg.anthropic_api_key)

        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1200,
            messages=[{"role": "user", "content": prompt}],
        )

        email_text = response.content[0].text if response.content else ""
        return jsonify({"email": email_text, "company": company.get("name"), "lang": lang})

    except Exception as e:
        logger.error(f"[generate-email] {e}")
        return jsonify({"error": str(e)}), 500


# ── SBT Advisor — Agent IA multi-modes ───────────────────────────────────────

@app.route("/api/advisor", methods=["POST"])
def api_advisor():
    """
    Agent IA unique avec 4 modes XAI :
      - score_explain   : Explique le score XAI d'une entreprise
      - strategy        : Plan de prospection priorisé sur toutes les entreprises
      - competitive     : Veille concurrentielle sur les Tier 3
      - pdf_report      : Génère un rapport PDF complet pour la direction

    Body JSON : { "mode": "...", "company": {...}, "companies": [...] }
    """
    import anthropic
    from src.config import Settings

    body      = request.json or {}
    mode      = body.get("mode", "").strip()
    company   = body.get("company") or {}
    companies = body.get("companies") or []

    if not mode:
        return jsonify({"error": "mode manquant"}), 400

    cfg    = Settings()
    client = anthropic.Anthropic(api_key=cfg.anthropic_api_key)

    # ── Mode 1 : Expliqueur de Score XAI ─────────────────────────────────────
    if mode == "score_explain":
        if not company.get("name"):
            return jsonify({"error": "company manquant"}), 400

        score = company.get('score_final', 'N/A')
        reco  = company.get('xai_recommendation', 'N/A')

        prompt = f"""Tu es Thomas, conseiller stratégique senior chez Smart Brain Technologie (SBT). Tu parles à un commercial qui vient de voir ce score et veut comprendre — vraiment comprendre — ce qui se cache derrière.

Ton style : humain, direct, comme si tu expliquais à un collègue autour d'un café. Pas de jargon inutile. Des phrases courtes. Des images concrètes. De l'enthousiasme quand c'est justifié, de la franchise quand ça l'est aussi.

─────────────────────────────
FICHE ENTREPRISE
─────────────────────────────
Entreprise   : {company.get('name', 'N/A')}
Pays         : {company.get('country', 'N/A')}
Profil       : Tier {company.get('tier', 'N/A')}
Description  : {company.get('description', 'N/A')}
Score final  : {score}/100  ({reco})
Résumé XAI   : {company.get('xai_summary', 'N/A')}

Scores détaillés :
  • Pertinence métier  : {company.get('score_pertinence', 'N/A')}/100
  • Potentiel business : {company.get('score_potentiel', 'N/A')}/100
  • Pression concurr.  : {company.get('score_competition', 'N/A')}/100
  • Attractivité marché: {company.get('score_marche', 'N/A')}/100
─────────────────────────────

Rédige l'analyse en respectant EXACTEMENT cette structure (garde les emojis et titres) :

### 🎯 En un mot — ce que dit ce score de {score}/100

Commence par une phrase d'accroche percutante qui capte l'essence de cette entreprise. Explique en 2-3 phrases naturelles ce que ce score révèle vraiment sur leur profil — pas une liste, un vrai paragraphe qui donne envie de lire la suite.

### ✅ Ce qui tire le score vers le haut

Pour chaque facteur positif, commence par **le facteur en gras** puis explique en une phrase pourquoi c'est un signal fort pour SBT. Sois précis : cite des chiffres, des détails du profil, des logiques business concrètes. 3 à 5 facteurs maximum.

### ⚠️ Ce qui retient le score

Même format. Sois honnête mais constructif — ce n'est pas une critique, c'est de la lucidité. 2 à 4 points.

### 🚀 Ce qui pourrait changer la donne

3 actions concrètes et réalistes que SBT (ou l'entreprise) pourrait faire pour que ce score monte. Chaque action = une phrase d'action directe, pas une vague suggestion.

### 💬 Mon conseil pour le commercial

Termine par un paragraphe de 3-4 phrases écrit comme si tu donnais ton avis personnel : faut-il contacter ? Quand ? Avec quel angle d'attaque ? Quelle serait la première phrase d'un email à cette entreprise ? Donne-la vraiment — une vraie phrase d'ouverture, prête à l'emploi.

Ton ton doit rester professionnel mais vivant. Évite les formulations robotiques type "Il convient de noter que..." ou "On peut observer que...". Parle comme un expert qui a de la conviction."""

        try:
            resp = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=1800,
                messages=[{"role": "user", "content": prompt}],
            )
            return jsonify({"result": resp.content[0].text, "mode": mode})
        except Exception as e:
            logger.error(f"[advisor/score_explain] {e}")
            return jsonify({"error": str(e)}), 500

    # ── Mode 2 : Stratégie de Prospection ────────────────────────────────────
    elif mode == "strategy":
        if not companies:
            return jsonify({"error": "companies manquant"}), 400

        top = sorted(companies, key=lambda c: c.get("score_final", 0) or 0, reverse=True)[:15]
        total_scored = len(companies)
        avg = round(sum(c.get("score_final",0) or 0 for c in companies) / total_scored, 1) if total_scored else 0
        companies_txt = "\n".join([
            f"  {i+1}. {c.get('name','?')} ({c.get('country','?')}) — {c.get('score_final','?')}/100 — Tier {c.get('tier','?')} — email: {'✓' if c.get('email') else '✗'} — LinkedIn: {'✓' if c.get('linkedin') else '✗'} — {(c.get('xai_recommendation') or '').upper()}"
            for i, c in enumerate(top)
        ])

        prompt = f"""Tu es Sophie, directrice commerciale chez Smart Brain Technologie (SBT) — fabricant tunisien de faisceaux électriques industriels et d'armoires électriques, avec des équipements KOMAX et SCHUNK de niveau européen.

Tu viens de recevoir les résultats du pipeline IA : {total_scored} entreprises analysées, score moyen {avg}/100. Tu dois construire le plan de prospection de l'équipe pour les 30 prochains jours.

─────────────────────────────
PIPELINE SCORÉ (Top {len(top)})
─────────────────────────────
{companies_txt}
─────────────────────────────

Écris ce plan comme si tu briefais ton équipe commerciale un lundi matin. Ton style : énergique, motivant, précis. Pas de blabla — des décisions. Des chiffres. Des phrases d'action.

Respecte EXACTEMENT cette structure :

### 🏆 Nos 5 cibles de la semaine — celles qu'on ne peut pas rater

Pour chacune des 5 meilleures entreprises, écris une fiche de 4-5 lignes :
**[Numéro]. [Nom de l'entreprise] — [Score]/100**
Pourquoi maintenant : [une raison convaincante et spécifique à cette entreprise]
Notre angle d'attaque : [ce qu'on va mettre en avant pour EUX — pas générique]
Canal prioritaire : [Email direct / LinkedIn / Appel — et pourquoi ce canal pour eux]
Première phrase d'approche : "[une vraie phrase d'ouverture prête à envoyer]"

### 📅 Les 4 semaines — ce qu'on fait, quand, pourquoi

Semaine 1 — Lancer les premières prises de contact
Semaine 2 — Relances et qualification
Semaine 3 — Approfondissement et propositions
Semaine 4 — Bilan, ajustements, nouvelles cibles
(Pour chaque semaine : 3-4 actions concrètes avec le nom des entreprises concernées)

### 💬 3 accroches qui marchent — adaptées à ce que l'IA a trouvé

Pour chaque profil d'entreprise détecté, une accroche courte (2-3 phrases max) qui donne envie de répondre. Commence chaque accroche par l'entreprise-type à qui elle s'adresse.

### ⚡ Ce qu'on fait dès aujourd'hui — 5 actions, pas une de plus

Une liste courte, décisive. Chaque action commence par un verbe d'action fort."""

        try:
            resp = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=2500,
                messages=[{"role": "user", "content": prompt}],
            )
            return jsonify({"result": resp.content[0].text, "mode": mode})
        except Exception as e:
            logger.error(f"[advisor/strategy] {e}")
            return jsonify({"error": str(e)}), 500

    # ── Mode 3 : Veille Concurrentielle ──────────────────────────────────────
    elif mode == "competitive":
        competitors = [c for c in companies if c.get("tier") == 3]
        if not competitors:
            return jsonify({"error": "Aucun concurrent (Tier 3) trouvé"}), 400

        comp_txt = "\n".join([
            f"  • {c.get('name','?')} ({c.get('country','?')}) — {(c.get('description') or 'description non disponible')[:150]}"
            for c in competitors[:12]
        ])
        nb_comp = len(competitors)

        prompt = f"""Tu es Marc, analyste stratégique indépendant mandaté par Smart Brain Technologie (SBT) pour cartographier le paysage concurrentiel. Tu rends tes conclusions directement au PDG.

Ton style : celui d'un consultant qui va droit au but. Des insights tranchants, pas des généralités. Tu n'hésites pas à dire "c'est une vraie menace" ou "celui-là n'est pas un danger réel". Tu donnes ton avis, pas juste des faits.

─────────────────────────────
SBT — NOTRE PROFIL
─────────────────────────────
Localisation : Beni Khalled, Nabeul, Tunisie
Cœur de métier : Faisceaux électriques industriels + armoires électriques
Arsenal technique : KOMAX Alpha 433, KOMAX Gamma 333, soudure ultrasonique SCHUNK, SCHLEUNIGER
Notre proposition de valeur : Niveau de qualité européen, coûts de production nord-africains
Contact : contact@smartbtechnologie.com | +216 71 601 295

─────────────────────────────
CONCURRENTS DÉTECTÉS ({nb_comp} entreprises Tier 3)
─────────────────────────────
{comp_txt}
─────────────────────────────

Produis ton rapport de veille. Respecte EXACTEMENT cette structure :

### 🔍 Portrait des concurrents qui comptent vraiment

Identifie les 3 à 5 acteurs les plus significatifs dans cette liste. Pour chacun, écris un paragraphe court (3-4 phrases) : qui ils sont vraiment, ce qu'ils font mieux que la moyenne, leur positionnement géographique et leurs clients probables. Sois direct — si l'un d'eux est clairement dans notre segment, dis-le.

### ⚔️ Face à face — SBT contre le marché

Quatre blocs, pas des listes à rallonge :

**Ce que SBT fait mieux que tous ces acteurs :**
[2-3 phrases fermes, avec des arguments techniques et économiques concrets]

**Ce que certains font mieux que SBT aujourd'hui :**
[Sois honnête. 2-3 points. La direction a besoin de savoir.]

**Les brèches que SBT peut exploiter maintenant :**
[2-3 opportunités réelles identifiées grâce à cette analyse]

**Ce qui pourrait nous faire mal dans 12-18 mois :**
[1-2 menaces émergentes — montée en gamme d'un concurrent, nouveau marché qu'on ne couvre pas, etc.]

### 🎯 Nos 4 arguments différenciants — ceux qu'on répète à chaque rendez-vous

4 arguments courts, tranchants, mémorables. Chacun doit répondre à une objection probable d'un prospect qui "compare". Format : **[L'argument en titre]** suivi d'une phrase d'explication.

### 📊 Comment SBT doit se positionner — notre territoire à occuper

Un paragraphe de 4-5 phrases qui définit clairement où SBT doit se battre (et où il ne doit PAS essayer d'aller). Pense en termes de géographies prioritaires, de types de clients à cibler, et de messages à porter.

### 🚨 Ce qu'on surveille — les signaux d'alerte

3 indicateurs ou événements concurrentiels à monitorer. Pour chacun : le signal à surveiller + ce qu'on fait si ça arrive."""

        try:
            resp = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=2200,
                messages=[{"role": "user", "content": prompt}],
            )
            return jsonify({"result": resp.content[0].text, "mode": mode})
        except Exception as e:
            logger.error(f"[advisor/competitive] {e}")
            return jsonify({"error": str(e)}), 500

    # ── Mode 4 : Rapport PDF ──────────────────────────────────────────────────
    elif mode == "pdf_report":
        if not companies:
            return jsonify({"error": "companies manquant"}), 400

        top5 = sorted(companies, key=lambda c: c.get("score_final", 0) or 0, reverse=True)[:5]
        top5_txt = "\n".join([
            f"- {c.get('name','?')} ({c.get('country','?')}) — Score {c.get('score_final','?')}/100 — {c.get('xai_recommendation','?')}"
            for c in top5
        ])
        total      = len(companies)
        avg_score  = round(sum(c.get("score_final", 0) or 0 for c in companies) / total, 1) if total else 0
        haute_cnt  = sum(1 for c in companies if (c.get("xai_recommendation") or "").upper() == "HAUTE")
        countries  = list({c.get("country","?") for c in companies if c.get("country")})[:6]

        import datetime as _dt
        today_str = _dt.date.today().strftime('%d %B %Y')

        prompt = f"""Tu es le conseiller stratégique de Smart Brain Technologie (SBT), mandaté pour rédiger le rapport mensuel de prospection destiné au comité de direction.

Ce rapport sera imprimé et présenté en réunion. Il doit être professionnel, lisible en 5 minutes, et donner envie d'agir. Pas de remplissage, pas de phrases vides. Chaque paragraphe doit apporter une information utile ou une décision.

─────────────────────────────
DONNÉES DU PIPELINE IA — {today_str}
─────────────────────────────
Entreprises analysées par l'IA  : {total}
Score de pertinence moyen       : {avg_score}/100
Entreprises en priorité HAUTE   : {haute_cnt}
Marchés couverts                : {', '.join(countries) if countries else 'N/A'}

TOP 5 PROSPECTS IDENTIFIÉS
{top5_txt}
─────────────────────────────

Rédige le rapport complet. Respecte EXACTEMENT cette structure (les titres de sections doivent apparaître exactement comme indiqué) :

# RAPPORT DE PROSPECTION B2B — SBT Intelligence Platform
**Date :** {today_str}
**Préparé par :** SBT Advisor — Intelligence Artificielle XAI

---

## 1. RÉSUMÉ EXÉCUTIF

Rédige 4-5 phrases qui vont droit à l'essentiel : que révèle cette analyse ? Quelle est la taille de l'opportunité ? Quel est le signal fort que la direction doit retenir ? Commence par un fait marquant — un chiffre, une tendance, une opportunité concrète. Pas d'intro générale.

## 2. CE QUE LES CHIFFRES NOUS DISENT

Un paragraphe court (3-4 phrases) qui donne du sens aux métriques : qu'est-ce qu'un score moyen de {avg_score}/100 signifie vraiment ? Que représentent les {haute_cnt} entreprises en priorité haute ? Est-ce un marché concentré ou dispersé géographiquement ?

## 3. NOS 5 PROSPECTS PRIORITAIRES

Pour chaque entreprise du top 5, une fiche structurée :
**[Rang]. [Nom] — [Score]/100 — [Pays]**
Profil : [1 phrase sur ce qu'ils font et pourquoi ils sont intéressants pour SBT]
Notre opportunité : [en quoi SBT répond exactement à leur besoin probable]
Action recommandée : [une action précise et datée — "envoyer un email cette semaine", "demander un RDV avant fin du mois", etc.]

## 4. CARTOGRAPHIE DES MARCHÉS

Analyse les opportunités géographiques identifiées. Pour chaque pays ou région représenté, 2-3 phrases sur le potentiel, les particularités culturelles ou réglementaires à connaître, et comment SBT doit adapter son approche. Priorise les marchés par ordre de maturité pour SBT.

## 5. RECOMMANDATIONS POUR LA DIRECTION

5 recommandations numérotées, formulées comme des décisions à prendre. Chaque recommandation = une phrase d'action directe + une phrase de justification. Exemples de format : "Allouer X% du budget prospection au marché Y car..." ou "Recruter un profil Z pour adresser l'opportunité W..."

## 6. FEUILLE DE ROUTE — 60 JOURS

Deux blocs :
**Jours 1-30 — Mise en contact et qualification**
[4-5 actions séquencées avec les noms des entreprises cibles]

**Jours 31-60 — Propositions et conversion**
[3-4 objectifs mesurables à atteindre]

---
*Rapport généré par SBT Intelligence Platform · Propulsé par Claude AI · {today_str}*"""

        try:
            resp = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=2500,
                messages=[{"role": "user", "content": prompt}],
            )
            report_text = resp.content[0].text

            # ── Génération PDF avec ReportLab ────────────────────────────────
            from io import BytesIO
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import cm
            from reportlab.lib import colors
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
            from reportlab.lib.enums import TA_CENTER, TA_LEFT
            import datetime

            buf = BytesIO()
            doc = SimpleDocTemplate(
                buf, pagesize=A4,
                leftMargin=2*cm, rightMargin=2*cm,
                topMargin=2*cm, bottomMargin=2*cm,
            )

            styles = getSampleStyleSheet()
            PRIMARY  = colors.HexColor("#1e3a8a")
            ACCENT   = colors.HexColor("#3b82f6")
            LIGHT_BG = colors.HexColor("#f0f4ff")

            style_h1 = ParagraphStyle("h1", parent=styles["Heading1"],
                fontSize=18, textColor=PRIMARY, spaceAfter=6, spaceBefore=12)
            style_h2 = ParagraphStyle("h2", parent=styles["Heading2"],
                fontSize=13, textColor=PRIMARY, spaceAfter=4, spaceBefore=10,
                borderPad=4, backColor=LIGHT_BG)
            style_h3 = ParagraphStyle("h3", parent=styles["Heading3"],
                fontSize=11, textColor=ACCENT, spaceAfter=3, spaceBefore=8)
            style_body = ParagraphStyle("body", parent=styles["Normal"],
                fontSize=9.5, leading=14, spaceAfter=4)
            style_small = ParagraphStyle("small", parent=styles["Normal"],
                fontSize=8, textColor=colors.grey, leading=11)

            story = []

            # En-tête
            story.append(Paragraph("SBT Intelligence Platform", ParagraphStyle(
                "brand", parent=styles["Normal"], fontSize=10,
                textColor=colors.white, backColor=PRIMARY,
                alignment=TA_CENTER, spaceBefore=0, spaceAfter=0, leading=20,
            )))
            story.append(Spacer(1, 0.3*cm))
            story.append(Paragraph(
                f"Rapport de Prospection B2B — {datetime.date.today().strftime('%d/%m/%Y')}",
                ParagraphStyle("title", parent=styles["Normal"], fontSize=16,
                    textColor=PRIMARY, alignment=TA_CENTER, spaceAfter=2)
            ))
            story.append(HRFlowable(width="100%", thickness=2, color=ACCENT))
            story.append(Spacer(1, 0.4*cm))

            # Métriques clés
            metrics_data = [
                ["Entreprises analysées", "Score moyen", "Priorité HAUTE", "Pays couverts"],
                [str(total), f"{avg_score}/100", str(haute_cnt), str(len(countries))],
            ]
            tbl = Table(metrics_data, colWidths=[4.2*cm]*4)
            tbl.setStyle(TableStyle([
                ("BACKGROUND", (0,0), (-1,0), PRIMARY),
                ("TEXTCOLOR",  (0,0), (-1,0), colors.white),
                ("BACKGROUND", (0,1), (-1,1), LIGHT_BG),
                ("ALIGN",      (0,0), (-1,-1), "CENTER"),
                ("FONTSIZE",   (0,0), (-1,0), 9),
                ("FONTSIZE",   (0,1), (-1,1), 14),
                ("FONTNAME",   (0,1), (-1,1), "Helvetica-Bold"),
                ("BOX",        (0,0), (-1,-1), 1, ACCENT),
                ("GRID",       (0,0), (-1,-1), 0.5, colors.lightgrey),
                ("ROWBACKGROUNDS", (0,0), (-1,-1), [None, None]),
                ("TOPPADDING",  (0,0), (-1,-1), 6),
                ("BOTTOMPADDING",(0,0), (-1,-1), 6),
            ]))
            story.append(tbl)
            story.append(Spacer(1, 0.5*cm))

            # Contenu IA — parsing ligne par ligne
            for line in report_text.split("\n"):
                line = line.strip()
                if not line:
                    story.append(Spacer(1, 0.15*cm))
                elif line.startswith("# "):
                    story.append(Paragraph(line[2:], style_h1))
                elif line.startswith("## "):
                    story.append(Paragraph(line[3:], style_h2))
                elif line.startswith("### "):
                    story.append(Paragraph(line[4:], style_h3))
                elif line.startswith("**") and line.endswith("**"):
                    story.append(Paragraph(f"<b>{line[2:-2]}</b>", style_body))
                elif line.startswith("- ") or line.startswith("* "):
                    story.append(Paragraph(f"• {line[2:]}", style_body))
                elif line.startswith("---"):
                    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
                elif line.startswith("*") and line.endswith("*"):
                    story.append(Paragraph(f"<i>{line[1:-1]}</i>", style_small))
                else:
                    story.append(Paragraph(line, style_body))

            doc.build(story)
            buf.seek(0)

            from flask import send_file
            return send_file(
                buf,
                mimetype="application/pdf",
                as_attachment=True,
                download_name=f"SBT_Rapport_Prospection_{datetime.date.today().strftime('%Y%m%d')}.pdf",
            )

        except Exception as e:
            logger.error(f"[advisor/pdf_report] {e}")
            return jsonify({"error": str(e)}), 500

    else:
        return jsonify({"error": f"mode inconnu : {mode}"}), 400


# ── Graph data ────────────────────────────────────────────────────────────────

@app.route("/api/graph-data")
def api_graph_data():
    """Return nodes + edges for vis-network visualization."""
    try:
        # Utilisation du context manager pour garantir la fermeture de la connexion
        with GraphStore() as gs:
            nodes, edges = [], []

            with gs.driver.session() as session:
                # Company nodes
                res = session.run("""
                    MATCH (c:Company)
                    WHERE c.website IS NOT NULL
                    RETURN c.name AS name, c.tier AS tier, c.website AS website,
                           c.email AS email, c.phone AS phone, c.address AS address,
                           c.country AS country, c.linkedin AS linkedin,
                           c.confidence AS confidence,
                           c.score_final AS score_final,
                           c.xai_recommendation AS xai_rec
                """)
                for r in res:
                    tier  = r["tier"]
                    score = r["score_final"] or (int((r["confidence"] or 0) * 100))
                    color = {"1": "#22c55e", "2": "#3b82f6", "3": "#f59e0b"}.get(str(tier), "#94a3b8")
                    nodes.append({
                        "id":    r["name"],
                        "label": r["name"],
                        "color": color,
                        "size":  max(15, min(45, score // 3)) if score else 20,
                        "tier":  tier,
                        "score": score,
                        "country": r["country"],
                        "title": (
                            f"<b>{r['name']}</b><br>"
                            f"Tier: {tier or '?'} | Pays: {r['country'] or '-'}<br>"
                            f"Score: {score}/100<br>"
                            f"Email: {r['email'] or '-'}<br>"
                            f"Reco XAI: {r['xai_rec'] or '-'}"
                        ),
                    })

                # Tier nodes
                for r in session.run("MATCH (t:Tier) RETURN t.level AS level, t.label AS label"):
                    nodes.append({
                        "id":    f"tier_{r['level']}",
                        "label": f"Tier {r['level']}\n{r['label'] or ''}",
                        "color": "#f97316",
                        "size":  45,
                        "shape": "diamond",
                        "tier":  None,
                        "title": f"<b>Tier {r['level']}</b><br>{r['label']}",
                    })

                # Edges — use coalesce to avoid warning when 'reason' property missing
                res = session.run("""
                    MATCH (a)-[r]->(b)
                    WHERE (a:Company OR a:Tier) AND (b:Company OR b:Tier)
                    RETURN
                        CASE WHEN a:Tier THEN 'tier_' + toString(a.level) ELSE a.name END AS from_id,
                        CASE WHEN b:Tier THEN 'tier_' + toString(b.level) ELSE b.name END AS to_id,
                        type(r) AS rel_type,
                        coalesce(r.reason, '') AS reason
                """)
                color_map = {
                    "BELONGS_TO":         "#f97316",
                    "MENTIONS":           "#8b5cf6",
                    "SUPPLIES":           "#ef4444",
                    "POTENTIAL_SUPPLIER": "#64748b",
                    "SUPPLIER":           "#ef4444",
                    "CONCURRENT":         "#f59e0b",
                }
                for r in res:
                    rel = r["rel_type"]
                    edges.append({
                        "from":   r["from_id"],
                        "to":     r["to_id"],
                        "label":  rel,
                        "color":  color_map.get(rel, "#94a3b8"),
                        "dashes": rel in ("POTENTIAL_SUPPLIER",),
                        "title":  r["reason"] or rel,
                    })

        return jsonify({"nodes": nodes, "edges": edges})
    except Exception as e:
        logger.error(f"[graph-data] {e}")
        return jsonify({"nodes": [], "edges": [], "error": str(e)})


# ── Marketing results ─────────────────────────────────────────────────────────

@app.route("/api/marketing-results")
def api_marketing_results():
    # Return in-memory if populated, otherwise load from disk
    if _marketing_results:
        return jsonify(_marketing_results)
    from src.agents.marketing_agent import load_results
    return jsonify(load_results())


# ── XAI ──────────────────────────────────────────────────────────────────────

@app.route("/api/xai/<path:company_name>")
def api_xai(company_name: str):
    """
    Return cached XAI explanation for a company (generated during marketing pipeline).
    Falls back to on-demand generation if not yet cached.
    A per-company lock ensures only ONE generation at a time — concurrent requests
    for the same company wait and then return the cached result.
    """
    # ── 1. Fast path: cache hit (no lock needed) ──────────────────────────────
    cached_xai = _marketing_results.get("xai_results", {}).get(company_name)
    if cached_xai:
        logger.debug(f"[xai] Cache hit for {company_name}")
        return jsonify(cached_xai)

    # ── 2. Acquire per-company lock — only ONE generation at a time ───────────
    with _xai_locks_mutex:
        lock = _xai_locks[company_name]

    acquired = lock.acquire(timeout=180)  # max 3 min wait
    if not acquired:
        return jsonify({"error": "Timeout — génération XAI trop longue"}), 504

    try:
        # Double-check cache now that we hold the lock (another thread may have generated it)
        cached_xai = _marketing_results.get("xai_results", {}).get(company_name)
        if cached_xai:
            logger.debug(f"[xai] Cache hit après lock pour {company_name}")
            return jsonify(cached_xai)

        # ── 3. On-demand generation ───────────────────────────────────────────
        logger.info(f"[xai] Génération à la demande pour {company_name}")

        async def _compute():
            from src.scoring.xai import explain_company
            from src.scoring.scorer import score_company

            with GraphStore() as gs:
                company = gs.get_company_by_name(company_name)

            if company is None:
                return {"error": "Entreprise non trouvée"}, 404

            scores = {
                "relevance":   company.get("score_relevance"),
                "potential":   company.get("score_potential"),
                "competition": company.get("score_competition"),
                "market":      company.get("score_market"),
                "final":       company.get("score_final"),
            }

            if not scores.get("final"):
                scores = await score_company(
                    name=company.get("name", ""),
                    description=company.get("description", ""),
                    country=company.get("country", ""),
                    tier=company.get("tier", 0),
                    sector=_pipeline_context.get("sector") or "câblage électrique industriel",
                    email=company.get("email", ""),
                    linkedin=company.get("linkedin", ""),
                )
                with GraphStore() as gs:
                    gs.update_company_scores(company_name, scores)

            xai = await explain_company(company, scores)

            with GraphStore() as gs:
                gs.update_company_xai(company_name, xai)

            # Store in cache — future calls return instantly
            if "xai_results" not in _marketing_results:
                _marketing_results["xai_results"] = {}
            _marketing_results["xai_results"][company_name] = xai

            return xai, 200

        loop = asyncio.new_event_loop()
        try:
            result, status_code = loop.run_until_complete(_compute())
        finally:
            try:
                pending = asyncio.all_tasks(loop)
                if pending:
                    loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))
            except Exception:
                pass
            loop.close()

        return jsonify(result), status_code

    except Exception as e:
        logger.error(f"[xai] {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        lock.release()


# ── Scoring batch ─────────────────────────────────────────────────────────────

@app.route("/api/score-all", methods=["POST"])
def api_score_all():
    """Trigger multifactorial scoring for all companies in Neo4j."""
    if _task_status.get("scoring", {}).get("running"):
        return jsonify({"error": "Scoring déjà en cours"}), 409

    sector = (request.json or {}).get("sector") or _pipeline_context.get("sector") or "câblage électrique industriel"

    async def _run_scoring():
        from src.scoring.scorer import score_company
        _task_status["scoring"] = {"running": True, "message": "Scoring en cours...", "progress": 0}
        try:
            with GraphStore() as gs:
                companies = gs.get_all_companies_paginated(limit=500)["companies"]

            total = len(companies)
            logger.info(f"[scoring] Démarrage — {total} entreprises à scorer")

            if total == 0:
                _task_status["scoring"]["message"] = "Aucune entreprise à scorer"
                return

            for i, company in enumerate(companies):
                name = company.get("name", "")
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
                    logger.info(f"[scoring] {i+1}/{total} — {name} → {scores.get('final')}/100")
                except Exception as e:
                    logger.warning(f"[scoring] Erreur pour {name}: {e}")

                _task_status["scoring"]["progress"] = int((i + 1) / total * 100)
                _task_status["scoring"]["message"] = f"Scoring {i+1}/{total} — {name}"

            _task_status["scoring"]["message"] = f"Terminé — {total} entreprises scorées"
        except Exception as e:
            logger.error(f"[scoring] Erreur globale: {e}")
            _task_status["scoring"].update({"message": f"Erreur: {e}", "progress": 0})
        finally:
            _task_status["scoring"]["running"] = False

    _task_status.setdefault("scoring", {"running": False, "message": "Prêt", "progress": 0})
    _run_async_in_thread("scoring", _run_scoring)
    return jsonify({"status": "started"})


# ── Pipeline runners ──────────────────────────────────────────────────────────

@app.route("/api/run/<agent_name>", methods=["POST"])
def api_run(agent_name: str):
    """
    Start an agent.

    Body (JSON):
        country       — selected country (strict filter)
        sector        — target sector
        max_per_query — Serper results per query (searcher only)
        limit         — max companies to scrape (scrapper only)
    """
    if _task_status.get(agent_name, {}).get("running"):
        return jsonify({"error": f"{agent_name} est déjà en cours"}), 409

    body    = request.json or {}
    country = body.get("country") or _pipeline_context.get("country")
    sector  = body.get("sector")  or _pipeline_context.get("sector")

    # Store context for downstream agents
    if country:
        _pipeline_context["country"] = country
    if sector:
        _pipeline_context["sector"] = sector

    if agent_name == "searcher":
        from src.agents.target_searcher import run_pipeline
        max_q = body.get("max_per_query", 5)
        _run_async_in_thread(
            "searcher", run_pipeline,
            max_per_query=max_q, country=country, sector=sector,
        )

    elif agent_name == "scrapper":
        from src.agents.scrapper_agent import main as scrapper_main
        with get_connection() as conn:
            pending = conn.execute(
                "SELECT COUNT(*) FROM search_results WHERE status='pending'"
            ).fetchone()[0]
        limit = body.get("limit", pending)
        _run_async_in_thread(
            "scrapper", scrapper_main,
            limit=limit, target_country=country,
        )

    elif agent_name == "marketing":
        from src.agents.marketing_agent import run_marketing

        _sector = sector or "câblage électrique industriel"

        async def _run_and_store():
            global _marketing_results
            _task_status["marketing"]["message"] = "Scoring + Analyse + XAI + Pitchs..."
            _marketing_results = await run_marketing(sector=_sector)
            stats = _marketing_results.get("stats", {})
            _task_status["marketing"]["message"] = (
                f"Terminé — {stats.get('scored',0)} scorées, "
                f"{stats.get('xai',0)} XAI, "
                f"{stats.get('pitches',0)} pitchs"
            )

        _run_async_in_thread("marketing", _run_and_store)

    else:
        return jsonify({"error": "Agent inconnu"}), 404

    return jsonify({"status": "started", "agent": agent_name, "country": country, "sector": sector})


@app.route("/api/run-all", methods=["POST"])
def api_run_all():
    """
    Run full pipeline sequentially: searcher → scrapper → marketing.
    Accepts country + sector in body.
    """
    body    = request.json or {}
    country = body.get("country")
    sector  = body.get("sector")
    max_q   = body.get("max_per_query", 5)

    if country:
        _pipeline_context["country"] = country
    if sector:
        _pipeline_context["sector"] = sector

    _sector = sector or "câblage électrique industriel"

    async def _full_pipeline():
        from src.agents.target_searcher import run_pipeline
        from src.agents.scrapper_agent import main as scrapper_main
        from src.agents.marketing_agent import run_marketing
        global _marketing_results

        # Step 1 — Target Search
        _task_status["searcher"].update({"running": True, "message": "Recherche en cours...", "progress": 10})
        try:
            await run_pipeline(max_per_query=max_q, country=country, sector=_sector)
            _task_status["searcher"].update({"running": False, "message": "Terminé", "progress": 100})
        except Exception as e:
            _task_status["searcher"].update({"running": False, "message": f"Erreur: {e}", "progress": 0})
            return

        # Step 2 — Scrapper
        _task_status["scrapper"].update({"running": True, "message": "Scraping en cours...", "progress": 10})
        try:
            with get_connection() as conn:
                pending = conn.execute(
                    "SELECT COUNT(*) FROM search_results WHERE status='pending'"
                ).fetchone()[0]
            await scrapper_main(limit=pending, target_country=country)
            _task_status["scrapper"].update({"running": False, "message": "Terminé", "progress": 100})
        except Exception as e:
            _task_status["scrapper"].update({"running": False, "message": f"Erreur: {e}", "progress": 0})
            return

        # Step 3 — Marketing (scoring + XAI + pitching inclus)
        _task_status["marketing"].update({"running": True, "message": "Scoring + Analyse + Pitchs...", "progress": 10})
        try:
            _marketing_results = await run_marketing(sector=_sector)
            stats = _marketing_results.get("stats", {})
            _task_status["marketing"].update({
                "running": False,
                "message": (
                    f"Terminé — {stats.get('scored',0)} scorées, "
                    f"{stats.get('xai',0)} XAI, "
                    f"{stats.get('pitches',0)} pitchs"
                ),
                "progress": 100,
            })
        except Exception as e:
            logger.error(f"[run-all/marketing] {e}")
            _task_status["marketing"].update({"running": False, "message": f"Erreur: {e}", "progress": 0})

    def _thread_target():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(_full_pipeline())
        loop.close()

    threading.Thread(target=_thread_target, daemon=True).start()
    return jsonify({"status": "started", "country": country, "sector": sector})


# ── Consolidator — répare le graphe (tier3 + relations) sans relancer le scrapper

@app.route("/api/consolidate-graph", methods=["POST"])
def api_consolidate_graph():
    """
    Repair + enrich le graphe Neo4j à partir des données existantes.
    - insère les concurrents Tier 3 (short-list curated)
    - crée les POTENTIAL_SUPPLIER manquantes (Tier 2 → Tier 1)
    - crée les COMPETES_WITH (Tier 3 → Tier 1/2)
    - re-scanne les descriptions pour MENTIONS
    - recalcule SUPPLIES
    """
    try:
        from src.agents.consolidator import consolidate
        result = consolidate()
        return jsonify({"success": True, **result})
    except Exception as e:
        logger.error(f"[consolidate-graph] {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# ── Serve React SPA ───────────────────────────────────────────────────────────

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path: str):
    """Serve the React build. Falls back to index.html for client-side routing."""
    if path.startswith("api/"):
        return jsonify({"error": "Not found"}), 404

    if DIST_DIR.exists():
        full_path = DIST_DIR / path
        if path and full_path.exists() and full_path.is_file():
            return send_from_directory(str(DIST_DIR), path)
        return send_from_directory(str(DIST_DIR), "index.html")

    return (
        "<h1 style='font-family:sans-serif;padding:40px'>"
        "Frontend not built yet.<br><br>"
        "Run: <code>cd frontend && npm install && npm run build</code>"
        "</h1>",
        200,
    )


# ── Entrypoint ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    # use_reloader=False — prevents Flask from killing running pipeline threads
    # when source files change during execution
    app.run(debug=False, port=5000, threaded=True, use_reloader=False)
