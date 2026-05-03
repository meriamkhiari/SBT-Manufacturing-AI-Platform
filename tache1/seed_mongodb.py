#!/usr/bin/env python3
"""Script de seed pour la base MongoDB de SBT Vision"""

from pymongo import MongoClient
from datetime import datetime
import sys

# Données de test pour SBT Vision
SAMPLE_DATA = {
    "detections": [
        {
            "image_name": "faisceau_001.jpg",
            "timestamp": datetime.now(),
            "detections": [
                {
                    "class": "defaut_sertissage",
                    "confidence": 0.92,
                    "bbox": [120, 80, 200, 150],
                    "severity": "high"
                },
                {
                    "class": "cable_coupe",
                    "confidence": 0.87,
                    "bbox": [300, 200, 380, 270],
                    "severity": "critical"
                }
            ],
            "total_defects": 2,
            "status": "completed"
        },
        {
            "image_name": "faisceau_002.jpg",
            "timestamp": datetime.now(),
            "detections": [
                {
                    "class": "soudure_defectueuse",
                    "confidence": 0.78,
                    "bbox": [150, 120, 220, 180],
                    "severity": "medium"
                }
            ],
            "total_defects": 1,
            "status": "completed"
        },
        {
            "image_name": "faisceau_003.jpg",
            "timestamp": datetime.now(),
            "detections": [],
            "total_defects": 0,
            "status": "completed"
        }
    ],
    "users": [
        {
            "username": "admin",
            "password": "admin123",
            "fullname": "Administrateur SBT",
            "email": "admin@sbt.com",
            "role": "administrator"
        },
        {
            "username": "operator",
            "password": "operator123",
            "fullname": "Opérateur Production",
            "email": "operator@sbt.com",
            "role": "operator"
        },
        {
            "username": "demo",
            "password": "demo123",
            "fullname": "Utilisateur Demo",
            "email": "demo@sbt.com",
            "role": "employee"
        }
    ],
    "statistics": [
        {
            "date": datetime.now().strftime("%Y-%m-%d"),
            "total_analyses": 3,
            "total_defects": 3,
            "defects_by_type": {
                "defaut_sertissage": 1,
                "cable_coupe": 1,
                "soudure_defectueuse": 1
            },
            "average_confidence": 0.86
        }
    ]
}

def seed_database():
    """Peupler la base de données MongoDB"""
    try:
        # Connexion
        print("🔌 Connexion à MongoDB...")
        client = MongoClient('mongodb://localhost:27017/')
        db = client['sbt_vision']
        
        print(f"✅ Connecté à la base 'sbt_vision'")
        
        # Supprimer les anciennes données
        print("\n🗑️  Nettoyage des anciennes données...")
        for collection_name in SAMPLE_DATA.keys():
            db[collection_name].delete_many({})
            print(f"  - Collection '{collection_name}' vidée")
        
        # Insérer les nouvelles données
        print("\n📥 Insertion des données de test...")
        for collection_name, documents in SAMPLE_DATA.items():
            if documents:
                result = db[collection_name].insert_many(documents)
                print(f"  ✅ {len(result.inserted_ids)} documents insérés dans '{collection_name}'")
        
        # Vérification
        print("\n📊 Vérification des données:")
        for collection_name in SAMPLE_DATA.keys():
            count = db[collection_name].count_documents({})
            print(f"  - {collection_name}: {count} documents")
        
        print("\n" + "=" * 60)
        print("✅ BASE DE DONNÉES PEUPLÉE AVEC SUCCÈS!")
        print("=" * 60)
        print("\n💡 Vous pouvez maintenant lancer l'application:")
        print("   cd tache1")
        print("   python app.py")
        print("\n🌐 Puis ouvrir: http://localhost:5001")
        
        return True
        
    except Exception as e:
        print("\n" + "=" * 60)
        print("❌ ERREUR LORS DU SEED")
        print("=" * 60)
        print(f"Erreur: {e}")
        print("\n💡 Vérifiez que MongoDB est démarré:")
        print("   net start MongoDB")
        return False

if __name__ == "__main__":
    success = seed_database()
    sys.exit(0 if success else 1)
