"""
Testes unitários para a camada de repositórios (database access layer).
Testa as operações de acesso ao banco de dados.
"""
import pytest
from decimal import Decimal
from kaizen_app import repositories, db
from kaizen_app.models import Usuario, UserRoles, Item, Area, Fornecedor, Estoque, Lista


class TestUsuarioRepository:
    """Testes para operações de repositório de usuários"""
    
    def test_buscar_usuario_por_email(self, app):
        """Testa busca de usuário por email"""
        with app.app_context():
            from .conftest import create_user
            create_user('Test', 'test@example.com', 'senha', UserRoles.ADMIN)
            
            user = repositories.buscar_usuario_por_email('test@example.com')
            assert user is not None
            assert user.email == 'test@example.com'

    def test_buscar_usuario_inexistente(self, app):
        """Testa busca de usuário que não existe"""
        with app.app_context():
            user = repositories.buscar_usuario_por_email('naoexiste@example.com')
            assert user is None

    def test_listar_usuarios_pendentes(self, app):
        """Testa listagem de usuários pendentes de aprovação"""
        with app.app_context():
            from .conftest import create_user
            # Usuário aprovado
            create_user('Aprovado', 'aprovado@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
            # Usuário pendente
            create_user('Pendente', 'pendente@example.com', 'senha', UserRoles.COLLABORATOR, aprovado=False)
            
            pendentes = repositories.listar_usuarios_pendentes()
            emails = [u.email for u in pendentes]
            
            assert 'pendente@example.com' in emails
            assert 'aprovado@example.com' not in emails


class TestItemRepository:
    """Testes para operações de repositório de itens"""
    
    def test_criar_item(self, app):
        """Testa criação de item via repositório"""
        with app.app_context():
            fornecedor = Fornecedor(nome="Fornecedor")
            db.session.add(fornecedor)
            db.session.commit()
            
            item = repositories.criar_item(
                nome="Arroz Branco",
                unidade_medida="kg",
                fornecedor_id=fornecedor.id
            )
            
            assert item.id is not None
            assert item.nome == "Arroz Branco"

    def test_listar_itens(self, app):
        """Testa listagem de todos os itens"""
        with app.app_context():
            fornecedor = Fornecedor(nome="Fornecedor")
            db.session.add(fornecedor)
            db.session.flush()
            
            item1 = Item(nome="Item 1", unidade_medida="un", fornecedor_id=fornecedor.id)
            item2 = Item(nome="Item 2", unidade_medida="kg", fornecedor_id=fornecedor.id)
            db.session.add_all([item1, item2])
            db.session.commit()
            
            itens = repositories.listar_itens()
            assert len(itens) >= 2

    def test_buscar_item_por_nome(self, app):
        """Testa busca de item por nome"""
        with app.app_context():
            fornecedor = Fornecedor(nome="Fornecedor")
            db.session.add(fornecedor)
            db.session.flush()
            
            item = Item(nome="Feijão Preto", unidade_medida="kg", fornecedor_id=fornecedor.id)
            db.session.add(item)
            db.session.commit()
            
            found = repositories.buscar_item_por_nome("Feijão Preto")
            assert found is not None
            assert found.nome == "Feijão Preto"


class TestAreaRepository:
    """Testes para operações de repositório de áreas"""
    
    def test_criar_area(self, app):
        """Testa criação de área"""
        with app.app_context():
            area = repositories.criar_area("Cozinha")
            assert area.id is not None
            assert area.nome == "Cozinha"

    def test_listar_areas(self, app):
        """Testa listagem de áreas"""
        with app.app_context():
            repositories.criar_area("Cozinha")
            repositories.criar_area("Almoxarifado")
            
            areas = repositories.listar_areas()
            assert len(areas) >= 2
            nomes = [a.nome for a in areas]
            assert "Cozinha" in nomes

    def test_buscar_area_por_id(self, app):
        """Testa busca de área por ID"""
        with app.app_context():
            area = repositories.criar_area("Depósito")
            found = repositories.buscar_area_por_id(area.id)
            assert found is not None
            assert found.nome == "Depósito"


class TestFornecedorRepository:
    """Testes para operações de repositório de fornecedores"""
    
    def test_criar_fornecedor(self, app):
        """Testa criação de fornecedor"""
        with app.app_context():
            fornecedor = repositories.criar_fornecedor(
                nome="Fornecedor ABC",
                contato="11 99999-9999",
                meio_envio="WhatsApp"
            )
            assert fornecedor.id is not None
            assert fornecedor.nome == "Fornecedor ABC"

    def test_listar_fornecedores(self, app):
        """Testa listagem de fornecedores"""
        with app.app_context():
            repositories.criar_fornecedor("Fornecedor 1")
            repositories.criar_fornecedor("Fornecedor 2")
            
            fornecedores = repositories.listar_fornecedores()
            assert len(fornecedores) >= 2

    def test_atualizar_fornecedor(self, app):
        """Testa atualização de fornecedor"""
        with app.app_context():
            fornecedor = repositories.criar_fornecedor("Fornecedor Original")
            
            repositories.atualizar_fornecedor(
                fornecedor.id,
                nome="Fornecedor Atualizado",
                contato="11 88888-8888"
            )
            
            updated = Fornecedor.query.get(fornecedor.id)
            assert updated.nome == "Fornecedor Atualizado"
            assert updated.contato == "11 88888-8888"


class TestEstoqueRepository:
    """Testes para operações de repositório de estoque"""
    
    def test_buscar_estoque_por_area_e_item(self, app):
        """Testa busca de estoque específico"""
        with app.app_context():
            # Setup
            fornecedor = Fornecedor(nome="Fornecedor")
            db.session.add(fornecedor)
            db.session.flush()
            
            item = Item(nome="Arroz", unidade_medida="kg", fornecedor_id=fornecedor.id)
            area = Area(nome="Cozinha")
            db.session.add_all([item, area])
            db.session.flush()
            
            estoque = Estoque(
                item_id=item.id,
                area_id=area.id,
                quantidade_atual=Decimal('10.0'),
                quantidade_minima=Decimal('5.0')
            )
            db.session.add(estoque)
            db.session.commit()
            
            # Busca
            found = repositories.buscar_estoque_por_area_e_item(area.id, item.id)
            assert found is not None
            assert float(found.quantidade_atual) == 10.0

    def test_listar_estoque_abaixo_minimo(self, app):
        """Testa listagem de itens com estoque abaixo do mínimo"""
        with app.app_context():
            # Setup
            fornecedor = Fornecedor(nome="Fornecedor")
            db.session.add(fornecedor)
            db.session.flush()
            
            item = Item(nome="Feijão", unidade_medida="kg", fornecedor_id=fornecedor.id)
            area = Area(nome="Cozinha")
            db.session.add_all([item, area])
            db.session.flush()
            
            # Estoque abaixo do mínimo
            estoque_baixo = Estoque(
                item_id=item.id,
                area_id=area.id,
                quantidade_atual=Decimal('3.0'),
                quantidade_minima=Decimal('10.0')
            )
            db.session.add(estoque_baixo)
            db.session.commit()
            
            # Busca
            baixos = repositories.listar_estoque_abaixo_minimo()
            assert len(baixos) > 0
            assert any(e.item.nome == "Feijão" for e in baixos)

    def test_atualizar_quantidade_estoque(self, app):
        """Testa atualização de quantidade em estoque"""
        with app.app_context():
            # Setup
            fornecedor = Fornecedor(nome="Fornecedor")
            db.session.add(fornecedor)
            db.session.flush()
            
            item = Item(nome="Óleo", unidade_medida="litro", fornecedor_id=fornecedor.id)
            area = Area(nome="Cozinha")
            db.session.add_all([item, area])
            db.session.flush()
            
            estoque = Estoque(
                item_id=item.id,
                area_id=area.id,
                quantidade_atual=Decimal('5.0'),
                quantidade_minima=Decimal('10.0')
            )
            db.session.add(estoque)
            db.session.commit()
            estoque_id = estoque.id
            
            # Atualiza
            repositories.atualizar_quantidade_estoque(estoque_id, Decimal('15.0'))
            
            # Verifica
            updated = Estoque.query.get(estoque_id)
            assert float(updated.quantidade_atual) == 15.0


class TestListaRepository:
    """Testes para operações de repositório de listas"""
    
    def test_criar_lista(self, app):
        """Testa criação de lista"""
        with app.app_context():
            lista = repositories.criar_lista(
                nome="Lista Mensal",
                descricao="Compras do mês"
            )
            assert lista.id is not None
            assert lista.nome == "Lista Mensal"

    def test_listar_listas_ativas(self, app):
        """Testa listagem apenas de listas não deletadas"""
        with app.app_context():
            # Lista ativa
            lista_ativa = repositories.criar_lista("Lista Ativa")
            
            # Lista deletada
            from datetime import datetime
            lista_deletada = Lista(nome="Lista Deletada")
            lista_deletada.deletado = True
            lista_deletada.data_delecao = datetime.utcnow()
            db.session.add(lista_deletada)
            db.session.commit()
            
            # Busca apenas ativas
            ativas = repositories.listar_listas_ativas()
            nomes = [l.nome for l in ativas]
            
            assert "Lista Ativa" in nomes
            assert "Lista Deletada" not in nomes

    def test_soft_delete_lista(self, app):
        """Testa exclusão lógica de lista"""
        with app.app_context():
            lista = repositories.criar_lista("Lista Temp")
            lista_id = lista.id
            
            repositories.soft_delete_lista(lista_id)
            
            # Verifica
            lista = Lista.query.get(lista_id)
            assert lista.deletado is True
            assert lista.data_delecao is not None

    def test_adicionar_colaborador_lista(self, app):
        """Testa adição de colaborador a uma lista"""
        with app.app_context():
            from .conftest import create_user
            
            lista = repositories.criar_lista("Lista Compartilhada")
            user = create_user('Colab', 'colab@example.com', 'senha', UserRoles.COLLABORATOR)
            
            repositories.adicionar_colaborador_lista(lista.id, user.id)
            
            # Verifica
            lista_updated = Lista.query.get(lista.id)
            assert user in lista_updated.colaboradores
