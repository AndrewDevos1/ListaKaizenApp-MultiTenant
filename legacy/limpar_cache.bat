@echo off
echo ========================================
echo Limpando Cache Python do Kaizen Lists
echo ========================================
echo.

cd /d "%~dp0backend"

echo [1/3] Removendo diretorios __pycache__...
for /d /r %%i in (__pycache__) do (
    if exist "%%i" (
        echo Removendo: %%i
        rd /s /q "%%i"
    )
)

echo.
echo [2/3] Removendo arquivos .pyc...
del /s /q *.pyc 2>nul

echo.
echo [3/3] Removendo arquivos .pyo...
del /s /q *.pyo 2>nul

echo.
echo ========================================
echo Cache Python limpo com sucesso!
echo ========================================
echo.
echo Proximos passos:
echo 1. Execute: backend\.venv\Scripts\activate
echo 2. Execute: set PYTHONDONTWRITEBYTECODE=1
echo 3. Execute: flask run
echo.
pause
