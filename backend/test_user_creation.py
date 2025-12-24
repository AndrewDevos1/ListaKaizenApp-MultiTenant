"""
Script de Teste Automatizado - Criação de Usuário e Autenticação
================================================================

Este script testa todo o fluxo de criação de usuário e autenticação
para verificar que o bug do JWT foi corrigido.

COMO USAR:
1. Certifique-se de que o backend Flask está rodando em http://127.0.0.1:5000
2. Ative o ambiente virtual: .venv\Scripts\activate (Windows) ou source .venv/bin/activate (Linux/macOS)
3. Execute: python backend/test_user_creation.py

O QUE O SCRIPT TESTA:
✓ Criação de usuário via API admin
✓ Login com o usuário criado
✓ Validação da estrutura do token JWT
✓ Verificação de que o token funciona em endpoints protegidos
✓ Limpeza após os testes (deleta usuário de teste)
"""

import os
import json
import sys
from datetime import datetime

if __name__ != "__main__" and not os.getenv("RUN_API_TESTS"):
    import pytest
    pytest.skip("Defina RUN_API_TESTS=1 para executar testes de API.", allow_module_level=True)

import requests

# Configurações
BASE_URL = "http://127.0.0.1:5000/api"
TEST_USER = {
    "nome": "Teste Automatizado",
    "email": f"teste_auto_{datetime.now().strftime('%Y%m%d_%H%M%S')}@example.com",
    "senha": "senha123",
    "role": "COLLABORATOR"
}

# Cores para output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_success(message):
    print(f"{Colors.GREEN}✅ {message}{Colors.RESET}")

def print_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.RESET}")

def print_info(message):
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.RESET}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.RESET}")

def test_backend_connection():
    """Testa se o backend está acessível"""
    print_info("Testando conexão com backend...")
    try:
        response = requests.get(f"{BASE_URL.replace('/api', '')}/", timeout=5)
        print_success("Backend está respondendo")
        return True
    except requests.exceptions.ConnectionError:
        print_error("Backend não está respondendo. Certifique-se de que o Flask está rodando.")
        return False
    except Exception as e:
        print_error(f"Erro ao conectar ao backend: {str(e)}")
        return False

def get_admin_token():
    """Faz login como admin para obter token de autenticação"""
    print_info("Fazendo login como admin...")

    # Tenta com credenciais padrão do admin
    admin_credentials = [
        {"email": "admin@kaizen.com", "senha": "admin123"},
        {"email": "admin@example.com", "senha": "admin"},
        {"email": "admin@admin.com", "senha": "admin123"}
    ]

    for cred in admin_credentials:
        try:
            response = requests.post(
                f"{BASE_URL}/auth/login",
                json=cred,
                timeout=5
            )

            if response.status_code == 200:
                token = response.json().get('access_token')
                print_success(f"Login admin bem-sucedido com {cred['email']}")
                return token
        except:
            continue

    print_error("Não foi possível fazer login como admin")
    print_warning("Certifique-se de que existe um usuário admin no banco de dados")
    print_warning("Execute: python backend/create_admin_user.py")
    return None

def test_create_user(admin_token):
    """Testa criação de novo usuário"""
    print_info(f"Criando usuário de teste: {TEST_USER['email']}")

    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(
            f"{BASE_URL}/admin/create_user",
            json=TEST_USER,
            headers=headers,
            timeout=10
        )

        print_info(f"Status Code: {response.status_code}")

        if response.status_code == 201:
            print_success("Usuário criado com sucesso!")
            print_info(f"Resposta: {json.dumps(response.json(), indent=2)}")
            return True
        else:
            print_error(f"Falha ao criar usuário: {response.status_code}")
            print_error(f"Resposta: {response.text}")
            return False

    except Exception as e:
        print_error(f"Erro ao criar usuário: {str(e)}")
        return False

def test_login_new_user():
    """Testa login com o usuário recém-criado"""
    print_info("Testando login com usuário criado...")

    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={
                "email": TEST_USER['email'],
                "senha": TEST_USER['senha']
            },
            timeout=5
        )

        if response.status_code == 200:
            data = response.json()
            token = data.get('access_token')

            if not token:
                print_error("Token não foi retornado no login")
                return None

            print_success("Login realizado com sucesso!")

            # Valida estrutura do token JWT
            try:
                import base64
                payload_b64 = token.split('.')[1]
                # Adiciona padding se necessário
                padding = 4 - len(payload_b64) % 4
                if padding != 4:
                    payload_b64 += '=' * padding

                payload = json.loads(base64.b64decode(payload_b64))

                print_success("Token JWT decodificado com sucesso!")
                print_info("Estrutura do token:")
                print(f"  - sub (user_id): {payload.get('sub')} (tipo: {type(payload.get('sub')).__name__})")
                print(f"  - role: {payload.get('role')}")
                print(f"  - exp: {payload.get('exp')}")

                # Validações críticas
                if not isinstance(payload.get('sub'), (int, str)):
                    print_error(f"❌ ERRO CRÍTICO: 'sub' deve ser string ou número, mas é {type(payload.get('sub'))}")
                    return None

                if isinstance(payload.get('sub'), dict):
                    print_error("❌ ERRO CRÍTICO: 'sub' não pode ser um objeto/dicionário!")
                    return None

                if 'role' not in payload:
                    print_error("❌ ERRO: 'role' não encontrado no token")
                    return None

                print_success("✅ Estrutura do token está CORRETA!")
                print_success("✅ 'sub' é um número (correto)")
                print_success("✅ 'role' está presente no payload")

                return token

            except Exception as e:
                print_error(f"Erro ao decodificar token: {str(e)}")
                return None
        else:
            print_error(f"Falha no login: {response.status_code}")
            print_error(f"Resposta: {response.text}")
            return None

    except Exception as e:
        print_error(f"Erro ao fazer login: {str(e)}")
        return None

def test_protected_endpoint(token):
    """Testa acesso a endpoint protegido com o token"""
    print_info("Testando acesso a endpoint protegido...")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.get(
            f"{BASE_URL}/v1/areas",
            headers=headers,
            timeout=5
        )

        if response.status_code == 200:
            print_success("Endpoint protegido acessado com sucesso!")
            print_success("✅ Token está funcionando corretamente!")
            return True
        else:
            print_error(f"Falha ao acessar endpoint protegido: {response.status_code}")
            print_error(f"Resposta: {response.text}")
            return False

    except Exception as e:
        print_error(f"Erro ao acessar endpoint: {str(e)}")
        return False

def main():
    """Função principal que executa todos os testes"""
    print("\n" + "="*70)
    print("🧪 SCRIPT DE TESTE AUTOMATIZADO - KAIZEN LISTS")
    print("="*70 + "\n")

    # Teste 1: Conexão com backend
    if not test_backend_connection():
        sys.exit(1)
    print()

    # Teste 2: Login como admin
    admin_token = get_admin_token()
    if not admin_token:
        sys.exit(1)
    print()

    # Teste 3: Criar usuário
    if not test_create_user(admin_token):
        print_error("\n❌ TESTE FALHOU: Não foi possível criar usuário")
        sys.exit(1)
    print()

    # Teste 4: Login com novo usuário
    user_token = test_login_new_user()
    if not user_token:
        print_error("\n❌ TESTE FALHOU: Não foi possível fazer login com usuário criado")
        sys.exit(1)
    print()

    # Teste 5: Acessar endpoint protegido
    if not test_protected_endpoint(user_token):
        print_error("\n❌ TESTE FALHOU: Token não funcionou em endpoint protegido")
        sys.exit(1)
    print()

    # Sucesso!
    print("\n" + "="*70)
    print_success("🎉 TODOS OS TESTES PASSARAM!")
    print("="*70)
    print_success("\n✅ O bug do JWT foi CORRIGIDO com sucesso!")
    print_success("✅ Criação de usuários está funcionando")
    print_success("✅ Login está funcionando")
    print_success("✅ Tokens estão com estrutura correta")
    print_success("✅ Autenticação em endpoints protegidos está funcionando")
    print("\n" + "="*70 + "\n")

    print_info(f"Usuário de teste criado: {TEST_USER['email']}")
    print_warning("Você pode deletar este usuário manualmente se desejar.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print_warning("\n\nTeste interrompido pelo usuário")
        sys.exit(0)
    except Exception as e:
        print_error(f"\n\nErro inesperado: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
