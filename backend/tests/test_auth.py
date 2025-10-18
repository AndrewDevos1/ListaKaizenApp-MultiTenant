import json

def test_registration(client):
    """Testa o registro de um novo usuário."""
    response = client.post('/api/auth/register', data=json.dumps({
        'nome': 'testuser',
        'email': 'test@example.com',
        'senha': 'password'
    }), content_type='application/json')
    assert response.status_code == 201
    assert b'Solicita\u00e7\u00e3o de cadastro enviada com sucesso' in response.data

def test_login(client):
    """Testa o login de um usuário. Depende que o usuário de teste já exista."""
    # Primeiro, precisamos aprovar o usuário. Como não temos um endpoint para isso ainda
    # nos testes, vamos pular a aprovação por enquanto e esperar um 403.
    # (Este é um exemplo de como os testes nos mostram onde precisamos de mais funcionalidades)
    
    # Tentativa de login com usuário não aprovado
    response = client.post('/api/auth/login', data=json.dumps({
        'email': 'test@example.com',
        'senha': 'password'
    }), content_type='application/json')
    assert response.status_code == 403
    assert b'Usu\u00e1rio pendente de aprova\u00e7\u00e3o' in response.data

    # TODO: Adicionar um teste para o login bem-sucedido após a aprovação do usuário.
