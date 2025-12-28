"""
Testes unitários para os modelos do sistema.
Testa a criação, validação e métodos dos modelos.
"""
import pytest
from decimal import Decimal
from datetime import datetime, timezone
from kaizen_app.models import (
    Usuario, UserRoles, Item, Area, Fornecedor, Estoque,
    Pedido, PedidoStatus, Cotacao, CotacaoStatus, CotacaoItem,
    Lista, ListaMaeItem
)
from werkzeug.security import generate_password_hash, check_password_hash


class TestUsuarioModel:
    """Testes para o modelo Usuario"""
    
    def test_criar_usuario(self, app):
        """Testa criação básica de um usuário"""
        with app.app_context():
            usuario = Usuario(
                nome="Teste User",
                email="teste@example.com",
                senha_hash=generate_password_hash("senha123"),
                role=UserRoles.COLLABORATOR,
                aprovado=False
            )
            assert usuario.nome == "Teste User"
            assert usuario.email == "teste@example.com"
            assert usuario.role == UserRoles.COLLABORATOR
            assert usuario.aprovado is False
            assert usuario.ativo is True  # Default

    def test_usuario_to_dict_nao_expoe_senha(self, app):
        """Testa que to_dict não retorna a senha"""
        with app.app_context():
            usuario = Usuario(
                nome="Teste",
                email="teste@example.com",
                senha_hash=generate_password_hash("senha123"),
                role=UserRoles.ADMIN
            )
            user_dict = usuario.to_dict()
            assert 'senha_hash' not in user_dict
            assert 'senha' not in user_dict
            assert user_dict['email'] == "teste@example.com"
            assert user_dict['role'] == "ADMIN"

    def test_usuario_roles(self, app):
        """Testa os diferentes roles de usuário"""
        with app.app_context():
            admin = Usuario(
                nome="Admin",
                email="admin@example.com",
                senha_hash=generate_password_hash("senha"),
                role=UserRoles.ADMIN
            )
            colaborador = Usuario(
                nome="Colab",
                email="colab@example.com",
                senha_hash=generate_password_hash("senha"),
                role=UserRoles.COLLABORATOR
            )
            assert admin.role == UserRoles.ADMIN
            assert colaborador.role == UserRoles.COLLABORATOR


class TestItemModel:
    """Testes para o modelo Item"""
    
    def test_criar_item(self, app):
        """Testa criação de um item"""
        with app.app_context():
            from kaizen_app import db
            fornecedor = Fornecedor(nome="Fornecedor Teste", contato="123456")
            db.session.add(fornecedor)
            db.session.flush()
            
            item = Item(
                nome="Arroz",
                unidade_medida="kg",
                fornecedor_id=fornecedor.id
            )
            assert item.nome == "Arroz"
            assert item.unidade_medida == "kg"
            assert item.fornecedor_id == fornecedor.id


class TestAreaModel:
    """Testes para o modelo Area"""
    
    def test_criar_area(self, app):
        """Testa criação de uma área"""
        with app.app_context():
            area = Area(nome="Cozinha")
            assert area.nome == "Cozinha"


class TestFornecedorModel:
    """Testes para o modelo Fornecedor"""
    
    def test_criar_fornecedor_completo(self, app):
        """Testa criação de fornecedor com todos os campos"""
        with app.app_context():
            fornecedor = Fornecedor(
                nome="Fornecedor ABC",
                contato="11 99999-9999",
                meio_envio="WhatsApp",
                responsavel="João Silva",
                observacao="Fornecedor preferencial"
            )
            assert fornecedor.nome == "Fornecedor ABC"
            assert fornecedor.contato == "11 99999-9999"
            assert fornecedor.meio_envio == "WhatsApp"
            assert fornecedor.responsavel == "João Silva"

    def test_criar_fornecedor_minimo(self, app):
        """Testa criação de fornecedor apenas com nome"""
        with app.app_context():
            fornecedor = Fornecedor(nome="Fornecedor Mínimo")
            assert fornecedor.nome == "Fornecedor Mínimo"
            assert fornecedor.contato is None


class TestEstoqueModel:
    """Testes para o modelo Estoque"""
    
    def test_calcular_pedido_com_deficit(self, app):
        """Testa cálculo de pedido quando estoque está abaixo do mínimo"""
        with app.app_context():
            estoque = Estoque(
                quantidade_atual=Decimal('5.0'),
                quantidade_minima=Decimal('10.0')
            )
            pedido = estoque.calcular_pedido()
            assert pedido == 5.0

    def test_calcular_pedido_sem_deficit(self, app):
        """Testa cálculo de pedido quando estoque está acima do mínimo"""
        with app.app_context():
            estoque = Estoque(
                quantidade_atual=Decimal('15.0'),
                quantidade_minima=Decimal('10.0')
            )
            pedido = estoque.calcular_pedido()
            assert pedido == 0.0

    def test_estoque_to_dict_inclui_item(self, app):
        """Testa que to_dict inclui informações do item"""
        with app.app_context():
            from kaizen_app import db
            fornecedor = Fornecedor(nome="Fornecedor")
            db.session.add(fornecedor)
            db.session.flush()
            
            item = Item(nome="Feijão", unidade_medida="kg", fornecedor_id=fornecedor.id)
            db.session.add(item)
            db.session.flush()
            
            area = Area(nome="Cozinha")
            db.session.add(area)
            db.session.flush()
            
            estoque = Estoque(
                item_id=item.id,
                area_id=area.id,
                quantidade_atual=Decimal('5.0'),
                quantidade_minima=Decimal('10.0')
            )
            db.session.add(estoque)
            db.session.flush()
            
            estoque_dict = estoque.to_dict()
            assert 'item' in estoque_dict
            assert estoque_dict['item']['nome'] == "Feijão"


class TestPedidoModel:
    """Testes para o modelo Pedido"""
    
    def test_criar_pedido_status_padrao(self, app):
        """Testa que pedido é criado com status PENDENTE por padrão"""
        with app.app_context():
            pedido = Pedido(
                quantidade_solicitada=Decimal('10.0'),
                data_pedido=datetime.now(timezone.utc)
            )
            assert pedido.status == PedidoStatus.PENDENTE

    def test_pedido_status_aprovado(self, app):
        """Testa alteração de status para APROVADO"""
        with app.app_context():
            pedido = Pedido(
                quantidade_solicitada=Decimal('10.0'),
                status=PedidoStatus.APROVADO
            )
            assert pedido.status == PedidoStatus.APROVADO


class TestCotacaoModel:
    """Testes para o modelo Cotacao"""
    
    def test_criar_cotacao_status_padrao(self, app):
        """Testa que cotação é criada com status PENDENTE"""
        with app.app_context():
            cotacao = Cotacao(data_cotacao=datetime.now(timezone.utc))
            assert cotacao.status == CotacaoStatus.PENDENTE

    def test_cotacao_to_dict_inclui_itens(self, app):
        """Testa que to_dict inclui lista de itens"""
        with app.app_context():
            from kaizen_app import db
            fornecedor = Fornecedor(nome="Fornecedor")
            db.session.add(fornecedor)
            db.session.flush()
            
            cotacao = Cotacao(
                fornecedor_id=fornecedor.id,
                status=CotacaoStatus.PENDENTE
            )
            db.session.add(cotacao)
            db.session.flush()
            
            cotacao_dict = cotacao.to_dict()
            assert 'itens' in cotacao_dict
            assert 'fornecedor' in cotacao_dict


class TestListaModel:
    """Testes para o modelo Lista"""
    
    def test_criar_lista_basica(self, app):
        """Testa criação de lista básica"""
        with app.app_context():
            lista = Lista(nome="Lista de Compras Semanal")
            assert lista.nome == "Lista de Compras Semanal"
            assert lista.deletado is False

    def test_lista_soft_delete(self, app):
        """Testa soft delete de lista"""
        with app.app_context():
            lista = Lista(nome="Lista Temporária")
            lista.deletado = True
            lista.data_delecao = datetime.now(timezone.utc)
            assert lista.deletado is True
            assert lista.data_delecao is not None


class TestListaMaeItemModel:
    """Testes para o modelo ListaMaeItem"""

    def test_criar_item_lista_mae(self, app):
        """Testa criação de item no catálogo global"""
        with app.app_context():
            from kaizen_app import db

            # ListaMaeItem agora é um catálogo global (não vinculado a lista específica)
            item = ListaMaeItem(
                nome="Óleo de Soja",
                unidade="litro"
            )
            db.session.add(item)
            db.session.commit()

            assert item.id is not None
            assert item.nome == "Óleo de Soja"
            assert item.unidade == "litro"
            assert item.criado_em is not None
