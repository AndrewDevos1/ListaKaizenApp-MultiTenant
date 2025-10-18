import json
from kaizen_app.models import UserRoles
from .conftest import create_user

def test_registration(client, app):
    """Testa o registro de um novo usuário."""
    with app.app_context():
        response = client.post('/api/auth/register', data=json.dumps({
            'nome': 'testuser',
            'email': 'test@example.com',
            'senha': 'password'
        }), content_type='application/json')
        assert response.status_code == 201
        assert b'Solicita\u00e7\u00e3o de cadastro enviada com sucesso' in response.data

def test_login_unapproved_user_fails(client, app):
    """Testa que um usuário não aprovado não consegue logar."""
    with app.app_context():
        # Cria um usuário específico para este teste, que não está aprovado
        create_user('unapproved_user', 'unapproved@test.com', 'password', UserRoles.COLLABORATOR, aprovado=False)

        # Tentativa de login com usuário não aprovado
        response = client.post('/api/auth/login', data=json.dumps({
            'email': 'unapproved@test.com',
            'senha': 'password'
        }), content_type='application/json')
        
        assert response.status_code == 403
        assert b'Usu\u00e1rio pendente de aprova\u00e7\u00e3o' in response.data

# TODO: Adicionar um teste para o login bem-sucedido após a aprovação do usuário.
