# 🧪 Guia de Testes - Kaizen Lists

## 📋 Índice

- [Estrutura de Testes](#estrutura-de-testes)
- [Como Executar](#como-executar)
- [Tipos de Testes](#tipos-de-testes)
- [Cobertura](#cobertura)
- [Fixtures Disponíveis](#fixtures-disponíveis)
- [Convenções](#convenções)

---

## 🏗️ Estrutura de Testes

```
backend/tests/
├── __init__.py                 # Inicialização do pacote de testes
├── conftest.py                 # Fixtures principais e configuração pytest
├── fixtures.py                 # Fixtures adicionais e helpers
├── test_models.py              # Testes dos modelos (camada de dados)
├── test_repositories.py        # Testes dos repositórios (acesso ao banco)
├── test_services.py            # Testes da camada de serviços (lógica de negócio)
├── test_routes.py              # Testes de integração (rotas da API)
├── test_auth.py                # Testes de autenticação
└── test_admin_features.py      # Testes de funcionalidades admin
```

---

## 🚀 Como Executar

### Executar todos os testes

```bash
# Da raiz do projeto
pytest backend/tests/

# Ou do diretório backend
cd backend
pytest tests/
```

### Executar arquivo específico

```bash
pytest backend/tests/test_models.py
pytest backend/tests/test_services.py -v  # verbose
```

### Executar teste específico

```bash
pytest backend/tests/test_models.py::TestUsuarioModel::test_criar_usuario
```

### Com cobertura de código

```bash
pytest backend/tests/ --cov=backend/kaizen_app --cov-report=html
```

Relatório HTML será gerado em `htmlcov/index.html`

### Modos úteis

```bash
# Parar no primeiro erro
pytest backend/tests/ -x

# Mostrar prints
pytest backend/tests/ -s

# Ver quais testes seriam executados
pytest backend/tests/ --collect-only

# Executar apenas testes que falharam anteriormente
pytest backend/tests/ --lf
```

---

## 📦 Tipos de Testes

### 1️⃣ **Testes de Modelos** (`test_models.py`)

Testam a camada de dados isoladamente:
- Criação de objetos
- Validações de campos
- Métodos dos modelos (ex: `calcular_pedido()`)
- Serialização (`to_dict()`)
- Relacionamentos entre modelos

**Exemplo:**
```python
def test_usuario_to_dict_nao_expoe_senha(self, app):
    usuario = Usuario(...)
    user_dict = usuario.to_dict()
    assert 'senha_hash' not in user_dict
```

### 2️⃣ **Testes de Repositórios** (`test_repositories.py`)

Testam operações de acesso ao banco:
- CRUD completo (Create, Read, Update, Delete)
- Buscas e filtros
- Queries customizadas
- Transações

**Exemplo:**
```python
def test_buscar_usuario_por_email(self, app):
    create_user('Test', 'test@example.com', ...)
    user = repositories.buscar_usuario_por_email('test@example.com')
    assert user is not None
```

### 3️⃣ **Testes de Serviços** (`test_services.py`)

Testam a lógica de negócio:
- Regras de negócio
- Validações complexas
- Cálculos
- Fluxos de trabalho

**Exemplo:**
```python
def test_registrar_usuario_colaborador_sucesso(self, app):
    response, status = services.register_user(data)
    assert status == 201
    assert user.role == UserRoles.COLLABORATOR
```

### 4️⃣ **Testes de Rotas** (`test_routes.py`)

Testam a API completa (integração):
- Requisições HTTP
- Autenticação JWT
- Autorização (roles)
- Status codes
- Respostas JSON

**Exemplo:**
```python
def test_login_endpoint_sucesso(self, client, app):
    response = client.post('/api/auth/login', ...)
    assert response.status_code == 200
    assert 'access_token' in response.get_json()
```

---

## 📊 Cobertura

### Objetivos de Cobertura

| Camada | Cobertura Mínima | Cobertura Ideal |
|--------|------------------|-----------------|
| Models | 80% | 95% |
| Repositories | 75% | 90% |
| Services | 85% | 95% |
| Controllers/Routes | 70% | 85% |
| **TOTAL** | **75%** | **90%** |

### Verificar Cobertura Atual

```bash
pytest backend/tests/ --cov=backend/kaizen_app --cov-report=term-missing
```

---

## 🧰 Fixtures Disponíveis

### Fixtures Principais (`conftest.py`)

#### `app`
Cria instância da aplicação Flask para testes.
```python
def test_exemplo(app):
    with app.app_context():
        # seu teste aqui
```

#### `client`
Cliente HTTP para fazer requisições de teste.
```python
def test_endpoint(client):
    response = client.get('/api/v1/items')
```

#### `create_user(nome, email, senha, role, aprovado=True)`
Helper para criar usuários rapidamente.
```python
with app.app_context():
    user = create_user('Admin', 'admin@test.com', 'senha', UserRoles.ADMIN)
```

#### `get_auth_token(client, email, senha)`
Obtém token JWT para testes autenticados.
```python
token = get_auth_token(client, 'admin@test.com', 'senha')
response = client.get('/api/admin/users', 
    headers={'Authorization': f'Bearer {token}'})
```

### Fixtures Adicionais (`fixtures.py`)

- `admin_user` - Usuário admin pré-criado
- `colaborador_user` - Usuário colaborador pré-criado
- `fornecedor_padrao` - Fornecedor de teste
- `area_padrao` - Área de teste
- `item_padrao` - Item de teste
- `estoque_com_deficit` - Estoque abaixo do mínimo
- `estoque_sem_deficit` - Estoque acima do mínimo
- `lista_com_itens` - Lista com múltiplos itens
- `usuarios_multiplos` - 3 usuários para testes
- `setup_completo_estoque` - Setup completo (fornecedor + área + item + estoque)

**Uso:**
```python
def test_exemplo(app, admin_user, fornecedor_padrao):
    # admin_user e fornecedor_padrao já estão criados!
    with app.app_context():
        assert admin_user.role == UserRoles.ADMIN
```

---

## 📏 Convenções

### Nomenclatura

✅ **BOM:**
```python
def test_criar_usuario_sucesso(self, app):
def test_login_credenciais_invalidas(self, client):
def test_estoque_calcular_pedido_com_deficit(self, app):
```

❌ **RUIM:**
```python
def test_1(self):  # Sem contexto
def test_user(self):  # Ambíguo
def testCreateUser(self):  # CamelCase não é padrão Python
```

### Organização em Classes

Agrupe testes relacionados em classes:
```python
class TestUsuarioModel:
    def test_criar_usuario(self, app):
        ...
    
    def test_usuario_to_dict(self, app):
        ...

class TestAuthRoutes:
    def test_login_sucesso(self, client, app):
        ...
```

### Assertions Claras

✅ **BOM:**
```python
assert response.status_code == 200, "Login deveria retornar 200 OK"
assert 'access_token' in data, "Token JWT não encontrado na resposta"
assert user.aprovado is True, "Usuário deveria estar aprovado"
```

❌ **RUIM:**
```python
assert response.status_code  # Sem verificação do valor
assert data  # Muito vago
```

### AAA Pattern (Arrange-Act-Assert)

```python
def test_criar_item(self, app):
    # ARRANGE - Preparação
    with app.app_context():
        fornecedor = Fornecedor(nome="Test")
        db.session.add(fornecedor)
        db.session.flush()
    
    # ACT - Ação
    item = Item(nome="Arroz", unidade_medida="kg", fornecedor_id=fornecedor.id)
    db.session.add(item)
    db.session.commit()
    
    # ASSERT - Verificação
    assert item.id is not None
    assert item.nome == "Arroz"
```

---

## 🔧 Configuração Pytest

Configuração no `pytest.ini`:
```ini
[pytest]
testpaths = backend/tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = 
    -v
    --tb=short
    --strict-markers
markers =
    slow: marks tests as slow
    integration: marks tests as integration tests
    unit: marks tests as unit tests
```

---

## 🐛 Debugging

### Ver output detalhado

```bash
pytest backend/tests/ -vv -s
```

### Usar breakpoint

```python
def test_exemplo(app):
    with app.app_context():
        user = Usuario(...)
        breakpoint()  # Pausa aqui
        assert user.nome == "Test"
```

### Ver queries SQL

```python
def test_exemplo(app):
    with app.app_context():
        import logging
        logging.basicConfig()
        logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
        # seu teste aqui
```

---

## 📝 Checklist para Novos Testes

Ao adicionar funcionalidade nova, certifique-se de:

- [ ] Criar teste unitário do modelo
- [ ] Criar teste do repositório (se houver nova query)
- [ ] Criar teste do serviço (lógica de negócio)
- [ ] Criar teste da rota (endpoint)
- [ ] Testar casos de sucesso
- [ ] Testar casos de erro/validação
- [ ] Testar permissões (admin vs colaborador)
- [ ] Testar edge cases (valores nulos, vazios, etc)
- [ ] Verificar cobertura (`--cov`)

---

## 🎓 Exemplos Práticos

### Teste Completo de Feature

```python
class TestCriarItem:
    """Suite completa de testes para criação de item"""
    
    def test_criar_item_sucesso(self, app, fornecedor_padrao):
        """Happy path: criação bem-sucedida"""
        with app.app_context():
            item = Item(nome="Arroz", unidade_medida="kg", 
                       fornecedor_id=fornecedor_padrao.id)
            db.session.add(item)
            db.session.commit()
            assert item.id is not None
    
    def test_criar_item_nome_duplicado(self, app, fornecedor_padrao):
        """Edge case: nome duplicado deve falhar"""
        with app.app_context():
            Item(nome="Arroz", ...).save()
            
            with pytest.raises(IntegrityError):
                Item(nome="Arroz", ...).save()
    
    def test_criar_item_sem_fornecedor(self, app):
        """Validação: item requer fornecedor"""
        with app.app_context():
            with pytest.raises(IntegrityError):
                Item(nome="Arroz", unidade_medida="kg").save()
```

---

## 📚 Recursos Adicionais

- [Pytest Documentation](https://docs.pytest.org/)
- [Flask Testing](https://flask.palletsprojects.com/en/2.3.x/testing/)
- [SQLAlchemy Testing](https://docs.sqlalchemy.org/en/20/orm/session_transaction.html)

---

**Última atualização:** Dezembro 2024  
**Autor:** Time Kaizen Lists
