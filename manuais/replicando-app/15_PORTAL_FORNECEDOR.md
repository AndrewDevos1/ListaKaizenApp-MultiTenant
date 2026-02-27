# 15 — Portal do Fornecedor

> Módulo separado para fornecedores externos (role SUPPLIER) com login próprio, gestão de itens e histórico de preços. Admins gerenciam convites e aprovações.

---

## Conceito

Fornecedores (role `SUPPLIER`) têm acesso a um portal separado onde podem:
- Gerenciar o catálogo de seus próprios itens
- Atualizar preços (com histórico automático)
- Editar perfil de empresa

Administradores podem:
- Gerar convites para fornecedores se cadastrarem
- Aprovar/rejeitar cadastros manuais
- Visualizar itens e usuários de cada fornecedor
- Criar credenciais para fornecedores

---

## Modelos do Banco

### Fornecedor

```python
class Fornecedor(db.Model):
    __tablename__ = 'fornecedores'

    id                   = db.Column(db.Integer, primary_key=True)
    nome                 = db.Column(db.String(100), nullable=False)
    usuario_id           = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True)
    cnpj                 = db.Column(db.String(18), nullable=True)
    telefone             = db.Column(db.String(20), nullable=True)
    endereco             = db.Column(db.String(400), nullable=True)
    cidade               = db.Column(db.String(100), nullable=True)
    estado               = db.Column(db.String(2), nullable=True)
    cep                  = db.Column(db.String(10), nullable=True)
    site                 = db.Column(db.String(200), nullable=True)
    aprovado             = db.Column(db.Boolean, default=False)
    criado_em            = db.Column(db.DateTime, default=brasilia_now)
    contato              = db.Column(db.String(100), nullable=True)
    meio_envio           = db.Column(db.String(20), nullable=True)
    responsavel          = db.Column(db.String(100), nullable=True)
    observacao           = db.Column(db.String(600), nullable=True)
    restaurante_id       = db.Column(db.Integer, db.ForeignKey('restaurantes.id'), nullable=False, index=True)
    compartilhado_regiao = db.Column(db.Boolean, default=False)

    usuario    = db.relationship('Usuario', backref='fornecedor_vinculado')
    itens      = db.relationship('Item', lazy=True)
    listas     = db.relationship('Lista', secondary='fornecedor_lista', ...)  # M2M
    pedidos    = db.relationship('Pedido', ...)
```

### Item (catálogo do fornecedor)

```python
class Item(db.Model):
    __tablename__ = 'itens'

    id               = db.Column(db.Integer, primary_key=True)
    nome             = db.Column(db.String(100), nullable=False)   # UNIQUE
    codigo_fornecedor = db.Column(db.String(50), nullable=True)
    descricao        = db.Column(db.Text, nullable=True)
    marca            = db.Column(db.String(100), nullable=True)
    unidade_medida   = db.Column(db.String(20), nullable=False)
    preco_atual      = db.Column(db.Numeric(10, 4), nullable=True)
    atualizado_em    = db.Column(db.DateTime)
    fornecedor_id    = db.Column(db.Integer, db.ForeignKey('fornecedores.id'), nullable=False, index=True)
    # Index: idx_fornecedor_nome em (fornecedor_id, nome)
```

### ItemPrecoHistorico (histórico de preços)

```python
class ItemPrecoHistorico(db.Model):
    __tablename__ = 'item_preco_historicos'

    id              = db.Column(db.Integer, primary_key=True)
    item_id         = db.Column(db.Integer, db.ForeignKey('itens.id', ondelete='CASCADE'), nullable=False, index=True)
    preco_anterior  = db.Column(db.Numeric(10, 4), nullable=True)
    preco_novo      = db.Column(db.Numeric(10, 4), nullable=False)
    alterado_em     = db.Column(db.DateTime, default=brasilia_now, nullable=False)
    alterado_por_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True)
    observacao      = db.Column(db.String(200), nullable=True)
```

### ConviteFornecedor (token de convite)

```python
class ConviteFornecedor(db.Model):
    __tablename__ = 'convites_fornecedor'

    id                = db.Column(db.Integer, primary_key=True)
    token             = db.Column(db.String(64), unique=True, index=True)
    criado_por_id     = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True)
    criado_em         = db.Column(db.DateTime, default=brasilia_now)
    usado             = db.Column(db.Boolean, default=False)
    usado_em          = db.Column(db.DateTime, nullable=True)
    usado_por_id      = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True)
    fornecedor_id     = db.Column(db.Integer, db.ForeignKey('fornecedores.id', ondelete='SET NULL'), nullable=True)
    expira_em         = db.Column(db.DateTime, nullable=True)
    ativo             = db.Column(db.Boolean, default=True)
    limite_usos       = db.Column(db.Integer, default=1)
    quantidade_usos   = db.Column(db.Integer, default=0)

    # Métodos:
    # esta_valido() → not usado, not expired, ativo, quantidade_usos < limite_usos
    # usos_restantes → max(0, limite_usos - quantidade_usos)
```

---

## Roles e Autenticação

**Role SUPPLIER** é um dos 4 roles do sistema:
- `SUPER_ADMIN`, `ADMIN`, `COLLABORATOR`, `SUPPLIER`

**Decorator `@supplier_required()`** (controllers.py):
- Valida JWT presente
- Valida `user.role === SUPPLIER`
- Valida `user.ativo === True`
- Valida `fornecedor.aprovado === True`
- Retorna 403 se qualquer check falhar

**JWT Claims do Fornecedor:**
```json
{
  "identity": "user_id",
  "role": "SUPPLIER",
  "nome": "nome_fornecedor",
  "email": "email",
  "restaurante_id": "id_restaurante",
  "session_token": "uuid",
  "wizard_status": {}
}
```

---

## Fluxos de Cadastro

### Fluxo 1: Via Convite (Recomendado)

```
1. Admin cria convite via POST /admin/convites-fornecedor
2. Admin compartilha link com fornecedor
3. Fornecedor acessa /supplier/register-convite?token=<TOKEN>
4. Frontend valida token: GET /auth/validar-convite-fornecedor?token=<TOKEN>
5. Fornecedor preenche formulário (nome, email, senha, dados empresa)
6. POST /auth/register-fornecedor-com-convite
7. Usuario criado (role=SUPPLIER, aprovado=True)
8. Fornecedor criado (aprovado=True, compartilhado_regiao=True)
9. JWT retornado → auto-login → redireciona para /supplier/dashboard
```

### Fluxo 2: Auto-cadastro

```
1. Fornecedor acessa /supplier/register (página pública)
2. Preenche formulário
3. POST /auth/register-fornecedor
4. Usuario criado (aprovado=False)
5. Fornecedor criado (aprovado=False)
6. Mensagem: "Aguardando aprovação do administrador"
```

### Fluxo 3: Criar Login pelo Admin

```
1. Admin acessa /admin/fornecedores-cadastrados
2. Clica "Criar Login" em um fornecedor sem usuário
3. Admin informa email e senha
4. POST /admin/fornecedores/:id/login
5. Usuario criado (role=SUPPLIER, aprovado=True)
6. fornecedor.usuario_id atualizado
7. Credenciais exibidas para cópia/WhatsApp
```

---

## Endpoints do Portal Fornecedor

**Base:** `/api/supplier` — protegido por `@supplier_required()`

### Perfil

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/supplier/perfil` | Obter perfil com dados de usuário e empresa |
| PUT | `/api/supplier/perfil` | Atualizar nome, email, empresa, contato, endereço, etc. |

**Resposta GET:**
```json
{
  "id": 5,
  "nome": "Hortifruti XYZ",
  "telefone": "(11) 99999-9999",
  "cnpj": "12.345.678/0001-90",
  "endereco": "Rua das Frutas, 100",
  "cidade": "São Paulo",
  "estado": "SP",
  "cep": "01001-000",
  "site": "https://hortifrutixyz.com",
  "contato": "Maria Silva",
  "meio_envio": "entrega",
  "responsavel": "João Costa",
  "observacao": "Entrega às terças e quintas",
  "usuario": { "id": 10, "nome": "Maria", "email": "maria@xyz.com", "aprovado": true }
}
```

### Itens

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/supplier/itens` | Listar todos os itens do fornecedor |
| POST | `/api/supplier/itens` | Criar novo item |
| GET | `/api/supplier/itens/<id>` | Detalhe (valida pertencimento) |
| PUT | `/api/supplier/itens/<id>` | Atualizar item (rastreia mudança de preço) |
| DELETE | `/api/supplier/itens/<id>` | Deletar (403 se em uso em estoque/cotação) |

**Payload POST/PUT:**
```json
{
  "nome": "Cebola Roxa",
  "codigo_fornecedor": "CEB-001",
  "descricao": "Cebola roxa tipo A",
  "marca": "Hortifruti",
  "unidade_medida": "kg",
  "preco_atual": 4.50
}
```

**Validações:**
- `nome` e `unidade_medida` são obrigatórios
- Unicidade: nome único por fornecedor (case-insensitive)
- Unicidade: codigo_fornecedor único por fornecedor
- Preço deve ser não-negativo

**Mudança de preço:** Quando `preco_atual` muda, cria `ItemPrecoHistorico` automaticamente.

**Delete:** Retorna 409 se item está em `Estoque` ou `CotacaoItem`.

### Histórico de Preços

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/supplier/itens/<id>/historico-precos` | Histórico cronológico (desc) |

---

## Endpoints Admin para Gestão de Fornecedores

### Convites (SUPER_ADMIN)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/admin/convites-fornecedor` | Criar convite (`{limite_usos: 1-100}`) |
| GET | `/api/admin/convites-fornecedor` | Listar convites |
| PUT | `/api/admin/convites-fornecedor/<id>` | Editar (limite_usos, ativo) |
| DELETE | `/api/admin/convites-fornecedor/<id>` | Deletar |

### Aprovação e Gestão

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/admin/fornecedores-cadastrados` | Listar fornecedores (`?aprovado=true|false`) |
| GET | `/api/admin/fornecedores/<id>` | Detalhe |
| PUT | `/api/admin/fornecedores/<id>` | Editar dados |
| PUT | `/api/admin/fornecedores/<id>/aprovar` | Aprovar/rejeitar (`{aprovado: bool}`) |
| DELETE | `/api/admin/fornecedores/<id>` | Deletar |
| GET | `/api/admin/fornecedores/<id>/usuarios` | Ver usuários do fornecedor |
| GET | `/api/admin/fornecedores/<id>/itens` | Ver itens |
| POST | `/api/admin/fornecedores/<id>/login` | Criar login (`{email, senha, nome?}`) |

### Endpoints de Autenticação Pública

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/auth/validar-convite-fornecedor?token=X` | Validar token |
| POST | `/api/auth/register-fornecedor-com-convite` | Cadastro via convite |
| POST | `/api/auth/register-fornecedor` | Auto-cadastro |

---

## Rotas do Frontend

```
/supplier/login                     → SupplierLogin (wrapper do Login genérico)
/supplier/register                  → SupplierRegister (auto-cadastro)
/supplier/register-convite          → SupplierRegisterConvite (com token)
/supplier/dashboard                 → SupplierDashboard
/supplier/perfil                    → SupplierProfile
/supplier/itens                     → SupplierItems
/supplier/itens/novo                → SupplierItemForm (mode="create")
/supplier/itens/:id/editar          → SupplierItemForm (mode="edit")
/supplier/itens/:id/historico       → SupplierItemPriceHistory
```

**Proteção:** `SupplierRoute.tsx` verifica `isAuthenticated && user.role === 'SUPPLIER'`, redireciona para `/supplier/login` caso contrário.

---

## Telas do Frontend

### SupplierDashboard.tsx
- Card único: "Total de Itens" (count)
- Dados: `getSupplierItems()` count

### SupplierItems.tsx
- Tabela: Nome | Marca | Unidade | Preço | Ações
- Ações: Editar → `/supplier/itens/:id/editar` | Histórico → `/supplier/itens/:id/historico` | Deletar (com confirmação)

### SupplierItemForm.tsx (mode: 'create' | 'edit')
- Campos: Nome (req), Código, Descrição, Marca, Unidade (req), Preço
- Redirect em sucesso: `/supplier/itens`

### SupplierItemPriceHistory.tsx
- Tabela: Alterado em | Preço Anterior | Preço Novo | Observação
- Somente leitura

### SupplierProfile.tsx
- Formulário em seções: Pessoal | Empresa | Contato | Localização | Web | Notas
- Edição completa com feedback de sucesso/erro

### SupplierRegisterConvite.tsx
- Valida token na montagem (`GET /auth/validar-convite-fornecedor`)
- Exibe "Validando convite..." durante validação
- Formulário aparece apenas se token válido
- Sucesso → armazena JWT → redireciona para `/supplier/dashboard`

### GerenciarConvitesFornecedor.tsx (Admin)
- Painel de criação: input limite_usos, botão "Gerar Convite"
- Link gerado com: copiar, compartilhar WhatsApp
- Tabela de convites: Fornecedor | Criado em | Expira | Usos | Status | Ações
- Ações: editar, deletar, pausar/retomar, copiar, WhatsApp

### GerenciarFornecedoresCadastrados.tsx (Admin)
- Tabela: Nome | Status | Telefone | CNPJ | Email | Ações
- Ações por fornecedor:
  - Aprovar/Rejeitar (badge clicável)
  - Editar (modal com máscaras de input: telefone, CNPJ, CEP)
  - Gerenciar Credenciais (email + senha em texto puro, copiar, WhatsApp)
  - Ver Usuários (modal)
  - Criar Login (modal: email + senha)
  - Deletar (com confirmação)

---

## Validação de Dados

### Cadastro de Fornecedor (`_validar_dados_cadastro_fornecedor`)
- Obrigatórios: nome, email, senha, nome_empresa, telefone
- Formato: email válido, senha >= 6 chars
- Unicidade: email não cadastrado

### Item (`_validar_dados_item`)
- Obrigatórios: nome, unidade_medida
- Unicidade: nome (case-insensitive), código por fornecedor
- Preço: >= 0

### Máscaras no Frontend
- Telefone: `(XX) XXXXX-XXXX`
- CNPJ: `XX.XXX.XXX/XXXX-XX`
- CEP: `XXXXX-XXX`

---

## Auditoria

Todas as operações do fornecedor criam registros `AppLog`:
- Criar item: `acao="create"`, `entidade="fornecedor"`, `meta={item_id, item_nome}`
- Atualizar item: `acao="update"`, `meta={preco_anterior, preco_novo}`
- Deletar item: `acao="delete"`, `meta={item_nome}`
- Atualizar perfil: `acao="update"`, `meta={mudancas: {campo: {anterior, novo}}}`
- Aprovar: `acao="approve"`, `mensagem="Fornecedor aprovado"`

---

## Relacionamentos com Outros Módulos

- **Cotações:** Itens do fornecedor são referenciados em `CotacaoItem`; não pode deletar item em uso
- **Estoque:** Itens vinculados a registros `Estoque`; não pode deletar item em uso
- **Listas:** Fornecedor pode ser vinculado a listas via M2M `fornecedor_lista`
- **Pedidos:** Pedidos referenciam fornecedor via item

---

## Resumo de Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `backend/kaizen_app/models.py` | Fornecedor, Item, ItemPrecoHistorico, ConviteFornecedor |
| `backend/kaizen_app/services.py` | `register_fornecedor_com_convite`, `register_fornecedor_auto`, `criar_login_fornecedor` |
| `backend/kaizen_app/controllers.py` | Blueprints supplier_bp e admin_bp para fornecedores |
| `frontend/src/features/supplier/` | Todas as telas do portal |
| `frontend/src/features/admin/GerenciarConvitesFornecedor.tsx` | Gestão de convites |
| `frontend/src/features/admin/GerenciarFornecedoresCadastrados.tsx` | Gestão de fornecedores |
