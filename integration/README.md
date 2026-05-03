# 🎓 Portail d'Intégration Token Thieves - ESPRIT 2026

Portail web moderne centralisant les 3 projets multi-agents avec intelligence artificielle.

## 🏗️ Architecture

```
integration/
├── backend/              # Flask API
│   ├── app.py
│   └── requirements.txt
├── frontend/             # React + Vite
│   ├── src/
│   │   ├── components/   # Navbar, Footer
│   │   ├── pages/        # Home, Task1, Task2, Task3, Dashboard
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 🚀 Démarrage Rapide

### Option 1: Démarrage Automatique (Windows)

#### Backend
```cmd
start_backend.bat
```
→ Backend disponible sur http://localhost:5000

#### Frontend
```cmd
start_frontend.bat
```
→ Frontend disponible sur http://localhost:3000

### Option 2: Démarrage Manuel

#### Backend
```bash
cd backend
pip install -r requirements.txt
python app.py
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 📋 Prérequis

- **Python 3.8+**
- **Node.js 16+** et npm
- **Services des 3 tâches** démarrés séparément

## 🔗 Services à Démarrer

Avant d'utiliser le portail, démarrez les services individuels :

### Tache 1 (Port 5001)
```bash
cd ../tache1
python app.py
```

### Tache 2 (Port 8000)
```bash
cd ../tache2
start.bat  # ou ./start.sh
```

### Tache 3 (Ports 8001-8003, 5002)
```bash
cd ../tache3
python manage.py dashboard
```

## 🎨 Fonctionnalités

### Page d'Accueil (/)
- Présentation des 3 projets
- Cards cliquables pour navigation
- Statistiques globales

### Pages Détaillées (/task1, /task2, /task3)
Chaque page contient 3 sections complètes :

1. **Backend**
   - Description du backend
   - Technologies utilisées
   - Endpoints API
   - Bouton d'accès direct

2. **Frontend**
   - Description de l'interface
   - Technologies utilisées
   - Fonctionnalités principales
   - Bouton d'accès direct

3. **Données**
   - Type de base de données
   - Collections/Tables
   - Métriques de performance
   - Visualisation

### Dashboard (/dashboard)
- Vue d'ensemble des 3 projets
- Statut des services en temps réel
- Métriques globales
- Performances des agents IA

## 🎯 API Backend

### Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/tasks` | Liste de toutes les tâches |
| GET | `/api/tasks/<id>` | Détails d'une tâche |
| GET | `/api/status` | Statut des services |
| GET | `/api/metrics` | Métriques globales |
| GET | `/api/health` | Health check |

### Exemple de Réponse

```json
{
  "success": true,
  "task": {
    "id": "task1",
    "name": "SBT Vision Intelligence Hub",
    "description": "...",
    "backend": {
      "url": "http://localhost:5001",
      "description": "...",
      "tech": ["Flask", "Python"],
      "endpoints": [...]
    },
    "frontend": {
      "url": "http://localhost:5001",
      "description": "...",
      "tech": ["JavaScript", "HTML5"],
      "features": [...]
    },
    "data": {
      "type": "MongoDB",
      "description": "...",
      "collections": [...],
      "metrics": {...}
    }
  }
}
```

## 🎨 Design

- **Thème**: Bleu et Blanc (professionnel)
- **Style**: SaaS moderne
- **Responsive**: Mobile, Tablet, Desktop
- **Animations**: Fade-in, Slide-in
- **Typographie**: Inter (Google Fonts)
- **Icons**: Font Awesome 6

## 🔧 Configuration

### Backend (Flask)
- Port: 5000
- CORS activé pour React
- Proxy Vite configuré

### Frontend (React + Vite)
- Port: 3000
- Proxy vers backend: `/api` → `http://localhost:5000`
- Hot Module Replacement (HMR)

## 📦 Dépendances

### Backend
```txt
Flask==3.0.0
Flask-CORS==4.0.0
requests==2.31.0
```

### Frontend
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.20.0",
  "axios": "^1.6.2"
}
```

## 🐛 Dépannage

### Erreur CORS
→ Vérifier que Flask-CORS est installé et activé

### Port déjà utilisé
→ Modifier le port dans `backend/app.py` ou `frontend/vite.config.js`

### Services non accessibles
→ Vérifier que les 3 tâches sont démarrées sur leurs ports respectifs

### npm install échoue
→ Supprimer `node_modules` et `package-lock.json`, puis réessayer

## 📝 Notes

- Le portail est un **hub de navigation** vers les 3 projets
- Les services individuels doivent être démarrés séparément
- Le backend Flask sert uniquement les métadonnées
- Les données réelles proviennent des services individuels

## 👥 Crédits

**Équipe**: Token Thieves  
**Institution**: ESPRIT (École Supérieure Privée d'Ingénierie et de Technologies)  
**Promotion**: 2026  

---

**Version**: 1.0.0  
**Date**: Avril 2026  
**Statut**: ✅ Production Ready
