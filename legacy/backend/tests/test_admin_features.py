import json
from kaizen_app.models import Usuario, UserRoles, Lista
from kaizen_app.extensions import db
from .conftest import create_user, get_auth_token

# --- Testes de Gestão de Listas ---

def test_create_list_as_admin(client, app):
    """Testa se um admin consegue criar uma nova lista."""
    with app.app_context():
        create_user('admin_user', 'admin@test.com', 'adminpass', UserRoles.ADMIN)
        admin_token = get_auth_token(client, 'admin@test.com', 'adminpass')

        response = client.post('/api/v1/listas', 
            headers={'Authorization': f'Bearer {admin_token}'},
            data=json.dumps({'nome': 'Lista de Teste'}),
            content_type='application/json'
        )
        
        assert response.status_code == 201
        assert response.get_json()['nome'] == 'Lista de Teste'
def test_create_list_as_collaborator_fails(client, app):
    """Testa que um colaborador não consegue criar uma nova lista."""
    with app.app_context():
        create_user('colab_user', 'colab@test.com', 'colabpass', UserRoles.COLLABORATOR)
        colab_token = get_auth_token(client, 'colab@test.com', 'colabpass')

        response = client.post('/api/v1/listas', 
            headers={'Authorization': f'Bearer {colab_token}'},
            data=json.dumps({'nome': 'Lista do Colaborador'}),
            content_type='application/json'
        )
        
        assert response.status_code == 403
def test_get_all_lists_as_admin(client, app):
    """Testa se um admin consegue buscar todas as listas."""
    with app.app_context():
        create_user('admin_user_2', 'admin2@test.com', 'adminpass', UserRoles.ADMIN)
        admin_token = get_auth_token(client, 'admin2@test.com', 'adminpass')
        db.session.add(Lista(nome="Lista para GET"))
        db.session.commit()

        response = client.get('/api/v1/listas', 
            headers={'Authorization': f'Bearer {admin_token}'}
        )
        
        assert response.status_code == 200
        response_data = response.get_json()
        assert isinstance(response_data, list)
        assert len(response_data) == 1
        assert response_data[0]['nome'] == "Lista para GET"
def test_assign_collaborators_to_list(client, app):
    """Testa se um admin consegue atribuir colaboradores a uma lista."""
    with app.app_context():
        create_user('admin_user_3', 'admin3@test.com', 'adminpass', UserRoles.ADMIN)
        admin_token = get_auth_token(client, 'admin3@test.com', 'adminpass')
        colab = create_user('colab_user_2', 'colab2@test.com', 'colabpass', UserRoles.COLLABORATOR)
        lista = Lista(nome='Lista para Atribuição')
        db.session.add(lista)
        db.session.commit()

        response = client.post(f'/api/v1/listas/{lista.id}/assign', 
            headers={'Authorization': f'Bearer {admin_token}'},
            data=json.dumps({'colaborador_ids': [colab.id]}),
            content_type='application/json'
        )
        
        assert response.status_code == 200
        response_data = response.get_json()
        assert len(response_data['colaboradores']) == 1
        assert response_data['colaboradores'][0]['id'] == colab.id
# --- Teste do Dashboard Summary ---

def test_get_dashboard_summary(client, app):
    """Testa o endpoint de resumo do dashboard."""
    with app.app_context():
        create_user('admin_user_4', 'admin4@test.com', 'adminpass', UserRoles.ADMIN)
        admin_token = get_auth_token(client, 'admin4@test.com', 'adminpass')
        # Cria um usuário pendente para o teste
        create_user('pending_user', 'pending@test.com', 'password', UserRoles.COLLABORATOR, aprovado=False)
        db.session.add(Lista(nome="Outra Lista"))
        db.session.commit()

        response = client.get('/api/admin/dashboard-summary', 
            headers={'Authorization': f'Bearer {admin_token}'}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['total_users'] == 2
        assert data['pending_users'] == 1
        assert data['total_lists'] == 1
