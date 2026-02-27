import json

from kaizen_app import db
from kaizen_app.models import Restaurante, UserRoles
from .conftest import create_user, get_auth_token


def test_isolamento_listas_por_restaurante(client, app):
    """Admin nao deve ver nem deletar listas de outro restaurante."""
    with app.app_context():
        rest1 = Restaurante(nome='Restaurante Um', slug='rest-um', ativo=True)
        rest2 = Restaurante(nome='Restaurante Dois', slug='rest-dois', ativo=True)
        db.session.add_all([rest1, rest2])
        db.session.commit()

        create_user('Admin R1', 'admin1@example.com', 'senha123', UserRoles.ADMIN, aprovado=True, restaurante_id=rest1.id)
        create_user('Admin R2', 'admin2@example.com', 'senha123', UserRoles.ADMIN, aprovado=True, restaurante_id=rest2.id)

    token_r1 = get_auth_token(client, 'admin1@example.com', 'senha123')
    resp = client.post(
        '/api/v1/listas',
        headers={'Authorization': f'Bearer {token_r1}'},
        data=json.dumps({'nome': 'Lista R1'}),
        content_type='application/json'
    )
    assert resp.status_code == 201
    lista_id = resp.get_json()['id']

    token_r2 = get_auth_token(client, 'admin2@example.com', 'senha123')
    resp = client.get(
        '/api/v1/listas',
        headers={'Authorization': f'Bearer {token_r2}'}
    )
    assert resp.status_code == 200
    listas = resp.get_json()
    nomes = [l['nome'] for l in listas]
    assert 'Lista R1' not in nomes

    resp = client.delete(
        f'/api/v1/listas/{lista_id}',
        headers={'Authorization': f'Bearer {token_r2}'}
    )
    assert resp.status_code == 404
