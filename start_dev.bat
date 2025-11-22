@echo off
cd /d "%~dp0"

echo ========================================
echo Iniciando Backend e Frontend
echo ========================================
echo.

start "Backend - Flask (http://127.0.0.1:5000)" cmd /k "cd backend && set FLASK_CONFIG=development && .venv\Scripts\activate.bat && python run.py"
timeout /t 2 /nobreak
start "Frontend - React (http://localhost:3000)" cmd /k "cd frontend && npm start"

echo.
echo ========================================
echo Backend e Frontend iniciados!
echo ========================================
echo Backend: http://127.0.0.1:5000
echo Frontend: http://localhost:3000
echo.
pause
