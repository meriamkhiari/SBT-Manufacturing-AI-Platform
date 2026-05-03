@echo off
REM ============================================================
REM  RESTART ALL - Kills old processes and starts fresh
REM ============================================================
echo Stopping all services...

REM Kill Python processes on specific ports
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000" ^| findstr "LISTENING"') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5002" ^| findstr "LISTENING"') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5050" ^| findstr "LISTENING"') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /F /PID %%a 2>nul

REM Kill Node processes on port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /F /PID %%a 2>nul

echo Waiting 3 seconds for ports to be released...
timeout /t 3 /nobreak >nul

echo.
echo Starting all services...
cd integration
call start_all.bat
