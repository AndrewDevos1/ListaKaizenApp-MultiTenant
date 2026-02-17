@echo off
REM Script para rodar o frontend (Windows)

cd frontend

REM Instala dependências se necessário
if not exist "node_modules" (
    echo Instalando dependências do frontend...
    call npm install
)

REM Roda o frontend
echo Iniciando Frontend na porta 3000...
call npm start
pause
