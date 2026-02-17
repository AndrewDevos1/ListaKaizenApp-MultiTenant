@echo off
echo ========================================
echo  FIX CORS DEFINITIVO - Kaizen Lists
echo ========================================
echo.

echo [1/5] Matando TODOS os processos Python...
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM pythonw.exe /T 2>nul
timeout /t 3 /nobreak >nul

echo.
echo [2/5] Limpando cache Python COMPLETO...
cd /d "%~dp0backend"

for /d /r %%i in (__pycache__) do (
    if exist "%%i" (
        echo Removendo: %%i
        rd /s /q "%%i" 2>nul
    )
)

del /s /q *.pyc 2>nul
del /s /q *.pyo 2>nul

echo.
echo [3/5] Removendo flask-cors (conflito)...
call .venv\Scripts\activate.bat
pip uninstall flask-cors -y 2>nul

echo.
echo [4/5] Configurando variaveis...
set PYTHONDONTWRITEBYTECODE=1
set FLASK_CONFIG=development
set FLASK_ENV=development
set FLASK_DEBUG=1

echo.
echo [5/5] Iniciando Flask com CORS manual...
echo.
echo ========================================
echo   SERVIDOR RODANDO EM:
echo   http://0.0.0.0:5000
echo   http://127.0.0.1:5000
echo   http://192.168.88.122:5000
echo ========================================
echo.
echo IMPORTANTE: 
echo - CORS agora usa headers manuais
echo - Aceita qualquer origem em DEV
echo - Sem Flask-CORS (removido)
echo.
echo ========================================
echo.

python run.py

pause
