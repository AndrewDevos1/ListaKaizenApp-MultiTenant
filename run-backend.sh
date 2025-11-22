#!/bin/bash

# Script para rodar o backend com o venv ativado (Linux/macOS)

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
echo "Iniciando Backend na porta 5000..."
export FLASK_APP=run.py
flask run
