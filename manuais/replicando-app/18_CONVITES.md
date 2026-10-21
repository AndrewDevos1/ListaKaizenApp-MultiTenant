# 18 — Sistema de Convites

> Tokens de convite para cadastro de usuários, restaurantes e fornecedores. Cada tipo tem seu próprio modelo e fluxo.

---

## Conceito

O sistema usa tokens UUID para controlar cadastros. Existem 3 tipos:
1. **ConviteToken** — para usuários (COLLABORATOR, ADMIN, SUPPLIER)
2. **ConviteRestaurante** — para novos restaurantes (multi-tenant)
3. **ConviteFornecedor** — para fornecedores (portal supplier)

Todos os tokens suportam: expiração opcional, uso único ou multi-uso, ativação/pausa.

---

## Modelos do Banco

### ConviteToken (usuários)

```python
class ConviteToken(db.Model):
    __tablename__ = 'convite_tokens'

    id             = db.Column(db.Integer, primary_key=True)
    token          = db.Column(db.String(64), unique=True, nullable=False)
    role           = db.Column(db.Enum(UserRoles))           # Role a ser atribuída
    criado_por_id  = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='CASCADE'))
    criado_em      = db.Column(db.DateTime, default=brasilia_now)
    restaurante_id = db.Column(db.Integer, db.ForeignKey('restaurantes.id', ondelete='SET NULL'), nullable=True)
    usado          = db.Column(db.Boolean, default=False)
    usado_em       = db.Column(db.DateTime, nullable=True)
    usado_por_id   = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True)
    expira_em      = db.Column(db.DateTime, nullable=True)

    # Métodos:
    # gerar_token() → UUID estático
    # esta_valido() → not usado and (not expira_em or expira_em > now)
```

### ConviteRestaurante

```python
class ConviteRestaurante(db.Model):
    __tablename__ = 'convites_restaurante'

    id              = db.Column(db.Integer, primary_key=True)
    token           = db.Column(db.String(64), unique=True, nullable=False)
    criado_por_id   = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='CASCADE'))
    criado_em       = db.Column(db.DateTime, default=brasilia_now)
    expira_em       = db.Column(db.DateTime, nullable=True)
    usado           = db.Column(db.Boolean, default=False)   # Calculado dinamicamente
    usado_em        = db.Column(db.DateTime, nullable=True)
    usado_por_id    = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True)
    restaurante_id  = db.Column(db.Integer, db.ForeignKey('restaurantes.id', ondelete='SET NULL'), nullable=True)
    limite_usos     = db.Column(db.Integer, default=1)         # 1-100 usos
    quantidade_usos = db.Column(db.Integer, default=0)
    ativo           = db.Column(db.Boolean, default=True)

    # Métodos:
    # esta_valido() → ativo and quantidade_usos < limite_usos and (not expira_em or expira_em > now)
    # usos_restantes → max(0, limite_usos - quantidade_usos)
```

### ConviteFornecedor

```python
class ConviteFornecedor(db.Model):
    __tablename__ = 'convites_fornecedor'
    # Mesmos campos que ConviteRestaurante, mas com fornecedor_id ao invés de restaurante_id
    # Documentado em 15_PORTAL_FORNECEDOR.md
```

---

## Endpoints

### Convites de Usuário

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| POST | `/api/admin/convites` | ADMIN | Criar convite (`{role, restaurante_id?}`) |
| GET | `/api/admin/convites` | ADMIN | Listar convites criados |
| DELETE | `/api/admin/convites/<id>` | ADMIN | Revogar |
| GET | `/api/auth/validar-convite?token=X` | Público | Validar token |
| POST | `/api/auth/register-com-convite` | Público | Registrar com token |

**Payload POST /admin/convites:**
```json
{
  "role": "COLLABORATOR",
  "restaurante_id": 3
}
```

**Payload POST /auth/register-com-convite:**
```json
{
  "nome": "João Silva",
  "email": "joao@empresa.com",
  "senha": "senha123",
  "token_convite": "abc123def456..."
}
```

### Convites de Restaurante

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| POST | `/api/admin/convites-restaurante` | SUPER_ADMIN | Criar (`{limite_usos?}`) |
| GET | `/api/admin/convites-restaurante` | SUPER_ADMIN | Listar |
| PUT | `/api/admin/convites-restaurante/<id>` | SUPER_ADMIN | Editar (limite_usos, ativo) |
| DELETE | `/api/admin/convites-restaurante/<id>` | SUPER_ADMIN | Deletar |
| GET | `/api/public/validar-convite-restaurante?token=X` | Público | Validar |
| POST | `/api/public/register-restaurante-com-convite` | Público | Registrar restaurante |

### Convites de Fornecedor

(ver `15_PORTAL_FORNECEDOR.md`)

---

## Fluxos

### Fluxo: Convidar Usuário

```
1. Admin acessa painel → POST /admin/convites { role: "COLLABORATOR" }
2. Sistema gera token UUID único
3. Admin copia link: https://app.kaizen.com/convite?token=<TOKEN>
4. Usuário acessa link → tela RegisterConvite.tsx
5. Frontend valida: GET /auth/validar-convite?token=<TOKEN>
   → Retorna: { valido: true, role: "COLLABORATOR" }
6. Usuário preenche: nome, email, senha
7. POST /auth/register-com-convite { ...dados, token_convite: "<TOKEN>" }
8. Backend: cria Usuario com role=COLLABORATOR, aprovado=True
9. Token marcado como: usado=True, usado_em=now, usado_por_id=novo_usuario.id
```

### Fluxo: Registrar Restaurante com Convite

```
1. SUPER_ADMIN cria convite de restaurante: POST /admin/convites-restaurante
2. Link compartilhado: https://app.kaizen.com/register-restaurant?token=<TOKEN>
3. Visitante acessa link → GET /public/validar-convite-restaurante?token=<TOKEN>
4. Visitante preenche dados do restaurante + admin
5. POST /public/register-restaurante-com-convite
6. Backend cria em uma operação:
   - Restaurante (nome, slug, dados)
   - Usuario admin (role=ADMIN, aprovado=True)
7. Incrementa quantidade_usos no token
8. Multi-uso: mesmo token permite múltiplos restaurantes até limite_usos
```

---

## Regras de Validação

**Token válido se:**
- `ConviteToken`: `not usado` AND (`not expira_em` OR `expira_em > agora`)
- `ConviteRestaurante/ConviteFornecedor`: `ativo` AND `quantidade_usos < limite_usos` AND (`not expira_em` OR `expira_em > agora`)

**Segurança:**
- Tokens são UUID v4 (64 chars hex)
- Papel atribuído no token — não pode ser alterado pelo usuário
- Tokens de usuário são de uso único (padrão)
- Tokens de restaurante/fornecedor suportam multi-uso
- Admins podem revogar tokens a qualquer momento

---

## Telas do Frontend

### RegisterConvite.tsx (`/convite`)
- Valida token na montagem
- Exibe role que será atribuída
- Formulário: nome, email, senha (com show/hide)
- Erro se token inválido/expirado
- Sucesso → login automático

### GerenciarConvites.tsx (Admin — `/admin/convites`)
- Tabela de convites criados
- Colunas: Role | Criado em | Expira | Usado | Usado por | Ações
- Ações: Copiar link | WhatsApp | Deletar
- Botão "Gerar Novo Convite" com seletor de role

---

## Resumo de Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `backend/kaizen_app/models.py` | ConviteToken, ConviteRestaurante, ConviteFornecedor |
| `backend/kaizen_app/services.py` | `criar_convite_usuario`, `validar_convite`, `register_com_convite` |
| `backend/kaizen_app/controllers.py` | Endpoints admin_bp e auth_bp para convites |
| `frontend/src/features/auth/RegisterConvite.tsx` | Cadastro via convite de usuário |
| `frontend/src/features/auth/RegisterRestaurant.tsx` | Cadastro de restaurante via convite |
| `frontend/src/features/admin/GerenciarConvites.tsx` | Painel admin de convites |
