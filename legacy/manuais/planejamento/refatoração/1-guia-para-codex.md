# Plano: Implementação Multi-Tenant com Abordagem Incremental

## Objetivo

Transformar o sistema atual single-tenant (restaurante KZN) em um sistema multi-tenant onde:
- **SUPER_ADMIN** pode gerenciar múltiplos restaurantes e todos os dados do sistema
- Cada restaurante tem dados completamente isolados
- **ADMIN** e **COLLABORATOR** veem apenas dados do seu restaurante
- Nova hierarquia: SUPER_ADMIN (global) → ADMIN (por restaurante) → COLLABORATOR (por restaurante)

## Estratégia: Implementação Incremental (Faseada)

Ao invés de refatorar tudo de uma vez (alto risco), vamos implementar em fases testáveis:

1. **Fase 1**: Criar tabela Restaurante + role SUPER_ADMIN (2-3 dias)
2. **Fase 2**: CRUD de restaurantes - apenas super admin (2 dias)
3. **Fase 3**: Associar usuários a restaurantes (2 dias)
4. **Fases 4+**: Migrar demais tabelas gradualmente - 2-3 por vez (1-2 semanas)

**Vantagens desta abordagem:**
- Testável: Cada fase independente
- Reversível: Fácil fazer rollback
- Menos arriscado: Não quebra sistema atual KZN
- Incremental: Pode pausar entre fases
- Aprendizado: Descobre problemas cedo em escopo menor

---

## FASE 1: Infraestrutura Base (2-3 dias)

### Objetivo
Criar fundação do sistema multi-tenant sem tocar no código existente.

### 1.1 Novo Model: Restaurante

**Arquivo**: `backend/kaizen_app/models.py` (adicionar após linha 62)

```python
class Restaurante(db.Model, SerializerMixin):
    __tablename__ = 'restaurantes'
    serialize_rules = ('-usuarios', '-listas', '-itens')

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(200), nullable=False, unique=True)
    slug = db.Column(db.String(100), nullable=False, unique=True, index=True)
    ativo = db.Column(db.Boolean, default=True, nullable=False)
    criado_em = db.Column(db.DateTime, default=brasilia_now, nullable=False)
    atualizado_em = db.Column(db.DateTime, default=brasilia_now, onupdate=brasilia_now)
    deletado = db.Column(db.Boolean, default=False, nullable=False)

    # Relationships (adicionados nas próximas fases)
    # usuarios = db.relationship('Usuario', back_populates='restaurante')

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'slug': self.slug,
            'ativo': self.ativo,
            'criado_em': self.criado_em.isoformat() if self.criado_em else None
        }
```

### 1.2 Atualizar Role Enum

**Arquivo**: `backend/kaizen_app/models.py` (linhas 37-39)

```python
class UserRoles(enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"  # NOVO
    ADMIN = "ADMIN"
    COLLABORATOR = "COLLABORATOR"
```

### 1.3 Migração

```bash
cd backend
flask db migrate -m "Add Restaurante model and SUPER_ADMIN role"
flask db upgrade
```

### 1.4 Script: Criar Super Admin Inicial

**Criar arquivo**: `backend/create_super_admin.py`

Script Python para criar primeiro SUPER_ADMIN com:
- Input de nome, email, senha
- Validação de email duplicado
- Aprovado automaticamente (aprovado=True)
- Role SUPER_ADMIN

**Executar**:
```bash
# Windows
.venv\Scripts\python.exe backend\create_super_admin.py

# Linux/macOS
python backend/create_super_admin.py
```

### 1.5 Script: Criar Restaurante KZN

**Criar arquivo**: `backend/migrate_kzn_restaurante.py`

Script para:
- Criar restaurante KZN (nome='KZN Restaurante', slug='kzn')
- Executar apenas uma vez após criar tabela restaurantes

### 1.6 Novo Decorator: super_admin_required

**Arquivo**: `backend/kaizen_app/controllers.py` (adicionar após linha 67)

```python
def super_admin_required():
    """Decorator para rotas que exigem SUPER_ADMIN"""
    def wrapper(fn):
        @wraps(fn)
        @jwt_required()
        def decorator(*args, **kwargs):
            claims = get_jwt()
            role = claims.get('role')
            if role != 'SUPER_ADMIN':
                return jsonify({"error": "Acesso negado. Apenas SUPER_ADMIN."}), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper
```

---

## FASE 2: CRUD de Restaurantes (2 dias)

### Objetivo
Permitir que SUPER_ADMIN gerencie restaurantes (criar, listar, editar, desativar).

### 2.1 Backend Services

**Arquivo**: `backend/kaizen_app/services.py` (adicionar no final)

Funções a criar:
- `listar_restaurantes()` - Lista todos restaurantes (deletado=False)
- `obter_restaurante(restaurante_id)` - Obtém um restaurante por ID
- `criar_restaurante(data)` - Cria novo restaurante com slug único (usando python-slugify)
- `atualizar_restaurante(restaurante_id, data)` - Atualiza nome e status ativo
- `deletar_restaurante(restaurante_id)` - Soft delete (deletado=True)

**Dependência**: Instalar `python-slugify==8.0.1`

### 2.2 Backend Controllers

**Arquivo**: `backend/kaizen_app/controllers.py` (adicionar após linha 953)

Rotas a criar (todas com @super_admin_required()):
- `GET /admin/restaurantes` - Lista todos
- `GET /admin/restaurantes/<id>` - Obtém um
- `POST /admin/restaurantes` - Cria novo
- `PUT /admin/restaurantes/<id>` - Atualiza
- `DELETE /admin/restaurantes/<id>` - Deleta (soft)

### 2.3 Frontend - Gerenciar Restaurantes

**Criar**: `frontend/src/features/admin/GerenciarRestaurantes.tsx`

Componente com:
- Tabela listando todos restaurantes (ID, Nome, Slug, Status, Criado em, Ações)
- Botão "Criar Novo Restaurante"
- Modal criar/editar com campos: nome, ativo (checkbox)
- Botões editar e deletar por restaurante
- Spinner durante loading
- Alertas de erro

**Criar**: `frontend/src/features/admin/GerenciarRestaurantes.module.css`

Estilos básicos para container e header.

### 2.4 Adicionar Rota no App

**Arquivo**: `frontend/src/App.tsx`

- Import: `import GerenciarRestaurantes from './features/admin/GerenciarRestaurantes';`
- Rota (após linha 66): `<Route path="restaurantes" element={<GerenciarRestaurantes />} />`

### 2.5 Adicionar Item no Menu Admin

**Arquivo**: `frontend/src/components/Layout.tsx`

Menu item para SUPER_ADMIN:
```typescript
{
    label: 'Restaurantes',
    icon: 'fa-store',
    path: '/admin/restaurantes'
}
```

**Nota**: Condição para mostrar apenas para SUPER_ADMIN será adicionada na Fase 3.

---

## FASE 3: Associação User ↔ Restaurante (2 dias)

### Objetivo
- Adicionar `restaurante_id` na tabela `usuarios`
- Atualizar JWT para incluir `restaurante_id`
- Permitir SUPER_ADMIN atribuir usuários a restaurantes
- SUPER_ADMIN pode criar novos admins de restaurante

### 3.1 Atualizar Model Usuario

**Arquivo**: `backend/kaizen_app/models.py` (linha ~41)

Adicionar:
```python
# NOVO: FK para restaurante (nullable para SUPER_ADMIN)
restaurante_id = db.Column(db.Integer, db.ForeignKey('restaurantes.id'), nullable=True, index=True)

# Relationship
restaurante = db.relationship('Restaurante', back_populates='usuarios')
```

Atualizar `to_dict()` para incluir `restaurante_id` e `restaurante`.

**Atualizar Model Restaurante**:
```python
usuarios = db.relationship('Usuario', back_populates='restaurante', lazy='dynamic')
```

### 3.2 Migração

```bash
flask db migrate -m "Add restaurante_id to usuarios"
flask db upgrade
```

### 3.3 Atualizar JWT

**Arquivo**: `backend/kaizen_app/controllers.py` (login_route, linha ~118)

Adicionar `restaurante_id` ao JWT:
```python
additional_claims = {
    'role': usuario.role.value,
    'restaurante_id': usuario.restaurante_id  # NOVO
}
```

### 3.4 Helper Function

**Arquivo**: `backend/kaizen_app/controllers.py` (adicionar após linha 70)

```python
def get_current_restaurante_id():
    """
    Retorna restaurante_id do usuário atual.
    SUPER_ADMIN retorna None (acessa todos os restaurantes).
    """
    claims = get_jwt()
    role = claims.get('role')

    if role == 'SUPER_ADMIN':
        return None  # Sem filtro

    return claims.get('restaurante_id')
```

### 3.5 Services - Gestão de Usuários Multi-Tenant

**Arquivo**: `backend/kaizen_app/services.py`

Funções a criar:
- `atribuir_usuario_restaurante(usuario_id, restaurante_id)` - Atribui usuário a restaurante
- `criar_admin_restaurante(data)` - SUPER_ADMIN cria ADMIN vinculado a restaurante

### 3.6 Controllers - Rotas de Gestão

**Arquivo**: `backend/kaizen_app/controllers.py`

Rotas a criar (ambas @super_admin_required()):
- `PUT /admin/usuarios/<id>/atribuir-restaurante` - Atribui usuário a restaurante
- `POST /admin/usuarios/criar-admin-restaurante` - Cria novo ADMIN de restaurante

### 3.7 Atualizar Script migrate_kzn_restaurante.py

Adicionar código para vincular todos os usuários ADMIN e COLLABORATOR existentes ao KZN:

```python
usuarios_sem_restaurante = Usuario.query.filter(
    Usuario.restaurante_id.is_(None),
    Usuario.role != UserRoles.SUPER_ADMIN
).all()

for usuario in usuarios_sem_restaurante:
    usuario.restaurante_id = kzn.id

db.session.commit()
```

### 3.8 Frontend - Condicionar Menu por Role

**Arquivo**: `frontend/src/components/Layout.tsx`

Mostrar "Restaurantes" apenas para SUPER_ADMIN:

```typescript
const user = JSON.parse(localStorage.getItem('user') || '{}');
const isSuperAdmin = user.role === 'SUPER_ADMIN';

// No menu admin
{isSuperAdmin && {
    label: 'Restaurantes',
    icon: 'fa-store',
    path: '/admin/restaurantes'
}}
```

---

## FASES 4+: Migração Gradual das Demais Tabelas (2-3 tabelas por semana)

### Tabelas a Migrar (em ordem de prioridade)

**Grupo 1** (Fase 4): Catálogo e Fornecedores
- `lista_mae_itens` (catálogo global por restaurante)
- `fornecedores` (fornecedores por restaurante)

**Grupo 2** (Fase 5): Áreas e Listas
- `areas`, `listas`, `lista_item_ref`

**Grupo 3** (Fase 6): Estoque e Submissões
- `estoques`, `submissoes`

**Grupo 4** (Fase 7): Pedidos e Cotações
- `pedidos`, `cotacoes`, `cotacao_itens`

**Grupo 5** (Fase 8): Checklists e Listas Rápidas
- `checklists`, `checklist_itens`, `listas_rapidas`, `listas_rapidas_itens`, `sugestoes_itens`

### Padrão de Implementação (Repetir para Cada Grupo)

#### 1. Migration
```python
# Adicionar coluna nullable
op.add_column('nome_tabela',
    sa.Column('restaurante_id', sa.Integer(), nullable=True))
op.create_foreign_key('fk_nome_tabela_restaurante',
    'nome_tabela', 'restaurantes', ['restaurante_id'], ['id'])
op.create_index('ix_nome_tabela_restaurante_id',
    'nome_tabela', ['restaurante_id'])

# Migrar dados existentes para KZN (ID 1)
op.execute("UPDATE nome_tabela SET restaurante_id = 1 WHERE restaurante_id IS NULL")

# Tornar coluna obrigatória
op.alter_column('nome_tabela', 'restaurante_id', nullable=False)
```

#### 2. Atualizar Model
```python
restaurante_id = db.Column(db.Integer, db.ForeignKey('restaurantes.id'),
                           nullable=False, index=True)
restaurante = db.relationship('Restaurante')
```

#### 3. Atualizar Services (Adicionar Filtros)

**Antes**:
```python
def listar_itens():
    itens = Modelo.query.filter_by(deletado=False).all()
```

**Depois**:
```python
def listar_itens(restaurante_id):
    """restaurante_id: None para SUPER_ADMIN, ID específico para ADMIN/COLLABORATOR"""
    query = Modelo.query.filter_by(deletado=False)

    if restaurante_id:
        query = query.filter_by(restaurante_id=restaurante_id)

    itens = query.all()
```

#### 4. Atualizar Controllers (Passar restaurante_id)
```python
@admin_bp.route('/endpoint', methods=['GET'])
@admin_required()
def endpoint_route():
    restaurante_id = get_current_restaurante_id()
    response, status = services.funcao(restaurante_id)
    return jsonify(response), status
```

#### 5. Testes de Isolamento
```python
def test_isolamento(client, auth_rest1, auth_rest2):
    # Restaurante 1 cria item
    resp1 = client.post('/endpoint', json={'nome': 'Item R1'}, headers=auth_rest1)

    # Restaurante 2 não deve ver
    resp2 = client.get('/endpoint', headers=auth_rest2)
    assert 'Item R1' not in str(resp2.data)
```

---

## Checklist de Validação (Cada Fase)

- [ ] Migration executada sem erros
- [ ] Dados existentes migrados para KZN
- [ ] Models atualizados com relacionamentos
- [ ] Services filtram por `restaurante_id`
- [ ] SUPER_ADMIN vê todos os dados
- [ ] ADMIN vê apenas seu restaurante
- [ ] COLLABORATOR vê apenas seu restaurante
- [ ] Frontend atualizado (se aplicável)
- [ ] Testes de isolamento passando
- [ ] Documentação atualizada

---

## Riscos e Mitigações

### Risco 1: Esquecer Filtro `restaurante_id`
**Impacto**: Data leakage entre restaurantes
**Mitigação**: Helper function padronizada, code review rigoroso, testes automatizados

### Risco 2: Dados Órfãos Durante Migração
**Impacto**: Registros sem `restaurante_id`
**Mitigação**: Script sempre atribui KZN aos dados existentes, validação pós-migration

### Risco 3: Performance (Queries Complexas)
**Impacto**: Lentidão com múltiplos restaurantes
**Mitigação**: Índices em todas as colunas `restaurante_id`, análise de EXPLAIN

### Risco 4: FK Cascades Indesejados
**Impacto**: Deletar restaurante deletaria todos os dados
**Mitigação**: Soft delete (`deletado=True`), checks nos services

---

## Ordem de Implementação Recomendada

1. **Semana 1**: Fases 1, 2, 3 (Infraestrutura + CRUD + Usuários)
2. **Semana 2**: Fase 4 (Catálogo + Fornecedores) - Testar isolamento
3. **Semana 3**: Fase 5 (Áreas + Listas)
4. **Semana 4**: Fase 6 (Estoque + Submissões)
5. **Semana 5**: Fase 7 (Pedidos + Cotações)
6. **Semana 6**: Fase 8 (Checklists + Listas Rápidas + Sugestões)
7. **Semana 7**: Testes finais, ajustes, documentação

---

## Arquivos Críticos

**Backend:**
1. `backend/kaizen_app/models.py` - Adicionar Restaurante, atualizar Usuario, UserRoles enum
2. `backend/kaizen_app/services.py` - CRUD restaurantes, gestão usuários, filtros multi-tenant
3. `backend/kaizen_app/controllers.py` - Rotas restaurantes, decorator super_admin_required, helper function
4. `backend/create_super_admin.py` - Script criar primeiro SUPER_ADMIN (novo)
5. `backend/migrate_kzn_restaurante.py` - Script criar restaurante KZN (novo)

**Frontend:**
6. `frontend/src/features/admin/GerenciarRestaurantes.tsx` - Tela CRUD restaurantes (novo)
7. `frontend/src/features/admin/GerenciarRestaurantes.module.css` - Estilos (novo)
8. `frontend/src/App.tsx` - Adicionar rota restaurantes
9. `frontend/src/components/Layout.tsx` - Menu condicional por role

---

## Detalhamento Completo de Rotas e Validações

### Rotas NOVAS (Fase 2 e 3)

#### Grupo 1: Gerenciamento de Restaurantes (Fase 2)

**Todas requerem @super_admin_required()**

| Método | Rota | Descrição | Request Body | Response |
|--------|------|-----------|--------------|----------|
| GET | `/admin/restaurantes` | Lista todos restaurantes | - | `{restaurantes: [...], total: int}` |
| GET | `/admin/restaurantes/<id>` | Obtém um restaurante | - | `{restaurante: {...}}` |
| POST | `/admin/restaurantes` | Cria restaurante | `{nome: string}` | `{message: string, restaurante: {...}}` |
| PUT | `/admin/restaurantes/<id>` | Atualiza restaurante | `{nome: string, ativo: bool}` | `{message: string, restaurante: {...}}` |
| DELETE | `/admin/restaurantes/<id>` | Deleta restaurante (soft) | - | `{message: string}` |

**Exemplo de uso:**

```typescript
// Frontend: GerenciarRestaurantes.tsx

// Listar todos
const response = await api.get('/admin/restaurantes');
// Response: {restaurantes: [{id: 1, nome: 'KZN', slug: 'kzn', ativo: true, ...}], total: 3}

// Criar novo
const response = await api.post('/admin/restaurantes', {
  nome: 'Restaurante Central'
});
// Response: {message: 'Restaurante criado com sucesso.', restaurante: {id: 2, nome: 'Restaurante Central', slug: 'restaurante-central', ...}}

// Atualizar
const response = await api.put('/admin/restaurantes/2', {
  nome: 'Central São Paulo',
  ativo: true
});

// Deletar
const response = await api.delete('/admin/restaurantes/2');
```

**Validações Críticas (Backend):**

```python
# services.py - criar_restaurante()

def criar_restaurante(data):
    nome = data.get('nome', '').strip()

    # ✅ Validação 1: Nome obrigatório
    if not nome:
        return {"error": "Nome do restaurante é obrigatório."}, 400

    # ✅ Validação 2: Nome mínimo de caracteres
    if len(nome) < 3:
        return {"error": "Nome deve ter pelo menos 3 caracteres."}, 400

    # ✅ Validação 3: Verificar duplicação (case-insensitive)
    from sqlalchemy import func
    existente = Restaurante.query.filter(
        func.lower(Restaurante.nome) == func.lower(nome)
    ).first()

    if existente:
        return {"error": f"Já existe um restaurante com o nome '{nome}'."}, 409

    # ✅ Validação 4: Gerar slug único
    from slugify import slugify
    slug_base = slugify(nome)
    slug = slug_base
    contador = 1

    while Restaurante.query.filter_by(slug=slug).first():
        slug = f"{slug_base}-{contador}"
        contador += 1

    # ✅ Validação 5: Sanitizar input
    nome = nome.strip()[:200]  # Max 200 caracteres

    restaurante = Restaurante(nome=nome, slug=slug, ativo=True)
    db.session.add(restaurante)
    db.session.commit()

    return {"message": "Restaurante criado com sucesso.", "restaurante": restaurante.to_dict()}, 201
```

```python
# services.py - deletar_restaurante()

def deletar_restaurante(restaurante_id):
    restaurante = Restaurante.query.filter_by(id=restaurante_id, deletado=False).first()

    if not restaurante:
        return {"error": "Restaurante não encontrado."}, 404

    # ✅ CRÍTICO: Verificar se existem usuários vinculados (Fase 3+)
    usuarios_vinculados = Usuario.query.filter_by(
        restaurante_id=restaurante_id,
        deletado=False
    ).count()

    if usuarios_vinculados > 0:
        return {
            "error": f"Não é possível deletar. Existem {usuarios_vinculados} usuário(s) vinculado(s). "
                     f"Remova ou transfira os usuários primeiro."
        }, 400

    # ✅ CRÍTICO: Verificar se existem dados vinculados (Fase 4+)
    # itens_catalogo = ListaMaeItem.query.filter_by(restaurante_id=restaurante_id, deletado=False).count()
    # if itens_catalogo > 0:
    #     return {"error": f"Existem {itens_catalogo} itens no catálogo vinculados."}, 400

    restaurante.deletado = True
    db.session.commit()

    return {"message": "Restaurante deletado com sucesso."}, 200
```

---

#### Grupo 2: Gestão de Usuários Multi-Tenant (Fase 3)

**Todas requerem @super_admin_required()**

| Método | Rota | Descrição | Request Body | Response |
|--------|------|-----------|--------------|----------|
| PUT | `/admin/usuarios/<id>/atribuir-restaurante` | Atribui usuário a restaurante | `{restaurante_id: int ou null}` | `{message: string, usuario: {...}}` |
| POST | `/admin/usuarios/criar-admin-restaurante` | Cria ADMIN de restaurante | `{nome, email, senha, restaurante_id}` | `{message: string, usuario: {...}}` |

**Exemplo de uso:**

```typescript
// Frontend: GerenciarUsuarios.tsx

// Atribuir usuário a restaurante
const response = await api.put('/admin/usuarios/3/atribuir-restaurante', {
  restaurante_id: 2  // ou null para remover vínculo
});
// Response: {message: 'Usuário atribuído ao restaurante com sucesso.', usuario: {...}}

// Criar admin de restaurante
const response = await api.post('/admin/usuarios/criar-admin-restaurante', {
  nome: 'Maria Silva',
  email: 'maria@central.com',
  senha: 'senhaSegura123',
  restaurante_id: 2
});
// Response: {message: 'Admin do restaurante criado com sucesso.', usuario: {id: 4, nome: 'Maria Silva', ...}}
```

**Validações Críticas (Backend):**

```python
# services.py - atribuir_usuario_restaurante()

def atribuir_usuario_restaurante(usuario_id, restaurante_id):
    usuario = Usuario.query.filter_by(id=usuario_id, deletado=False).first()

    # ✅ Validação 1: Usuário existe
    if not usuario:
        return {"error": "Usuário não encontrado."}, 404

    # ✅ Validação 2: SUPER_ADMIN não pode ser vinculado a restaurante
    if usuario.role == UserRoles.SUPER_ADMIN:
        return {
            "error": "SUPER_ADMIN não pode ser vinculado a restaurante específico. "
                     "SUPER_ADMIN tem acesso global ao sistema."
        }, 400

    # ✅ Validação 3: Se restaurante_id foi fornecido, verificar se existe
    if restaurante_id:
        restaurante = Restaurante.query.filter_by(
            id=restaurante_id,
            deletado=False,
            ativo=True
        ).first()

        if not restaurante:
            return {"error": "Restaurante não encontrado ou inativo."}, 404

    # ✅ Validação 4: Prevenir ciclos ou inconsistências
    if usuario.restaurante_id == restaurante_id:
        return {"error": "Usuário já está vinculado a este restaurante."}, 400

    # Atribuir
    usuario.restaurante_id = restaurante_id
    db.session.commit()

    return {
        "message": "Usuário atribuído ao restaurante com sucesso.",
        "usuario": usuario.to_dict()
    }, 200
```

```python
# services.py - criar_admin_restaurante()

def criar_admin_restaurante(data):
    from werkzeug.security import generate_password_hash

    nome = data.get('nome', '').strip()
    email = data.get('email', '').strip().lower()
    senha = data.get('senha', '').strip()
    restaurante_id = data.get('restaurante_id')

    # ✅ Validação 1: Campos obrigatórios
    if not all([nome, email, senha, restaurante_id]):
        return {"error": "Nome, email, senha e restaurante são obrigatórios."}, 400

    # ✅ Validação 2: Email válido (regex básico)
    import re
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_regex, email):
        return {"error": "Email inválido."}, 400

    # ✅ Validação 3: Senha forte (mínimo 8 caracteres)
    if len(senha) < 8:
        return {"error": "Senha deve ter pelo menos 8 caracteres."}, 400

    # ✅ Validação 4: Restaurante existe e está ativo
    restaurante = Restaurante.query.filter_by(
        id=restaurante_id,
        deletado=False,
        ativo=True
    ).first()

    if not restaurante:
        return {"error": "Restaurante não encontrado ou inativo."}, 404

    # ✅ Validação 5: Email único no sistema
    usuario_existente = Usuario.query.filter_by(email=email).first()
    if usuario_existente:
        return {"error": f"Já existe um usuário com o email '{email}'."}, 409

    # ✅ Validação 6: Limite de admins por restaurante (opcional)
    admins_restaurante = Usuario.query.filter_by(
        restaurante_id=restaurante_id,
        role=UserRoles.ADMIN,
        deletado=False
    ).count()

    if admins_restaurante >= 5:  # Limite exemplo: 5 admins por restaurante
        return {
            "error": f"Restaurante '{restaurante.nome}' já possui {admins_restaurante} admins. "
                     f"Limite máximo atingido."
        }, 400

    # Criar admin
    usuario = Usuario(
        nome=nome,
        email=email,
        senha_hash=generate_password_hash(senha),
        role=UserRoles.ADMIN,
        restaurante_id=restaurante_id,
        aprovado=True,  # Aprovado automaticamente
        ativo=True
    )

    db.session.add(usuario)
    db.session.commit()

    return {
        "message": "Admin do restaurante criado com sucesso.",
        "usuario": usuario.to_dict()
    }, 201
```

---

### Rotas MODIFICADAS (Fases 4+)

**Rotas existentes que precisam ser adaptadas para multi-tenancy**

#### Padrão de Modificação

**ANTES (single-tenant):**
```python
@admin_bp.route('/catalogo-global', methods=['GET'])
@admin_required()
def listar_catalogo_global_route():
    response, status = services.listar_itens_catalogo()
    return jsonify(response), status
```

**DEPOIS (multi-tenant):**
```python
@admin_bp.route('/catalogo-global', methods=['GET'])
@admin_required()
def listar_catalogo_global_route():
    # ✅ MUDANÇA: Obter restaurante_id do usuário logado
    restaurante_id = get_current_restaurante_id()

    # ✅ MUDANÇA: Passar restaurante_id para service
    response, status = services.listar_itens_catalogo(restaurante_id)
    return jsonify(response), status
```

**Service Layer:**

```python
# ANTES
def listar_itens_catalogo():
    itens = ListaMaeItem.query.filter_by(deletado=False).all()
    return {"itens": [i.to_dict() for i in itens]}, 200

# DEPOIS
def listar_itens_catalogo(restaurante_id):
    """
    restaurante_id: None para SUPER_ADMIN (vê tudo), ID específico para ADMIN/COLLABORATOR
    """
    query = ListaMaeItem.query.filter_by(deletado=False)

    # ✅ CRÍTICO: Filtrar por restaurante se não for SUPER_ADMIN
    if restaurante_id:
        query = query.filter_by(restaurante_id=restaurante_id)

    itens = query.all()
    return {"itens": [i.to_dict() for i in itens]}, 200
```

#### Lista de Rotas a Modificar (Fases 4-8)

| Rota | Fase | Modificação | Validações Extras |
|------|------|-------------|-------------------|
| `GET /admin/catalogo-global` | 4 | Filtrar por `restaurante_id` | - |
| `POST /admin/catalogo-global` | 4 | Exigir `restaurante_id` se SUPER_ADMIN | Validar restaurante existe e ativo |
| `PUT /admin/catalogo-global/<id>` | 4 | Validar pertence ao restaurante do usuário | Prevenir edição cross-tenant |
| `GET /admin/fornecedores` | 4 | Filtrar por `restaurante_id` | - |
| `POST /admin/fornecedores` | 4 | Atribuir `restaurante_id` automaticamente | - |
| `GET /admin/areas` | 5 | Filtrar por `restaurante_id` | - |
| `GET /admin/listas-compras` | 5 | Filtrar por `restaurante_id` | - |
| `GET /admin/submissoes` | 6 | Filtrar por `restaurante_id` | - |
| `GET /admin/pedidos` | 7 | Filtrar por `restaurante_id` | - |
| `GET /admin/cotacoes` | 7 | Filtrar por `restaurante_id` | - |
| `GET /admin/checklists` | 8 | Filtrar por `restaurante_id` | - |
| `GET /admin/listas-rapidas` | 8 | Filtrar por `restaurante_id` | - |
| `GET /admin/sugestoes` | 8 | Filtrar por `restaurante_id` | - |
| `GET /auth/itens-globais` | 4 | Filtrar por `restaurante_id` do colaborador | - |

**Total: ~50-70 endpoints a modificar** (entre GETs, POSTs, PUTs)

---

### Validações Críticas de Segurança

#### 1. Validação de Propriedade (Ownership)

**Problema:** Admin do Restaurante A tenta editar dados do Restaurante B

```python
# ❌ INSEGURO (Antes)
def atualizar_fornecedor(fornecedor_id, data):
    fornecedor = Fornecedor.query.get(fornecedor_id)
    if not fornecedor:
        return {"error": "Fornecedor não encontrado."}, 404

    fornecedor.nome = data.get('nome')
    db.session.commit()
    return {"message": "Atualizado."}, 200

# ✅ SEGURO (Depois)
def atualizar_fornecedor(fornecedor_id, data, restaurante_id):
    fornecedor = Fornecedor.query.filter_by(id=fornecedor_id, deletado=False).first()

    if not fornecedor:
        return {"error": "Fornecedor não encontrado."}, 404

    # ✅ CRÍTICO: Validar propriedade
    if restaurante_id and fornecedor.restaurante_id != restaurante_id:
        return {"error": "Acesso negado. Este fornecedor não pertence ao seu restaurante."}, 403

    fornecedor.nome = data.get('nome')
    db.session.commit()
    return {"message": "Fornecedor atualizado com sucesso."}, 200
```

**Controller:**
```python
@admin_bp.route('/fornecedores/<int:fornecedor_id>', methods=['PUT'])
@admin_required()
def atualizar_fornecedor_route(fornecedor_id):
    restaurante_id = get_current_restaurante_id()
    data = request.get_json()
    response, status = services.atualizar_fornecedor(fornecedor_id, data, restaurante_id)
    return jsonify(response), status
```

---

#### 2. Validação de FK (Foreign Key)

**Problema:** Criar item vinculado a restaurante diferente do usuário

```python
# ✅ SEGURO
def criar_fornecedor(data, restaurante_id):
    nome = data.get('nome', '').strip()

    if not nome:
        return {"error": "Nome é obrigatório."}, 400

    # ✅ CRÍTICO: Se SUPER_ADMIN, permitir escolher restaurante
    if not restaurante_id:
        restaurante_id_fornecido = data.get('restaurante_id')

        if not restaurante_id_fornecido:
            return {"error": "restaurante_id é obrigatório para SUPER_ADMIN."}, 400

        # Validar que restaurante existe
        restaurante = Restaurante.query.filter_by(
            id=restaurante_id_fornecido,
            deletado=False,
            ativo=True
        ).first()

        if not restaurante:
            return {"error": "Restaurante inválido."}, 404

        restaurante_id = restaurante_id_fornecido

    # ✅ CRÍTICO: Se ADMIN, sempre usar seu restaurante_id
    fornecedor = Fornecedor(
        nome=nome,
        restaurante_id=restaurante_id  # SEMPRE definir
    )

    db.session.add(fornecedor)
    db.session.commit()

    return {"message": "Fornecedor criado.", "fornecedor": fornecedor.to_dict()}, 201
```

---

#### 3. Validação de Relacionamentos Cross-Tenant

**Problema:** Admin cria pedido vinculando fornecedor de outro restaurante

```python
def criar_pedido(data, restaurante_id):
    fornecedor_id = data.get('fornecedor_id')

    # ✅ CRÍTICO: Validar que fornecedor pertence ao mesmo restaurante
    fornecedor = Fornecedor.query.filter_by(id=fornecedor_id, deletado=False).first()

    if not fornecedor:
        return {"error": "Fornecedor não encontrado."}, 404

    # ✅ CRÍTICO: Prevenir cross-tenant
    if restaurante_id and fornecedor.restaurante_id != restaurante_id:
        return {
            "error": "Fornecedor não pertence ao seu restaurante. "
                     "Você só pode criar pedidos com fornecedores do seu restaurante."
        }, 403

    # Criar pedido...
```

---

#### 4. Validação de JWT Tamper

**Problema:** Usuário tenta manipular JWT para trocar restaurante_id

```python
# controllers.py - get_current_restaurante_id()

def get_current_restaurante_id():
    """Retorna restaurante_id do JWT (validado)"""
    try:
        claims = get_jwt()
        role = claims.get('role')

        if role == 'SUPER_ADMIN':
            return None

        restaurante_id = claims.get('restaurante_id')

        # ✅ CRÍTICO: Validar que restaurante_id no JWT é válido
        if restaurante_id:
            restaurante = Restaurante.query.filter_by(
                id=restaurante_id,
                deletado=False,
                ativo=True
            ).first()

            if not restaurante:
                # JWT contém restaurante_id inválido
                raise ValueError("Restaurante inválido no token. Faça login novamente.")

        return restaurante_id

    except Exception as e:
        # Token inválido ou manipulado
        return jsonify({"error": "Token inválido. Faça login novamente."}), 401
```

---

#### 5. Validação de Mass Assignment

**Problema:** Frontend envia `restaurante_id` no body e tenta trocar

```python
def atualizar_fornecedor(fornecedor_id, data, restaurante_id):
    fornecedor = Fornecedor.query.filter_by(id=fornecedor_id, deletado=False).first()

    if not fornecedor:
        return {"error": "Fornecedor não encontrado."}, 404

    # ✅ CRÍTICO: Validar propriedade
    if restaurante_id and fornecedor.restaurante_id != restaurante_id:
        return {"error": "Acesso negado."}, 403

    # ✅ CRÍTICO: Nunca permitir atualizar restaurante_id via API
    campos_permitidos = ['nome', 'telefone', 'email', 'responsavel', 'observacao']

    for campo in campos_permitidos:
        if campo in data:
            setattr(fornecedor, campo, data[campo])

    # ❌ NUNCA fazer isso:
    # if 'restaurante_id' in data:
    #     fornecedor.restaurante_id = data['restaurante_id']  # VULNERABILIDADE!

    db.session.commit()
    return {"message": "Fornecedor atualizado."}, 200
```

---

### Checklist de Segurança por Rota

**Para cada rota modificada, garantir:**

- [ ] ✅ **Decorator correto** (`@admin_required()` ou `@super_admin_required()`)
- [ ] ✅ **Obter restaurante_id** via `get_current_restaurante_id()`
- [ ] ✅ **Passar restaurante_id para service** layer
- [ ] ✅ **Service filtra por restaurante_id** (se não for None)
- [ ] ✅ **Validar propriedade** em updates/deletes (ownership check)
- [ ] ✅ **Validar FK** em creates (restaurante existe e está ativo)
- [ ] ✅ **Prevenir cross-tenant** em relacionamentos
- [ ] ✅ **Nunca confiar em restaurante_id do body** (sempre usar do JWT)
- [ ] ✅ **Teste de isolamento** criado e passando

---

### Exemplo de Rota Completa e Segura

```python
# ========================================
# EXEMPLO COMPLETO: FORNECEDORES
# ========================================

# controllers.py
@admin_bp.route('/fornecedores', methods=['GET'])
@admin_required()
def listar_fornecedores_route():
    """Lista fornecedores (filtrado por restaurante se não for SUPER_ADMIN)"""
    # ✅ 1. Obter restaurante_id do JWT
    restaurante_id = get_current_restaurante_id()

    # ✅ 2. Passar para service
    response, status = services.listar_fornecedores(restaurante_id)
    return jsonify(response), status


@admin_bp.route('/fornecedores', methods=['POST'])
@admin_required()
def criar_fornecedor_route():
    """Cria fornecedor (sempre vinculado ao restaurante do usuário)"""
    # ✅ 1. Obter restaurante_id do JWT
    restaurante_id = get_current_restaurante_id()

    # ✅ 2. Obter dados do body
    data = request.get_json()

    # ✅ 3. Passar para service
    response, status = services.criar_fornecedor(data, restaurante_id)
    return jsonify(response), status


@admin_bp.route('/fornecedores/<int:fornecedor_id>', methods=['PUT'])
@admin_required()
def atualizar_fornecedor_route(fornecedor_id):
    """Atualiza fornecedor (valida propriedade)"""
    restaurante_id = get_current_restaurante_id()
    data = request.get_json()
    response, status = services.atualizar_fornecedor(fornecedor_id, data, restaurante_id)
    return jsonify(response), status


@admin_bp.route('/fornecedores/<int:fornecedor_id>', methods=['DELETE'])
@admin_required()
def deletar_fornecedor_route(fornecedor_id):
    """Deleta fornecedor (valida propriedade)"""
    restaurante_id = get_current_restaurante_id()
    response, status = services.deletar_fornecedor(fornecedor_id, restaurante_id)
    return jsonify(response), status


# services.py
def listar_fornecedores(restaurante_id):
    """Lista fornecedores (filtrado por restaurante)"""
    # ✅ Iniciar query
    query = Fornecedor.query.filter_by(deletado=False)

    # ✅ Filtrar por restaurante se não for SUPER_ADMIN
    if restaurante_id:
        query = query.filter_by(restaurante_id=restaurante_id)

    fornecedores = query.order_by(Fornecedor.nome).all()

    return {
        "fornecedores": [f.to_dict() for f in fornecedores],
        "total": len(fornecedores)
    }, 200


def criar_fornecedor(data, restaurante_id):
    """Cria fornecedor (sempre vinculado a restaurante)"""
    nome = data.get('nome', '').strip()

    # ✅ Validação 1: Nome obrigatório
    if not nome:
        return {"error": "Nome é obrigatório."}, 400

    # ✅ Validação 2: Se SUPER_ADMIN, deve fornecer restaurante_id
    if not restaurante_id:
        restaurante_id = data.get('restaurante_id')

        if not restaurante_id:
            return {"error": "restaurante_id é obrigatório."}, 400

        # ✅ Validação 3: Restaurante existe e está ativo
        restaurante = Restaurante.query.filter_by(
            id=restaurante_id,
            deletado=False,
            ativo=True
        ).first()

        if not restaurante:
            return {"error": "Restaurante inválido."}, 404

    # ✅ Validação 4: Nome único por restaurante
    fornecedor_existente = Fornecedor.query.filter_by(
        nome=nome,
        restaurante_id=restaurante_id,
        deletado=False
    ).first()

    if fornecedor_existente:
        return {"error": f"Já existe um fornecedor '{nome}' neste restaurante."}, 409

    # ✅ Criar com restaurante_id
    fornecedor = Fornecedor(
        nome=nome,
        telefone=data.get('telefone', '').strip() or None,
        email=data.get('email', '').strip() or None,
        responsavel=data.get('responsavel', '').strip() or None,
        observacao=data.get('observacao', '').strip() or None,
        restaurante_id=restaurante_id  # SEMPRE DEFINIR
    )

    db.session.add(fornecedor)
    db.session.commit()

    return {
        "message": "Fornecedor criado com sucesso.",
        "fornecedor": fornecedor.to_dict()
    }, 201


def atualizar_fornecedor(fornecedor_id, data, restaurante_id):
    """Atualiza fornecedor (valida propriedade)"""
    fornecedor = Fornecedor.query.filter_by(id=fornecedor_id, deletado=False).first()

    # ✅ Validação 1: Existe
    if not fornecedor:
        return {"error": "Fornecedor não encontrado."}, 404

    # ✅ Validação 2: CRÍTICO - Validar propriedade
    if restaurante_id and fornecedor.restaurante_id != restaurante_id:
        return {"error": "Acesso negado. Este fornecedor não pertence ao seu restaurante."}, 403

    # ✅ Validação 3: Atualizar apenas campos permitidos
    campos_permitidos = ['nome', 'telefone', 'email', 'responsavel', 'observacao']

    for campo in campos_permitidos:
        if campo in data:
            valor = data[campo]
            if isinstance(valor, str):
                valor = valor.strip() or None
            setattr(fornecedor, campo, valor)

    # ✅ Validação 4: Se mudou nome, verificar duplicação
    if 'nome' in data:
        nome_novo = data['nome'].strip()
        duplicado = Fornecedor.query.filter(
            Fornecedor.nome == nome_novo,
            Fornecedor.restaurante_id == fornecedor.restaurante_id,
            Fornecedor.id != fornecedor_id,
            Fornecedor.deletado == False
        ).first()

        if duplicado:
            return {"error": f"Já existe outro fornecedor '{nome_novo}' neste restaurante."}, 409

    db.session.commit()

    return {
        "message": "Fornecedor atualizado com sucesso.",
        "fornecedor": fornecedor.to_dict()
    }, 200


def deletar_fornecedor(fornecedor_id, restaurante_id):
    """Deleta fornecedor (valida propriedade)"""
    fornecedor = Fornecedor.query.filter_by(id=fornecedor_id, deletado=False).first()

    if not fornecedor:
        return {"error": "Fornecedor não encontrado."}, 404

    # ✅ CRÍTICO: Validar propriedade
    if restaurante_id and fornecedor.restaurante_id != restaurante_id:
        return {"error": "Acesso negado."}, 403

    # ✅ Validação: Verificar dependências (opcional)
    pedidos_vinculados = Pedido.query.filter_by(
        fornecedor_id=fornecedor_id,
        deletado=False
    ).count()

    if pedidos_vinculados > 0:
        return {
            "error": f"Não é possível deletar. Existem {pedidos_vinculados} pedido(s) vinculado(s)."
        }, 400

    fornecedor.deletado = True
    db.session.commit()

    return {"message": "Fornecedor deletado com sucesso."}, 200
```

---

### Testes de Isolamento (Exemplo)

```python
# tests/test_multi_tenant_isolamento.py

def test_admin_nao_ve_fornecedores_outro_restaurante(client, auth_headers_kzn, auth_headers_central):
    """Admin do KZN não deve ver fornecedores do Central"""

    # Admin do KZN cria fornecedor
    resp_create = client.post('/admin/fornecedores',
        json={'nome': 'Fornecedor KZN'},
        headers=auth_headers_kzn)
    assert resp_create.status_code == 201

    # Admin do Central lista fornecedores
    resp_list = client.get('/admin/fornecedores', headers=auth_headers_central)
    assert resp_list.status_code == 200

    fornecedores = resp_list.get_json()['fornecedores']
    nomes = [f['nome'] for f in fornecedores]

    # ✅ CRÍTICO: Não deve conter "Fornecedor KZN"
    assert 'Fornecedor KZN' not in nomes


def test_admin_nao_pode_editar_fornecedor_outro_restaurante(client, auth_headers_kzn, auth_headers_central):
    """Admin do Central não pode editar fornecedor do KZN"""

    # Admin do KZN cria fornecedor
    resp_create = client.post('/admin/fornecedores',
        json={'nome': 'Fornecedor KZN'},
        headers=auth_headers_kzn)
    fornecedor_id = resp_create.get_json()['fornecedor']['id']

    # Admin do Central tenta editar
    resp_edit = client.put(f'/admin/fornecedores/{fornecedor_id}',
        json={'nome': 'Hackeado'},
        headers=auth_headers_central)

    # ✅ CRÍTICO: Deve retornar 403 Forbidden
    assert resp_edit.status_code == 403
    assert 'Acesso negado' in resp_edit.get_json()['error']


def test_super_admin_ve_todos_fornecedores(client, auth_headers_super_admin, auth_headers_kzn, auth_headers_central):
    """SUPER_ADMIN vê fornecedores de todos os restaurantes"""

    # KZN cria fornecedor
    client.post('/admin/fornecedores',
        json={'nome': 'Fornecedor KZN'},
        headers=auth_headers_kzn)

    # Central cria fornecedor
    client.post('/admin/fornecedores',
        json={'nome': 'Fornecedor Central'},
        headers=auth_headers_central)

    # SUPER_ADMIN lista todos
    resp = client.get('/admin/fornecedores', headers=auth_headers_super_admin)
    assert resp.status_code == 200

    fornecedores = resp.get_json()['fornecedores']
    nomes = [f['nome'] for f in fornecedores]

    # ✅ CRÍTICO: Deve ver ambos
    assert 'Fornecedor KZN' in nomes
    assert 'Fornecedor Central' in nomes
```

---

### Resumo Final: Cuidados Críticos

#### TOP 10 Cuidados para Garantir Sucesso

1. **✅ NUNCA confiar em `restaurante_id` do body** - Sempre usar do JWT
2. **✅ SEMPRE validar propriedade** em updates/deletes
3. **✅ SEMPRE filtrar queries** por `restaurante_id` (exceto SUPER_ADMIN)
4. **✅ SEMPRE validar FK** ao criar relacionamentos
5. **✅ SEMPRE prevenir cross-tenant** em relacionamentos
6. **✅ SEMPRE usar `get_current_restaurante_id()`** padronizado
7. **✅ SEMPRE testar isolamento** com testes automatizados
8. **✅ SEMPRE validar que restaurante existe e está ativo**
9. **✅ SEMPRE fazer soft delete** (nunca hard delete)
10. **✅ SEMPRE logar tentativas de acesso negado** (auditoria)

---

---

## GUIA DE EXECUÇÃO PARA IA AUTÔNOMA

**IMPORTANTE:** Esta seção contém instruções detalhadas para que uma IA possa executar este plano completo do início ao fim, incluindo testes, correções e validação antes da entrega.

---

### Instruções Gerais de Execução

#### Fluxo de Trabalho por Fase

Para cada fase, seguir rigorosamente este fluxo:

1. **LER** os arquivos relevantes da fase
2. **IMPLEMENTAR** as mudanças conforme especificado
3. **EXECUTAR** migrações (se aplicável)
4. **TESTAR** manualmente os endpoints
5. **EXECUTAR** testes automatizados
6. **VALIDAR** checklist da fase
7. **COMMIT** com mensagem descritiva
8. **DOCUMENTAR** mudanças (se necessário)

#### Comandos Base do Projeto

```bash
# Backend
cd backend
source .venv/bin/activate  # Linux/macOS
.venv\Scripts\activate     # Windows

# Migrações
flask db migrate -m "mensagem"
flask db upgrade

# Testes
cd ..  # voltar para raiz
pytest backend/tests/ -v

# Frontend
cd frontend
npm install
npm start
npm run build
```

---

### FASE 1: Infraestrutura Base (2-3 dias)

#### 1.1 Adicionar Model Restaurante

**Ler:**
- `backend/kaizen_app/models.py` (linha 1-100)

**Executar:**

```bash
# 1. Abrir models.py
# 2. Localizar classe Usuario (linha ~41)
# 3. Adicionar APÓS Usuario (linha ~62):
```

```python
class Restaurante(db.Model, SerializerMixin):
    __tablename__ = 'restaurantes'
    serialize_rules = ('-usuarios', '-listas', '-itens')

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(200), nullable=False, unique=True)
    slug = db.Column(db.String(100), nullable=False, unique=True, index=True)
    ativo = db.Column(db.Boolean, default=True, nullable=False)
    criado_em = db.Column(db.DateTime, default=brasilia_now, nullable=False)
    atualizado_em = db.Column(db.DateTime, default=brasilia_now, onupdate=brasilia_now)
    deletado = db.Column(db.Boolean, default=False, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'slug': self.slug,
            'ativo': self.ativo,
            'criado_em': self.criado_em.isoformat() if self.criado_em else None,
            'atualizado_em': self.atualizado_em.isoformat() if self.atualizado_em else None
        }
```

**Validar:**
- [ ] Importações no topo do arquivo incluem: `db`, `SerializerMixin`, `brasilia_now`
- [ ] Classe está corretamente indentada
- [ ] Método `to_dict()` retorna dicionário

#### 1.2 Atualizar Role Enum

**Ler:**
- `backend/kaizen_app/models.py` (linha 37-39)

**Executar:**

```python
# Localizar (linha ~37):
class UserRoles(enum.Enum):
    ADMIN = "ADMIN"
    COLLABORATOR = "COLLABORATOR"

# SUBSTITUIR por:
class UserRoles(enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    COLLABORATOR = "COLLABORATOR"
```

**Validar:**
- [ ] Enum tem 3 valores (SUPER_ADMIN, ADMIN, COLLABORATOR)
- [ ] SUPER_ADMIN é o primeiro da lista

#### 1.3 Criar e Executar Migração

**Executar:**

```bash
cd backend
flask db migrate -m "Add Restaurante model and SUPER_ADMIN role"
```

**Validar saída:**
- [ ] Deve aparecer: "Generating migration..."
- [ ] Deve criar arquivo em `backend/migrations/versions/XXXXX_add_restaurante_model.py`

**Ler o arquivo de migração gerado:**
```bash
# Verificar que contém:
# - op.create_table('restaurantes', ...)
# - Colunas: id, nome, slug, ativo, criado_em, atualizado_em, deletado
```

**Se houver erro "No changes detected":**
```bash
# Verificar que models.py foi salvo
# Verificar que está no ambiente virtual
# Tentar novamente
```

**Executar migração:**
```bash
flask db upgrade
```

**Validar:**
- [ ] Saída: "Running upgrade -> XXXXX, Add Restaurante model"
- [ ] Sem erros

**Testar no banco:**
```bash
# SQLite
sqlite3 backend/kaizen_dev.db
.tables  # Deve listar 'restaurantes'
.schema restaurantes  # Deve mostrar estrutura
.quit
```

#### 1.4 Criar Script create_super_admin.py

**Executar:**

```bash
# Criar arquivo: backend/create_super_admin.py
```

```python
#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Script para criar o primeiro usuário SUPER_ADMIN do sistema."""
import sys
from werkzeug.security import generate_password_hash
from kaizen_app import create_app, db
from kaizen_app.models import Usuario, UserRoles

def criar_super_admin():
    app = create_app()

    with app.app_context():
        print("\n=== Criar SUPER ADMIN ===\n")

        # Verificar se já existe super admin
        super_admin_existente = Usuario.query.filter_by(
            role=UserRoles.SUPER_ADMIN
        ).first()

        if super_admin_existente:
            print(f"⚠️  Já existe um SUPER ADMIN: {super_admin_existente.email}")
            resposta = input("Deseja criar outro SUPER ADMIN? (s/n): ").lower()
            if resposta != 's':
                print("Operação cancelada.")
                return

        nome = input("Nome completo: ").strip()
        email = input("Email: ").strip()
        senha = input("Senha: ").strip()

        if not nome or not email or not senha:
            print("❌ Todos os campos são obrigatórios.")
            sys.exit(1)

        # Verificar se email já existe
        usuario_existente = Usuario.query.filter_by(email=email).first()
        if usuario_existente:
            print(f"❌ Já existe um usuário com o email '{email}'.")
            sys.exit(1)

        # Criar super admin
        super_admin = Usuario(
            nome=nome,
            email=email,
            senha_hash=generate_password_hash(senha),
            role=UserRoles.SUPER_ADMIN,
            aprovado=True,
            ativo=True
        )

        db.session.add(super_admin)
        db.session.commit()

        print(f"\n✅ SUPER ADMIN criado com sucesso!")
        print(f"   Nome: {nome}")
        print(f"   Email: {email}")
        print(f"   Role: SUPER_ADMIN")
        print(f"\n🔐 Faça login com estas credenciais.")

if __name__ == "__main__":
    criar_super_admin()
```

**Validar:**
- [ ] Arquivo criado em `backend/create_super_admin.py`
- [ ] Imports corretos
- [ ] Função `criar_super_admin()` existe

**Testar execução:**
```bash
python backend/create_super_admin.py
# Input de teste:
# Nome: Super Admin
# Email: super@admin.com
# Senha: superadmin123

# Deve retornar: ✅ SUPER ADMIN criado com sucesso!
```

**Validar no banco:**
```bash
sqlite3 backend/kaizen_dev.db
SELECT id, nome, email, role, aprovado FROM usuarios WHERE role = 'SUPER_ADMIN';
# Deve retornar 1 linha
.quit
```

#### 1.5 Criar Script migrate_kzn_restaurante.py

**Executar:**

```bash
# Criar arquivo: backend/migrate_kzn_restaurante.py
```

```python
#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Script para criar o restaurante KZN (executar apenas uma vez)."""
from kaizen_app import create_app, db
from kaizen_app.models import Restaurante

def criar_restaurante_kzn():
    app = create_app()

    with app.app_context():
        # Verificar se KZN já existe
        kzn_existente = Restaurante.query.filter_by(slug='kzn').first()
        if kzn_existente:
            print("⚠️  Restaurante KZN já existe.")
            return

        kzn = Restaurante(
            nome='KZN Restaurante',
            slug='kzn',
            ativo=True
        )

        db.session.add(kzn)
        db.session.commit()

        print(f"✅ Restaurante KZN criado com sucesso (ID: {kzn.id})")
        print(f"   Nome: {kzn.nome}")
        print(f"   Slug: {kzn.slug}")

if __name__ == "__main__":
    criar_restaurante_kzn()
```

**Testar execução:**
```bash
python backend/migrate_kzn_restaurante.py
# Deve retornar: ✅ Restaurante KZN criado com sucesso (ID: 1)
```

**Validar no banco:**
```bash
sqlite3 backend/kaizen_dev.db
SELECT * FROM restaurantes WHERE slug = 'kzn';
# Deve retornar 1 linha com id=1
.quit
```

#### 1.6 Adicionar Decorator super_admin_required

**Ler:**
- `backend/kaizen_app/controllers.py` (linha 33-67)

**Executar:**

```python
# Localizar decorator admin_required() (linha ~33-67)
# Adicionar APÓS admin_required():

def super_admin_required():
    """Decorator para rotas que exigem SUPER_ADMIN"""
    def wrapper(fn):
        @wraps(fn)
        @jwt_required()
        def decorator(*args, **kwargs):
            claims = get_jwt()
            role = claims.get('role')
            if role != 'SUPER_ADMIN':
                return jsonify({"error": "Acesso negado. Apenas SUPER_ADMIN."}), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper
```

**Validar:**
- [ ] Imports no topo incluem: `wraps`, `jwt_required`, `get_jwt`, `jsonify`
- [ ] Decorator está corretamente indentado
- [ ] Retorna 403 se não for SUPER_ADMIN

**Testar manualmente (criar rota de teste):**

```python
# Adicionar no final de admin_bp (temporário):
@admin_bp.route('/test-super-admin', methods=['GET'])
@super_admin_required()
def test_super_admin_route():
    return jsonify({"message": "Você é SUPER_ADMIN!"}), 200
```

**Executar backend:**
```bash
flask run
```

**Testar com curl:**
```bash
# 1. Login como SUPER_ADMIN
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "super@admin.com", "senha": "superadmin123"}'

# Copiar access_token da resposta

# 2. Testar rota protegida
curl http://localhost:5000/api/admin/test-super-admin \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# Deve retornar: {"message": "Você é SUPER_ADMIN!"}
```

**Validar:**
- [ ] SUPER_ADMIN consegue acessar (200)
- [ ] ADMIN normal recebe 403 Forbidden

**Remover rota de teste após validação.**

#### 1.7 Checklist Final Fase 1

- [ ] Model `Restaurante` criado em `models.py`
- [ ] Enum `UserRoles` tem `SUPER_ADMIN`
- [ ] Migração executada sem erros
- [ ] Tabela `restaurantes` existe no banco
- [ ] Script `create_super_admin.py` funciona
- [ ] SUPER_ADMIN criado no banco (id=1)
- [ ] Script `migrate_kzn_restaurante.py` funciona
- [ ] Restaurante KZN criado no banco (id=1)
- [ ] Decorator `super_admin_required()` funciona
- [ ] Testes manuais passando

**Commit:**
```bash
git add .
git commit -m "feat: add Restaurante model, SUPER_ADMIN role and scripts

- Add Restaurante model with slug and soft delete
- Add SUPER_ADMIN to UserRoles enum
- Create migration for restaurantes table
- Add create_super_admin.py script
- Add migrate_kzn_restaurante.py script
- Add super_admin_required decorator

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### FASE 2: CRUD de Restaurantes (2 dias)

#### 2.1 Instalar Dependência python-slugify

**Executar:**
```bash
cd backend
pip install python-slugify==8.0.1
pip freeze | grep slugify  # Validar instalação
echo "python-slugify==8.0.1" >> requirements.txt
```

**Validar:**
- [ ] Pacote instalado
- [ ] Adicionado ao `requirements.txt`

#### 2.2 Adicionar Services de Restaurantes

**Ler:**
- `backend/kaizen_app/services.py` (final do arquivo)

**Executar:**

```python
# Adicionar NO FINAL do arquivo services.py:

# ========================================
# RESTAURANTES (Multi-Tenant)
# ========================================

def listar_restaurantes():
    """Lista todos os restaurantes (apenas SUPER_ADMIN)"""
    restaurantes = Restaurante.query.filter_by(deletado=False).order_by(Restaurante.nome).all()
    return {
        "restaurantes": [r.to_dict() for r in restaurantes],
        "total": len(restaurantes)
    }, 200


def obter_restaurante(restaurante_id):
    """Obtém um restaurante por ID"""
    restaurante = Restaurante.query.filter_by(id=restaurante_id, deletado=False).first()
    if not restaurante:
        return {"error": "Restaurante não encontrado."}, 404

    return {"restaurante": restaurante.to_dict()}, 200


def criar_restaurante(data):
    """Cria um novo restaurante"""
    from slugify import slugify
    from sqlalchemy import func

    nome = data.get('nome', '').strip()

    if not nome:
        return {"error": "Nome do restaurante é obrigatório."}, 400

    if len(nome) < 3:
        return {"error": "Nome deve ter pelo menos 3 caracteres."}, 400

    # Verificar duplicação (case-insensitive)
    existente = Restaurante.query.filter(
        func.lower(Restaurante.nome) == func.lower(nome)
    ).first()

    if existente:
        return {"error": f"Já existe um restaurante com o nome '{nome}'."}, 409

    # Gerar slug único
    slug_base = slugify(nome)
    slug = slug_base
    contador = 1

    while Restaurante.query.filter_by(slug=slug).first():
        slug = f"{slug_base}-{contador}"
        contador += 1

    # Sanitizar input
    nome = nome.strip()[:200]

    restaurante = Restaurante(nome=nome, slug=slug, ativo=True)
    db.session.add(restaurante)
    db.session.commit()

    return {"message": "Restaurante criado com sucesso.", "restaurante": restaurante.to_dict()}, 201


def atualizar_restaurante(restaurante_id, data):
    """Atualiza dados de um restaurante"""
    from slugify import slugify

    restaurante = Restaurante.query.filter_by(id=restaurante_id, deletado=False).first()
    if not restaurante:
        return {"error": "Restaurante não encontrado."}, 404

    nome = data.get('nome', '').strip()

    if not nome:
        return {"error": "Nome do restaurante é obrigatório."}, 400

    # Atualizar nome
    restaurante.nome = nome

    # Regenerar slug se nome mudou
    novo_slug = slugify(nome)
    if novo_slug != restaurante.slug:
        slug = novo_slug
        contador = 1
        while Restaurante.query.filter_by(slug=slug).filter(Restaurante.id != restaurante_id).first():
            slug = f"{novo_slug}-{contador}"
            contador += 1
        restaurante.slug = slug

    # Atualizar status ativo
    if 'ativo' in data:
        restaurante.ativo = bool(data['ativo'])

    db.session.commit()

    return {
        "message": "Restaurante atualizado com sucesso.",
        "restaurante": restaurante.to_dict()
    }, 200


def deletar_restaurante(restaurante_id):
    """Soft delete de um restaurante"""
    restaurante = Restaurante.query.filter_by(id=restaurante_id, deletado=False).first()
    if not restaurante:
        return {"error": "Restaurante não encontrado."}, 404

    # Verificar se existem usuários vinculados (será implementado na Fase 3)
    # Por enquanto, permitir deletar

    restaurante.deletado = True
    db.session.commit()

    return {"message": "Restaurante deletado com sucesso."}, 200
```

**Validar:**
- [ ] 5 funções adicionadas
- [ ] Imports `slugify` e `func` estão dentro das funções
- [ ] Todas retornam tupla (dict, status_code)

#### 2.3 Adicionar Controllers de Restaurantes

**Ler:**
- `backend/kaizen_app/controllers.py` (linha ~953)

**Executar:**

```python
# Adicionar APÓS linha 953 (dentro do admin_bp):

# ========================================
# RESTAURANTES (Apenas SUPER_ADMIN)
# ========================================

@admin_bp.route('/restaurantes', methods=['GET'])
@super_admin_required()
def listar_restaurantes_route():
    """Lista todos os restaurantes"""
    response, status = services.listar_restaurantes()
    return jsonify(response), status


@admin_bp.route('/restaurantes/<int:restaurante_id>', methods=['GET'])
@super_admin_required()
def obter_restaurante_route(restaurante_id):
    """Obtém um restaurante por ID"""
    response, status = services.obter_restaurante(restaurante_id)
    return jsonify(response), status


@admin_bp.route('/restaurantes', methods=['POST'])
@super_admin_required()
def criar_restaurante_route():
    """Cria um novo restaurante"""
    data = request.get_json()
    response, status = services.criar_restaurante(data)
    return jsonify(response), status


@admin_bp.route('/restaurantes/<int:restaurante_id>', methods=['PUT'])
@super_admin_required()
def atualizar_restaurante_route(restaurante_id):
    """Atualiza um restaurante"""
    data = request.get_json()
    response, status = services.atualizar_restaurante(restaurante_id, data)
    return jsonify(response), status


@admin_bp.route('/restaurantes/<int:restaurante_id>', methods=['DELETE'])
@super_admin_required()
def deletar_restaurante_route(restaurante_id):
    """Deleta um restaurante (soft delete)"""
    response, status = services.deletar_restaurante(restaurante_id)
    return jsonify(response), status
```

**Validar:**
- [ ] 5 rotas adicionadas
- [ ] Todas têm `@super_admin_required()`
- [ ] Todas chamam `services.funcao_correspondente()`

#### 2.4 Testar Endpoints Backend

**Executar backend:**
```bash
cd backend
flask run
```

**Testes com curl:**

```bash
# 1. Login como SUPER_ADMIN
TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "super@admin.com", "senha": "superadmin123"}' \
  | jq -r '.access_token')

# 2. Listar restaurantes
curl http://localhost:5000/api/admin/restaurantes \
  -H "Authorization: Bearer $TOKEN"
# Deve retornar: {"restaurantes": [{"id": 1, "nome": "KZN Restaurante", ...}], "total": 1}

# 3. Criar novo restaurante
curl -X POST http://localhost:5000/api/admin/restaurantes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nome": "Restaurante Central"}'
# Deve retornar: {"message": "Restaurante criado com sucesso.", "restaurante": {...}}

# 4. Obter restaurante (ID 2)
curl http://localhost:5000/api/admin/restaurantes/2 \
  -H "Authorization: Bearer $TOKEN"
# Deve retornar: {"restaurante": {"id": 2, "nome": "Restaurante Central", ...}}

# 5. Atualizar restaurante
curl -X PUT http://localhost:5000/api/admin/restaurantes/2 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nome": "Central Modificado", "ativo": true}'
# Deve retornar: {"message": "Restaurante atualizado com sucesso.", ...}

# 6. Deletar restaurante
curl -X DELETE http://localhost:5000/api/admin/restaurantes/2 \
  -H "Authorization: Bearer $TOKEN"
# Deve retornar: {"message": "Restaurante deletado com sucesso."}

# 7. Tentar acessar como ADMIN normal (deve falhar)
# Login como admin normal primeiro
TOKEN_ADMIN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@kzn.com", "senha": "senha_admin"}' \
  | jq -r '.access_token')

curl http://localhost:5000/api/admin/restaurantes \
  -H "Authorization: Bearer $TOKEN_ADMIN"
# Deve retornar: {"error": "Acesso negado. Apenas SUPER_ADMIN."} (403)
```

**Validar:**
- [ ] GET lista restaurantes (200)
- [ ] POST cria restaurante (201)
- [ ] GET obtém restaurante específico (200)
- [ ] PUT atualiza restaurante (200)
- [ ] DELETE deleta restaurante (200)
- [ ] Slug é gerado automaticamente
- [ ] ADMIN normal recebe 403 em todas as rotas

#### 2.5 Frontend - Criar GerenciarRestaurantes.tsx

**Executar:**

```bash
# Criar arquivo: frontend/src/features/admin/GerenciarRestaurantes.tsx
```

**Copiar código completo do plano (linhas 163-270 do plano).**

**Validar:**
- [ ] Arquivo criado
- [ ] Imports corretos
- [ ] Interface `Restaurante` definida
- [ ] Estados definidos
- [ ] Funções CRUD implementadas

#### 2.6 Frontend - Criar GerenciarRestaurantes.module.css

**Executar:**

```bash
# Criar arquivo: frontend/src/features/admin/GerenciarRestaurantes.module.css
```

```css
.container {
    padding: 20px;
    max-width: 1400px;
    margin: 0 auto;
}

.header {
    margin-bottom: 24px;
}
```

#### 2.7 Frontend - Adicionar Rota no App.tsx

**Ler:**
- `frontend/src/App.tsx`

**Executar:**

```typescript
// 1. Adicionar import (linha ~32):
import GerenciarRestaurantes from './features/admin/GerenciarRestaurantes';

// 2. Adicionar rota (após linha 66, dentro de <Route path="/admin">):
<Route path="restaurantes" element={<GerenciarRestaurantes />} />
```

**Validar:**
- [ ] Import adicionado
- [ ] Rota adicionada dentro do AdminRoute

#### 2.8 Frontend - Adicionar no Menu (Layout.tsx)

**Ler:**
- `frontend/src/components/Layout.tsx`

**Executar:**

```typescript
// Localizar array de menu items do admin
// Adicionar item:
{
    label: 'Restaurantes',
    icon: 'fa-store',
    path: '/admin/restaurantes'
}
```

**Validar:**
- [ ] Item adicionado ao menu admin

#### 2.9 Testar Frontend

**Executar:**
```bash
cd frontend
npm start
# Aguardar abrir em http://localhost:3000
```

**Testes manuais:**

1. **Login como SUPER_ADMIN:**
   - Email: super@admin.com
   - Senha: superadmin123
   - Deve redirecionar para `/admin`

2. **Navegar para Restaurantes:**
   - Clicar em menu hambúrguer
   - Deve aparecer item "Restaurantes"
   - Clicar em "Restaurantes"
   - Deve listar restaurantes existentes (KZN)

3. **Criar novo restaurante:**
   - Clicar "Criar Novo Restaurante"
   - Preencher: "Teste Frontend"
   - Clicar "Criar Restaurante"
   - Deve aparecer na lista com slug "teste-frontend"

4. **Editar restaurante:**
   - Clicar ícone editar
   - Mudar nome para "Teste Editado"
   - Clicar "Atualizar"
   - Nome deve atualizar na lista

5. **Deletar restaurante:**
   - Clicar ícone deletar
   - Confirmar
   - Deve desaparecer da lista

6. **Testar filtros:**
   - Criar 3 restaurantes
   - Desativar um
   - Badge deve mostrar "Inativo"

**Validar:**
- [ ] Login funciona
- [ ] Menu aparece apenas para SUPER_ADMIN
- [ ] Lista carrega
- [ ] Criar funciona
- [ ] Editar funciona
- [ ] Deletar funciona
- [ ] Badges de status aparecem

#### 2.10 Checklist Final Fase 2

- [ ] python-slugify instalado
- [ ] 5 services de restaurantes criados
- [ ] 5 controllers de restaurantes criados
- [ ] Todos endpoints testados com curl (200/201/403)
- [ ] Frontend GerenciarRestaurantes.tsx criado
- [ ] CSS criado
- [ ] Rota adicionada em App.tsx
- [ ] Menu item adicionado
- [ ] Testes manuais no frontend passando
- [ ] ADMIN normal NÃO vê menu "Restaurantes"

**Commit:**
```bash
git add .
git commit -m "feat: implement CRUD for Restaurantes (SUPER_ADMIN only)

Backend:
- Add 5 services: listar, obter, criar, atualizar, deletar
- Add 5 routes with @super_admin_required decorator
- Add slug generation with python-slugify

Frontend:
- Add GerenciarRestaurantes component with table and modals
- Add responsive CSS
- Add route in App.tsx
- Add menu item for SUPER_ADMIN

Tests:
- Manual testing with curl (all CRUD operations)
- Manual testing in browser (UI flows)

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### FASE 3: Associação User ↔ Restaurante (2 dias)

**IMPORTANTE:** Siga o mesmo padrão detalhado das Fases 1 e 2.

#### 3.1-3.8 (Referência ao Plano Principal)

Executar passos conforme descrito no plano principal (linhas 201-316).

**Checklist resumido:**
- [ ] Campo `restaurante_id` adicionado em Usuario model
- [ ] Relationship `restaurante` adicionado
- [ ] Migração executada
- [ ] JWT atualizado para incluir `restaurante_id`
- [ ] Helper `get_current_restaurante_id()` criado
- [ ] 2 services criados (atribuir_usuario, criar_admin)
- [ ] 2 routes criadas
- [ ] Script migrate_kzn atualizado para vincular usuários
- [ ] Frontend menu condicional por role

---

### TESTES AUTOMATIZADOS

#### Criar Arquivo de Testes de Isolamento

**Executar:**

```bash
# Criar: backend/tests/test_multi_tenant_isolamento.py
```

```python
import pytest
from kaizen_app.models import Restaurante, Usuario, Fornecedor, UserRoles
from werkzeug.security import generate_password_hash

# Fixtures
@pytest.fixture
def restaurante_kzn(db_session):
    rest = Restaurante(nome='KZN', slug='kzn', ativo=True)
    db_session.add(rest)
    db_session.commit()
    return rest

@pytest.fixture
def restaurante_central(db_session):
    rest = Restaurante(nome='Central', slug='central', ativo=True)
    db_session.add(rest)
    db_session.commit()
    return rest

@pytest.fixture
def admin_kzn(db_session, restaurante_kzn):
    user = Usuario(
        nome='Admin KZN',
        email='admin@kzn.com',
        senha_hash=generate_password_hash('senha123'),
        role=UserRoles.ADMIN,
        restaurante_id=restaurante_kzn.id,
        aprovado=True,
        ativo=True
    )
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture
def admin_central(db_session, restaurante_central):
    user = Usuario(
        nome='Admin Central',
        email='admin@central.com',
        senha_hash=generate_password_hash('senha123'),
        role=UserRoles.ADMIN,
        restaurante_id=restaurante_central.id,
        aprovado=True,
        ativo=True
    )
    db_session.add(user)
    db_session.commit()
    return user

# Testes (Fase 4 - após implementar fornecedores multi-tenant)
def test_admin_nao_ve_fornecedores_outro_restaurante(client, admin_kzn, admin_central):
    """Admin do KZN não deve ver fornecedores do Central"""
    # Login KZN
    resp_login = client.post('/api/auth/login', json={
        'email': 'admin@kzn.com',
        'senha': 'senha123'
    })
    token_kzn = resp_login.get_json()['access_token']

    # Criar fornecedor KZN
    client.post('/api/admin/fornecedores',
        json={'nome': 'Fornecedor KZN'},
        headers={'Authorization': f'Bearer {token_kzn}'})

    # Login Central
    resp_login = client.post('/api/auth/login', json={
        'email': 'admin@central.com',
        'senha': 'senha123'
    })
    token_central = resp_login.get_json()['access_token']

    # Listar fornecedores Central
    resp = client.get('/api/admin/fornecedores',
        headers={'Authorization': f'Bearer {token_central}'})

    assert resp.status_code == 200
    fornecedores = resp.get_json()['fornecedores']
    nomes = [f['nome'] for f in fornecedores]

    # NÃO deve conter fornecedor do KZN
    assert 'Fornecedor KZN' not in nomes
```

**Executar testes:**
```bash
cd backend
pytest tests/test_multi_tenant_isolamento.py -v
```

**Validar:**
- [ ] Todos os testes passando
- [ ] Isolamento validado

---

### VALIDAÇÃO FINAL E ENTREGA

#### Checklist de Entrega Completa

**Backend:**
- [ ] Todas as migrations executadas sem erros
- [ ] Tabela `restaurantes` existe
- [ ] Enum `UserRoles` tem SUPER_ADMIN
- [ ] Scripts create_super_admin e migrate_kzn funcionam
- [ ] Decorator super_admin_required funciona
- [ ] 5 rotas de restaurantes funcionam (GET, POST, PUT, DELETE)
- [ ] 2 rotas de gestão de usuários funcionam
- [ ] Helper get_current_restaurante_id funciona
- [ ] JWT inclui restaurante_id
- [ ] Testes automatizados passando (pytest)
- [ ] Nenhum erro 500 nos logs
- [ ] python-slugify instalado

**Frontend:**
- [ ] GerenciarRestaurantes.tsx renderiza
- [ ] Modal criar funciona
- [ ] Modal editar funciona
- [ ] Deletar funciona
- [ ] Menu condicional por role funciona
- [ ] SUPER_ADMIN vê menu "Restaurantes"
- [ ] ADMIN normal NÃO vê menu "Restaurantes"
- [ ] npm build sem erros
- [ ] Responsivo (desktop e mobile)

**Segurança:**
- [ ] ADMIN normal recebe 403 em rotas SUPER_ADMIN
- [ ] JWT validado em todas as rotas
- [ ] Soft delete implementado (não hard delete)
- [ ] Validações de input implementadas
- [ ] Slug único garantido

**Documentação:**
- [ ] README.md atualizado (se necessário)
- [ ] CLAUDE.md atualizado com multi-tenant
- [ ] Commits descritivos com Co-Authored-By

**Testes Finais de Integração:**

```bash
# 1. Resetar banco (se necessário)
rm backend/kaizen_dev.db
flask db upgrade

# 2. Executar scripts
python backend/create_super_admin.py
python backend/migrate_kzn_restaurante.py

# 3. Rodar backend e frontend
# Terminal 1:
cd backend && flask run

# Terminal 2:
cd frontend && npm start

# 4. Testar fluxo completo no browser:
# - Login SUPER_ADMIN
# - Criar 2 restaurantes
# - Criar 1 admin para cada restaurante
# - Login com admin1 (deve ver apenas seu restaurante)
# - Login com admin2 (deve ver apenas seu restaurante)
# - Login SUPER_ADMIN (deve ver ambos)

# 5. Executar testes automatizados
pytest backend/tests/ -v
```

**Se todos os testes passarem:**

```bash
git add .
git commit -m "feat: complete multi-tenant infrastructure (Phases 1-3)

Implemented:
- Restaurante model with slug generation
- SUPER_ADMIN role and decorator
- User-restaurant association
- JWT with restaurante_id
- CRUD operations for restaurants (SUPER_ADMIN only)
- Frontend management UI
- Automated tests for data isolation

All tests passing ✅
All manual tests validated ✅

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

git push origin super-admin
```

**Criar Pull Request:**
- Título: "[Multi-Tenant] Phases 1-3: Infrastructure, CRUD, User Association"
- Descrição: Listar todas as mudanças, testes realizados, screenshots
- Solicitar code review

---

### TROUBLESHOOTING

#### Erros Comuns e Soluções

**1. Erro: "No module named 'slugify'"**
```bash
pip install python-slugify
```

**2. Erro: "Table 'restaurantes' doesn't exist"**
```bash
flask db upgrade
```

**3. Erro: "SUPER_ADMIN já existe"**
```bash
# Normal. Script detecta duplicação. Usar outro email ou pular.
```

**4. Erro: "403 Forbidden" em rota SUPER_ADMIN**
```bash
# Validar que:
# - Login foi feito com SUPER_ADMIN
# - Token está correto no header
# - Decorator @super_admin_required() está na rota
```

**5. Frontend não conecta no backend**
```bash
# Validar que backend está rodando em http://localhost:5000
# Validar proxy em frontend/package.json
```

**6. Testes falhando**
```bash
# Verificar que banco de teste está limpo
# Executar: pytest --create-db
```

---

## Próximos Passos Imediatos

1. ✅ Executar Fase 1 completa (infraestrutura)
2. ✅ Executar Fase 2 completa (CRUD restaurantes)
3. ✅ Executar Fase 3 completa (associação usuários)
4. ✅ Executar testes automatizados
5. ✅ Validação final e entrega
6. 🚀 Iniciar Fase 4 (migrar primeiras tabelas: catálogo e fornecedores)
