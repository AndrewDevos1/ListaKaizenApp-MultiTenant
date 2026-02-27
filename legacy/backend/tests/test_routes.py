"""
Testes de integração para as rotas da API.
Testa o fluxo completo: requisição -> controller -> service -> model -> resposta.
"""
import json
import pytest
from kaizen_app.models import Usuario, UserRoles, Item, Area, Fornecedor, Lista, Restaurante, ListaMaeItem, ListaItemRef
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
            user = db.session.get(Usuario, pendente_id)
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
            user = db.session.get(Usuario, user_id)
            assert user.ativo is False


class TestItemRoutes:
    """Testes para rotas de itens"""
    
    def test_criar_item_como_admin(self, client, app):
        """Testa criação de item por admin"""
        with app.app_context():
            create_user('Admin', 'admin@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
            restaurante = Restaurante.query.first()
            fornecedor = Fornecedor(nome="Fornecedor Teste", restaurante_id=restaurante.id)
            db.session.add(fornecedor)
            db.session.commit()
            fornecedor_id = fornecedor.id
            token = get_auth_token(client, 'admin@example.com', 'senha')
        
        response = client.post('/api/v1/items',
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
            restaurante = Restaurante.query.first()
            fornecedor = Fornecedor(nome="Fornecedor", restaurante_id=restaurante.id)
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
        
        response = client.post('/api/v1/areas',
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
        
        response = client.post('/api/v1/fornecedores',
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
            restaurante = Restaurante.query.first()
            fornecedor = Fornecedor(nome="Fornecedor XYZ", restaurante_id=restaurante.id)
            db.session.add(fornecedor)
            db.session.commit()
            token = get_auth_token(client, 'user@example.com', 'senha')
        
        response = client.get('/api/v1/fornecedores',
            headers={'Authorization': f'Bearer {token}'})
        
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)

    def test_listar_fornecedores_compartilhados(self, client, app):
        """Testa filtro de fornecedores compartilhados na regiao"""
        with app.app_context():
            create_user('Admin', 'admin-comp@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
            restaurante = Restaurante.query.first()
            fornecedor_regional = Fornecedor(
                nome="Fornecedor Regional",
                restaurante_id=restaurante.id,
                compartilhado_regiao=True
            )
            fornecedor_privado = Fornecedor(
                nome="Fornecedor Privado",
                restaurante_id=restaurante.id,
                compartilhado_regiao=False
            )
            db.session.add(fornecedor_regional)
            db.session.add(fornecedor_privado)
            db.session.commit()
            token = get_auth_token(client, 'admin-comp@example.com', 'senha')

        response = client.get(
            '/api/v1/fornecedores?compartilhado_regiao=1',
            headers={'Authorization': f'Bearer {token}'}
        )

        assert response.status_code == 200
        data = response.get_json()
        nomes = [f['nome'] for f in data]
        assert "Fornecedor Regional" in nomes
        assert "Fornecedor Privado" not in nomes
        assert all(f.get('compartilhado_regiao') for f in data)

    def test_fornecedor_detalhes_estoque(self, client, app):
        """Testa rota de detalhes com itens do fornecedor"""
        with app.app_context():
            create_user('Admin', 'admin-detalhes@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
            restaurante = Restaurante.query.first()
            fornecedor = Fornecedor(nome="Fornecedor Detalhes", restaurante_id=restaurante.id)
            db.session.add(fornecedor)
            db.session.flush()
            item = Item(nome="Arroz Detalhe", unidade_medida="kg", fornecedor_id=fornecedor.id)
            db.session.add(item)
            db.session.commit()
            token = get_auth_token(client, 'admin-detalhes@example.com', 'senha')
            fornecedor_id = fornecedor.id
            item_id = item.id

        response = client.get(
            f'/api/v1/fornecedores/{fornecedor_id}/detalhes-estoque',
            headers={'Authorization': f'Bearer {token}'}
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['fornecedor']['id'] == fornecedor_id
        assert len(data['itens']) == 1
        assert data['itens'][0]['id'] == item_id
        assert data['estoques'] == []

    def test_lista_skip_item_existente(self, client, app):
        """Testa adicionar item na lista sem alterar quando ja existe."""
        with app.app_context():
            create_user('Admin', 'admin-skip@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
            restaurante = Restaurante.query.first()
            lista = Lista(nome="Lista Skip", restaurante_id=restaurante.id)
            db.session.add(lista)
            fornecedor = Fornecedor(nome="Fornecedor Skip", restaurante_id=restaurante.id)
            db.session.add(fornecedor)
            db.session.flush()
            item_fornecedor = Item(nome="Item Skip", unidade_medida="kg", fornecedor_id=fornecedor.id)
            db.session.add(item_fornecedor)
            db.session.flush()
            item_global = ListaMaeItem(
                nome="Item Skip",
                unidade="kg",
                restaurante_id=restaurante.id
            )
            db.session.add(item_global)
            db.session.flush()
            ref = ListaItemRef(
                lista_id=lista.id,
                item_id=item_global.id,
                quantidade_atual=0,
                quantidade_minima=5
            )
            db.session.add(ref)
            db.session.commit()
            token = get_auth_token(client, 'admin-skip@example.com', 'senha')
            lista_id = lista.id
            item_fornecedor_id = item_fornecedor.id
            item_global_id = item_global.id

        response = client.post(
            f'/api/admin/listas/{lista_id}/itens?skip_if_exists=1',
            data=json.dumps({
                'itens': [
                    {'id': f'fornecedor_{item_fornecedor_id}', 'quantidade_minima': 1}
                ]
            }),
            headers={'Authorization': f'Bearer {token}'},
            content_type='application/json'
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['resultados'][0].get('skipped') is True

        with app.app_context():
            ref_atual = ListaItemRef.query.filter_by(
                lista_id=lista_id,
                item_id=item_global_id
            ).first()
            assert ref_atual is not None
            assert ref_atual.quantidade_minima == 5

    def test_listar_itens_regionais(self, client, app):
        """Testa listagem de itens de fornecedores regionais."""
        with app.app_context():
            create_user('Admin', 'admin-itens-regionais@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
            restaurante = Restaurante.query.first()
            fornecedor_regional = Fornecedor(
                nome="Fornecedor Regional Itens",
                restaurante_id=restaurante.id,
                compartilhado_regiao=True
            )
            fornecedor_privado = Fornecedor(
                nome="Fornecedor Privado Itens",
                restaurante_id=restaurante.id,
                compartilhado_regiao=False
            )
            db.session.add(fornecedor_regional)
            db.session.add(fornecedor_privado)
            db.session.flush()
            item_regional = Item(
                nome="Item Regional",
                unidade_medida="kg",
                fornecedor_id=fornecedor_regional.id
            )
            item_privado = Item(
                nome="Item Privado",
                unidade_medida="kg",
                fornecedor_id=fornecedor_privado.id
            )
            db.session.add(item_regional)
            db.session.add(item_privado)
            db.session.commit()
            token = get_auth_token(client, 'admin-itens-regionais@example.com', 'senha')

        response = client.get(
            '/api/admin/itens-regionais',
            headers={'Authorization': f'Bearer {token}'}
        )

        assert response.status_code == 200
        data = response.get_json()
        nomes = [item['nome'] for item in data.get('itens', [])]
        assert "Item Regional" in nomes
        assert "Item Privado" not in nomes


class TestListaRoutes:
    """Testes para rotas de listas"""
    
    def test_criar_lista_como_admin(self, client, app):
        """Testa criação de lista por admin"""
        with app.app_context():
            create_user('Admin', 'admin@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
            token = get_auth_token(client, 'admin@example.com', 'senha')
        
        response = client.post('/api/v1/listas',
            data=json.dumps({
                'nome': 'Lista Semanal',
                'descricao': 'Compras da semana'
            }),
            headers={'Authorization': f'Bearer {token}'},
            content_type='application/json')
        
        assert response.status_code == 201


class TestNavbarLayoutRoutes:
    """Testes para rotas de layout da navbar."""

    def test_get_navbar_layout(self, client, app):
        with app.app_context():
            create_user('Admin', 'admin-layout@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
            token = get_auth_token(client, 'admin-layout@example.com', 'senha')

        response = client.get(
            '/api/auth/navbar-layout',
            headers={'Authorization': f'Bearer {token}'}
        )

        assert response.status_code == 200
        data = response.get_json()
        assert 'layout' in data

    def test_save_navbar_layout_requires_super_admin(self, client, app):
        with app.app_context():
            create_user('Admin', 'admin-no-layout@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
            token = get_auth_token(client, 'admin-no-layout@example.com', 'senha')

        response = client.post(
            '/api/auth/navbar-layout',
            data=json.dumps({
                'layout': {
                    'groups': [],
                    'hidden_items': []
                }
            }),
            headers={'Authorization': f'Bearer {token}'},
            content_type='application/json'
        )

        assert response.status_code == 403

    def test_save_navbar_layout_super_admin(self, client, app):
        with app.app_context():
            create_user('Super', 'super-layout@example.com', 'senha', UserRoles.SUPER_ADMIN, aprovado=True)
            token = get_auth_token(client, 'super-layout@example.com', 'senha')

        response = client.post(
            '/api/auth/navbar-layout',
            data=json.dumps({
                'layout': {
                    'groups': [
                        {'id': 'grupo-1', 'title': 'Grupo 1', 'items': []}
                    ],
                    'hidden_items': []
                }
            }),
            headers={'Authorization': f'Bearer {token}'},
            content_type='application/json'
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data.get('layout')


class TestNavbarActivityRoutes:
    """Testes para o histórico de acessos da navbar."""

    def test_get_navbar_activity_empty(self, client, app):
        with app.app_context():
            create_user('User', 'user-history@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
            token = get_auth_token(client, 'user-history@example.com', 'senha')

        response = client.get(
            '/api/auth/navbar-activity',
            headers={'Authorization': f'Bearer {token}'}
        )

        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data.get('items'), list)
        assert data.get('items') == []

    def test_log_navbar_activity_requires_item_key(self, client, app):
        with app.app_context():
            create_user('User', 'user-history2@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
            token = get_auth_token(client, 'user-history2@example.com', 'senha')

        response = client.post(
            '/api/auth/navbar-activity',
            data=json.dumps({}),
            headers={'Authorization': f'Bearer {token}'},
            content_type='application/json'
        )

        assert response.status_code == 400

    def test_log_navbar_activity(self, client, app):
        with app.app_context():
            create_user('User', 'user-history3@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
            token = get_auth_token(client, 'user-history3@example.com', 'senha')

        response = client.post(
            '/api/auth/navbar-activity',
            data=json.dumps({'item_key': 'admin_dashboard'}),
            headers={'Authorization': f'Bearer {token}'},
            content_type='application/json'
        )

        assert response.status_code == 200
        payload = client.get(
            '/api/auth/navbar-activity',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert payload.status_code == 200
        data = payload.get_json()
        assert data.get('items')[0] == 'admin_dashboard'

    def test_listar_listas(self, client, app):
        """Testa listagem de listas"""
        with app.app_context():
            create_user('User', 'user@example.com', 'senha', UserRoles.ADMIN, aprovado=True)
            restaurante = Restaurante.query.first()
            lista = Lista(nome="Lista Teste", restaurante_id=restaurante.id)
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
            restaurante = Restaurante.query.first()
            lista = Lista(nome="Lista Temp", restaurante_id=restaurante.id)
            db.session.add(lista)
            db.session.commit()
            lista_id = lista.id
            token = get_auth_token(client, 'admin@example.com', 'senha')
        
        response = client.delete(f'/api/v1/listas/{lista_id}',
            headers={'Authorization': f'Bearer {token}'})
        
        assert response.status_code == 200
        
        # Verifica soft delete
        with app.app_context():
            lista = db.session.get(Lista, lista_id)
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
