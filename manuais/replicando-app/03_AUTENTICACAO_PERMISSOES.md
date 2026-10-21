# 03 — Autenticação e Permissões

---

## Sistema de Autenticação

### JWT (JSON Web Token)

O sistema usa **Flask-JWT-Extended** com tokens armazenados em `localStorage` no frontend.

**Configuração:**
```python
# config.py
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
JWT_TOKEN_LOCATION = ['headers']
JWT_HEADER_NAME = 'Authorization'
JWT_HEADER_TYPE = 'Bearer'
JWT_IDENTITY_CLAIM = 'sub'
JWT_ERROR_MESSAGE_KEY = 'msg'   # Importante: erros JWT retornam "msg", não "error"
JWT_BLOCKLIST_ENABLED = True
```

**Expiração:** 1 dia (`timedelta(days=1)`)

### Estrutura do Token

```json
{
  "sub": 1,               // user_id (int)
  "email": "user@x.com",
  "role": "ADMIN",
  "restaurante_id": 5,   // null para SUPER_ADMIN
  "nome": "João",
  "iat": 1771384550,
  "exp": 1771989350
}
```

### Login Flow

```
POST /api/auth/login
Body: { "email": "x@x.com", "senha": "123456" }

Backend:
  1. Busca usuário por email
  2. Verifica senha com check_password_hash()
  3. Verifica aprovado=True e ativo=True
  4. Cria JWT com create_access_token(identity=user_id, additional_claims={role, email, nome, restaurante_id})
  5. Retorna { access_token, user: {...} }

Frontend:
  1. Salva token em localStorage('accessToken')
  2. Salva expiração em localStorage('sessionExpiry')
  3. Decodifica JWT com jwtDecode() → seta AuthContext
```

---

## Roles e Permissões

### Hierarquia

```
SUPER_ADMIN > ADMIN > COLLABORATOR
                    > SUPPLIER (lateral)
```

### SUPER_ADMIN
- **Acesso**: Todos os restaurantes
- **`restaurante_id`**: NULL (vê dados de todos)
- **Pode fazer tudo** que ADMIN faz, mais:
  - Gerenciar restaurantes (`/api/admin/restaurantes`)
  - Ver dashboard global (`/api/admin/super-dashboard`)
  - Aprovar cadastros de restaurantes
  - Impersonar usuários de outros restaurantes

### ADMIN
- **Acesso**: Apenas seu restaurante (`restaurante_id`)
- **Pode**:
  - CRUD completo de listas
  - Atribuir colaboradores a listas
  - Aprovar/rejeitar submissões e pedidos
  - Editar quantidades de submissões
  - Fazer merge de submissões aprovadas
  - CRUD do catálogo global (`ListaMaeItem`)
  - Gerenciar fornecedores do restaurante
  - Gerar e gerenciar cotações
  - Criar convites de usuários
  - Aprovar cadastros de colaboradores/fornecedores
  - Ver dashboard do restaurante

### COLLABORATOR
- **Acesso**: Apenas listas atribuídas a ele
- **Pode**:
  - Ver listas que lhe foram atribuídas
  - Atualizar `quantidade_atual` nos itens
  - Submeter listas (criar `Submissao`)
  - Ver histórico das próprias submissões
  - Criar sugestões de novos itens
  - Executar checklists atribuídos

### SUPPLIER
- **Acesso**: Dados do fornecedor vinculado
- **Pode**:
  - Ver e gerenciar itens do seu catálogo
  - Revisar cotações enviadas a ele
  - Ver histórico de preços

---

## Decorators de Permissão (Backend)

### `@admin_required()`
```python
def admin_required():
    def wrapper(fn):
        @wraps(fn)
        @jwt_required()
        def decorator(*args, **kwargs):
            identity = get_jwt_identity()
            # Suporta tokens antigos (dict) e novos (int)
            user_id = identity if isinstance(identity, int) else identity.get('id')
            claims = get_jwt()
            role = claims.get('role') if isinstance(identity, int) else identity.get('role')

            if role not in ['ADMIN', 'SUPER_ADMIN']:
                return jsonify({"error": "Acesso negado. Requer permissão de administrador."}), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper
```

### `@jwt_required()` (Flask-JWT-Extended)
Qualquer usuário autenticado (qualquer role).

### `@collaborator_required()` (custom)
Similar ao admin_required, mas verifica role COLLABORATOR.

### `@supplier_required()` (custom)
Verifica role SUPPLIER e que o fornecedor está aprovado.

---

## Guards do Frontend

### `ProtectedRoute`
```tsx
// Redireciona para /login se não autenticado
const ProtectedRoute = () => {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return <div>Carregando...</div>;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return <Outlet />;
};
```

### `AdminRoute`
Verifica `user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'`.

### `CollaboratorRoute`
Verifica `user.role === 'COLLABORATOR'`.

---

## AuthContext

```tsx
// context/AuthContext.tsx

interface User {
    id: string | number;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'COLLABORATOR' | 'SUPPLIER';
    nome: string;
    email: string;
    restaurante_id: number | null;
    wizard_status: Record<string, any>;
    impersonated_by?: number | null;
    impersonated_by_nome?: string | null;
    impersonated_by_email?: string | null;
}

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    login: (token: string) => void;
    logout: () => void;
    loading: boolean;
}
```

### Fluxo de inicialização
```
App inicia
    ↓
AuthContext useEffect
    ↓
Lê 'accessToken' do localStorage
    ↓
Verifica 'sessionExpiry' (se expirou → logout automático)
    ↓
jwtDecode(token) → monta objeto User
    ↓
setUser(user) → isAuthenticated = true
    ↓
Timer a cada 1 min verifica sessionExpiry
```

---

## Interceptor Axios (Frontend)

```typescript
// services/api.ts

const api = axios.create({
    baseURL: 'http://127.0.0.1:5000/api',  // ajustado por env var
    headers: { 'Content-Type': 'application/json' }
});

// Request: Adiciona JWT
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response: Trata erros
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // 401 com SESSION_SUPERSEDED = sessão tomada por outro login
        if (error.response?.status === 401 &&
            error.response?.data?.code === 'SESSION_SUPERSEDED') {
            window.dispatchEvent(new CustomEvent('kaizen-session-superseded'));
        }
        return Promise.reject(error);
    }
);
```

**Importante:** Erros JWT (token expirado, assinatura inválida) retornam `422` com `{ "msg": "..." }` — não `401`. O frontend deve tratar `422` como falha de auth quando `msg` estiver presente.

---

## Registro e Aprovação de Usuários

### Fluxo completo
```
1. Usuário acessa /register (ou /convite?token=XXX)
2. POST /api/auth/register → cria com aprovado=False
3. Admin recebe notificação
4. Admin acessa /admin/gerenciar-usuarios
5. Admin clica "Aprovar" → POST /api/admin/users/:id/approve
6. Usuário pode agora fazer login
```

### Via convite
```
1. Admin gera convite → POST /api/admin/convites
2. Envia link /convite?token=XXX para o usuário
3. Usuário registra diretamente aprovado=True
```

---

## Endpoints de Autenticação

| Método | Endpoint | Auth | Payload | Resposta |
|--------|----------|------|---------|----------|
| POST | `/api/auth/register` | Público | `{nome, email, senha}` | `{message, user}` |
| POST | `/api/auth/login` | Público | `{email, senha}` | `{access_token, user}` |
| POST | `/api/auth/change-password` | JWT | `{senha_atual, nova_senha, confirmar_senha}` | `{message}` |
| GET | `/api/auth/profile` | JWT | — | `{user}` |
| PUT | `/api/auth/profile` | JWT | `{nome, ...}` | `{user}` |
| GET | `/api/auth/session` | JWT | — | `{valid: true, user}` |
| PATCH | `/api/auth/profile/wizard` | JWT | `{wizard_status: {...}}` | `{wizard_status}` |
| GET | `/api/auth/notificacoes` | JWT | — | `[notificacao]` |
| POST | `/api/auth/notificacoes/:id/lida` | JWT | — | `{message}` |
| GET | `/api/auth/navbar-preferences` | JWT | — | `{categorias_estado}` |
| PUT | `/api/auth/navbar-preferences` | JWT | `{categorias_estado}` | `{message}` |
| GET | `/api/auth/navbar-layout` | JWT | `?role=ADMIN` | `{layout}` |
| GET | `/api/auth/navbar-activity` | JWT | — | `{atividades}` |
