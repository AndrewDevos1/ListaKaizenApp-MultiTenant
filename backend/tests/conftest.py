import pytest
from kaizen_app import create_app, db

@pytest.fixture(scope='module')
def app():
    """Cria uma instância da aplicação para os testes."""
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

@pytest.fixture(scope='module')
def client(app):
    """Cria um cliente de teste para fazer requisições."""
    return app.test_client()
