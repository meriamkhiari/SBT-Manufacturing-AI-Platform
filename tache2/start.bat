@echo off
REM Mode production Flask — Sert le build React depuis Flask
echo 🔬 QualityVision A2A — Flask Production
echo.

REM set ANTHROPIC_API_KEY=your_key_here

REM Build React si nécessaire
if not exist "frontend\dist" (
  echo 📦 Build du frontend React...
  cd frontend
  call npm install
  call npm run build
  cd ..
)

echo 🚀 Démarrage Flask sur :8000...
python app.py
