#!/bin/bash

# Script para rodar o frontend (Linux/macOS)

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
echo "Iniciando Frontend na porta 3000..."
npm start
