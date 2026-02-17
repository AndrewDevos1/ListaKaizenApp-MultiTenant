#!/usr/bin/env python3
"""
Remove itens inválidos do catálogo global (headers HTTP, logs, etc.)
mantendo apenas produtos legítimos.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from kaizen_app import create_app, db
from kaizen_app.models import ListaMaeItem, ListaItemRef

# Lista de itens VÁLIDOS (produtos reais de restaurante)
ITENS_VALIDOS = {
    'ARROZ GRAO CURTO HEISEI FARDO (6X5KG)',
    'Alga Nori',
    'BAO com vegetais',
    'BISCOITO DA SORTE PCT C/300',
    'Bisnaga de Doce de leite',
    'Cogumelo  🍄 kg',
    'Cream Cheese (catupiry) Balde 3,6 kg',
    'Gengibre',
    'Gergelim branco',
    'Glutamato',
    'Guiosa Suino',
    'Guioza Bovino (so se faltar o suino)',
    'Guioza legumes',
    'HONDASHI (olhar com atenção)',
    'Hashi descartavel',
    'Kani kama',
    'Massa Haru',
    'Massa Yakisoba',
    'Misso',
    'Molho de Ostras',
    'NarutoMAKI ou simimalr',
    'Panko  Alfa',
    'Pantai Sweet',
    'Shoyu Galão light',
    'Shoyu Galão tradicional',
    'Shoyu Sachet  ligth',
    'Shoyu Sachet  tradicional',
    'Tare Galão',
    'Tomate seco',
    'Tonkatsu',
    'Wasabi',
    'vinagre',
}

app = create_app()
with app.app_context():
    print("=" * 70)
    print("LIMPEZA DE ITENS INVÁLIDOS DO CATÁLOGO")
    print("=" * 70)

    # Estatísticas antes
    total_antes = db.session.query(ListaMaeItem).count()
    refs_antes = db.session.query(ListaItemRef).count()

    print(f"\n📊 ANTES:")
    print(f"   Itens no catálogo: {total_antes}")
    print(f"   Referências: {refs_antes}")

    # Buscar todos os itens
    todos_itens = db.session.query(ListaMaeItem).all()

    # Separar válidos e inválidos
    itens_para_deletar = []
    itens_para_manter = []

    for item in todos_itens:
        if item.nome in ITENS_VALIDOS:
            itens_para_manter.append(item)
        else:
            itens_para_deletar.append(item)

    print(f"\n🔍 ANÁLISE:")
    print(f"   Itens VÁLIDOS a manter: {len(itens_para_manter)}")
    print(f"   Itens INVÁLIDOS a deletar: {len(itens_para_deletar)}")

    # Mostrar itens que serão mantidos
    print(f"\n✅ ITENS QUE SERÃO MANTIDOS:")
    for item in sorted(itens_para_manter, key=lambda x: x.nome):
        refs_count = db.session.query(ListaItemRef).filter_by(item_id=item.id).count()
        print(f"   • {item.nome} (em {refs_count} lista(s))")

    # Mostrar primeiros 20 itens que serão deletados
    print(f"\n❌ PRIMEIROS 20 ITENS QUE SERÃO DELETADOS:")
    for item in itens_para_deletar[:20]:
        print(f"   • {item.nome}")
    if len(itens_para_deletar) > 20:
        print(f"   ... e mais {len(itens_para_deletar) - 20} itens")

    # Confirmar
    print(f"\n⚠️  ATENÇÃO: Isso deletará {len(itens_para_deletar)} itens e suas referências!")
    resposta = input("Continuar? (S/n): ")

    if resposta.lower() not in ['s', 'sim', 'y', 'yes', '']:
        print("❌ Operação cancelada.")
        sys.exit(0)

    # Deletar referências primeiro, depois os itens
    print(f"\n🗑️  Deletando referências dos itens inválidos...")
    ids_para_deletar = [item.id for item in itens_para_deletar]
    refs_deletadas = db.session.query(ListaItemRef).filter(
        ListaItemRef.item_id.in_(ids_para_deletar)
    ).delete(synchronize_session=False)
    print(f"   ✓ {refs_deletadas} referências deletadas")

    print(f"\n🗑️  Deletando {len(itens_para_deletar)} itens inválidos...")
    itens_deletados = db.session.query(ListaMaeItem).filter(
        ListaMaeItem.id.in_(ids_para_deletar)
    ).delete(synchronize_session=False)
    print(f"   ✓ {itens_deletados} itens deletados")

    db.session.commit()

    # Estatísticas depois
    total_depois = db.session.query(ListaMaeItem).count()
    refs_depois = db.session.query(ListaItemRef).count()

    print("\n" + "=" * 70)
    print("✅ LIMPEZA CONCLUÍDA!")
    print("=" * 70)
    print(f"\n📊 DEPOIS:")
    print(f"   Itens no catálogo: {total_depois}")
    print(f"   Referências: {refs_depois}")
    print(f"\n📉 REMOVIDOS:")
    print(f"   {total_antes - total_depois} itens deletados")
    print(f"   {refs_antes - refs_depois} referências removidas")
    print(f"\n✨ O catálogo agora contém apenas itens válidos!")
