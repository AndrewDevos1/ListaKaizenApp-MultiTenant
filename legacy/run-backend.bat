@echo off
REM Script para rodar o backend com o venv ativado (Windows)

cd backend

REM Ativa o ambiente virtual
call .venv\Scripts\activate.bat

REM Roda o Flask
echo Iniciando Backend na porta 5000...
set FLASK_APP=run.py
flask run
pause
