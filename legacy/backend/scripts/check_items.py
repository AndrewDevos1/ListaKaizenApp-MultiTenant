#!/usr/bin/env python3
"""Verifica itens no banco de dados."""
import sys

sys.path.insert(0, '.')

from kaizen_app import create_app
from kaizen_app.models import Item, Fornecedor

app = create_app()

with app.app_context():
    items = Item.query.all()
    fornecedores = Fornecedor.query.all()

    print("\n=== DIAGNOSTICO ===")
    print(f"Total de itens: {len(items)}")
    print(f"Total de fornecedores: {len(fornecedores)}")

    if len(items) == 0:
        print("\nAVISO: Nenhum item cadastrado!")
    else:
        print("\nItens encontrados:")
        for item in items[:10]:
            fornec = item.fornecedor.nome if item.fornecedor else "SEM FORNECEDOR"
            print(f"  - {item.id}: {item.nome} ({item.unidade_medida}) - {fornec}")
