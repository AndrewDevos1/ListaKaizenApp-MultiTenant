#!/usr/bin/env python3
"""Corrige itens com quantidade_minima = 0."""
import sys

sys.path.insert(0, '.')

from kaizen_app import create_app, db
from kaizen_app.models import ListaMaeItem

app = create_app()

with app.app_context():
    itens_zero = ListaMaeItem.query.filter_by(quantidade_minima=0).all()

    print("\n=== CORRECAO DE QUANTIDADE MINIMA ===")
    print(f"Encontrados {len(itens_zero)} itens com quantidade_minima = 0")

    if len(itens_zero) == 0:
        print("Nenhuma correcao necessaria.")
        sys.exit(0)

    for item in itens_zero:
        item.quantidade_minima = 1.0
        print(f"Corrigido: {item.nome} -> qtd_minima = 1.0")

    db.session.commit()
    print(f"\n{len(itens_zero)} item(ns) corrigido(s)!")
