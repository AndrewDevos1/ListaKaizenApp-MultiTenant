import pytest
import json
from kaizen_app import create_app, db
from kaizen_app.models import Usuario, UserRoles
from werkzeug.security import generate_password_hash

@pytest.fixture(scope='function')
def app():
    """Cria uma instância da aplicação para os testes."""
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

@pytest.fixture(scope='function')
def client(app):
    """Cria um cliente de teste para fazer requisições."""
    return app.test_client()

# --- Helper Functions ---

def create_user(nome, email, senha, role, aprovado=True):
    """Helper para criar um usuário diretamente no banco para testes."""
    hashed_password = generate_password_hash(senha)
    user = Usuario(nome=nome, email=email, senha_hash=hashed_password, role=role, aprovado=aprovado)
    db.session.add(user)
    db.session.commit()
    return user

def get_auth_token(client, email, senha):
    """Helper para obter um token de autenticação para um usuário."""
    response = client.post('/api/auth/login', data=json.dumps({
        'email': email,
        'senha': senha
    }), content_type='application/json')
    if response.status_code != 200:
        raise Exception(f"Falha ao obter token para {email}: {response.get_data(as_text=True)}")
    return response.get_json()['access_token']
