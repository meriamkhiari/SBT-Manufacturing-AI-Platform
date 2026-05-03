# 🚀 Démarrage - Tache 1 (SBT Vision)

## ✅ Problème résolu : MongoDB Wire Version

**Erreur corrigée** : `Server at localhost:27017 reports wire version 7, but this version of PyMongo requires at least 8`

**Solution appliquée** : Downgrade PyMongo de 4.6.0 → 3.12.3 (compatible MongoDB 4.0)

---

## 📋 Prérequis

- **Python** 3.9+
- **MongoDB** 4.0+ (installé et démarré)
- **PyMongo** 3.12.3 ✅

---

## ⚡ Installation rapide

### 1. Vérifier MongoDB

```bash
# Windows
net start MongoDB

# Vérifier la connexion
python test_mongo_connection.py
```

### 2. Installer les dépendances

```bash
cd tache1
pip install -r requirements.txt
```

### 3. Configurer l'environnement

Le fichier `.env` est déjà créé avec :
```env
MONGO_URI=mongodb://localhost:27017
MONGO_DB=sbt_vision
MONGO_COLL=detections
```

### 4. Peupler la base de données

```bash
python seed_mongodb.py
```

Cela crée :
- ✅ 3 détections de test
- ✅ 3 utilisateurs (admin, operator, demo)
- ✅ 1 statistique

### 5. Lancer l'application

```bash
python app.py
```

→ Ouvrir http://localhost:5000

---

## 🔐 Comptes de test

| Username | Password | Rôle |
|----------|----------|------|
| `admin` | `admin123` | Administrateur |
| `operator` | `operator123` | Opérateur |
| `demo` | `demo123` | Employé |

---

## 🎯 Fonctionnalités

1. **Login/Signup** : Authentification utilisateur
2. **Home** : Tableau de bord principal
3. **Agent1** : Extraction et analyse
4. **QC Pipeline** : Pipeline de contrôle qualité
5. **History** : Historique des actions

---

## 🔧 Dépannage

### MongoDB ne démarre pas

```bash
# Windows
net start MongoDB

# Vérifier le statut
Get-Service -Name MongoDB
```

### Erreur de connexion

```bash
# Tester la connexion
python test_mongo_connection.py
```

### Base de données vide

```bash
# Re-seed
python seed_mongodb.py
```

### Port déjà utilisé

L'application tourne sur le **port 5000** (pas 5001).

Si le port est occupé :
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

---

## 📚 Documentation

- **Troubleshooting** : Voir `TROUBLESHOOTING.md`
- **API** : Voir `README.md`

---

## 🆘 Support

**Erreur commune** : "Database error: Server at localhost:27017 reports wire version 7"

**Solution** : ✅ Déjà corrigée ! PyMongo 3.12.3 est compatible.

Si le problème persiste :
1. Vérifiez que MongoDB est démarré
2. Testez la connexion : `python test_mongo_connection.py`
3. Re-seed la base : `python seed_mongodb.py`

---

**Dernière mise à jour** : 27 avril 2026
**Version PyMongo** : 3.12.3 ✅
**Version MongoDB** : 4.0.3 ✅
