#!/usr/bin/env python3
"""
Remove itens inválidos do catálogo global PostgreSQL:
- Itens com tabs e números anexados (ex: "Alga Nori\t\t2\t6")
- Headers HTTP
- Logs e lixo
Mantém apenas produtos legítimos.
"""
import sys
import os
import re
os.environ['DATABASE_URL'] = 'postgresql://postgres:jdmrKwvtVwncIsPChhdOEQLyCSnphyAm@trolley.proxy.rlwy.net:27335/railway'
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from kaizen_app import create_app, db
from kaizen_app.models import ListaMaeItem, ListaItemRef
from sqlalchemy import text

# Padrão para identificar itens inválidos
INVALID_PATTERNS = [
    # Headers HTTP
    r'^(Accept|Authorization|Bearer|Connection|Host|User-Agent|Mozilla|Referer|Origin|Content-Type|Cookie|TE|Sec-Fetch)',
    # UUIDs e hashes
    r'^[0-9a-f]{8}-[0-9a-f]{4}',
    # URLs e domains
    r'https?://',
    r'\.com|\.net|\.org',
    # Logs e métricas
    r'requisições|transferidos|MB|kB|ms|DNS|DOM|load:',
    # HTTP status e versões
    r'^(502|DYNAMIC|VersãoHTTP)',
    # Números ou IDs puros
    r'^[0-9]+$',
    # Itens com tabs/espaços múltiplos e números (ex: "Nome\t\t2\t6")
    r'\t+[0-9]+\t',
]

# Lista de palavras-chave que indicam item válido
VALID_KEYWORDS = [
    'ARROZ', 'FARDO', 'KG', 'PACOTE', 'PCT', 'GALAO', 'GALÃO', 'BALDE',
    'SHOYU', 'MISSO', 'WASABI', 'GENGIBRE', 'COGUMELO', 'ALGA', 'NORI',
    'GUIOZA', 'GUIOSA', 'BAO', 'HONDASHI', 'KANI', 'MASSA', 'YAKISOBA',
    'MOLHO', 'PANKO', 'PANTAI', 'TARE', 'TONKATSU', 'GERGELIM', 'GLUTAMATO',
    'HASHI', 'BISCOITO', 'DOCE', 'CREAM', 'CHEESE', 'TOMATE', 'VINAGRE',
]

def is_invalid(nome):
    """Retorna True se o item parece inválido."""
    # Verificar padrões inválidos
    for pattern in INVALID_PATTERNS:
        if re.search(pattern, nome, re.IGNORECASE):
            return True

    # Se for muito curto (< 3 chars), é suspeito
    if len(nome.strip()) < 3:
        return True

    return False

def is_valid_product(nome):
    """Retorna True se contém palavras-chave de produtos válidos."""
    nome_upper = nome.upper()
    for keyword in VALID_KEYWORDS:
        if keyword in nome_upper:
            return True
    return False

def clean_nome(nome):
    """Remove tabs e lixo do nome, retorna nome limpo."""
    # Remover tudo após tabs
    cleaned = re.sub(r'\t.*', '', nome)
    # Remover espaços múltiplos
    cleaned = re.sub(r'\s+', ' ', cleaned)
    return cleaned.strip()

app = create_app()
with app.app_context():
    print("=" * 70)
    print("LIMPEZA DE ITENS INVÁLIDOS DO CATÁLOGO (PostgreSQL)")
    print("=" * 70)

    # Buscar todos os itens
    all_items = db.session.query(ListaMaeItem).all()

    print(f"\n📊 Total de itens no catálogo: {len(all_items)}")

    # Separar itens
    items_to_delete = []
    items_to_clean = []  # Itens com tabs que podem ser limpos
    items_to_keep = []
    duplicates = {}  # nome_limpo -> lista de itens

    for item in all_items:
        nome = item.nome
        nome_limpo = clean_nome(nome)

        # Se o nome tem tabs/lixo, marcar para limpeza
        if nome != nome_limpo and nome_limpo:
            # Verificar se nome_limpo já existe
            existing = db.session.query(ListaMaeItem).filter_by(nome=nome_limpo).first()
            if existing and existing.id != item.id:
                # É duplicado - marcar para deletar e manter o existente
                items_to_delete.append((item, f"Duplicado de '{nome_limpo}'"))
            else:
                # Pode ser limpo
                items_to_clean.append((item, nome_limpo))
        elif is_invalid(nome):
            # Item claramente inválido
            items_to_delete.append((item, "Inválido (header/log/lixo)"))
        elif is_valid_product(nome):
            # Produto válido
            items_to_keep.append(item)
        else:
            # Duvidoso - mostrar para decisão manual
            items_to_keep.append(item)  # Por segurança, manter

    print(f"\n🔍 ANÁLISE:")
    print(f"   ✅ Itens válidos a manter: {len(items_to_keep)}")
    print(f"   🧹 Itens a limpar (remover tabs/lixo): {len(items_to_clean)}")
    print(f"   ❌ Itens a deletar: {len(items_to_delete)}")

    # Mostrar itens que serão limpos
    if items_to_clean:
        print(f"\n🧹 ITENS QUE SERÃO LIMPOS:")
        for item, nome_limpo in items_to_clean[:20]:
            print(f"   • \"{item.nome}\" → \"{nome_limpo}\"")
        if len(items_to_clean) > 20:
            print(f"   ... e mais {len(items_to_clean) - 20}")

    # Mostrar itens que serão deletados
    if items_to_delete:
        print(f"\n❌ ITENS QUE SERÃO DELETADOS:")
        for item, reason in items_to_delete[:20]:
            print(f"   • \"{item.nome}\" ({reason})")
        if len(items_to_delete) > 20:
            print(f"   ... e mais {len(items_to_delete) - 20}")

    # Confirmar
    print(f"\n⚠️  ATENÇÃO:")
    print(f"   - Limpar {len(items_to_clean)} itens (remover tabs)")
    print(f"   - Deletar {len(items_to_delete)} itens inválidos")
    resposta = input("\nContinuar? (S/n): ")

    if resposta.lower() not in ['s', 'sim', 'y', 'yes', '']:
        print("❌ Operação cancelada.")
        sys.exit(0)

    # Executar limpeza - consolidar duplicados
    print(f"\n🧹 Consolidando itens duplicados...")
    consolidated_count = 0
    for item, nome_limpo in items_to_clean:
        # Verificar se já existe item com nome limpo
        existing = db.session.query(ListaMaeItem).filter_by(nome=nome_limpo).first()

        if existing and existing.id != item.id:
            # Consolidar: transferir referências para o item existente
            refs = db.session.query(ListaItemRef).filter_by(item_id=item.id).all()
            for ref in refs:
                # Verificar se já existe referência para o mesmo (lista_id, item_id)
                existing_ref = db.session.query(ListaItemRef).filter_by(
                    lista_id=ref.lista_id,
                    item_id=existing.id
                ).first()

                if existing_ref:
                    # Já existe - somar quantidades
                    existing_ref.quantidade_atual += ref.quantidade_atual
                    existing_ref.quantidade_minima = max(existing_ref.quantidade_minima, ref.quantidade_minima)
                    db.session.delete(ref)
                else:
                    # Não existe - transferir referência
                    ref.item_id = existing.id

            # Deletar item duplicado (agora sem referências)
            db.session.delete(item)
            consolidated_count += 1
        else:
            # Não há duplicado - apenas renomear
            item.nome = nome_limpo

    db.session.commit()
    print(f"   ✓ {consolidated_count} itens consolidados")
    print(f"   ✓ {len(items_to_clean) - consolidated_count} itens renomeados")

    # Executar deleção
    if items_to_delete:
        print(f"\n🗑️  Deletando itens inválidos...")
        ids_to_delete = [item.id for item, _ in items_to_delete]

        # Deletar referências primeiro
        refs_deleted = db.session.query(ListaItemRef).filter(
            ListaItemRef.item_id.in_(ids_to_delete)
        ).delete(synchronize_session=False)
        print(f"   ✓ {refs_deleted} referências deletadas")

        # Deletar itens
        items_deleted = db.session.query(ListaMaeItem).filter(
            ListaMaeItem.id.in_(ids_to_delete)
        ).delete(synchronize_session=False)
        print(f"   ✓ {items_deleted} itens deletados")

        db.session.commit()

    # Resultado final
    total_final = db.session.query(ListaMaeItem).count()
    refs_final = db.session.query(ListaItemRef).count()

    print("\n" + "=" * 70)
    print("✅ LIMPEZA CONCLUÍDA!")
    print("=" * 70)
    print(f"\n📊 RESULTADO:")
    print(f"   Itens no catálogo: {total_final}")
    print(f"   Referências: {refs_final}")
    print(f"\n📉 AÇÕES REALIZADAS:")
    print(f"   {len(items_to_clean)} itens renomeados (tabs removidos)")
    print(f"   {len(items_to_delete)} itens deletados")

    # Mostrar amostra de itens finais
    print(f"\n📦 AMOSTRA DO CATÁLOGO LIMPO:")
    final_items = db.session.query(ListaMaeItem).order_by(ListaMaeItem.nome).limit(15).all()
    for item in final_items:
        total_refs = db.session.query(ListaItemRef).filter_by(item_id=item.id).count()
        print(f"   • {item.nome} ({item.unidade}) - {total_refs} lista(s)")
