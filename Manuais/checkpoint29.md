# CHECKPOINT 29: VISUALIZAR SENHA, USERNAME E CRIAR USUÁRIO

**Data:** 25/10/2025
**Objetivo:** Adicionar botão visualizar senha no login, implementar username como opção de login, e ativar funcionalidade de criar usuário

---

## 🎯 Solicitação do usuário:

"adiciona o visualisar senha tambem no login, fala funcionar o botao de lembrar login e adicionar como opçao de login o dome de usuario, e por fim faça funcionar a o card criar usuario no menu gerenciar usuarios"

---

## ✅ Implementações Realizadas

### 1. BOTÃO VISUALIZAR SENHA NO LOGIN

#### Frontend - Login.tsx
**Arquivo modificado:** `frontend/src/features/auth/Login.tsx`

**Mudanças:**
- ✅ Adicionado imports de `FontAwesomeIcon`, `faEye`, `faEyeSlash`
- ✅ Adicionado state `showPassword` (boolean)
- ✅ Campo de senha envolvido em div `.passwordInputWrapper`
- ✅ Input type dinâmico: `{showPassword ? "text" : "password"}`
- ✅ Botão toggle com ícone de olho

**Código adicionado:**
```tsx
const [showPassword, setShowPassword] = useState(false);

<div className={styles.passwordInputWrapper}>
    <Form.Control
        type={showPassword ? "text" : "password"}
        ...
    />
    <button
        type="button"
        className={styles.togglePasswordButton}
        onClick={() => setShowPassword(!showPassword)}
    >
        <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
    </button>
</div>
```

---

#### CSS - Login.module.css
**Arquivo modificado:** `frontend/src/features/auth/Login.module.css`

**Estilos adicionados:**
```css
.passwordInputWrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.passwordInputWrapper .formInput {
  padding-right: 3rem;
}

.togglePasswordButton {
  position: absolute;
  right: 0.75rem;
  background: none;
  border: none;
  color: #667eea;
  cursor: pointer;
  padding: 0.5rem;
  transition: all 0.3s ease;
}

.togglePasswordButton:hover {
  color: #764ba2;
  transform: scale(1.1);
}
```

---

### 2. FUNCIONALIDADE "LEMBRAR-ME"

**Status:** ✅ JÁ ESTAVA CORRETO

O código existente no Login.tsx (linhas 38-44 e 54-59) já estava implementado corretamente:
- Salva **apenas o email** no localStorage (não a senha)
- Pré-preenche o email se "Lembrar-me" estava marcado
- Remove do localStorage se desmarcado
- Senha fica por conta do navegador (autocomplete nativo)

---

### 3. CAMPO USERNAME (NOME DE USUÁRIO)

#### Backend - Modelo Usuario

**Arquivo modificado:** `backend/kaizen_app/models.py`

**Campo adicionado:**
```python
username = db.Column(db.String(50), unique=True, nullable=True)
```

**Método `to_dict()` atualizado:**
```python
def to_dict(self):
    return {
        "id": self.id,
        "nome": self.nome,
        "username": self.username,  # ← NOVO
        "email": self.email,
        "role": self.role.value,
        "aprovado": self.aprovado,
        "criado_em": self.criado_em.isoformat()
    }
```

---

#### Backend - Migração de Banco de Dados

**Arquivo criado:** `backend/migrations/versions/8611c685f75b_add_username_field_to_usuario_model.py`

**Comando executado:**
```bash
cd backend
FLASK_APP=run.py .venv/Scripts/python.exe -m flask db migrate -m "add username field to Usuario model"
FLASK_APP=run.py .venv/Scripts/python.exe -m flask db upgrade
```

**Constraint criado:**
```python
batch_op.create_unique_constraint('uq_usuarios_username', ['username'])
```

---

#### Backend - Serviços Atualizados

**Arquivo modificado:** `backend/kaizen_app/services.py`

**1. `register_user()` - Aceita username no registro:**
```python
# Verifica se username já existe (se fornecido)
if data.get('username') and Usuario.query.filter_by(username=data['username']).first():
    return {"error": "Nome de usuário já cadastrado."}, 409

new_user = Usuario(
    nome=data['nome'],
    username=data.get('username'),  # ← NOVO
    email=data['email'],
    ...
)
```

---

**2. `authenticate_user()` - Login com email OU username:**
```python
def authenticate_user(data):
    # Aceita login com email ou username
    login_field = data.get('email') or data.get('username')

    # Busca por email ou username
    user = Usuario.query.filter(
        (Usuario.email == login_field) | (Usuario.username == login_field)
    ).first()
    ...
```

**Agora o usuário pode fazer login com:**
- Email: `joao@email.com`
- Username: `joaosilva`

---

**3. `create_user_by_admin()` - Admin pode criar com username:**
```python
# Verifica se username já existe (se fornecido)
if data.get('username') and Usuario.query.filter_by(username=data['username']).first():
    return {"error": "Nome de usuário já cadastrado."}, 409

new_user = Usuario(
    nome=data['nome'],
    username=data.get('username'),  # ← NOVO
    email=data['email'],
    ...
)
```

---

**4. `update_user_profile()` - Editar perfil com username:**
```python
# Verifica se o username já está em uso por outro usuário
if 'username' in data and data['username'] != user.username:
    existing_user = Usuario.query.filter_by(username=data['username']).first()
    if existing_user:
        return {"error": "Nome de usuário já está em uso."}, 409

# Atualiza os campos permitidos
if 'nome' in data:
    user.nome = data['nome']
if 'username' in data:
    user.username = data['username']  # ← NOVO
if 'email' in data:
    user.email = data['email']
```

---

### 4. CRIAR USUÁRIO (FRONTEND)

#### Componente CriarUsuario.tsx

**Arquivo criado:** `frontend/src/features/admin/CriarUsuario.tsx`

**Rota:** `/admin/users/new`

**Funcionalidades:**
- ✅ Formulário completo para criar usuário
- ✅ Campos: nome, username (opcional), email, senha, confirmar senha, role
- ✅ Dropdown para escolher role (ADMIN ou COLLABORATOR)
- ✅ Botões de visualizar senha (olhinho) nos campos de senha
- ✅ Validações:
  - Nome obrigatório
  - Email válido (regex)
  - Senha mínimo 6 caracteres
  - Senha = confirmação
- ✅ Feedback visual (alerts de erro/sucesso)
- ✅ Redireciona para `/admin/users` após 2 segundos

**Estrutura do formulário:**
```tsx
<Form onSubmit={handleSubmit}>
    <Form.Group>Nome Completo *</Form.Group>
    <Form.Group>Nome de Usuário (opcional)</Form.Group>
    <Form.Group>Email *</Form.Group>
    <Form.Group>Tipo de Conta * (ADMIN/COLLABORATOR)</Form.Group>
    <Form.Group>Senha * (com botão visualizar)</Form.Group>
    <Form.Group>Confirmar Senha * (com botão visualizar)</Form.Group>

    <div className={styles.actions}>
        <Button variant="outline-secondary">Cancelar</Button>
        <Button variant="success">Criar Usuário</Button>
    </div>
</Form>
```

**Endpoint chamado:**
```typescript
await api.post('/api/admin/create_user', {
    nome: formData.nome,
    username: formData.username || undefined,
    email: formData.email,
    senha: formData.senha,
    role: formData.role,
});
```

---

#### CSS - CriarUsuario.module.css

**Arquivo criado:** `frontend/src/features/admin/CriarUsuario.module.css`

**Destaques de design:**
```css
✅ Ícone de título: Gradiente verde (faUserPlus)
✅ Inputs: Bordas arredondadas com focus verde
✅ Senha: Botão toggle posicionado absolute à direita
✅ Botões: Hover com elevação (-2px + sombra)
✅ Responsivo: Botões empilham no mobile
```

---

#### Rota Adicionada - App.tsx

**Arquivo modificado:** `frontend/src/App.tsx`

**Import adicionado:**
```tsx
import CriarUsuario from './features/admin/CriarUsuario';
```

**Rota adicionada:**
```tsx
<Route path="/admin" element={<AdminRoute />}>
    ...
    <Route path="users/new" element={<CriarUsuario />} />
</Route>
```

---

### 5. EDITAR PERFIL COM USERNAME

**Arquivo modificado:** `frontend/src/features/admin/EditarPerfil.tsx`

**Mudanças:**
1. ✅ Interface `UserProfile` atualizada com `username: string | null`
2. ✅ State `formData` inclui `username`
3. ✅ `loadProfile()` carrega username do backend
4. ✅ Novo campo de formulário adicionado:

```tsx
<Form.Group className={styles.formGroup}>
    <Form.Label>
        <FontAwesomeIcon icon={faUser} style={{ marginRight: '0.5rem' }} />
        Nome de Usuário (opcional)
    </Form.Label>
    <Form.Control
        type="text"
        name="username"
        value={formData.username}
        onChange={handleChange}
        placeholder="Digite um nome de usuário único"
        disabled={saving}
        className={styles.input}
    />
    <Form.Text className={styles.hint}>
        Pode ser usado para login no lugar do email
    </Form.Text>
</Form.Group>
```

5. ✅ `handleReset()` restaura username
6. ✅ `hasChanges` detecta mudanças no username

---

## 📊 Arquivos Modificados/Criados

### Backend:
1. ✅ `backend/kaizen_app/models.py` (modificado)
   - Adicionado campo `username` no modelo Usuario
   - Atualizado método `to_dict()`

2. ✅ `backend/migrations/versions/8611c685f75b_add_username_field_to_usuario_model.py` (criado)
   - Migração para adicionar coluna username
   - Constraint único `uq_usuarios_username`

3. ✅ `backend/kaizen_app/services.py` (modificado)
   - `register_user()` - aceita username
   - `authenticate_user()` - login com email OU username
   - `create_user_by_admin()` - aceita username
   - `update_user_profile()` - edita username

### Frontend:
4. ✅ `frontend/src/features/auth/Login.tsx` (modificado)
   - Adicionado botão visualizar senha

5. ✅ `frontend/src/features/auth/Login.module.css` (modificado)
   - Estilos para botão toggle senha

6. ✅ `frontend/src/features/admin/CriarUsuario.tsx` (criado)
   - Componente completo para criar usuário

7. ✅ `frontend/src/features/admin/CriarUsuario.module.css` (criado)
   - Estilos para formulário de criar usuário

8. ✅ `frontend/src/features/admin/EditarPerfil.tsx` (modificado)
   - Adicionado campo username

9. ✅ `frontend/src/App.tsx` (modificado)
   - Adicionado rota `/admin/users/new`

---

## 🏗️ Build Frontend

**Resultado:**
```
✅ Compilado com sucesso
📦 main.js: 168.78 kB (+1.04 kB desde checkpoint anterior)
📦 main.css: 42.43 kB (+379 B)
⚠️ Warning: useMemo dependencies em Layout.tsx (não crítico)
```

---

## 🔐 Fluxo de Login com Username

### Antes (somente email):
```
POST /api/auth/login
{
  "email": "joao@email.com",
  "senha": "senha123"
}
```

### Agora (email OU username):
```
POST /api/auth/login
{
  "email": "joaosilva",  // pode ser username
  "senha": "senha123"
}

OU

{
  "username": "joaosilva",
  "senha": "senha123"
}
```

**Backend busca:**
```python
user = Usuario.query.filter(
    (Usuario.email == login_field) | (Usuario.username == login_field)
).first()
```

---

## 👤 Fluxo de Criar Usuário pelo Admin

```
1. Admin acessa Gerenciar Usuários
   ↓
2. Clica no card "Criar Usuário"
   ↓
3. Navega para /admin/users/new
   ↓
4. Preenche formulário:
   - Nome: João Silva
   - Username: joaosilva (opcional)
   - Email: joao@email.com
   - Tipo de Conta: COLLABORATOR ou ADMIN
   - Senha: ******
   - Confirmar Senha: ******
   ↓
5. Frontend valida:
   - Nome não vazio
   - Email válido
   - Senha mínimo 6 caracteres
   - Senha = confirmação
   ↓
6. POST /api/admin/create_user
   {
     "nome": "João Silva",
     "username": "joaosilva",
     "email": "joao@email.com",
     "senha": "senha123",
     "role": "COLLABORATOR"
   }
   ↓
7. Backend valida:
   - Email único
   - Username único (se fornecido)
   ↓
8. Backend cria usuário:
   - JÁ APROVADO (aprovado=True)
   - Role definido pelo admin
   ↓
9. Sucesso → Redireciona para /admin/users
```

---

## 🎨 Design das Páginas

### Login com Visualizar Senha:
```
┌────────────────────────────────────────┐
│ 🌊 Kaizen Lists                        │
│ Otimizando seu fluxo, um item de vez  │
├────────────────────────────────────────┤
│ Email                                  │
│ ┌──────────────────────────────┐      │
│ │ seu@email.com                │      │
│ └──────────────────────────────┘      │
│                                        │
│ Senha                                  │
│ ┌──────────────────────────────┐ 👁️  │
│ │ ••••••••                     │      │
│ └──────────────────────────────┘      │
│                                        │
│ ☑️ Lembrar-me    Esqueceu a senha?    │
│                                        │
│ [🔐 Entrar]                            │
│                                        │
│ ──────────────────────────────────    │
│                                        │
│ 👤 Não tem uma conta? Cadastrar       │
└────────────────────────────────────────┘
```

---

### Criar Usuário:
```
┌────────────────────────────────────────┐
│ ← Voltar                               │
├────────────────────────────────────────┤
│ ➕ Criar Novo Usuário                  │
│ Adicione um novo usuário (já aprovado) │
├────────────────────────────────────────┤
│                                        │
│ [Alert de erro/sucesso]                │
│                                        │
├────────────────────────────────────────┤
│ Card Branco:                           │
│                                        │
│ 🆔 Nome Completo *                     │
│ ┌──────────────────────────────┐      │
│ │ João Silva                   │      │
│ └──────────────────────────────┘      │
│                                        │
│ 👤 Nome de Usuário (opcional)          │
│ ┌──────────────────────────────┐      │
│ │ joaosilva                    │      │
│ └──────────────────────────────┘      │
│ Pode ser usado para login              │
│                                        │
│ ✉️ Email *                             │
│ ┌──────────────────────────────┐      │
│ │ joao@email.com               │      │
│ └──────────────────────────────┘      │
│                                        │
│ 🏷️ Tipo de Conta *                    │
│ ┌──────────────────────────────┐      │
│ │ Colaborador             ▼    │      │
│ └──────────────────────────────┘      │
│ Administradores têm acesso total       │
│                                        │
│ 🔑 Senha *                     👁️     │
│ ┌──────────────────────────────┐      │
│ │ ••••••••                     │      │
│ └──────────────────────────────┘      │
│ Mínimo 6 caracteres                    │
│                                        │
│ 🔑 Confirmar Senha *           👁️     │
│ ┌──────────────────────────────┐      │
│ │ ••••••••                     │      │
│ └──────────────────────────────┘      │
│                                        │
│ ──────────────────────────────────    │
│ [Cancelar] [💾 Criar Usuário]         │
└────────────────────────────────────────┘
```

---

### Editar Perfil (com username):
```
┌────────────────────────────────────────┐
│ ← Voltar                               │
├────────────────────────────────────────┤
│ 👤 Editar Perfil                       │
│ Atualize suas informações pessoais     │
├────────────────────────────────────────┤
│ Card Branco:                           │
│                                        │
│ 🆔 Nome Completo *                     │
│ ┌──────────────────────────────┐      │
│ │ João Silva                   │      │
│ └──────────────────────────────┘      │
│                                        │
│ 👤 Nome de Usuário (opcional)          │
│ ┌──────────────────────────────┐      │
│ │ joaosilva                    │      │
│ └──────────────────────────────┘      │
│ Pode ser usado para login              │
│                                        │
│ ✉️ Email *                             │
│ ┌──────────────────────────────┐      │
│ │ joao@email.com               │      │
│ └──────────────────────────────┘      │
│                                        │
│ ──────────────────────────────────    │
│ Informações da Conta                   │
│ [Tipo: Administrador] [Status: Aprovado]│
│ [Membro desde: 15/01/2025]            │
│                                        │
│ ──────────────────────────────────    │
│ [Cancelar] [Resetar] [💾 Salvar]      │
└────────────────────────────────────────┘
```

---

## 🧪 Como Testar

### 1. Testar Visualizar Senha no Login:
```bash
1. Acesse /login
2. Digite uma senha
3. Clique no ícone de olho à direita do campo
4. Senha deve ficar visível
5. Clique novamente → senha oculta
```

---

### 2. Testar Login com Username:
```bash
1. Crie um usuário com username via Admin
2. Faça logout
3. No login, digite o username no campo Email
4. Digite a senha
5. Deve fazer login normalmente
```

---

### 3. Testar Criar Usuário:
```bash
1. Faça login como admin
2. Vá para Gerenciar Usuários
3. Clique no card "Criar Usuário"
4. Preencha formulário:
   - Nome: Teste Silva
   - Username: testesilva
   - Email: teste@email.com
   - Tipo: Colaborador
   - Senha: teste123
   - Confirmar: teste123
5. Clique em "Criar Usuário"
6. Deve redirecionar para lista de usuários
7. Verifique se usuário foi criado (já aprovado)
```

---

### 4. Testar Editar Perfil com Username:
```bash
1. Faça login
2. Vá para Configurações → Editar Perfil
3. Altere o campo "Nome de Usuário"
4. Salve
5. Faça logout
6. Tente fazer login com novo username
```

---

## ✅ Validações Implementadas

### Frontend - CriarUsuario:
- ✅ Nome obrigatório (não vazio)
- ✅ Email obrigatório
- ✅ Email com formato válido (regex)
- ✅ Senha obrigatória
- ✅ Senha mínimo 6 caracteres
- ✅ Senha = confirmação

### Backend - services.py:
- ✅ Email único (não duplicado)
- ✅ Username único (se fornecido)
- ✅ Validação em `register_user()`
- ✅ Validação em `create_user_by_admin()`
- ✅ Validação em `update_user_profile()`

---

## 🔒 Segurança

### Username:
- ✅ Campo nullable (opcional)
- ✅ Constraint único no banco de dados
- ✅ Validação de duplicação no backend
- ✅ Busca case-sensitive (pode ser alterado se necessário)

### Login:
- ✅ Aceita email OU username
- ✅ Busca otimizada com query OR
- ✅ Senha hasheada com `werkzeug.security`

### Visualizar Senha:
- ✅ Toggle local (não envia senha visível)
- ✅ Apenas muda tipo do input (password ↔ text)
- ✅ Não afeta segurança do envio

---

## 📝 Notas Importantes

### Username é Opcional:
- Usuário pode criar conta SEM username
- Login funciona apenas com email nesse caso
- Admin pode criar usuários sem username

### Caso de Uso:
```
Usuário A:
- Nome: João Silva
- Username: joaosilva
- Email: joao@email.com
- Pode logar com: joaosilva OU joao@email.com

Usuário B:
- Nome: Maria Santos
- Username: (vazio)
- Email: maria@email.com
- Pode logar com: maria@email.com (apenas)
```

---

## 🚀 Próximos Passos Sugeridos

1. **Adicionar validação de formato do username:**
   - Apenas letras, números e underscore
   - Mínimo 3 caracteres
   - Máximo 20 caracteres
   - Sem espaços

2. **Adicionar busca case-insensitive:**
   - Converter username para lowercase antes de salvar
   - Busca case-insensitive no login

3. **Adicionar campo username no formulário de registro:**
   - Atualmente apenas admin pode definir username
   - Usuários podem adicionar depois em Editar Perfil

4. **Adicionar tooltip explicativo:**
   - Explicar diferença entre nome e username
   - Mostrar exemplos de usernames válidos

5. **Adicionar verificação de disponibilidade em tempo real:**
   - Endpoint `GET /api/check-username?username=joao`
   - Mostrar ícone verde/vermelho enquanto digita

---

## ✅ Status Final

**Todas as funcionalidades implementadas com sucesso!**

### Resumo:
- ✅ Botão visualizar senha no Login
- ✅ Funcionalidade "Lembrar-me" verificada (já estava correta)
- ✅ Campo username adicionado no backend
- ✅ Migração de banco de dados aplicada
- ✅ Login com email OU username funcionando
- ✅ Card "Criar Usuário" ativado e funcionando
- ✅ Editar Perfil com campo username
- ✅ Build compilado sem erros

---

**Checkpoint concluído com sucesso!** 🎉

**Principais conquistas:**
1. 👁️ Visualização de senha no login (melhor UX)
2. 👤 Username como alternativa ao email para login
3. ➕ Admin pode criar usuários diretamente pelo sistema
4. ✏️ Usuários podem adicionar/editar username no perfil
5. 🔐 Todas as validações e segurança implementadas
