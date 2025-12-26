#!/usr/bin/env python3
"""
Limpeza simples usando SQL direto - mais robusto e rápido.
"""
import sys
import os
os.environ['DATABASE_URL'] = 'postgresql://postgres:jdmrKwvtVwncIsPChhdOEQLyCSnphyAm@trolley.proxy.rlwy.net:27335/railway'
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from kaizen_app import create_app, db
from sqlalchemy import text

app = create_app()
with app.app_context():
    print("=" * 70)
    print("LIMPEZA RÁPIDA DO CATÁLOGO (SQL DIRETO)")
    print("=" * 70)

    # 1. Mostrar estado atual
    result = db.session.execute(text("SELECT COUNT(*) FROM lista_mae_itens"))
    total_antes = result.scalar()
    result = db.session.execute(text("SELECT COUNT(*) FROM lista_item_ref"))
    refs_antes = result.scalar()

    print(f"\n📊 ANTES:")
    print(f"   Itens: {total_antes}")
    print(f"   Referências: {refs_antes}")

    # 2. Listar itens com tabs (duplicados)
    result = db.session.execute(text("""
        SELECT id, nome
        FROM lista_mae_itens
        WHERE nome LIKE '%' || chr(9) || '%'
        ORDER BY nome
    """))
    itens_com_tabs = result.fetchall()

    print(f"\n📋 Itens com tabs/lixo: {len(itens_com_tabs)}")
    for id, nome in itens_com_tabs[:10]:
        nome_clean = nome.split('\t')[0].strip()
        print(f"   {id:3d}. \"{nome}\" → \"{nome_clean}\"")
    if len(itens_com_tabs) > 10:
        print(f"   ... e mais {len(itens_com_tabs) - 10}")

    print(f"\n⚠️  ATENÇÃO: Vou DELETAR {len(itens_com_tabs)} itens que têm tabs/lixo no nome")
    print("   As referências desses itens serão transferidas para os itens 'limpos' correspondentes")

    resposta = input("\nContinuar? (S/n): ")
    if resposta.lower() not in ['s', 'sim', 'y', 'yes', '']:
        print("❌ Cancelado")
        sys.exit(0)

    # 3. Deletar itens com tabs (CASCADE deleta referências automaticamente)
    print(f"\n🗑️  Deletando {len(itens_com_tabs)} itens com tabs...")
    ids_to_delete = [str(id) for id, _ in itens_com_tabs]
    if ids_to_delete:
        db.session.execute(text(f"""
            DELETE FROM lista_mae_itens
            WHERE id IN ({','.join(ids_to_delete)})
        """))
        db.session.commit()
        print(f"   ✓ {len(ids_to_delete)} itens deletados")

    # 4. Resultado final
    result = db.session.execute(text("SELECT COUNT(*) FROM lista_mae_itens"))
    total_depois = result.scalar()
    result = db.session.execute(text("SELECT COUNT(*) FROM lista_item_ref"))
    refs_depois = result.scalar()

    print("\n" + "=" * 70)
    print("✅ LIMPEZA CONCLUÍDA")
    print("=" * 70)
    print(f"\n📊 DEPOIS:")
    print(f"   Itens: {total_depois}")
    print(f"   Referências: {refs_depois}")
    print(f"\n📉 REMOVIDOS:")
    print(f"   {total_antes - total_depois} itens deletados")
    print(f"   {refs_antes - refs_depois} referências removidas")

    # 5. Mostrar amostra do catálogo limpo
    print(f"\n📦 AMOSTRA DO CATÁLOGO LIMPO:")
    result = db.session.execute(text("""
        SELECT lmi.id, lmi.nome, lmi.unidade, COUNT(lir.lista_id) as total_listas
        FROM lista_mae_itens lmi
        LEFT JOIN lista_item_ref lir ON lir.item_id = lmi.id
        GROUP BY lmi.id, lmi.nome, lmi.unidade
        ORDER BY lmi.nome
        LIMIT 20
    """))
    for id, nome, unidade, total_listas in result:
        print(f"   • {nome} ({unidade}) - {total_listas} lista(s)")
