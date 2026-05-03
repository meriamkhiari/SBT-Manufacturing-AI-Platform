"""
Consolidator — répare et enrichit le graphe Neo4j SANS relancer le scrapper.

Étapes :
  1. Insère une short-list de concurrents Tier 3 réels du marché câblage low-cost
     (sociétés industrielles connues, pas de données fabriquées).
  2. Crée toutes les POTENTIAL_SUPPLIER manquantes : pour chaque Tier 2 réel,
     pointe vers chaque Tier 1 réel (relations en pointillés sur la viz).
  3. Re-scanne les descriptions de toutes les sociétés Neo4j pour détecter
     les MENTIONS (« cite XYZ ») a posteriori.
  4. Recalcule les SUPPLIES via les MENTIONS bidirectionnelles.

Toutes les opérations sont idempotentes (MERGE Cypher). Aucune donnée n'est
inventée pour les sociétés existantes : on enrichit juste le graphe.
"""
from __future__ import annotations
from src.storage.graph_store import GraphStore
from loguru import logger


# ── Concurrents Tier 3 RÉELS basés en France (sites/sièges vérifiables).
#    Sociétés publiques actives sur le câblage industriel / faisceaux /
#    armoires électriques. Aucune donnée inventée.
TIER3_COMPETITORS = [
    {
        "name": "Nexans",
        "website": "https://www.nexans.com",
        "country": "France",
        "description": (
            "Groupe français leader mondial des câbles d'énergie et de "
            "télécommunication, siège à Courbevoie (Hauts-de-Seine). Présent "
            "sur le câblage industriel haute tension, bâtiment, énergies "
            "renouvelables. Concurrent indirect de SBT sur le marché des "
            "câbles et faisceaux industriels en Europe."
        ),
    },
    {
        "name": "Acome",
        "website": "https://www.acome.com",
        "country": "France",
        "description": (
            "Société coopérative et participative (SCOP) française, siège à "
            "Mortain (Manche, Normandie). Spécialiste des câbles automobile, "
            "fibre optique, télécommunications et bâtiment. Plus de 1500 "
            "salariés. Concurrent direct sur faisceaux automobile."
        ),
    },
    {
        "name": "Axon' Cable",
        "website": "https://www.axon-cable.com",
        "country": "France",
        "description": (
            "Fabricant français de câbles techniques haute performance, siège "
            "à Montmirail (Marne). Spécialisé aéronautique, défense, médical "
            "et nucléaire. Concurrent sur les niches haute valeur du câblage."
        ),
    },
    {
        "name": "Omerin",
        "website": "https://www.omerin.com",
        "country": "France",
        "description": (
            "Groupe familial français, siège à Ambert (Puy-de-Dôme). Premier "
            "fabricant européen de câbles spéciaux haute température et "
            "isolation extrême. Plus de 1000 collaborateurs. Concurrent sur "
            "les câblages industriels en environnement sévère."
        ),
    },
    {
        "name": "Sermes",
        "website": "https://www.sermes.fr",
        "country": "France",
        "description": (
            "Société française basée à Strasbourg, spécialisée en distribution "
            "de matériel électrique et solutions d'automatismes pour "
            "l'industrie. Active sur l'intégration et le câblage d'armoires."
        ),
    },
    {
        "name": "Eolane",
        "website": "https://www.eolane.com",
        "country": "France",
        "description": (
            "Sous-traitant français en électronique professionnelle (EMS), "
            "siège à Angers. Plusieurs sites en France et au Maroc. Active "
            "sur le câblage de cartes électroniques et l'assemblage de "
            "sous-ensembles. Concurrent sur la sous-traitance industrielle."
        ),
    },
]


def _purge_non_french_tier3(gs: GraphStore) -> int:
    """
    Supprime du graphe toute société Tier 3 qui n'est pas en France.
    Garantit qu'après consolidation, la liste des concurrents = uniquement français.
    """
    with gs.driver.session() as session:
        result = session.run(
            """
            MATCH (c:Company {tier: 3})
            WHERE c.country IS NULL OR c.country <> 'France'
            DETACH DELETE c
            RETURN count(c) AS removed
            """
        ).single()
        return result["removed"] if result else 0


def _insert_tier3(gs: GraphStore) -> int:
    """Insère les concurrents Tier 3 (idempotent via MERGE)."""
    inserted = 0
    for c in TIER3_COMPETITORS:
        with gs.driver.session() as session:
            r = session.run(
                """
                MERGE (c:Company {name: $name})
                ON CREATE SET c.created_at = timestamp()
                SET c.website     = $website,
                    c.country     = $country,
                    c.description = $description,
                    c.tier        = 3,
                    c.source      = 'consolidator_tier3',
                    c.confidence  = 1.0
                RETURN c.created_at AS created
                """,
                **c,
            ).single()
            if r and r["created"]:
                inserted += 1
        gs.link_company_to_tier(c["name"], 3)
    return inserted


def _backfill_potential_suppliers(gs: GraphStore) -> int:
    """
    Crée toutes les POTENTIAL_SUPPLIER manquantes : Tier 2 → Tier 1.
    Le bug initial du scrapper : les listes tier1/tier2 étaient vides au moment
    du run. On les recrée proprement à partir de l'état Neo4j actuel.
    """
    with gs.driver.session() as session:
        result = session.run(
            """
            MATCH (sup:Company {tier: 2}), (cli:Company {tier: 1})
            WHERE sup.name <> cli.name
            MERGE (sup)-[r:POTENTIAL_SUPPLIER]->(cli)
            ON CREATE SET r.reason = 'Tier 2 (assembleur câblage) → Tier 1 (fabricant coffrets)',
                          r.created_by = 'consolidator',
                          r.created_at = timestamp()
            RETURN count(r) AS total
            """
        ).single()
        return result["total"] if result else 0


def _backfill_competitor_relations(gs: GraphStore) -> int:
    """Tier 3 (concurrents) — relation COMPETES_WITH vers Tier 1 et Tier 2."""
    with gs.driver.session() as session:
        result = session.run(
            """
            MATCH (comp:Company {tier: 3}), (target:Company)
            WHERE target.tier IN [1, 2] AND comp.name <> target.name
            MERGE (comp)-[r:COMPETES_WITH]->(target)
            ON CREATE SET r.created_by = 'consolidator',
                          r.created_at = timestamp()
            RETURN count(r) AS total
            """
        ).single()
        return result["total"] if result else 0


def _detect_mentions_retro(gs: GraphStore) -> int:
    """
    Re-scan toutes les descriptions stockées pour trouver des MENTIONS croisées
    (société A cite société B dans sa description).
    """
    with gs.driver.session() as session:
        # 1. récupère tous les noms et descriptions
        rows = session.run(
            "MATCH (c:Company) RETURN c.name AS name, c.description AS desc"
        ).data()

    names = [r["name"] for r in rows if r.get("name")]
    desc_by_name = {r["name"]: (r.get("desc") or "").lower() for r in rows}

    created = 0
    for src_name in names:
        src_desc = desc_by_name[src_name]
        if not src_desc:
            continue
        for tgt_name in names:
            if src_name == tgt_name:
                continue
            # on vérifie le nom complet OU sans suffixe juridique
            short = tgt_name.split()[0].lower()
            if short in src_desc or tgt_name.lower() in src_desc:
                with gs.driver.session() as session:
                    r = session.run(
                        """
                        MATCH (a:Company {name: $a}), (b:Company {name: $b})
                        WHERE a <> b
                        MERGE (a)-[m:MENTIONS]->(b)
                        ON CREATE SET m.created_by = 'consolidator_retro'
                        RETURN m
                        """,
                        a=src_name, b=tgt_name,
                    ).single()
                    if r:
                        created += 1
    return created


# ─────────────────────────────────────────────
# ORGANIZE : ordonner le graphe pour qu'il soit lisible
# ─────────────────────────────────────────────

_TLD_COUNTRY = {
    "fr": "France",  "it": "Italie",   "de": "Allemagne", "es": "Espagne",
    "tn": "Tunisie", "ma": "Maroc",    "uk": "Royaume-Uni", "be": "Belgique",
    "nl": "Pays-Bas","ch": "Suisse",   "pt": "Portugal",  "pl": "Pologne",
    "ro": "Roumanie","at": "Autriche", "se": "Suède",     "no": "Norvège",
    "dk": "Danemark","fi": "Finlande", "ie": "Irlande",   "cz": "Tchéquie",
}

_TIER_LABELS = {
    1: "Fabricant coffrets/armoires",
    2: "Assembleur / câbleur",
    3: "Concurrent câblage",
}

_TIER_COLORS = {1: "#10b981", 2: "#3b82f6", 3: "#f59e0b"}


def _organize_graph(gs: GraphStore) -> dict:
    """
    Rend le graphe parfaitement lisible :
    - comble les pays manquants via TLD du website
    - ajoute display_name + tier_label + node_color
    - range les Tier nodes avec un label métier
    - garantit que tous les nœuds Tier (1/2/3) existent
    - met un index sur Company.name
    """
    out = {"countries_filled": 0, "tier_nodes_set": 0, "company_props_set": 0}

    with gs.driver.session() as session:
        # 1. Index pour perf
        try:
            session.run("CREATE INDEX company_name_idx IF NOT EXISTS FOR (c:Company) ON (c.name)")
            session.run("CREATE INDEX company_tier_idx IF NOT EXISTS FOR (c:Company) ON (c.tier)")
        except Exception as e:
            logger.warning(f"Index already exists or error: {e}")

        # 2. Comble les pays manquants via TLD
        rows = session.run(
            """MATCH (c:Company)
               WHERE (c.country IS NULL OR c.country = '') AND c.website IS NOT NULL
               RETURN c.name AS name, c.website AS website"""
        ).data()
        for r in rows:
            try:
                from urllib.parse import urlparse
                host = urlparse(r["website"]).netloc.lower().replace("www.", "")
                tld = host.rsplit(".", 1)[-1] if "." in host else ""
                country = _TLD_COUNTRY.get(tld, "Inconnu")
            except Exception:
                country = "Inconnu"
            session.run(
                "MATCH (c:Company {name:$n}) SET c.country = $c, c.country_inferred = true",
                n=r["name"], c=country,
            )
            out["countries_filled"] += 1

        # 3. Pour chaque Company : ajoute display_name + tier_label + node_color
        result = session.run(
            """MATCH (c:Company)
               WITH c, coalesce(c.tier, 0) AS t
               SET c.tier_label   = CASE t
                                       WHEN 1 THEN $l1
                                       WHEN 2 THEN $l2
                                       WHEN 3 THEN $l3
                                       ELSE 'Non classé'
                                    END,
                   c.node_color   = CASE t
                                       WHEN 1 THEN $c1
                                       WHEN 2 THEN $c2
                                       WHEN 3 THEN $c3
                                       ELSE '#94a3b8'
                                    END,
                   c.display_name = c.name + ' [' + coalesce(c.country, 'Inconnu') + ']'
               RETURN count(c) AS n""",
            l1=_TIER_LABELS[1], l2=_TIER_LABELS[2], l3=_TIER_LABELS[3],
            c1=_TIER_COLORS[1], c2=_TIER_COLORS[2], c3=_TIER_COLORS[3],
        ).single()
        out["company_props_set"] = result["n"] if result else 0

        # 4. Garantit que les Tier (1/2/3) existent avec label propre
        for tier in (1, 2, 3):
            session.run(
                """MERGE (t:Tier {level: $tier})
                   SET t.label       = $label,
                       t.color       = $color,
                       t.display_name = 'Tier ' + $tier + ' — ' + $label""",
                tier=tier, label=_TIER_LABELS[tier], color=_TIER_COLORS[tier],
            )
            out["tier_nodes_set"] += 1

        # 5. Nettoie les properties vides (string vide → null)
        session.run(
            """MATCH (c:Company)
               FOREACH (k IN ['email','phone','linkedin','address','description'] |
                        FOREACH (_ IN CASE WHEN c[k] = '' THEN [1] ELSE [] END |
                                 SET c[k] = null))"""
        )

    return out


def consolidate() -> dict:
    """Run all consolidation steps. Returns counts."""
    logger.info("CONSOLIDATOR — démarrage")
    out = {}
    with GraphStore() as gs:
        gs.create_constraints()

        out["tier3_purged"] = _purge_non_french_tier3(gs)
        logger.success(f"Tier 3 non-français purgés: {out['tier3_purged']}")

        out["tier3_inserted"] = _insert_tier3(gs)
        logger.success(f"Tier 3 français insérés: {out['tier3_inserted']} new (total list = {len(TIER3_COMPETITORS)})")

        out["potential_suppliers_created"] = _backfill_potential_suppliers(gs)
        logger.success(f"POTENTIAL_SUPPLIER backfill: {out['potential_suppliers_created']} relations")

        out["competes_with_created"] = _backfill_competitor_relations(gs)
        logger.success(f"COMPETES_WITH (T3→T1/T2): {out['competes_with_created']} relations")

        out["mentions_detected"] = _detect_mentions_retro(gs)
        logger.success(f"MENTIONS retro-détectées: {out['mentions_detected']}")

        gs.detect_and_upgrade_supplies()
        logger.success("SUPPLIES recalculées (depuis MENTIONS bidirectionnelles)")

        # 5. Organiser le graphe pour qu'il soit lisible
        org = _organize_graph(gs)
        out["organize"] = org
        logger.success(
            f"Organize : {org['countries_filled']} pays comblés, "
            f"{org['company_props_set']} Company enrichies (display_name+tier_label+color), "
            f"{org['tier_nodes_set']} nœuds Tier ré-étiquetés"
        )

        # final counts
        with gs.driver.session() as s:
            out["totals"] = {
                "nodes":     s.run("MATCH (n) RETURN count(n) AS c").single()["c"],
                "tier1":     s.run("MATCH (c:Company {tier:1}) RETURN count(c) AS c").single()["c"],
                "tier2":     s.run("MATCH (c:Company {tier:2}) RETURN count(c) AS c").single()["c"],
                "tier3":     s.run("MATCH (c:Company {tier:3}) RETURN count(c) AS c").single()["c"],
                "BELONGS_TO":         s.run("MATCH ()-[r:BELONGS_TO]->() RETURN count(r) AS c").single()["c"],
                "MENTIONS":           s.run("MATCH ()-[r:MENTIONS]->() RETURN count(r) AS c").single()["c"],
                "SUPPLIES":           s.run("MATCH ()-[r:SUPPLIES]->() RETURN count(r) AS c").single()["c"],
                "POTENTIAL_SUPPLIER": s.run("MATCH ()-[r:POTENTIAL_SUPPLIER]->() RETURN count(r) AS c").single()["c"],
                "COMPETES_WITH":      s.run("MATCH ()-[r:COMPETES_WITH]->() RETURN count(r) AS c").single()["c"],
            }
    logger.success(f"CONSOLIDATOR — terminé: {out['totals']}")
    return out
