from neo4j import GraphDatabase
from src.config import settings
from src.models.company import Company


class GraphStore:
    _instance = None

    def __init__(self):
        self.driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )

    @classmethod
    def get_instance(cls) -> "GraphStore":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def close(self):
        self.driver.close()
        GraphStore._instance = None

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    # ------------------------------------------------------------------
    # Schema
    # ------------------------------------------------------------------

    def create_constraints(self):
        with self.driver.session() as session:
            session.run("""
                CREATE CONSTRAINT company_name_unique IF NOT EXISTS
                FOR (c:Company)
                REQUIRE c.name IS UNIQUE
            """)
            session.run("""
                CREATE CONSTRAINT tier_level_unique IF NOT EXISTS
                FOR (t:Tier)
                REQUIRE t.level IS UNIQUE
            """)

    # ------------------------------------------------------------------
    # Writes
    # ------------------------------------------------------------------

    def upsert_company(self, company: Company):
        query = """
        MERGE (c:Company {name: $name})
        SET c.website       = $website,
            c.country       = $country,
            c.tier          = $tier,
            c.description   = $description,
            c.email         = $email,
            c.phone         = $phone,
            c.address       = $address,
            c.linkedin      = $linkedin,
            c.contact_name  = $contact_name,
            c.services      = $services,
            c.certifications = $certifications,
            c.source        = $source,
            c.confidence    = $confidence
        """
        with self.driver.session() as session:
            session.run(query, {
                "name":           company.name,
                "website":        company.website,
                "country":        company.country,
                "tier":           company.tier,
                "description":    company.description,
                "email":          company.email,
                "phone":          company.phone,
                "address":        company.address,
                "linkedin":       company.linkedin,
                "contact_name":   company.contact_name,
                "services":       company.services or [],
                "certifications": company.certifications or [],
                "source":         company.source,
                "confidence":     company.confidence,
            })

    def upsert_discovered_company(self, name: str, source_company: str):
        with self.driver.session() as session:
            session.run(
                """
                MERGE (c:Company {name: $name})
                ON CREATE SET c.source = $source,
                              c.discovered_via = $via
                """,
                {"name": name, "source": "discovered", "via": source_company},
            )

    def link_company_to_tier(self, company_name: str, tier: int):
        """
        Tier 1 = Fabricants coffrets
        Tier 2 = Sous-traitants câblage
        Tier 3 = Concurrents (câbleurs low-cost)
        """
        if not tier or tier not in (1, 2, 3):
            return
        label = {
            1: "Fabricants coffrets",
            2: "Sous-traitants câblage",
            3: "Concurrents câblage low-cost",
        }[tier]
        with self.driver.session() as session:
            session.run(
                """
                MERGE (t:Tier {level: $tier})
                SET t.label = $label
                WITH t
                MATCH (c:Company {name: $name})
                MERGE (c)-[:BELONGS_TO]->(t)
                """,
                {"tier": tier, "label": label, "name": company_name},
            )

    def create_mention_relation(self, source_name: str, mentioned_name: str):
        with self.driver.session() as session:
            session.run(
                """
                MATCH (a:Company {name: $source})
                MATCH (b:Company {name: $mentioned})
                WHERE a <> b
                MERGE (a)-[:MENTIONS]->(b)
                """,
                {"source": source_name, "mentioned": mentioned_name},
            )

    def create_supplies_relation(self, supplier_name: str, client_name: str):
        with self.driver.session() as session:
            session.run(
                """
                MATCH (s:Company {name: $supplier})
                MATCH (c:Company {name: $client})
                WHERE s <> c
                MERGE (s)-[:SUPPLIES]->(c)
                """,
                {"supplier": supplier_name, "client": client_name},
            )

    def create_potential_supplier(self, supplier_name: str, client_name: str, reason: str):
        """
        Relation POTENTIAL_SUPPLIER — plus de contrainte géographique.
        Toute Tier 2 peut potentiellement fournir une Tier 1.
        """
        with self.driver.session() as session:
            session.run(
                """
                MATCH (s:Company {name: $supplier})
                MATCH (c:Company {name: $client})
                WHERE s <> c
                MERGE (s)-[r:POTENTIAL_SUPPLIER]->(c)
                SET r.reason = $reason
                """,
                {"supplier": supplier_name, "client": client_name, "reason": reason},
            )

    def detect_and_upgrade_supplies(self):
        """Mention bidirectionnelle → relation SUPPLIES confirmée."""
        with self.driver.session() as session:
            session.run("""
                MATCH (a:Company)-[:MENTIONS]->(b:Company)-[:MENTIONS]->(a)
                WHERE a <> b
                MERGE (a)-[:SUPPLIES]->(b)
            """)

    def update_embedding(self, company_name: str, embedding: list[float]):
        with self.driver.session() as session:
            session.run(
                "MATCH (c:Company {name: $name}) SET c.embedding = $embedding",
                {"name": company_name, "embedding": embedding},
            )

    # ------------------------------------------------------------------
    # Reads
    # ------------------------------------------------------------------

    def get_all_companies(self) -> list[dict]:
        query = """
        MATCH (c:Company)
        RETURN c.name    AS name,
               c.website AS website,
               c.country AS country,
               c.tier    AS tier,
               c.address AS address
        """
        with self.driver.session() as session:
            result = session.run(query)
            return [record.data() for record in result]

    def get_company_names(self) -> list[str]:
        with self.driver.session() as session:
            result = session.run("MATCH (c:Company) RETURN c.name AS name")
            return [record["name"] for record in result]

    def get_known_domains(self) -> set[str]:
        from urllib.parse import urlparse
        with self.driver.session() as session:
            result = session.run(
                "MATCH (c:Company) WHERE c.website IS NOT NULL RETURN c.website AS website"
            )
            domains = set()
            for record in result:
                url = record["website"] or ""
                try:
                    host = urlparse(url if url.startswith("http") else f"https://{url}").netloc.lower()
                    if host:
                        domains.add(host.replace("www.", ""))
                except Exception:
                    pass
            return domains

    def get_companies_by_tier(self, tier: int) -> list[dict]:
        query = """
        MATCH (c:Company {tier: $tier})
        OPTIONAL MATCH (c)<-[m:MENTIONS]-()
        OPTIONAL MATCH (c)-[s:SUPPLIES]->()
        OPTIONAL MATCH (c)<-[ps:POTENTIAL_SUPPLIER]-()
        WITH c, count(DISTINCT m) AS mentions_in,
                count(DISTINCT s) AS supplies_count,
                count(DISTINCT ps) AS potential_suppliers_count
        RETURN c.name           AS name,
               c.website        AS website,
               c.country        AS country,
               c.tier           AS tier,
               c.email          AS email,
               c.phone          AS phone,
               c.address        AS address,
               c.linkedin       AS linkedin,
               c.description    AS description,
               c.confidence     AS confidence,
               c.score_final    AS score_final,
               c.score_relevance   AS score_relevance,
               c.score_potential   AS score_potential,
               c.score_competition AS score_competition,
               c.score_market      AS score_market,
               c.xai_summary    AS xai_summary,
               c.xai_recommendation AS xai_recommendation,
               c.pitch_angle    AS pitch_angle,
               mentions_in,
               supplies_count,
               potential_suppliers_count
        ORDER BY coalesce(c.score_final, c.confidence, 0) DESC,
                 mentions_in DESC
        """
        with self.driver.session() as session:
            result = session.run(query, {"tier": tier})
            return [record.data() for record in result]

    # ------------------------------------------------------------------
    # Scores & XAI
    # ------------------------------------------------------------------

    def update_company_scores(self, company_name: str, scores: dict):
        """Persist multifactorial scores to Neo4j."""
        with self.driver.session() as session:
            session.run(
                """
                MATCH (c:Company {name: $name})
                SET c.score_relevance   = $relevance,
                    c.score_potential   = $potential,
                    c.score_competition = $competition,
                    c.score_market      = $market,
                    c.score_final       = $final
                """,
                {
                    "name":        company_name,
                    "relevance":   scores.get("relevance"),
                    "potential":   scores.get("potential"),
                    "competition": scores.get("competition"),
                    "market":      scores.get("market"),
                    "final":       scores.get("final"),
                },
            )

    def update_company_pitch(self, company_name: str, pitch_angle: str):
        """Persist the marketing pitch angle to Neo4j so the Marketing page can display it."""
        with self.driver.session() as session:
            session.run(
                "MATCH (c:Company {name: $name}) SET c.pitch_angle = $pitch_angle",
                {"name": company_name, "pitch_angle": pitch_angle},
            )

    def update_company_xai(self, company_name: str, xai: dict):
        """Persist XAI summary and recommendation to Neo4j."""
        with self.driver.session() as session:
            session.run(
                """
                MATCH (c:Company {name: $name})
                SET c.xai_summary        = $summary,
                    c.xai_recommendation = $recommendation,
                    c.xai_action         = $action
                """,
                {
                    "name":           company_name,
                    "summary":        xai.get("summary", ""),
                    "recommendation": xai.get("recommendation", ""),
                    "action":         xai.get("action", ""),
                },
            )

    def get_company_by_name(self, name: str) -> dict | None:
        """Return full company data including scores."""
        query = """
        MATCH (c:Company {name: $name})
        RETURN c.name AS name, c.website AS website, c.country AS country,
               c.tier AS tier, c.email AS email, c.phone AS phone,
               c.address AS address, c.linkedin AS linkedin,
               c.description AS description, c.confidence AS confidence,
               c.contact_name AS contact_name,
               c.services AS services,
               c.certifications AS certifications,
               c.source AS source,
               c.discovered_via AS discovered_via,
               c.score_final AS score_final,
               c.score_relevance AS score_relevance,
               c.score_potential AS score_potential,
               c.score_competition AS score_competition,
               c.score_market AS score_market,
               c.xai_summary AS xai_summary,
               c.xai_recommendation AS xai_recommendation,
               c.xai_action AS xai_action,
               c.pitch_angle AS pitch_angle
        """
        with self.driver.session() as session:
            result = session.run(query, {"name": name})
            record = result.single()
            return record.data() if record else None

    def get_countries(self) -> list[str]:
        """Return sorted list of unique countries present in graph."""
        with self.driver.session() as session:
            result = session.run(
                "MATCH (c:Company) WHERE c.country IS NOT NULL "
                "RETURN DISTINCT c.country AS country ORDER BY country"
            )
            return [r["country"] for r in result if r["country"]]

    def get_all_companies_paginated(
        self,
        tier: int | None = None,
        country: str | None = None,
        min_score: int = 0,
        limit: int = 100,
        offset: int = 0,
    ) -> dict:
        """Return paginated companies with optional filters."""
        filters = ["c.website IS NOT NULL"]
        params: dict = {"limit": limit, "offset": offset, "min_score": min_score}

        if tier is not None:
            filters.append("c.tier = $tier")
            params["tier"] = tier
        if country:
            filters.append("c.country = $country")
            params["country"] = country

        where_clause = " AND ".join(filters)
        query = f"""
        MATCH (c:Company)
        WHERE {where_clause}
          AND coalesce(c.score_final, coalesce(c.confidence * 100, 0)) >= $min_score
        RETURN c.name AS name, c.website AS website, c.country AS country,
               c.tier AS tier, c.email AS email, c.phone AS phone,
               c.address AS address, c.linkedin AS linkedin,
               c.description AS description, c.confidence AS confidence,
               c.contact_name AS contact_name,
               c.services AS services,
               c.certifications AS certifications,
               c.source AS source,
               c.discovered_via AS discovered_via,
               c.score_final AS score_final,
               c.score_relevance AS score_relevance,
               c.score_potential AS score_potential,
               c.score_competition AS score_competition,
               c.score_market AS score_market,
               c.xai_summary AS xai_summary,
               c.xai_recommendation AS xai_recommendation,
               c.xai_action AS xai_action,
               c.pitch_angle AS pitch_angle
        ORDER BY coalesce(c.score_final, 0) DESC
        SKIP $offset LIMIT $limit
        """
        count_query = f"""
        MATCH (c:Company)
        WHERE {where_clause}
          AND coalesce(c.score_final, coalesce(c.confidence * 100, 0)) >= $min_score
        RETURN count(c) AS total
        """
        with self.driver.session() as session:
            companies = [r.data() for r in session.run(query, params)]
            total     = session.run(count_query, params).single()["total"]
        return {"companies": companies, "total": total, "limit": limit, "offset": offset}
