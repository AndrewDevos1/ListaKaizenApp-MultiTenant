# 🚂 Guia Completo - Configuração Railway

## 📋 Situação Atual

**Problema:** Backend no Railway não consegue conectar no PostgreSQL
- ❌ Erro: `connection to server at "postgres-production-f11c.up.railway.app" (66.33.22.97), port 5432 failed: timeout expired`
- ❌ Status: 502 Bad Gateway em `/api/v1/fornecedores`
- ❌ Status: 500 Internal Server Error em `/api/admin/listas/1/lista-mae`

**Causa:** O Railway está usando a URL PÚBLICA do PostgreSQL. Dentro do Railway, os serviços devem se comunicar via **rede privada interna**.

---

## ✅ Solução - Configuração Correta

### 1️⃣ Configurar Variáveis no Backend (kaizen-lists-api)

No Railway, vá em: **kaizen-lists-api** → **Variables** → Adicione estas variáveis:

```bash
# 🔐 Chaves Secretas
SECRET_KEY=seu-secret-key-aqui-aleatorio-min-32-caracteres
JWT_SECRET_KEY=seu-jwt-secret-aqui-aleatorio-min-16-caracteres

# 🗄️ Banco de Dados (USA A URL INTERNA DO RAILWAY)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# ⚙️ Flask Config
FLASK_APP=run.py
FLASK_CONFIG=production
FLASK_DEBUG=0

# 🌍 CORS (permite o frontend Railway)
CORS_ORIGINS=https://kaizen-compras.up.railway.app
```

### 2️⃣ Configurar Variáveis no Frontend (React Frontend)

No Railway, vá em: **React Frontend** → **Variables** → Adicione:

```bash
# 🔗 URL da API (endereço público do backend)
REACT_APP_API_BASE_URL=https://kaizen-lists-api-production.up.railway.app
```

### 3️⃣ Verificar Postgres

No Railway, vá em: **Postgres** → **Variables**

Verifique se existe a variável:
- `DATABASE_URL` - Esta é a URL **INTERNA** que o backend deve usar

---

## 🔍 Como Usar ${{Postgres.DATABASE_URL}}

Quando você coloca `${{Postgres.DATABASE_URL}}` no campo DATABASE_URL do backend, o Railway **automaticamente** injeta a URL interna do PostgreSQL.

**URL Interna (Railway):**
```
postgresql://postgres:senha@postgres.railway.internal:5432/railway
```

**URL Pública (ERRADA para usar dentro do Railway):**
```
postgresql://postgres:senha@postgres-production-f11c.up.railway.app:5432/railway
```

---

## 📝 Passo a Passo Visual no Railway

### Backend (kaizen-lists-api)

1. Clique em **kaizen-lists-api**
2. Vá em **Variables**
3. Clique em **+ New Variable**
4. Adicione uma por vez:

| Variable Name | Variable Value |
|--------------|----------------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `SECRET_KEY` | `Kaiser-2024-Production-Secret-Key-1234567890` |
| `JWT_SECRET_KEY` | `Kaiser-JWT-2024-1234567890` |
| `FLASK_APP` | `run.py` |
| `FLASK_CONFIG` | `production` |
| `FLASK_DEBUG` | `0` |
| `CORS_ORIGINS` | `https://kaizen-compras.up.railway.app` |

5. Clique em **Deploy** (botão roxo no topo)

### Frontend (React Frontend)

1. Clique em **React Frontend**
2. Vá em **Variables**
3. Clique em **+ New Variable**
4. Adicione:

| Variable Name | Variable Value |
|--------------|----------------|
| `REACT_APP_API_BASE_URL` | `https://kaizen-lists-api-production.up.railway.app` |

5. Clique em **Deploy** (botão roxo no topo)

---

## ⚠️ Importante

### Para Desenvolvimento Local

O arquivo `backend/.env` já está correto:
```bash
# Usa SQLite local automaticamente
FLASK_CONFIG=development
FLASK_DEBUG=1
SECRET_KEY=chave-super-secreta-local-desenvolvimento-2024
```

### Para Produção Railway

**NÃO** precisa alterar código! Só configurar as variáveis no Railway dashboard.

---

## 🧪 Como Testar Após Deploy

1. **Aguarde o deploy terminar** (veja em Activity)
2. **Abra o frontend:** `https://kaizen-compras.up.railway.app`
3. **Faça login**
4. **Crie uma lista nova**
5. **Veja se os itens aparecem** (fornecedores, lista mãe)

---

## 🆘 Se Ainda Não Funcionar

### Ver Logs do Backend

1. No Railway: **kaizen-lists-api** → **Deployments**
2. Clique no último deploy
3. Vá em **Deploy Logs**
4. Procure por erros

### Ver Logs do Frontend

1. No Railway: **React Frontend** → **Deployments**
2. Clique no último deploy
3. Vá em **Deploy Logs**

### Comandos Úteis

Para testar a conexão do PostgreSQL:

```bash
# No Railway, vá em Postgres → Connect
# Use o comando sugerido para conectar via CLI
```

---

## 📞 Próximos Passos

1. ✅ Configure as variáveis do backend (DATABASE_URL com ${{Postgres.DATABASE_URL}})
2. ✅ Configure as variáveis do frontend (REACT_APP_API_BASE_URL)
3. ✅ Faça deploy de ambos
4. ✅ Teste login e criação de listas
5. ✅ Me avise se funcionou ou se precisa ajustar algo

---

## 🎯 Resultado Esperado

Após configurar corretamente:

- ✅ Login funciona
- ✅ Criar lista funciona
- ✅ Ver lista mãe (itens) funciona
- ✅ Fornecedores aparecem
- ✅ Não tem mais erro 502 ou 500

---

**Última atualização:** 24/12/2025 - 01:14 (Horário de Brasília)
