#!/bin/bash
# Script para verificar e aplicar migrations

echo "=== Verificando ambiente ==="
cd backend

if [ -d ".venv" ]; then
    echo "✓ Virtual env encontrado"
    source .venv/bin/activate
else
    echo "✗ Virtual env não encontrado!"
    exit 1
fi

echo ""
echo "=== Aplicando migrations ==="
export FLASK_APP=run.py
flask db upgrade

echo ""
echo "=== Verificando tabelas ==="
python3 << 'EOF'
from run import app
from kaizen_app.extensions import db
from kaizen_app.models import SugestaoItem

with app.app_context():
    # Tenta contar sugestões
    try:
        count = SugestaoItem.query.count()
        print(f"✓ Tabela sugestoes_itens existe!")
        print(f"  Total de sugestões: {count}")
        
        # Lista todas
        sugestoes = SugestaoItem.query.all()
        for s in sugestoes:
            print(f"  - ID: {s.id}, Item: {s.nome_item}, Status: {s.status.value}")
    except Exception as e:
        print(f"✗ Erro: {e}")
        print("  Tabela sugestoes_itens não existe ou há erro no modelo")
EOF

echo ""
echo "=== Concluído ==="
