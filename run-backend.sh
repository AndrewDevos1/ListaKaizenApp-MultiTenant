#!/bin/bash

# Script para rodar o backend com o venv ativado (Linux/macOS)
# Atualizado: 24/12/2025 05:27 BRT - Suporte a Railway PostgreSQL

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
    echo "❌ Ambiente virtual não encontrado. Execute primeiro:"
    echo "   python -m venv .venv"
    echo "   pip install -r requirements.txt"
    exit 1
fi

# Ativa o ambiente virtual
source .venv/bin/activate

# 🔗 Carrega variáveis do .env (se existir)
if [ -f ".env" ]; then
    echo "📋 Carregando variáveis do .env..."
    export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
    
    # Detecta qual banco está configurado
    if [ ! -z "$DATABASE_URL" ]; then
        if [[ "$DATABASE_URL" == postgresql://* ]]; then
            echo "🚂 Conectando ao PostgreSQL do Railway"
            echo "   Database: ${DATABASE_URL:0:40}..."
        elif [[ "$DATABASE_URL" == sqlite://* ]]; then
            echo "💾 Usando SQLite: ${DATABASE_URL}"
        fi
    else
        echo "💾 Usando SQLite local (kaizen_dev.db) - DATABASE_URL não configurado"
    fi
else
    echo "⚠️  Arquivo .env não encontrado. Usando SQLite padrão."
fi

# Roda o Flask
echo "🚀 Iniciando Backend na porta 5000..."
export FLASK_APP=run.py
python run.py
