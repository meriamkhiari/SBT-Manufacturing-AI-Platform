# 🔧 Dépannage - Tache 1 (SBT Vision)

## ❌ Erreur MongoDB Wire Version

### Symptôme
```
Database error: Server at localhost:27017 reports wire version 7, 
but this version of PyMongo requires at least 8 (MongoDB 4.2).
```

### Cause
Incompatibilité entre la version de MongoDB et PyMongo.

### Solution ✅ (Appliquée)
**PyMongo downgrade à 3.12.3** (compatible MongoDB 3.6+)

```bash
cd tache1
pip install -r requirements.txt --upgrade
```

---

## 🔄 Solutions alternatives

### Option 2 : Upgrade MongoDB (si possible)

Si vous avez les droits admin, mettez à jour MongoDB :

**Windows :**
1. Téléchargez MongoDB 4.2+ : https://www.mongodb.com/try/download/community
2. Installez la nouvelle version
3. Redémarrez le service MongoDB

**Linux :**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y mongodb-org

# Redémarrer
sudo systemctl restart mongod
```

**macOS :**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services restart mongodb-community
```

### Option 3 : Vérifier la version MongoDB

```bash
# Connexion à MongoDB
mongo

# Dans le shell MongoDB
db.version()
```

---

## 🐛 Autres erreurs courantes

### MongoDB ne démarre pas

**Windows :**
```bash
# Vérifier le service
net start MongoDB

# Si erreur, vérifier les logs
type "C:\Program Files\MongoDB\Server\4.0\log\mongod.log"
```

**Linux/macOS :**
```bash
# Vérifier le statut
sudo systemctl status mongod

# Démarrer
sudo systemctl start mongod

# Logs
sudo tail -f /var/log/mongodb/mongod.log
```

### Port 27017 déjà utilisé

```bash
# Windows
netstat -ano | findstr :27017
taskkill /PID <PID> /F

# Linux/macOS
lsof -i :27017
kill -9 <PID>
```

### Connexion refusée

Vérifiez le fichier `.env` :

```env
MONGO_URI=mongodb://localhost:27017/sbt_vision
FLASK_APP=app.py
FLASK_ENV=development
```

### Base de données vide

Exécutez le script de seed :

```bash
cd tache1
python seed_database.py
```

---

## 📊 Vérification de l'installation

### Test de connexion MongoDB

```python
from pymongo import MongoClient

try:
    client = MongoClient('mongodb://localhost:27017/')
    print(f"MongoDB version: {client.server_info()['version']}")
    print(f"Wire version: {client.server_info()['maxWireVersion']}")
    print("✅ Connexion réussie!")
except Exception as e:
    print(f"❌ Erreur: {e}")
```

### Test Flask

```bash
cd tache1
python app.py
```

Ouvrez http://localhost:5001 dans votre navigateur.

---

## 🆘 Support

Si le problème persiste :

1. **Vérifiez les versions** :
   ```bash
   python --version
   pip show pymongo
   mongo --version
   ```

2. **Logs détaillés** :
   ```bash
   # Activer le mode debug
   export FLASK_ENV=development
   python app.py
   ```

3. **Réinstallation complète** :
   ```bash
   pip uninstall pymongo
   pip install pymongo==3.12.3
   ```

---

## 📚 Versions compatibles

| MongoDB | PyMongo | Wire Version |
|---------|---------|--------------|
| 3.6     | 3.12.x  | 6            |
| 4.0     | 3.12.x  | 7            |
| 4.2     | 4.0+    | 8            |
| 4.4     | 4.0+    | 9            |
| 5.0+    | 4.0+    | 13+          |

**Configuration actuelle :**
- PyMongo : **3.12.3** ✅
- Compatible avec MongoDB 3.6 - 4.0

---

**Dernière mise à jour** : 27 avril 2026
