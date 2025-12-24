"""
Script para popular o banco de dados com dados mockados para teste.
"""
import sys
import os

# Adiciona o diretório backend ao path
sys.path.insert(0, os.path.dirname(__file__))

from kaizen_app import create_app
from kaizen_app.extensions import db
from kaizen_app.models import (
    Usuario, UserRoles, Item, Area, Fornecedor, Estoque,
    Pedido, PedidoStatus, Cotacao, CotacaoStatus, CotacaoItem,
    Lista, ListaMaeItem, fornecedor_lista, lista_colaborador
)
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta, timezone
import random

def seed_database():
    """Popula o banco de dados com dados mockados."""
    app = create_app()

    with app.app_context():
        print("🌱 Iniciando população do banco de dados...")

        # 1. Criar Áreas
        print("📍 Criando áreas...")
        areas = [
            Area(nome="Cozinha"),
            Area(nome="Almoxarifado"),
            Area(nome="Limpeza"),
            Area(nome="Manutenção"),
            Area(nome="Escritório")
        ]
        for area in areas:
            db.session.add(area)
        db.session.commit()
        print(f"✅ {len(areas)} áreas criadas")

        # 2. Criar Fornecedores
        print("🏪 Criando fornecedores...")
        fornecedores = [
            Fornecedor(
                nome="Distribuidora ABC",
                contato="(11) 1234-5678",
                meio_envio="WhatsApp",
                responsavel="João Silva",
                observacao="Fornecedor principal de alimentos"
            ),
            Fornecedor(
                nome="Produtos Limpeza XYZ",
                contato="(11) 8765-4321",
                meio_envio="Email",
                responsavel="Maria Santos",
                observacao="Produtos de limpeza e higiene"
            ),
            Fornecedor(
                nome="Papelaria Moderna",
                contato="(11) 5555-9999",
                meio_envio="WhatsApp",
                responsavel="Pedro Costa",
                observacao="Material de escritório"
            ),
            Fornecedor(
                nome="Ferramentas e Cia",
                contato="(11) 3333-7777",
                meio_envio="Telefone",
                responsavel="Carlos Oliveira",
                observacao="Ferramentas e material de manutenção"
            )
        ]
        for fornecedor in fornecedores:
            db.session.add(fornecedor)
        db.session.commit()
        print(f"✅ {len(fornecedores)} fornecedores criados")

        # 3. Criar Itens
        print("📦 Criando itens...")
        itens = [
            # Itens da Distribuidora ABC
            Item(nome="Arroz", unidade_medida="Kg", fornecedor_id=fornecedores[0].id),
            Item(nome="Feijão", unidade_medida="Kg", fornecedor_id=fornecedores[0].id),
            Item(nome="Óleo", unidade_medida="Litro", fornecedor_id=fornecedores[0].id),
            Item(nome="Açúcar", unidade_medida="Kg", fornecedor_id=fornecedores[0].id),
            Item(nome="Sal", unidade_medida="Kg", fornecedor_id=fornecedores[0].id),

            # Itens da Produtos Limpeza XYZ
            Item(nome="Detergente", unidade_medida="Unidade", fornecedor_id=fornecedores[1].id),
            Item(nome="Sabão em Pó", unidade_medida="Kg", fornecedor_id=fornecedores[1].id),
            Item(nome="Desinfetante", unidade_medida="Litro", fornecedor_id=fornecedores[1].id),
            Item(nome="Álcool Gel", unidade_medida="Litro", fornecedor_id=fornecedores[1].id),

            # Itens da Papelaria Moderna
            Item(nome="Papel A4", unidade_medida="Resma", fornecedor_id=fornecedores[2].id),
            Item(nome="Caneta Azul", unidade_medida="Unidade", fornecedor_id=fornecedores[2].id),
            Item(nome="Grampeador", unidade_medida="Unidade", fornecedor_id=fornecedores[2].id),

            # Itens da Ferramentas e Cia
            Item(nome="Martelo", unidade_medida="Unidade", fornecedor_id=fornecedores[3].id),
            Item(nome="Chave de Fenda", unidade_medida="Unidade", fornecedor_id=fornecedores[3].id),
            Item(nome="Fita Isolante", unidade_medida="Rolo", fornecedor_id=fornecedores[3].id),
        ]
        for item in itens:
            db.session.add(item)
        db.session.commit()
        print(f"✅ {len(itens)} itens criados")

        # 4. Criar Usuários colaboradores (além dos existentes)
        print("👥 Criando usuários colaboradores...")
        colaboradores = []
        usuarios_existentes = Usuario.query.all()

        if len(usuarios_existentes) < 3:
            novos_usuarios = [
                Usuario(
                    nome="Ana Paula",
                    username="ana.paula",
                    email="ana.paula@kaizen.com",
                    senha_hash=generate_password_hash("senha123"),
                    role=UserRoles.COLLABORATOR,
                    aprovado=True,
                    ativo=True
                ),
                Usuario(
                    nome="Roberto Lima",
                    username="roberto.lima",
                    email="roberto.lima@kaizen.com",
                    senha_hash=generate_password_hash("senha123"),
                    role=UserRoles.COLLABORATOR,
                    aprovado=True,
                    ativo=True
                ),
            ]
            for usuario in novos_usuarios:
                db.session.add(usuario)
            db.session.commit()
            colaboradores = Usuario.query.filter_by(role=UserRoles.COLLABORATOR).all()
            print(f"✅ {len(novos_usuarios)} novos colaboradores criados")
        else:
            colaboradores = Usuario.query.filter_by(role=UserRoles.COLLABORATOR).all()
            print(f"✅ Usando {len(colaboradores)} colaboradores existentes")

        # 5. Criar Listas de Compras
        print("📋 Criando listas de compras...")
        listas = [
            Lista(
                nome="Lista Mensal - Alimentos",
                descricao="Lista mensal de compras de alimentos"
            ),
            Lista(
                nome="Lista Semanal - Limpeza",
                descricao="Lista semanal de produtos de limpeza"
            ),
            Lista(
                nome="Lista Escritório",
                descricao="Material de escritório trimestral"
            )
        ]

        for lista in listas:
            db.session.add(lista)
        db.session.commit()

        # Associar colaboradores às listas
        if colaboradores:
            listas[0].colaboradores.append(colaboradores[0])
            listas[1].colaboradores.append(colaboradores[0])
            if len(colaboradores) > 1:
                listas[1].colaboradores.append(colaboradores[1])
                listas[2].colaboradores.append(colaboradores[1])
            db.session.commit()

        # Associar fornecedores às listas
        listas[0].fornecedores.append(fornecedores[0])  # Distribuidora ABC
        listas[1].fornecedores.append(fornecedores[1])  # Produtos Limpeza XYZ
        listas[2].fornecedores.append(fornecedores[2])  # Papelaria Moderna
        db.session.commit()
        print(f"✅ {len(listas)} listas criadas")

        # 6. Criar itens da Lista Mãe
        print("📝 Criando itens da lista mãe...")
        lista_mae_itens = [
            # Lista Mensal - Alimentos
            ListaMaeItem(lista_mae_id=listas[0].id, nome="Arroz Tipo 1", unidade="Kg", quantidade_atual=50, quantidade_minima=100),
            ListaMaeItem(lista_mae_id=listas[0].id, nome="Feijão Preto", unidade="Kg", quantidade_atual=30, quantidade_minima=80),
            ListaMaeItem(lista_mae_id=listas[0].id, nome="Óleo de Soja", unidade="Litro", quantidade_atual=15, quantidade_minima=40),

            # Lista Semanal - Limpeza
            ListaMaeItem(lista_mae_id=listas[1].id, nome="Detergente Neutro", unidade="Unidade", quantidade_atual=5, quantidade_minima=20),
            ListaMaeItem(lista_mae_id=listas[1].id, nome="Desinfetante Pinho", unidade="Litro", quantidade_atual=8, quantidade_minima=15),

            # Lista Escritório
            ListaMaeItem(lista_mae_id=listas[2].id, nome="Papel Sulfite A4", unidade="Resma", quantidade_atual=10, quantidade_minima=30),
        ]

        for item in lista_mae_itens:
            db.session.add(item)
        db.session.commit()
        print(f"✅ {len(lista_mae_itens)} itens da lista mãe criados")

        # 7. Criar Estoques
        print("📊 Criando registros de estoque...")
        estoques = []
        for area in areas[:3]:  # Primeiras 3 áreas
            for item in itens[:10]:  # Primeiros 10 itens
                qtd_atual = random.uniform(5, 50)
                qtd_minima = random.uniform(20, 100)
                estoque = Estoque(
                    item_id=item.id,
                    area_id=area.id,
                    lista_id=random.choice([None, listas[0].id, listas[1].id]),
                    quantidade_atual=qtd_atual,
                    quantidade_minima=qtd_minima,
                    pedido=max(qtd_minima - qtd_atual, 0)
                )
                estoques.append(estoque)
                db.session.add(estoque)
        db.session.commit()
        print(f"✅ {len(estoques)} registros de estoque criados")

        # 8. Criar Pedidos
        print("🛒 Criando pedidos...")
        admin = Usuario.query.filter_by(role=UserRoles.ADMIN).first()
        if not admin and colaboradores:
            admin = colaboradores[0]

        if admin:
            pedidos = []
            for i in range(10):
                item = random.choice(itens)
                pedido = Pedido(
                    item_id=item.id,
                    fornecedor_id=item.fornecedor_id,
                    quantidade_solicitada=random.uniform(10, 100),
                    data_pedido=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 30)),
                    usuario_id=admin.id,
                    status=random.choice([PedidoStatus.PENDENTE, PedidoStatus.APROVADO, PedidoStatus.REJEITADO])
                )
                pedidos.append(pedido)
                db.session.add(pedido)
            db.session.commit()
            print(f"✅ {len(pedidos)} pedidos criados")

        # 9. Criar Cotações
        print("💰 Criando cotações...")
        cotacoes = []
        for fornecedor in fornecedores[:2]:
            cotacao = Cotacao(
                fornecedor_id=fornecedor.id,
                data_cotacao=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 15)),
                status=random.choice([CotacaoStatus.PENDENTE, CotacaoStatus.CONCLUIDA])
            )
            db.session.add(cotacao)
            db.session.commit()

            # Adicionar itens à cotação
            itens_fornecedor = Item.query.filter_by(fornecedor_id=fornecedor.id).all()
            for item in itens_fornecedor[:3]:
                cotacao_item = CotacaoItem(
                    cotacao_id=cotacao.id,
                    item_id=item.id,
                    quantidade=random.uniform(10, 50),
                    preco_unitario=random.uniform(5, 100)
                )
                db.session.add(cotacao_item)
            cotacoes.append(cotacao)

        db.session.commit()
        print(f"✅ {len(cotacoes)} cotações criadas")

        print("\n✨ Banco de dados populado com sucesso!")
        print(f"""
📊 Resumo:
- Áreas: {len(areas)}
- Fornecedores: {len(fornecedores)}
- Itens: {len(itens)}
- Listas: {len(listas)}
- Itens da Lista Mãe: {len(lista_mae_itens)}
- Estoques: {len(estoques)}
- Pedidos: {len(pedidos) if 'pedidos' in locals() else 0}
- Cotações: {len(cotacoes)}
        """)

if __name__ == "__main__":
    seed_database()
