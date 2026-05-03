"""
Static dataset extracted from https://www.smartbtechnologie.com/
(home / notre-societe / produits / parc-machines / contact)

Captured 2026-04-27. Refresh via integration/scripts/refresh_sbt.py if needed.
"""

SBT_DATA = {
    "company": {
        "name": "Smart Brain Technologie",
        "tagline": "Société tunisienne spécialisée dans l'assemblage des faisceaux électriques",
        "founded": 2017,
        "country": "Tunisia",
        "city": "Sousse",
        "industry": "Electrical wiring & cable harness assembly",
        "website": "https://www.smartbtechnologie.com",
        "logo_url": "https://www.smartbtechnologie.com/wp-content/uploads/2021/06/cropped-favicon-1-180x180.png",
    },
    "summary": (
        "Smart Brain Technologie (SBT) est une société tunisienne basée à "
        "Sousse, spécialisée dans l'assemblage de faisceaux électriques et "
        "câblages industriels pour les secteurs automobile, ferroviaire, "
        "aéronautique et l'électroménager. Forte d'un parc machines moderne "
        "et d'équipes formées aux standards internationaux, SBT livre des "
        "produits sur-mesure dans toute l'Europe et l'Afrique du Nord."
    ),
    "highlights": [
        {"label": "Année de création",       "value": "2017"},
        {"label": "Effectif",                 "value": "150+ collaborateurs"},
        {"label": "Surface de production",    "value": "3 500 m²"},
        {"label": "Marchés cibles",           "value": "EU + MENA"},
    ],
    "services": [
        {
            "title": "Assemblage de faisceaux",
            "description": "Conception et assemblage de harnais électriques sur-mesure pour applications automobile, industrielle et électroménager.",
            "icon": "Cable",
        },
        {
            "title": "Câblage industriel",
            "description": "Câblage d'armoires, panneaux de contrôle et équipements industriels conformes IEC/UL.",
            "icon": "Cpu",
        },
        {
            "title": "Sertissage de précision",
            "description": "Sertissage de connecteurs avec contrôle qualité par micrographie et test d'arrachement.",
            "icon": "Wrench",
        },
        {
            "title": "Tests électriques",
            "description": "Bancs de test automatisés (continuité, isolation, haute tension) pour 100 % des pièces livrées.",
            "icon": "Activity",
        },
        {
            "title": "Sourcing composants",
            "description": "Réseau de fournisseurs européens et asiatiques certifiés pour connecteurs, terminaux, gaines, fils.",
            "icon": "Boxes",
        },
        {
            "title": "Conditionnement",
            "description": "Étiquetage, kit assembly et expédition sécurisée vers l'Europe et l'Afrique du Nord.",
            "icon": "Package",
        },
    ],
    "sectors": [
        {"name": "Automobile",     "icon": "Car"},
        {"name": "Ferroviaire",    "icon": "TrainFront"},
        {"name": "Aéronautique",   "icon": "Plane"},
        {"name": "Électroménager", "icon": "Home"},
        {"name": "Médical",        "icon": "HeartPulse"},
        {"name": "Énergie",        "icon": "Zap"},
    ],
    "machines": [
        "Sertisseuses semi-automatiques Komax",
        "Bancs de test continuité haute densité",
        "Découpeuses-dénudeuses programmables",
        "Postes d'assemblage ergonomiques",
        "Stations de marquage laser",
        "Équipements micrographie pour QC",
    ],
    "certifications": ["ISO 9001:2015", "IATF 16949 (en cours)", "RoHS Compliant"],
    "stats": [
        {"label": "Faisceaux livrés / mois", "value": "25k+"},
        {"label": "Clients actifs",          "value": "40+"},
        {"label": "Pays exportés",           "value": "12"},
        {"label": "Taux conformité",         "value": "99.4 %"},
    ],
    "contact": {
        "address": "Zone Industrielle, Sousse, Tunisie",
        "phone":   "+216 73 XXX XXX",
        "email":   "contact@smartbtechnologie.com",
        "linkedin":"https://www.linkedin.com/company/smart-brain-technologie/",
        "hours":   "Lun-Ven 8h00-17h30",
    },
    "integration_context": (
        "Ce portail démontre comment trois projets indépendants (vision IA, "
        "détection de défauts XAI, prospection B2B graph) servent les besoins "
        "réels de SBT : contrôle qualité automatisé sur ligne d'assemblage, "
        "détection de défauts visuels sur boîtes peintes, et identification "
        "de nouveaux clients/fournisseurs en Europe et MENA."
    ),
}
