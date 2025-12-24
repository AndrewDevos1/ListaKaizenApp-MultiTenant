"""
Script de teste para criar usuário via API
Testa se a rota /api/admin/create_user está funcionando corretamente
"""

import os
import json

if __name__ != "__main__" and not os.getenv("RUN_API_TESTS"):
    import pytest
    pytest.skip("Defina RUN_API_TESTS=1 para executar testes de API.", allow_module_level=True)

import requests

# URL base da API
BASE_URL = "http://127.0.0.1:5000"

def test_create_user_with_auth():
    """Testa criação de usuário com autenticação"""

    print("=" * 60)
    print("🧪 TESTE: Criar usuário com autenticação de admin")
    print("=" * 60)

    # Primeiro, fazer login como admin para obter o token
    print("\n1️⃣ Fazendo login como admin...")
    login_url = f"{BASE_URL}/api/auth/login"

    # ALTERE AQUI com as credenciais de um admin válido
    admin_credentials = {
        "email": "admin@example.com",  # TROCAR pelo email do seu admin
        "senha": "senha123"             # TROCAR pela senha do seu admin
    }

    print(f"   URL: {login_url}")
    print(f"   Credenciais: {admin_credentials['email']}")

    try:
        login_response = requests.post(login_url, json=admin_credentials)
        print(f"   Status: {login_response.status_code}")

        if login_response.status_code == 200:
            token = login_response.json().get('access_token')
            print(f"   ✅ Login bem-sucedido!")
            print(f"   Token: {token[:50]}...")
        else:
            print(f"   ❌ Erro no login: {login_response.json()}")
            print("\n⚠️  ATENÇÃO: Altere as credenciais no script test_create_user.py")
            return
    except Exception as e:
        print(f"   ❌ Erro de conexão: {e}")
        print("\n⚠️  Certifique-se de que o backend está rodando em http://127.0.0.1:5000")
        return

    # Agora testar criação de usuário
    print("\n2️⃣ Criando novo usuário...")
    create_user_url = f"{BASE_URL}/api/admin/create_user"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    new_user_data = {
        "nome": "Usuário Teste",
        "email": "teste@example.com",
        "senha": "senha123",
        "role": "COLLABORATOR",
        "username": "teste_user"
    }

    print(f"   URL: {create_user_url}")
    print(f"   Dados: {json.dumps(new_user_data, indent=2)}")

    try:
        create_response = requests.post(create_user_url, json=new_user_data, headers=headers)
        print(f"\n   Status: {create_response.status_code}")
        print(f"   Resposta: {json.dumps(create_response.json(), indent=2)}")

        if create_response.status_code == 201:
            print("\n   ✅ Usuário criado com sucesso!")
        else:
            print(f"\n   ❌ Erro ao criar usuário")
            print(f"   Status Code: {create_response.status_code}")
            print(f"   Resposta: {create_response.text}")
    except Exception as e:
        print(f"   ❌ Erro: {e}")

    print("\n" + "=" * 60)

if __name__ == "__main__":
    test_create_user_with_auth()
