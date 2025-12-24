#!/bin/bash

# Script para rodar o backend SEMPRE com SQLite local
# Use este script quando quiser trabalhar offline ou com dados locais

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║        💾 BACKEND → SQLITE LOCAL (kaizen_dev.db)          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Verifica e mata processo na porta 5000
echo "🔍 Verificando porta 5000..."
PORT_PID=$(lsof -ti:5000 2>/dev/null)
if [ ! -z "$PORT_PID" ]; then
    echo "⚠️  Processo encontrado na porta 5000 (PID: $PORT_PID)"
    echo "🔪 Finalizando processo..."
    kill -9 $PORT_PID 2>/dev/null
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
    echo "   source .venv/bin/activate"
    echo "   pip install -r requirements.txt"
    exit 1
fi

# Ativa o ambiente virtual
source .venv/bin/activate

# 🔧 FORÇA USO DE SQLITE LOCAL (remove PostgreSQL do ambiente)
echo "💾 Configurando para usar SQLite local..."
unset DATABASE_URL
unset DEV_DATABASE_URL
unset TEST_DATABASE_URL

echo "✅ SQLite configurado: kaizen_dev.db"
echo ""

# Roda o Flask
echo "🚀 Iniciando Backend na porta 5000..."
echo ""
export FLASK_APP=run.py
python run.py
