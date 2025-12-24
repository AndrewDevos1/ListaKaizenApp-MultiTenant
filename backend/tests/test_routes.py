"""
Testes de integração para as rotas da API.
Testa o fluxo completo: requisição -> controller -> service -> model -> resposta.
"""
import json
import pytest
from kaizen_app.models import Usuario, UserRoles, Item, Area, Fornecedor, Lista
from kaizen_app import db
from .conftest import create_user, get_auth_token


class TestAuthRoutes:
    """Testes para rotas de autenticação"""
    
    def test_register_endpoint(self, client, app):
        """Testa endpoint de registro"""
        response = client.post('/api/auth/register', 
            data=json.dumps({
                'nome': 'Novo Usuario',
                'email': 'novo@example.com',
                'senha': 'senha123'
            }),
            content_type='application/json')
        
        assert response.status_code == 201
        data = response.get_json()
        assert 'message' in data

    def test_login_endpoint_sucesso(self, client, app):
        """Testa login bem-sucedido"""
        with app.app_context():
            # Cria usuário aprovado
            create_user('Test User', 'test@example.com', 'senha123', UserRoles.ADMIN, aprovado=True)
        
        response = client.post('/api/auth/login',
            data=json.dumps({
                'email': 'test@example.com',
                'senha': 'senha123'
            }),
            content_type='application/json')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'access_token' in data

    def test_login_usuario_nao_aprovado(self, client, app):
        """Testa que usuário não aprovado não consegue logar"""
        with app.app_context():
            create_user('Pendente', 'pendente@example.com', 'senha123', UserRoles.COLLABORATOR, aprovado=False)
        
        response = client.post('/api/auth/login',
            data=json.dumps({
                'email': 'pendente@example.com',
                'senha': 'senha123'
            }),
            content_type='application/json')
        
        assert response.status_code == 403

    def test_login_credenciais_invalidas(self, client):
        """Testa login com credenciais inválidas"""
        response = client.post('/api/auth/login',
            data=json.dumps({
                'email': 'naoexiste@example.com',
                'senha': 'senhaerrada'
            }),
            content_type='application/json')
        
        assert response.status_code == 401


class TestAdminRoutes:
    """Testes para rotas administrativas"""
    
    def test_listar_usuarios_sem_autenticacao(self, client):
        """Testa que rota admin requer autenticação"""
        response = client.get('/api/admin/users')
        assert response.status_code == 401

    def test_listar_usuarios_como_admin(self, client, app):
        """Testa listagem de usuários por admin"""
        with app.app_context():
            admin = create_user('Admin', 'admin@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
            token = get_auth_token(client, 'admin@example.com', 'senha')
        
        response = client.get('/api/admin/users',
            headers={'Authorization': f'Bearer {token}'})
        
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)

    def test_listar_usuarios_como_colaborador_negado(self, client, app):
        """Testa que colaborador não pode acessar rotas admin"""
        with app.app_context():
            create_user('Colab', 'colab@example.com', 'senha', UserRoles.COLLABORATOR, aprovado=True)
            token = get_auth_token(client, 'colab@example.com', 'senha')
        
        response = client.get('/api/admin/users',
            headers={'Authorization': f'Bearer {token}'})
        
        assert response.status_code == 403

    def test_aprovar_usuario(self, client, app):
        """Testa aprovação de usuário por admin"""
        with app.app_context():
            create_user('Admin', 'admin@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
            pendente = create_user('Pendente', 'pendente@example.com', 'senha', UserRoles.COLLABORATOR, aprovado=False)
            token = get_auth_token(client, 'admin@example.com', 'senha')
            pendente_id = pendente.id
        
        response = client.post(f'/api/admin/users/{pendente_id}/approve',
            headers={'Authorization': f'Bearer {token}'})
        
        assert response.status_code == 200
        
        # Verifica se foi aprovado no banco
        with app.app_context():
            user = Usuario.query.get(pendente_id)
            assert user.aprovado is True

    def test_desativar_usuario(self, client, app):
        """Testa desativação de usuário por admin"""
        with app.app_context():
            create_user('Admin', 'admin@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
            user_to_deactivate = create_user('User', 'user@example.com', 'senha', UserRoles.COLLABORATOR, aprovado=True)
            token = get_auth_token(client, 'admin@example.com', 'senha')
            user_id = user_to_deactivate.id
        
        response = client.post(f'/api/admin/users/{user_id}/deactivate',
            headers={'Authorization': f'Bearer {token}'})
        
        assert response.status_code == 200
        
        with app.app_context():
            user = Usuario.query.get(user_id)
            assert user.ativo is False


class TestItemRoutes:
    """Testes para rotas de itens"""
    
    def test_criar_item_como_admin(self, client, app):
        """Testa criação de item por admin"""
        with app.app_context():
            create_user('Admin', 'admin@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
            fornecedor = Fornecedor(nome="Fornecedor Teste")
            db.session.add(fornecedor)
            db.session.commit()
            fornecedor_id = fornecedor.id
            token = get_auth_token(client, 'admin@example.com', 'senha')
        
        response = client.post('/api/admin/items',
            data=json.dumps({
                'nome': 'Arroz Tipo 1',
                'unidade_medida': 'kg',
                'fornecedor_id': fornecedor_id
            }),
            headers={'Authorization': f'Bearer {token}'},
            content_type='application/json')
        
        assert response.status_code == 201

    def test_listar_itens(self, client, app):
        """Testa listagem de itens"""
        with app.app_context():
            create_user('User', 'user@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
            fornecedor = Fornecedor(nome="Fornecedor")
            db.session.add(fornecedor)
            db.session.flush()
            
            item = Item(nome="Feijão", unidade_medida="kg", fornecedor_id=fornecedor.id)
            db.session.add(item)
            db.session.commit()
            
            token = get_auth_token(client, 'user@example.com', 'senha')
        
        response = client.get('/api/v1/items',
            headers={'Authorization': f'Bearer {token}'})
        
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)
        assert len(data) > 0


class TestAreaRoutes:
    """Testes para rotas de áreas"""
    
    def test_criar_area_como_admin(self, client, app):
        """Testa criação de área por admin"""
        with app.app_context():
            create_user('Admin', 'admin@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
            token = get_auth_token(client, 'admin@example.com', 'senha')
        
        response = client.post('/api/admin/areas',
            data=json.dumps({'nome': 'Cozinha Industrial'}),
            headers={'Authorization': f'Bearer {token}'},
            content_type='application/json')
        
        assert response.status_code == 201

    def test_listar_areas(self, client, app):
        """Testa listagem de áreas"""
        with app.app_context():
            create_user('User', 'user@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
            area = Area(nome="Almoxarifado")
            db.session.add(area)
            db.session.commit()
            token = get_auth_token(client, 'user@example.com', 'senha')
        
        response = client.get('/api/v1/areas',
            headers={'Authorization': f'Bearer {token}'})
        
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)


class TestFornecedorRoutes:
    """Testes para rotas de fornecedores"""
    
    def test_criar_fornecedor_como_admin(self, client, app):
        """Testa criação de fornecedor por admin"""
        with app.app_context():
            create_user('Admin', 'admin@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
            token = get_auth_token(client, 'admin@example.com', 'senha')
        
        response = client.post('/api/admin/fornecedores',
            data=json.dumps({
                'nome': 'Fornecedor ABC',
                'contato': '11 99999-9999',
                'meio_envio': 'WhatsApp',
                'responsavel': 'João Silva'
            }),
            headers={'Authorization': f'Bearer {token}'},
            content_type='application/json')
        
        assert response.status_code == 201

    def test_listar_fornecedores(self, client, app):
        """Testa listagem de fornecedores"""
        with app.app_context():
            create_user('User', 'user@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
            fornecedor = Fornecedor(nome="Fornecedor XYZ")
            db.session.add(fornecedor)
            db.session.commit()
            token = get_auth_token(client, 'user@example.com', 'senha')
        
        response = client.get('/api/v1/fornecedores',
            headers={'Authorization': f'Bearer {token}'})
        
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)


class TestListaRoutes:
    """Testes para rotas de listas"""
    
    def test_criar_lista_como_admin(self, client, app):
        """Testa criação de lista por admin"""
        with app.app_context():
            create_user('Admin', 'admin@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
            token = get_auth_token(client, 'admin@example.com', 'senha')
        
        response = client.post('/api/admin/listas',
            data=json.dumps({
                'nome': 'Lista Semanal',
                'descricao': 'Compras da semana'
            }),
            headers={'Authorization': f'Bearer {token}'},
            content_type='application/json')
        
        assert response.status_code == 201

    def test_listar_listas(self, client, app):
        """Testa listagem de listas"""
        with app.app_context():
            create_user('User', 'user@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
            lista = Lista(nome="Lista Teste")
            db.session.add(lista)
            db.session.commit()
            token = get_auth_token(client, 'user@example.com', 'senha')
        
        response = client.get('/api/v1/listas',
            headers={'Authorization': f'Bearer {token}'})
        
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)

    def test_soft_delete_lista(self, client, app):
        """Testa exclusão lógica de lista"""
        with app.app_context():
            create_user('Admin', 'admin@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
            lista = Lista(nome="Lista Temp")
            db.session.add(lista)
            db.session.commit()
            lista_id = lista.id
            token = get_auth_token(client, 'admin@example.com', 'senha')
        
        response = client.delete(f'/api/admin/listas/{lista_id}',
            headers={'Authorization': f'Bearer {token}'})
        
        assert response.status_code == 200
        
        # Verifica soft delete
        with app.app_context():
            lista = Lista.query.get(lista_id)
            assert lista.deletado is True


class TestProtectedRoutes:
    """Testes para proteção de rotas"""
    
    def test_rota_protegida_sem_token(self, client):
        """Testa que rota protegida requer token"""
        response = client.get('/api/v1/items')
        assert response.status_code == 401

    def test_rota_protegida_com_token_invalido(self, client):
        """Testa rota com token inválido"""
        response = client.get('/api/v1/items',
            headers={'Authorization': 'Bearer token_invalido_123'})
        assert response.status_code == 422  # JWT inválido

    def test_rota_admin_requer_role_admin(self, client, app):
        """Testa que rota admin requer role ADMIN"""
        with app.app_context():
            create_user('Colab', 'colab@example.com', 'senha', UserRoles.COLLABORATOR, aprovado=True)
            token = get_auth_token(client, 'colab@example.com', 'senha')
        
        response = client.get('/api/admin/users',
            headers={'Authorization': f'Bearer {token}'})
        
        assert response.status_code == 403
