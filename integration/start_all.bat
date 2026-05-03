@echo off
REM ============================================================
REM  Integration Portal - launches every service in its own window
REM ============================================================
REM   Gateway   : http://localhost:5050   (Flask)
REM   Frontend  : http://localhost:3000   (Vite/React)
REM   tache1    : http://localhost:5000   (Flask  - SBT Vision)
REM   tache2    : http://localhost:8000   (Flask  - QualityVision)
REM   tache3    : http://localhost:5002   (Flask  - SBT Intelligence)
REM ============================================================
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1
set ROOT=%~dp0..

echo [1/5] Starting Gateway on :5050 ...
start "GATEWAY :5050" cmd /k "chcp 65001>nul && set PYTHONIOENCODING=utf-8&& set PYTHONUTF8=1&& cd /d %~dp0backend && python app.py"

echo [2/5] Starting tache1 on :5000 ...
start "TACHE1 :5000" cmd /k "chcp 65001>nul && set PYTHONIOENCODING=utf-8&& set PYTHONUTF8=1&& cd /d %ROOT%\tache1 && python app.py"

echo [3/5] Starting tache2 on :8000 ...
start "TACHE2 :8000" cmd /k "chcp 65001>nul && set PYTHONIOENCODING=utf-8&& set PYTHONUTF8=1&& cd /d %ROOT%\tache2 && python app.py"

if not exist "%ROOT%\tache3\frontend\dist\index.html" (
  echo [4a] Building tache3 frontend (one-time, ~1 min) ...
  cmd /c "cd /d %ROOT%\tache3\frontend && npm install && npm run build"
)

echo [4/5] Starting tache3 on :5002 ...
start "TACHE3 :5002" cmd /k "chcp 65001>nul && set PYTHONIOENCODING=utf-8&& set PYTHONUTF8=1&& cd /d %~dp0 && python _run_tache3.py"

echo [5/5] Starting frontend on :3000 ...
start "FRONTEND :3000" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ============================================================
echo   All services launched. Open http://localhost:3000
echo ============================================================
