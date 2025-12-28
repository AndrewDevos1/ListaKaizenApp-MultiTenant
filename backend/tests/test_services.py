"""
Testes unitários para a camada de serviços (business logic).
Testa as funções de negócio sem dependência de rotas.
"""
import pytest
from decimal import Decimal
from datetime import datetime, timezone
from kaizen_app import services, db
from kaizen_app.models import Usuario, UserRoles, Item, Area, Fornecedor, Estoque, Lista, ListaMaeItem
from werkzeug.security import check_password_hash


class TestRegisterUser:
    """Testes para o serviço de registro de usuários"""
    
    def test_registrar_usuario_colaborador_sucesso(self, app):
        """Testa registro de colaborador com sucesso"""
        with app.app_context():
            data = {
                'nome': 'João Silva',
                'email': 'joao@example.com',
                'senha': 'senha123'
            }
            response, status = services.register_user(data)
            
            assert status == 201
            assert 'aguardando aprovação' in response['message'].lower()
            
            # Verifica se usuário foi criado no banco
            user = Usuario.query.filter_by(email='joao@example.com').first()
            assert user is not None
            assert user.nome == 'João Silva'
            assert user.role == UserRoles.COLLABORATOR
            assert user.aprovado is False

    def test_registrar_admin_com_token(self, app):
        """Testa registro de admin usando token"""
        with app.app_context():
            data = {
                'nome': 'Admin User',
                'email': 'admin@example.com',
                'senha': 'senha123',
                'token_admin': 'Kaiser@210891'
            }
            response, status = services.register_user(data)
            
            assert status == 201
            assert 'administrador' in response['message'].lower()
            
            user = Usuario.query.filter_by(email='admin@example.com').first()
            assert user.role == UserRoles.ADMIN
            assert user.aprovado is True

    def test_registrar_email_duplicado(self, app):
        """Testa erro ao registrar email duplicado"""
        with app.app_context():
            # Cria primeiro usuário
            data1 = {
                'nome': 'User 1',
                'email': 'duplicado@example.com',
                'senha': 'senha123'
            }
            services.register_user(data1)
            
            # Tenta criar segundo usuário com mesmo email
            data2 = {
                'nome': 'User 2',
                'email': 'duplicado@example.com',
                'senha': 'senha456'
            }
            response, status = services.register_user(data2)
            
            assert status == 409
            assert 'já cadastrado' in response['error'].lower()

    def test_registrar_username_duplicado(self, app):
        """Testa erro ao registrar username duplicado"""
        with app.app_context():
            data1 = {
                'nome': 'User 1',
                'email': 'user1@example.com',
                'senha': 'senha123',
                'username': 'joaosilva'
            }
            services.register_user(data1)
            
            data2 = {
                'nome': 'User 2',
                'email': 'user2@example.com',
                'senha': 'senha456',
                'username': 'joaosilva'
            }
            response, status = services.register_user(data2)
            
            assert status == 409
            assert 'usuário já cadastrado' in response['error'].lower()

    def test_senha_hash_seguro(self, app):
        """Testa que senha é armazenada com hash seguro"""
        with app.app_context():
            data = {
                'nome': 'Teste',
                'email': 'teste@example.com',
                'senha': 'minhasenha123'
            }
            services.register_user(data)
            
            user = Usuario.query.filter_by(email='teste@example.com').first()
            # Senha não deve estar em texto claro
            assert user.senha_hash != 'minhasenha123'
            # Deve ser possível verificar com check_password_hash
            assert check_password_hash(user.senha_hash, 'minhasenha123')


class TestAuthenticateUser:
    """Testes para o serviço de autenticação"""
    
    def test_login_sucesso_com_email(self, app):
        """Testa login bem-sucedido usando email"""
        with app.app_context():
            # Cria e aprova usuário
            data_register = {
                'nome': 'User Test',
                'email': 'login@example.com',
                'senha': 'senha123',
                'token_admin': 'Kaiser@210891'
            }
            services.register_user(data_register)
            
            # Tenta login
            data_login = {
                'email': 'login@example.com',
                'senha': 'senha123'
            }
            response, status = services.authenticate_user(data_login)
            
            assert status == 200
            assert 'access_token' in response
            assert isinstance(response['access_token'], str)

    def test_login_usuario_nao_aprovado(self, app):
        """Testa que usuário não aprovado não consegue logar"""
        with app.app_context():
            # Cria usuário sem aprovar
            data_register = {
                'nome': 'User Pendente',
                'email': 'pendente@example.com',
                'senha': 'senha123'
            }
            services.register_user(data_register)
            
            # Tenta login
            data_login = {
                'email': 'pendente@example.com',
                'senha': 'senha123'
            }
            response, status = services.authenticate_user(data_login)
            
            assert status == 403
            assert 'pendente' in response['error'].lower()

    def test_login_usuario_desativado(self, app):
        """Testa que usuário desativado não consegue logar"""
        with app.app_context():
            # Cria usuário aprovado
            data_register = {
                'nome': 'User Ativo',
                'email': 'ativo@example.com',
                'senha': 'senha123',
                'token_admin': 'Kaiser@210891'
            }
            services.register_user(data_register)
            
            # Desativa usuário
            user = Usuario.query.filter_by(email='ativo@example.com').first()
            user.ativo = False
            db.session.commit()
            
            # Tenta login
            data_login = {
                'email': 'ativo@example.com',
                'senha': 'senha123'
            }
            response, status = services.authenticate_user(data_login)
            
            assert status == 403
            assert 'desativado' in response['error'].lower()

    def test_login_credenciais_invalidas(self, app):
        """Testa login com credenciais inválidas"""
        with app.app_context():
            data = {
                'email': 'naoexiste@example.com',
                'senha': 'senhaerrada'
            }
            response, status = services.authenticate_user(data)
            
            assert status == 401
            assert 'credenciais' in response['error'].lower()

    def test_login_senha_incorreta(self, app):
        """Testa login com senha incorreta"""
        with app.app_context():
            # Cria usuário
            data_register = {
                'nome': 'User',
                'email': 'user@example.com',
                'senha': 'senhacorreta',
                'token_admin': 'Kaiser@210891'
            }
            services.register_user(data_register)
            
            # Tenta login com senha errada
            data_login = {
                'email': 'user@example.com',
                'senha': 'senhaerrada'
            }
            response, status = services.authenticate_user(data_login)
            
            assert status == 401


class TestGetAllUsers:
    """Testes para o serviço de listagem de usuários"""

    def test_get_all_users_retorna_todos_usuarios(self, app):
        """Testa que todos os usuários são retornados"""
        with app.app_context():
            # Cria usuário aprovado
            services.register_user({
                'nome': 'Aprovado',
                'email': 'aprovado@example.com',
                'senha': 'senha',
                'token_admin': 'Kaiser@210891'
            })

            # Cria usuário não aprovado
            services.register_user({
                'nome': 'Pendente',
                'email': 'pendente@example.com',
                'senha': 'senha'
            })

            usuarios, status = services.get_all_users()

            # Ambos devem aparecer
            emails = [u.email for u in usuarios]
            assert 'aprovado@example.com' in emails
            assert 'pendente@example.com' in emails
            assert status == 200

    def test_get_all_users_inclui_desativados(self, app):
        """Testa que get_all_users retorna todos, incluindo desativados"""
        with app.app_context():
            # Cria usuário aprovado
            services.register_user({
                'nome': 'User',
                'email': 'user@example.com',
                'senha': 'senha',
                'token_admin': 'Kaiser@210891'
            })

            # Desativa usuário
            user = Usuario.query.filter_by(email='user@example.com').first()
            user.ativo = False
            db.session.commit()

            usuarios, status = services.get_all_users()
            emails = [u.email for u in usuarios]

            # Usuário desativado ainda deve aparecer
            assert 'user@example.com' in emails
            assert status == 200


class TestEstoqueServices:
    """Testes para serviços relacionados ao estoque"""
    
    def test_calcular_necessidade_estoque(self, app):
        """Testa cálculo de necessidades de estoque"""
        with app.app_context():
            # Setup: criar fornecedor, item, área e estoque
            fornecedor = Fornecedor(nome="Fornecedor Teste")
            db.session.add(fornecedor)
            db.session.flush()
            
            item = Item(nome="Arroz", unidade_medida="kg", fornecedor_id=fornecedor.id)
            db.session.add(item)
            db.session.flush()
            
            area = Area(nome="Cozinha")
            db.session.add(area)
            db.session.flush()
            
            # Estoque abaixo do mínimo
            estoque = Estoque(
                item_id=item.id,
                area_id=area.id,
                quantidade_atual=Decimal('5.0'),
                quantidade_minima=Decimal('15.0')
            )
            db.session.add(estoque)
            db.session.commit()
            
            # Testa cálculo
            necessidade = estoque.calcular_pedido()
            assert necessidade == 10.0


class TestListaServices:
    """Testes para serviços relacionados às listas"""

    def test_criar_lista_com_itens(self, app):
        """Testa criação de lista com itens via catálogo global"""
        with app.app_context():
            from kaizen_app.models import ListaItemRef

            # Criar lista
            lista = Lista(nome="Lista de Teste", descricao="Teste")
            db.session.add(lista)
            db.session.flush()

            # Criar itens no catálogo global
            item1 = ListaMaeItem(nome="Feijão", unidade="kg")
            item2 = ListaMaeItem(nome="Arroz", unidade="kg")
            db.session.add_all([item1, item2])
            db.session.flush()

            # Associar itens à lista via ListaItemRef
            ref1 = ListaItemRef(
                lista_id=lista.id,
                item_id=item1.id,
                quantidade_atual=5.0,
                quantidade_minima=10.0
            )
            ref2 = ListaItemRef(
                lista_id=lista.id,
                item_id=item2.id,
                quantidade_atual=8.0,
                quantidade_minima=12.0
            )
            db.session.add_all([ref1, ref2])
            db.session.commit()

            # Verifica
            lista_db = db.session.get(Lista, lista.id)
            assert lista_db.item_refs.count() == 2
            item_refs = lista_db.item_refs.all()
            nomes = [ref.item.nome for ref in item_refs]
            assert "Feijão" in nomes
            assert "Arroz" in nomes

    def test_soft_delete_lista(self, app):
        """Testa exclusão lógica de lista"""
        with app.app_context():
            from datetime import datetime
            
            lista = Lista(nome="Lista Temp")
            db.session.add(lista)
            db.session.commit()
            
            # Marca como deletada
            lista.deletado = True
            lista.data_delecao = datetime.now(timezone.utc)
            db.session.commit()
            
            # Verifica
            lista_db = db.session.get(Lista, lista.id)
            assert lista_db.deletado is True
            assert lista_db.data_delecao is not None
