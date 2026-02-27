# Plano de Implementação: Sistema de Fornecedores Autônomos

## Visão Geral

Implementar sistema onde fornecedores podem se cadastrar, fazer login, e gerenciar seus próprios produtos. Produtos ficam disponíveis como "fornecedores regionais" para restaurantes que usam o sistema.

## Requisitos do Usuário

1. **Cadastro de Fornecedores**: Auto-registro + convite por link
2. **Autenticação**: Login próprio para fornecedores
3. **Gerenciamento de Produtos**: Fornecedores criam/editam/deletam seus itens
4. **Dados do Estabelecimento**: CNPJ, telefone, endereço, etc.
5. **Catálogo de Itens**: Código, nome, descrição, marca, unidade, preço
6. **Fornecedores Regionais**: Produtos disponíveis para todos restaurantes
7. **Aprovação**: Super admin aprova fornecedores auto-cadastrados

## Decisões Arquiteturais

### 1. Sistema de Autenticação
**Decisão**: Adicionar role `SUPPLIER` ao enum `UserRoles` existente

**Justificativa**:
- Reusa 100% da infraestrutura JWT, login, session management
- Menos código duplicado = menos bugs
- Manutenção simplificada
- Usuario.restaurante_id já é nullable (suporta SUPER_ADMIN)
- Padrão natural para multi-tenant com diferentes roles

**Alternativas descartadas**:
- Sistema de auth separado (duplicaria código)
- Modelo UsuarioFornecedor independente (complexidade desnecessária)

### 2. Fluxos de Cadastro
**Decisão**: Implementar AMBOS - convite + auto-cadastro

- **Com convite**: Super admin gera link → fornecedor preenche form → aprovação automática → login imediato
- **Auto-cadastro**: Fornecedor se registra → aguarda aprovação manual → super admin aprova → login

### 3. Vínculo com Restaurante
**Decisão**: Criar restaurante fictício "Fornecedores Regionais" (id a ser definido)

- Todos fornecedores auto-cadastrados: `restaurante_id = <id_regional>`
- Mantém integridade referencial (NOT NULL mantido)
- Menos invasivo que tornar campo nullable

**Ação**: Criar restaurante "Regional" antes de executar migrações (via script ou manualmente)

### 4. Visibilidade de Preços
**Decisão**: Preços VISÍVEIS para todos colaboradores

- Campo `preco_atual` incluído em resposta de API
- Transparência total no catálogo de fornecedores regionais

### 5. Exclusão de Itens em Uso
**Decisão**: BLOQUEAR delete (retornar erro 409)

- Validar uso em Estoque, Pedido, CotacaoItem antes de deletar
- Se em uso: retornar erro "Item em uso, não pode ser deletado"
- Se não usado: hard delete

**Futuro**: Implementar soft delete se necessário

---

## Mudanças nos Modelos

### 1. UserRoles Enum (models.py:41-44)
```python
class UserRoles(enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    COLLABORATOR = "COLLABORATOR"
    SUPPLIER = "SUPPLIER"  # NOVO
```

### 2. Fornecedor (models.py:154-173) - EXPANDIR

**Novos campos**:
- `usuario_id`: FK Usuario (nullable) - vincula fornecedor ao usuário SUPPLIER
- `cnpj`: String(18) (nullable)
- `telefone`: String(20) (nullable)
- `endereco`: String(400) (nullable)
- `cidade`: String(100) (nullable)
- `estado`: String(2) (nullable) - UF
- `cep`: String(10) (nullable)
- `site`: String(200) (nullable)
- `aprovado`: Boolean (default=False) - controla aprovação
- `criado_em`: DateTime (default=brasilia_now)

**Índices**: Adicionar index em `usuario_id`

**Relacionamento**: `usuario = relationship('Usuario', backref='fornecedor_vinculado')`

### 3. Item (models.py:129-141) - EXPANDIR

**Novos campos**:
- `codigo_fornecedor`: String(50) (nullable) - código interno do fornecedor
- `descricao`: Text (nullable)
- `marca`: String(100) (nullable)
- `preco_atual`: Numeric(10,4) (nullable) - preço unitário
- `atualizado_em`: DateTime (default=brasilia_now, onupdate=brasilia_now)

**Compatibilidade**: Campos nullable → itens antigos continuam funcionando

### 4. ConviteFornecedor (NOVO modelo)

Tabela: `convite_fornecedores`

**Campos**:
- `id`: Integer PK
- `token`: String(64) unique - UUID gerado automaticamente
- `criado_por_id`: FK Usuario (SUPER_ADMIN)
- `criado_em`: DateTime
- `usado`: Boolean (default=False)
- `usado_em`: DateTime (nullable)
- `usado_por_id`: FK Usuario (nullable)
- `fornecedor_id`: FK Fornecedor (nullable)
- `expira_em`: DateTime (nullable)
- `ativo`: Boolean (default=True)

**Métodos**:
- `gerar_token()`: Gera UUID
- `esta_valido()`: Valida se ativo, não usado, não expirado

### 5. ItemPrecoHistorico (NOVO modelo)

Tabela: `item_preco_historico`

**Campos**:
- `id`: Integer PK
- `item_id`: FK Item (CASCADE)
- `preco_anterior`: Numeric(10,4) (nullable) - null no cadastro inicial
- `preco_novo`: Numeric(10,4)
- `alterado_em`: DateTime
- `alterado_por_id`: FK Usuario (nullable)
- `observacao`: String(200) (nullable)

**Índices**: Index em `item_id`

---

## Backend - Mudanças

### Arquivos a Modificar

1. **backend/kaizen_app/models.py**
   - Adicionar `SUPPLIER` ao UserRoles enum
   - Expandir Fornecedor (10 novos campos)
   - Expandir Item (5 novos campos)
   - Adicionar ConviteFornecedor (modelo completo)
   - Adicionar ItemPrecoHistorico (modelo completo)

2. **backend/kaizen_app/controllers.py**
   - Criar blueprint `supplier_bp` (linha ~8-11)
   - Criar decorator `supplier_required()` (após linha 34)
   - Adicionar rotas supplier_bp (ver seção Endpoints)
   - Adicionar rotas admin_bp para gerenciar fornecedores
   - Adicionar rotas auth_bp para registro de fornecedores

3. **backend/kaizen_app/services.py**
   - Adicionar funções de serviço (ver seção Serviços)

4. **backend/kaizen_app/__init__.py**
   - Registrar supplier_bp (linha ~232-237)

### Decorator `supplier_required()`

```python
def supplier_required():
    """Valida JWT + role SUPPLIER + fornecedor aprovado."""
    def wrapper(fn):
        @wraps(fn)
        @jwt_required()
        def decorator(*args, **kwargs):
            user_id = get_user_id_from_jwt()
            usuario = db.session.get(Usuario, user_id)

            if not usuario or not usuario.ativo:
                return jsonify({"error": "Usuário inválido"}), 403

            if usuario.role != UserRoles.SUPPLIER:
                return jsonify({"error": "Acesso restrito a fornecedores"}), 403

            fornecedor = Fornecedor.query.filter_by(usuario_id=user_id).first()
            if not fornecedor or not fornecedor.aprovado:
                return jsonify({"error": "Fornecedor aguardando aprovação"}), 403

            return fn(*args, **kwargs)
        return decorator
    return wrapper
```

**Localização**: controllers.py, após `admin_required()` (~linha 70)

### Endpoints - Blueprint `supplier_bp` (/api/supplier/*)

**Perfil**:
- `GET /api/supplier/perfil` - Obter perfil completo
- `PUT /api/supplier/perfil` - Atualizar dados (nome, telefone, endereço, etc)

**Itens**:
- `GET /api/supplier/itens` - Listar todos os itens do fornecedor
- `POST /api/supplier/itens` - Criar item
- `GET /api/supplier/itens/<id>` - Obter item específico
- `PUT /api/supplier/itens/<id>` - Atualizar item (se preço mudou → cria histórico)
- `DELETE /api/supplier/itens/<id>` - Deletar item (valida uso antes)
- `GET /api/supplier/itens/<id>/historico-precos` - Histórico de preços

**Todos com decorator**: `@supplier_required()`

### Endpoints - Blueprint `auth_bp` (/api/auth/*)

**Novos**:
- `GET /api/auth/validar-convite-fornecedor?token=XXX` - Valida convite
- `POST /api/auth/register-fornecedor-com-convite` - Cadastro com convite (aprovação automática)
- `POST /api/auth/register-fornecedor` - Auto-cadastro (aguarda aprovação)

**Existentes**: Nenhuma modificação necessária (login reusa `/api/auth/login`)

### Endpoints - Blueprint `admin_bp` (/api/admin/*)

**Convites** (SUPER_ADMIN apenas):
- `POST /api/admin/convites-fornecedor` - Criar convite (gera token + link)
- `GET /api/admin/convites-fornecedor` - Listar convites
- `DELETE /api/admin/convites-fornecedor/<id>` - Desativar convite

**Gerenciamento de Fornecedores** (ADMIN pode visualizar, SUPER_ADMIN aprova):
- `GET /api/admin/fornecedores-cadastrados?aprovado=true/false` - Listar fornecedores
- `PUT /api/admin/fornecedores/<id>/aprovar` - Aprovar/rejeitar (SUPER_ADMIN)
- `GET /api/admin/fornecedores/<id>` - Detalhes completos
- `GET /api/admin/fornecedores/<id>/itens` - Itens do fornecedor

### Serviços (services.py)

**Convites**:
- `criar_convite_fornecedor(admin_id, expira_em)`
- `listar_convites_fornecedor(admin_id)`
- `validar_convite_fornecedor(token)`
- `excluir_convite_fornecedor(admin_id, convite_id)`

**Cadastro**:
- `register_fornecedor_com_convite(data)` - Valida token → cria Usuario + Fornecedor → marca aprovado=True
- `register_fornecedor_auto(data)` - Cria Usuario + Fornecedor com aprovado=False → notifica admins

**Gerenciamento (Admin)**:
- `listar_fornecedores_cadastrados(admin_id, filtro_aprovado)`
- `aprovar_fornecedor(admin_id, fornecedor_id, aprovado)` - Define aprovado + compartilhado_regiao
- `obter_detalhes_fornecedor_admin(admin_id, fornecedor_id)`
- `listar_itens_de_fornecedor_admin(admin_id, fornecedor_id)`

**Perfil (Supplier)**:
- `obter_perfil_fornecedor(user_id)`
- `atualizar_perfil_fornecedor(user_id, data)`

**Itens (Supplier)**:
- `listar_itens_fornecedor(user_id)`
- `criar_item_fornecedor(user_id, data)` - Valida nome único, cria item + histórico se preço fornecido
- `obter_item_fornecedor(user_id, item_id)` - Valida propriedade
- `atualizar_item_fornecedor(user_id, item_id, data)` - Se preço mudou → registra histórico
- `deletar_item_fornecedor(user_id, item_id)` - Valida uso → erro 409 se em uso
- `obter_historico_precos_item(user_id, item_id)`

**Helpers**:
- `_obter_fornecedor_por_usuario(user_id)`
- `_validar_propriedade_item(user_id, item_id)`
- `_registrar_alteracao_preco(item_id, preco_anterior, preco_novo, user_id, obs)`
- `_validar_dados_cadastro_fornecedor(data)` - Valida email, senha, CNPJ, etc
- `_validar_dados_item(data, fornecedor_id, item_id)` - Valida nome único, preço >= 0

### Validações Importantes

**Cadastro de Fornecedor**:
- Email obrigatório, formato válido, único no sistema
- Senha mínima 6 caracteres
- Nome e nome_empresa obrigatórios
- Telefone obrigatório
- CNPJ opcional, mas se fornecido: 14 dígitos

**Item**:
- Nome obrigatório, único GLOBALMENTE
- Unidade de medida obrigatória
- Preço opcional, mas se fornecido: >= 0
- Codigo_fornecedor único dentro do fornecedor
- Item pertence ao fornecedor (valida em edição/deleção)

**Delete de Item**:
```python
# Validar uso antes de deletar
if Estoque.query.filter_by(item_id=item_id).first():
    return {"error": "Item em uso em estoques"}, 409
if CotacaoItem.query.filter_by(item_id=item_id).first():
    return {"error": "Item em uso em cotações"}, 409
# Verificar Pedido se aplicável
```

---

## Frontend - Mudanças

### Componentes a Criar

**Diretório**: `frontend/src/features/supplier/`

1. **SupplierRegister.tsx** - Auto-cadastro (aguarda aprovação)
2. **SupplierRegisterConvite.tsx** - Cadastro com token (?token=XXX)
3. **SupplierLogin.tsx** - Login (wrapper do Login.tsx + validação role)
4. **SupplierDashboard.tsx** - Painel inicial (cards: total itens, estatísticas)
5. **SupplierProfile.tsx** - Visualizar/editar perfil
6. **SupplierItems.tsx** - Tabela de itens + ações (editar, deletar, histórico)
7. **SupplierItemForm.tsx** - Formulário criar/editar item
8. **SupplierItemPriceHistory.tsx** - Modal/página de histórico de preços
9. **SupplierRoute.tsx** - Guard de rota (valida role + aprovação)

**Diretório**: `frontend/src/features/admin/`

10. **GerenciarConvitesFornecedor.tsx** - Admin cria/lista convites
11. **GerenciarFornecedoresCadastrados.tsx** - Lista fornecedores + aprovar/rejeitar
12. **DetalhesFornecedorCadastrado.tsx** - Modal de detalhes + itens do fornecedor

### Rotas a Adicionar (App.tsx)

**Públicas**:
```tsx
<Route path="/supplier/login" element={<SupplierLogin />} />
<Route path="/supplier/register" element={<SupplierRegister />} />
<Route path="/supplier/register-convite" element={<SupplierRegisterConvite />} />
```

**Protegidas (Supplier)**:
```tsx
<Route element={<Layout />}>
  <Route path="/supplier" element={<SupplierRoute />}>
    <Route index element={<SupplierDashboard />} />
    <Route path="dashboard" element={<SupplierDashboard />} />
    <Route path="perfil" element={<SupplierProfile />} />
    <Route path="itens" element={<SupplierItems />} />
    <Route path="itens/novo" element={<SupplierItemForm mode="create" />} />
    <Route path="itens/:id/editar" element={<SupplierItemForm mode="edit" />} />
    <Route path="itens/:id/historico" element={<SupplierItemPriceHistory />} />
  </Route>
</Route>
```

**Admin**:
```tsx
<Route path="/admin/convites-fornecedor" element={<GerenciarConvitesFornecedor />} />
<Route path="/admin/fornecedores-cadastrados" element={<GerenciarFornecedoresCadastrados />} />
```

### API Service (supplierApi.ts)

**Criar arquivo**: `frontend/src/services/supplierApi.ts`

Funções:
- Auth: `registerSupplier`, `registerSupplierComConvite`, `validarConviteFornecedor`
- Perfil: `getSupplierProfile`, `updateSupplierProfile`
- Itens: `getSupplierItems`, `createSupplierItem`, `getSupplierItem`, `updateSupplierItem`, `deleteSupplierItem`, `getItemPriceHistory`
- Admin: `createConviteFornecedor`, `listConvitesFornecedor`, `deleteConviteFornecedor`, `listFornecedoresCadastrados`, `aprovarFornecedor`, `getFornecedorDetails`, `getFornecedorItens`

### Navegação (Layout.tsx)

**Adicionar links**:

Se `usuario.role === 'SUPPLIER'`:
```tsx
<Nav.Link href="/supplier/dashboard">Dashboard</Nav.Link>
<Nav.Link href="/supplier/itens">Meus Itens</Nav.Link>
<Nav.Link href="/supplier/perfil">Meu Perfil</Nav.Link>
```

Se `usuario.role === 'SUPER_ADMIN'`:
```tsx
<Nav.Link href="/admin/convites-fornecedor">Convites Fornecedores</Nav.Link>
<Nav.Link href="/admin/fornecedores-cadastrados">Fornecedores</Nav.Link>
```

---

## Migrações de Banco de Dados

**Ordem de execução**: 5 migrações

### 1. `add_supplier_role_to_user_roles`
- Adiciona `SUPPLIER` ao enum UserRoles
- PostgreSQL: `ALTER TYPE userroles ADD VALUE 'SUPPLIER'`
- SQLite: Rebuild table

### 2. `expand_fornecedor_table`
- Adiciona 10 campos ao Fornecedor: usuario_id, cnpj, telefone, endereco, cidade, estado, cep, site, aprovado, criado_em
- Index em usuario_id
- FK para usuarios.id (ON DELETE SET NULL)

### 3. `expand_item_table`
- Adiciona 5 campos ao Item: codigo_fornecedor, descricao, marca, preco_atual, atualizado_em

### 4. `create_convite_fornecedor_table`
- Cria tabela convite_fornecedores
- FKs: criado_por_id, usado_por_id, fornecedor_id
- Index único em token

### 5. `create_item_preco_historico_table`
- Cria tabela item_preco_historico
- FK: item_id (CASCADE), alterado_por_id (SET NULL)
- Index em item_id

**Comandos**:
```bash
cd backend
source .venv/bin/activate  # Linux/macOS
# .venv\Scripts\activate  # Windows

# ANTES de gerar migrações: Criar restaurante fictício
python -c "from kaizen_app import create_app, db; from kaizen_app.models import Restaurante; app=create_app(); app.app_context().push(); r=Restaurante(nome='Fornecedores Regionais', cnpj='00000000000000'); db.session.add(r); db.session.commit(); print(f'Restaurante Regional criado com ID: {r.id}')"

# Gerar migrações
flask db migrate -m "add supplier role to user roles"
flask db migrate -m "expand fornecedor table with cadastro fields"
flask db migrate -m "expand item table with catalog fields"
flask db migrate -m "create convite fornecedor table"
flask db migrate -m "create item preco historico table"

# Revisar arquivos em backend/migrations/versions/

# Aplicar
flask db upgrade
```

---

## Fluxos Principais

### Fluxo 1: Cadastro com Convite

1. Super Admin acessa `/admin/convites-fornecedor`
2. Clica "Gerar Convite" → `POST /api/admin/convites-fornecedor`
3. Copia link: `https://app.com/supplier/register-convite?token=XXX`
4. Envia link ao fornecedor
5. Fornecedor acessa link → valida token → `GET /api/auth/validar-convite-fornecedor?token=XXX`
6. Preenche formulário (dados pessoais + empresa)
7. Submete → `POST /api/auth/register-fornecedor-com-convite`
8. Backend cria Usuario (SUPPLIER, aprovado=True) + Fornecedor (aprovado=True, compartilhado_regiao=True)
9. Marca convite usado
10. Retorna JWT → auto-login → redirect `/supplier/dashboard`

### Fluxo 2: Auto-Cadastro

1. Fornecedor acessa `/supplier/register`
2. Preenche formulário (dados pessoais + empresa)
3. Submete → `POST /api/auth/register-fornecedor`
4. Backend cria Usuario (SUPPLIER, aprovado=False) + Fornecedor (aprovado=False, compartilhado_regiao=False)
5. Cria notificação para SUPER_ADMIN: "Novo fornecedor aguardando aprovação"
6. Exibe mensagem: "Cadastro realizado. Aguarde aprovação."
7. Super Admin acessa `/admin/fornecedores-cadastrados`
8. Vê fornecedor em "Pendentes"
9. Clica "Aprovar" → `PUT /api/admin/fornecedores/{id}/aprovar`
10. Backend define aprovado=True, compartilhado_regiao=True
11. Fornecedor pode fazer login → `/supplier/login` → dashboard

### Fluxo 3: Gerenciar Itens

1. Fornecedor logado → `/supplier/itens`
2. Clica "Novo Item" → formulário
3. Preenche: código, nome, descrição, marca, unidade, preço
4. Submete → `POST /api/supplier/itens`
5. Valida nome único, preço >= 0
6. Cria Item + ItemPrecoHistorico (se preço fornecido)
7. Atualização de preço: Edita item → muda preço → `PUT /api/supplier/itens/{id}`
8. Backend detecta mudança → cria registro em ItemPrecoHistorico
9. Histórico: Clica "Ver Histórico" → `GET /api/supplier/itens/{id}/historico-precos`
10. Deleção: Clica "Deletar" → `DELETE /api/supplier/itens/{id}`
11. Backend valida uso → se em uso: erro 409 → se não: hard delete

---

## Arquivos Críticos

**Backend**:
- `/home/devos/Codigos-vscode/ListaKaizenApp/backend/kaizen_app/models.py` - Modelos (UserRoles, Fornecedor, Item, ConviteFornecedor, ItemPrecoHistorico)
- `/home/devos/Codigos-vscode/ListaKaizenApp/backend/kaizen_app/controllers.py` - supplier_bp, supplier_required, endpoints
- `/home/devos/Codigos-vscode/ListaKaizenApp/backend/kaizen_app/services.py` - Toda lógica de negócio
- `/home/devos/Codigos-vscode/ListaKaizenApp/backend/kaizen_app/__init__.py` - Registrar supplier_bp

**Frontend**:
- `/home/devos/Codigos-vscode/ListaKaizenApp/frontend/src/App.tsx` - Rotas supplier
- `/home/devos/Codigos-vscode/ListaKaizenApp/frontend/src/features/supplier/` - 9 novos componentes
- `/home/devos/Codigos-vscode/ListaKaizenApp/frontend/src/features/admin/` - 3 novos componentes admin
- `/home/devos/Codigos-vscode/ListaKaizenApp/frontend/src/services/supplierApi.ts` - Cliente API (criar)
- `/home/devos/Codigos-vscode/ListaKaizenApp/frontend/src/components/Layout.tsx` - Navegação

**Migrações**:
- `/home/devos/Codigos-vscode/ListaKaizenApp/backend/migrations/versions/` - 5 arquivos gerados

---

## Segurança

### Controle de Acesso

**Backend**:
- `@supplier_required()`: Valida role=SUPPLIER + fornecedor.aprovado=True
- `@admin_required()`: Mantém lógica atual (bloqueia SUPPLIER)
- `@super_admin_required()`: Para convites e aprovações

**Validação de Propriedade**:
- Todas operações de item validam: `item.fornecedor.usuario_id == user_id`
- Função helper: `_validar_propriedade_item(user_id, item_id)`

**Frontend**:
- `SupplierRoute`: Guard que redireciona se role != SUPPLIER
- Mensagem amigável se aguardando aprovação

### Proteção de Dados

**Senhas**: Hash bcrypt (já implementado)
**CNPJ**: Armazenar sem formatação (apenas números)
**JWT**: Expiração configurável, blocklist ativa
**Logs**: Não expor senhas ou tokens completos

---

## Pontos de Atenção

### 1. Restaurante Fictício
- Criar restaurante "Fornecedores Regionais" ANTES das migrações
- Anotar ID gerado
- Usar esse ID em `fornecedor.restaurante_id` para fornecedores auto-cadastrados

### 2. Enum Migration (PostgreSQL)
- ALTER TYPE ADD VALUE é irreversível
- Testar downgrade em ambiente de dev
- Gerar código de rollback com cuidado

### 3. Fornecedor Não Aprovado
- `supplier_required()` retorna 403 se não aprovado
- Frontend exibe: "Aguardando aprovação do administrador"

### 4. Conflito de Nomes de Itens
- Nome de item é ÚNICO GLOBALMENTE (padrão atual)
- Validar em criar + editar item

### 5. Delete de Item em Uso
- Validar uso em Estoque, Pedido, CotacaoItem
- Retornar erro 409 com mensagem clara

### 6. Compatibilidade
- Campos novos são nullable → código antigo funciona
- Fornecedores antigos (usuario_id=NULL) continuam operando
- Nenhum endpoint existente é quebrado

---

## Verificação (Testes End-to-End)

### Pré-condições
1. Criar restaurante "Fornecedores Regionais"
2. Executar 5 migrações
3. Backend rodando
4. Frontend rodando

### Teste 1: Cadastro com Convite

1. **Como SUPER_ADMIN**:
   - Login como super admin
   - Acessar `/admin/convites-fornecedor`
   - Clicar "Gerar Convite"
   - Verificar: convite criado, token gerado, link copiado

2. **Como Fornecedor (novo)**:
   - Abrir navegador anônimo
   - Acessar link do convite
   - Verificar: formulário exibido, token validado
   - Preencher: nome, email, senha, nome empresa, CNPJ, telefone
   - Submeter
   - Verificar: auto-login realizado, redirect para `/supplier/dashboard`
   - Verificar: navbar mostra "Meus Itens", "Meu Perfil"

3. **Validação Backend**:
   - Verificar DB: Usuario criado com role=SUPPLIER, aprovado=True
   - Verificar DB: Fornecedor criado com aprovado=True, compartilhado_regiao=True, usuario_id preenchido
   - Verificar DB: Convite marcado como usado

### Teste 2: Auto-Cadastro + Aprovação

1. **Como Fornecedor (novo)**:
   - Acessar `/supplier/register`
   - Preencher formulário (mesmos dados)
   - Submeter
   - Verificar: mensagem "Aguarde aprovação", NÃO faz login

2. **Validação Backend**:
   - Verificar DB: Usuario criado com aprovado=False
   - Verificar DB: Fornecedor criado com aprovado=False, compartilhado_regiao=False
   - Verificar: Notificação criada para SUPER_ADMIN

3. **Como SUPER_ADMIN**:
   - Ver notificação (badge)
   - Acessar `/admin/fornecedores-cadastrados`
   - Ver fornecedor em "Pendentes"
   - Clicar "Ver Detalhes" → modal com dados
   - Clicar "Aprovar"
   - Verificar: fornecedor move para "Aprovados"

4. **Validação Backend**:
   - Verificar DB: Fornecedor.aprovado=True, compartilhado_regiao=True
   - Verificar DB: Usuario.aprovado=True

5. **Como Fornecedor (aprovado)**:
   - Fazer login em `/supplier/login`
   - Verificar: login bem-sucedido, redirect para `/supplier/dashboard`

### Teste 3: Gerenciar Itens

1. **Como Fornecedor (logado)**:
   - Acessar `/supplier/itens`
   - Verificar: tabela vazia ou com itens
   - Clicar "Novo Item"
   - Preencher: código "ABC123", nome "Azeite Gallo 500ml", descrição, marca "Gallo", unidade "un", preço "35.90"
   - Submeter
   - Verificar: item aparece na tabela

2. **Validação Backend**:
   - Verificar DB: Item criado com fornecedor_id correto, campos preenchidos
   - Verificar DB: ItemPrecoHistorico criado (preco_anterior=NULL, preco_novo=35.90)

3. **Editar Preço**:
   - Clicar "Editar" no item
   - Alterar preço para "38.50"
   - Submeter
   - Verificar: preço atualizado na tabela

4. **Validação Backend**:
   - Verificar DB: Item.preco_atual=38.50, Item.atualizado_em atualizado
   - Verificar DB: Novo registro em ItemPrecoHistorico (preco_anterior=35.90, preco_novo=38.50)

5. **Ver Histórico**:
   - Clicar "Ver Histórico"
   - Verificar: modal exibe 2 registros (cadastro inicial + alteração)

6. **Deletar Item Não Usado**:
   - Criar item novo sem usar em pedidos
   - Clicar "Deletar" → confirmar
   - Verificar: item removido da tabela

7. **Tentar Deletar Item em Uso** (se aplicável):
   - Se item está em estoque/pedido
   - Clicar "Deletar"
   - Verificar: erro 409, mensagem "Item em uso"

### Teste 4: Visibilidade para Colaboradores

1. **Como ADMIN**:
   - Fazer login como admin de restaurante
   - Acessar tela de "Fornecedores Regionais" (endpoint existente)
   - Verificar: fornecedor aprovado aparece na lista
   - Verificar: itens do fornecedor são listados COM PREÇOS visíveis

2. **Como COLLABORATOR**:
   - Fazer login como colaborador
   - Acessar `/fornecedores-regionais` (se existe tela)
   - Verificar: fornecedor aprovado visível
   - Verificar: itens com preços visíveis

### Teste 5: Segurança

1. **Fornecedor A tenta editar item do Fornecedor B**:
   - Login como Fornecedor A
   - Tentar `PUT /api/supplier/itens/{id_do_fornecedor_B}`
   - Verificar: erro 403 "Item não pertence ao fornecedor"

2. **COLLABORATOR tenta acessar `/supplier/dashboard`**:
   - Login como COLLABORATOR
   - Tentar acessar `/supplier/dashboard`
   - Verificar: redirect para login ou erro 403

3. **Fornecedor não aprovado tenta fazer login**:
   - Criar fornecedor via auto-cadastro (não aprovado)
   - Tentar login
   - Verificar: token gerado, mas ao acessar `/supplier/itens` → erro 403 "Aguardando aprovação"

### Checklist Final

- [ ] 5 migrações executadas sem erro
- [ ] Restaurante "Fornecedores Regionais" criado
- [ ] Cadastro com convite funciona (aprovação automática)
- [ ] Auto-cadastro funciona (aguarda aprovação)
- [ ] Super Admin aprova fornecedores
- [ ] Fornecedor cria/edita/deleta itens
- [ ] Histórico de preços registrado corretamente
- [ ] Delete de item em uso bloqueado
- [ ] Fornecedor A não edita item de Fornecedor B
- [ ] Colaboradores veem fornecedores regionais + preços
- [ ] Notificações criadas (novo fornecedor pendente)
- [ ] Layout com links corretos (supplier navbar, admin navbar)

---

## Próximos Passos (Pós-Implementação)

### Melhorias Futuras

1. **Soft Delete**: Adicionar campo `ativo` em Item para inativar itens em uso
2. **Estatísticas**: Dashboard do fornecedor com gráficos (itens mais pedidos, receita estimada)
3. **Notificação por Email**: Enviar email quando fornecedor for aprovado
4. **Upload de Logo**: Fornecedor pode fazer upload de logo da empresa
5. **Catálogo Público**: Página pública para fornecedor mostrar produtos
6. **Multi-upload de Itens**: Importar CSV com múltiplos itens de uma vez
7. **Histórico de Pedidos**: Fornecedor vê pedidos que incluem seus produtos
8. **Sistema de Avaliação**: Restaurantes avaliam fornecedores
9. **Cleanup Automático**: Remover histórico de preços antigo (manter últimos 100)
10. **Documentação Swagger**: Gerar docs interativos da API

---

## Estimativa de Esforço

- **Backend (modelos + migrações)**: 2-3 dias
- **Backend (services + controllers)**: 3-4 dias
- **Frontend (componentes supplier)**: 3-4 dias
- **Frontend (admin extensions)**: 1-2 dias
- **Testes manuais**: 2-3 dias
- **Ajustes e bugs**: 2-3 dias
- **Documentação**: 1 dia

**Total**: 14-20 dias úteis

---

## Observações Finais

- **Compatibilidade 100%**: Código existente não é afetado, campos novos são nullable
- **Segurança**: Multi-camadas (decorator, validação de propriedade, validação de dados)
- **Escalabilidade**: Indexes adicionados, queries otimizadas com joinedload
- **Manutenibilidade**: Reusa infraestrutura existente, menos pontos de falha
- **Extensibilidade**: Fácil adicionar funcionalidades futuras (estatísticas, avaliações, etc.)

**Decisão arquitetural chave**: Adicionar role SUPPLIER ao sistema existente em vez de criar sistema paralelo = menos código, menos bugs, mais fácil de manter.

**Pronto para implementação!**
