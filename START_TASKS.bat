@echo off
REM Démarre les 3 tâches uniquement (le gateway et frontend doivent déjà tourner)
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1

echo Démarrage des 3 tâches...
echo.

echo [1/3] Démarrage tache1 sur :5000 ...
start "TACHE1 :5000" cmd /k "chcp 65001>nul && set PYTHONIOENCODING=utf-8 && set PYTHONUTF8=1 && cd /d %~dp0tache1 && python app.py"

echo [2/3] Démarrage tache2 sur :8000 ...
start "TACHE2 :8000" cmd /k "chcp 65001>nul && set PYTHONIOENCODING=utf-8 && set PYTHONUTF8=1 && cd /d %~dp0tache2 && python app.py"

echo [3/3] Démarrage tache3 sur :5002 ...
start "TACHE3 :5002" cmd /k "chcp 65001>nul && set PYTHONIOENCODING=utf-8 && set PYTHONUTF8=1 && cd /d %~dp0integration && python _run_tache3.py"

echo.
echo ============================================================
echo   Les 3 tâches sont en cours de démarrage...
echo   - Tache1 : http://localhost:5000
echo   - Tache2 : http://localhost:8000
echo   - Tache3 : http://localhost:5002
echo ============================================================
echo.
pause
