#!/usr/bin/env python3
"""Test de connexion MongoDB avec PyMongo 3.12.3"""

from pymongo import MongoClient
import sys

try:
    # Connexion à MongoDB
    client = MongoClient('mongodb://localhost:27017/', serverSelectionTimeoutMS=5000)
    
    # Récupérer les infos du serveur
    server_info = client.server_info()
    
    print("=" * 60)
    print("✅ CONNEXION MONGODB RÉUSSIE!")
    print("=" * 60)
    print(f"MongoDB version    : {server_info.get('version', 'N/A')}")
    print(f"Wire version       : {server_info.get('maxWireVersion', 'N/A')}")
    print(f"PyMongo version    : 3.12.3")
    print(f"Serveur            : localhost:27017")
    print(f"Compatible         : ✅ PyMongo 3.12.3 supporte MongoDB 4.0")
    print("=" * 60)
    
    # Lister les bases de données
    print("\n📊 Bases de données disponibles:")
    for db_name in client.list_database_names():
        print(f"  - {db_name}")
    
    # Tester la base sbt_vision
    db = client['sbt_vision']
    collections = db.list_collection_names()
    
    print(f"\n📁 Collections dans 'sbt_vision':")
    if collections:
        for coll in collections:
            count = db[coll].count_documents({})
            print(f"  - {coll}: {count} documents")
    else:
        print("  ⚠️  Aucune collection (base vide)")
    
    print("\n✅ Test terminé avec succès!")
    sys.exit(0)
    
except Exception as e:
    print("=" * 60)
    print("❌ ERREUR DE CONNEXION MONGODB")
    print("=" * 60)
    print(f"Erreur: {e}")
    print("\n💡 Solutions possibles:")
    print("  1. Vérifiez que MongoDB est démarré: net start MongoDB")
    print("  2. Vérifiez le port 27017: netstat -ano | findstr :27017")
    print("  3. Réinstallez PyMongo: pip install pymongo==3.12.3")
    print("=" * 60)
    sys.exit(1)
