#!/bin/bash

# Script para rodar o frontend (Linux/macOS)

# Verifica e mata processo na porta 3000
echo "🔍 Verificando porta 3000..."
PORT_PID=$(lsof -ti:3000)
if [ ! -z "$PORT_PID" ]; then
    echo "⚠️  Processo encontrado na porta 3000 (PID: $PORT_PID)"
    echo "🔪 Finalizando processo..."
    kill -9 $PORT_PID
    sleep 1
    echo "✅ Processo finalizado!"
else
    echo "✅ Porta 3000 livre"
fi

cd frontend

# Instala dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "Instalando dependências do frontend..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Erro ao instalar dependências!"
        exit 1
    fi
fi

# Roda o frontend
echo "🚀 Iniciando Frontend na porta 3000..."
npm start
