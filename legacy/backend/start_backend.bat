@echo off
echo ========================================
echo   REINICIAR BACKEND - Kaizen Lists
echo ========================================
echo.

echo [1/3] Parando processos Flask existentes...
taskkill /F /IM python.exe /T 2>nul
timeout /t 2 /nobreak >nul

echo.
echo [2/3] Limpando cache Python...
cd /d "%~dp0backend"

for /d /r %%i in (__pycache__) do (
    if exist "%%i" (
        rd /s /q "%%i" 2>nul
    )
)

del /s /q *.pyc 2>nul
del /s /q *.pyo 2>nul

echo.
echo [3/3] Iniciando Flask...
echo.
echo ========================================
echo   Servidor iniciando em:
echo   http://0.0.0.0:5000 (Todas interfaces)
echo   http://127.0.0.1:5000 (Localhost)
echo   http://192.168.88.122:5000 (Rede)
echo ========================================
echo.

call .venv\Scripts\activate.bat
set PYTHONDONTWRITEBYTECODE=1
set FLASK_CONFIG=development
set FLASK_ENV=development
set FLASK_DEBUG=1

python run.py

pause
