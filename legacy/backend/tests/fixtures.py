"""
Fixtures adicionais e utilitários para testes.
Complementa conftest.py com fixtures específicas para testes avançados.
"""
import pytest
from decimal import Decimal
from kaizen_app import db
from kaizen_app.models import (
    Usuario, UserRoles, Item, Area, Fornecedor, 
    Estoque, Lista, ListaMaeItem, Pedido, Cotacao
)
from .conftest import create_user


@pytest.fixture
def admin_user(app):
    """Cria um usuário admin para testes"""
    with app.app_context():
        user = create_user('Admin Test', 'admin@test.com', 'senha123', UserRoles.ADMIN, aprovado=True)
        return user


@pytest.fixture
def colaborador_user(app):
    """Cria um usuário colaborador para testes"""
    with app.app_context():
        user = create_user('Colab Test', 'colab@test.com', 'senha123', UserRoles.COLLABORATOR, aprovado=True)
        return user


@pytest.fixture
def fornecedor_padrao(app):
    """Cria um fornecedor padrão para testes"""
    with app.app_context():
        fornecedor = Fornecedor(
            nome="Fornecedor Teste",
            contato="11 99999-9999",
            meio_envio="WhatsApp",
            responsavel="João Silva"
        )
        db.session.add(fornecedor)
        db.session.commit()
        return fornecedor


@pytest.fixture
def area_padrao(app):
    """Cria uma área padrão para testes"""
    with app.app_context():
        area = Area(nome="Cozinha Teste")
        db.session.add(area)
        db.session.commit()
        return area


@pytest.fixture
def item_padrao(app, fornecedor_padrao):
    """Cria um item padrão para testes"""
    with app.app_context():
        item = Item(
            nome="Arroz Teste",
            unidade_medida="kg",
            fornecedor_id=fornecedor_padrao.id
        )
        db.session.add(item)
        db.session.commit()
        return item


@pytest.fixture
def estoque_com_deficit(app, item_padrao, area_padrao):
    """Cria um estoque com déficit (abaixo do mínimo)"""
    with app.app_context():
        estoque = Estoque(
            item_id=item_padrao.id,
            area_id=area_padrao.id,
            quantidade_atual=Decimal('5.0'),
            quantidade_minima=Decimal('15.0')
        )
        db.session.add(estoque)
        db.session.commit()
        return estoque


@pytest.fixture
def estoque_sem_deficit(app, fornecedor_padrao, area_padrao):
    """Cria um estoque sem déficit (acima do mínimo)"""
    with app.app_context():
        item = Item(
            nome="Feijão Teste",
            unidade_medida="kg",
            fornecedor_id=fornecedor_padrao.id
        )
        db.session.add(item)
        db.session.flush()
        
        estoque = Estoque(
            item_id=item.id,
            area_id=area_padrao.id,
            quantidade_atual=Decimal('20.0'),
            quantidade_minima=Decimal('10.0')
        )
        db.session.add(estoque)
        db.session.commit()
        return estoque


@pytest.fixture
def lista_com_itens(app):
    """Cria uma lista com múltiplos itens"""
    with app.app_context():
        lista = Lista(nome="Lista Completa", descricao="Lista de teste")
        db.session.add(lista)
        db.session.flush()
        
        itens_data = [
            {"nome": "Arroz", "unidade": "kg", "qtd_atual": 5.0, "qtd_min": 10.0},
            {"nome": "Feijão", "unidade": "kg", "qtd_atual": 3.0, "qtd_min": 8.0},
            {"nome": "Óleo", "unidade": "litro", "qtd_atual": 2.0, "qtd_min": 5.0},
        ]
        
        for item_data in itens_data:
            item = ListaMaeItem(
                lista_mae_id=lista.id,
                nome=item_data["nome"],
                unidade=item_data["unidade"],
                quantidade_atual=item_data["qtd_atual"],
                quantidade_minima=item_data["qtd_min"]
            )
            db.session.add(item)
        
        db.session.commit()
        return lista


@pytest.fixture
def usuarios_multiplos(app):
    """Cria múltiplos usuários para testes de relacionamento"""
    with app.app_context():
        users = []
        for i in range(3):
            user = create_user(
                f'User {i+1}',
                f'user{i+1}@test.com',
                'senha123',
                UserRoles.COLLABORATOR,
                aprovado=True
            )
            users.append(user)
        return users


@pytest.fixture
def setup_completo_estoque(app):
    """
    Setup completo com fornecedor, área, item e estoque.
    Útil para testes de integração.
    """
    with app.app_context():
        # Fornecedor
        fornecedor = Fornecedor(nome="Fornecedor Completo")
        db.session.add(fornecedor)
        db.session.flush()
        
        # Área
        area = Area(nome="Área Completa")
        db.session.add(area)
        db.session.flush()
        
        # Item
        item = Item(
            nome="Item Completo",
            unidade_medida="unidade",
            fornecedor_id=fornecedor.id
        )
        db.session.add(item)
        db.session.flush()
        
        # Estoque
        estoque = Estoque(
            item_id=item.id,
            area_id=area.id,
            quantidade_atual=Decimal('10.0'),
            quantidade_minima=Decimal('20.0')
        )
        db.session.add(estoque)
        db.session.commit()
        
        return {
            'fornecedor': fornecedor,
            'area': area,
            'item': item,
            'estoque': estoque
        }


# Helpers para assertions comuns

def assert_usuario_valido(usuario):
    """Verifica se um objeto usuário tem todos os campos necessários"""
    assert usuario.id is not None
    assert usuario.nome is not None
    assert usuario.email is not None
    assert usuario.senha_hash is not None
    assert usuario.role in [UserRoles.ADMIN, UserRoles.COLLABORATOR]
    assert isinstance(usuario.aprovado, bool)
    assert isinstance(usuario.ativo, bool)


def assert_item_valido(item):
    """Verifica se um objeto item tem todos os campos necessários"""
    assert item.id is not None
    assert item.nome is not None
    assert item.unidade_medida is not None
    assert item.fornecedor_id is not None


def assert_estoque_valido(estoque):
    """Verifica se um objeto estoque tem todos os campos necessários"""
    assert estoque.id is not None
    assert estoque.item_id is not None
    assert estoque.area_id is not None
    assert estoque.quantidade_atual is not None
    assert estoque.quantidade_minima is not None
    assert isinstance(estoque.quantidade_atual, Decimal)
    assert isinstance(estoque.quantidade_minima, Decimal)


def assert_lista_valida(lista):
    """Verifica se uma lista tem todos os campos necessários"""
    assert lista.id is not None
    assert lista.nome is not None
    assert lista.data_criacao is not None
    assert isinstance(lista.deletado, bool)
