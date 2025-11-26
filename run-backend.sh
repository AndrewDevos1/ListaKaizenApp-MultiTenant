#!/bin/bash

# Script para rodar o backend com o venv ativado (Linux/macOS)

# Verifica e mata processo na porta 5000
echo "🔍 Verificando porta 5000..."
PORT_PID=$(lsof -ti:5000)
if [ ! -z "$PORT_PID" ]; then
    echo "⚠️  Processo encontrado na porta 5000 (PID: $PORT_PID)"
    echo "🔪 Finalizando processo..."
    kill -9 $PORT_PID
    sleep 1
    echo "✅ Processo finalizado!"
else
    echo "✅ Porta 5000 livre"
fi

cd backend

# Verifica se o venv existe
if [ ! -d ".venv" ]; then
    echo "Ambiente virtual não encontrado. Execute primeiro:"
    echo "python -m venv .venv"
    echo "pip install -r requirements.txt"
    exit 1
fi

# Ativa o ambiente virtual
source .venv/bin/activate

# Roda o Flask
echo "🚀 Iniciando Backend na porta 5000..."
export FLASK_APP=run.py
flask run
