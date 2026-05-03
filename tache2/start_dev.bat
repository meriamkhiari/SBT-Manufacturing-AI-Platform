@echo off
REM Mode développement Flask — Flask :8000 + React dev :3000
echo 🔬 QualityVision A2A — Mode Développement Flask
echo.

REM set ANTHROPIC_API_KEY=your_key_here

REM Install React deps si node_modules absent
if not exist "frontend\node_modules" (
  echo 📦 Installation des dépendances React...
  cd frontend
  call npm install
  cd ..
)

REM Start Flask
echo 🐍 Démarrage Flask sur :8000...
start "Flask Backend" python app.py

REM Wait 3 seconds
timeout /t 3 /nobreak >nul

REM Start React dev server
echo ⚛️  Démarrage React sur :3000...
cd frontend
start "React Dev" npm run dev
cd ..

echo.
echo ✅ Backend Flask : http://localhost:8000/api/
echo ✅ Frontend React : http://localhost:3000
echo.
echo Fermez les fenêtres pour arrêter
pause
