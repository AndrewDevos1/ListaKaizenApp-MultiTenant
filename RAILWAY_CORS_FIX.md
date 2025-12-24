# 🔧 Correção CORS e Configuração Railway

**Data:** 24/12/2025 00:19 (Horário de Brasília)  
**Problema:** Frontend no Railway retorna 502 Bad Gateway ao acessar Backend  
**Causa:** Variáveis de ambiente não configuradas corretamente

---

## 📋 Diagnóstico

### ✅ O que está funcionando:
- Login funciona localmente (localhost:3000 → localhost:5000)
- Backend sobe corretamente com SQLite local
- CORS configurado no código backend

### ❌ O que não está funcionando:
- Frontend Railway → Backend Railway retorna **502 Bad Gateway**
- Erro ao acessar `/api/v1/fornecedores`, `/api/admin/listas/X/lista-mae`

---

## 🎯 Solução: Configurar Variáveis no Railway

### 1️⃣ **Backend (kaizen-lists-api)**

Acesse: Railway > kaizen-lists-api > **Variables** > **New Variable**

Adicione estas variáveis:

```bash
# Database - PostgreSQL do Railway
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Flask Configuration
FLASK_APP=run.py
FLASK_CONFIG=production
FLASK_DEBUG=0

# Security Keys (gere chaves seguras!)
SECRET_KEY=sua-chave-secreta-super-segura-minimo-32-caracteres
JWT_SECRET_KEY=sua-jwt-key-secreta-minimo-32-caracteres

# CORS Origins - Frontend Railway
CORS_ORIGINS=https://kaizen-compras.up.railway.app,http://localhost:3000
```

**⚠️ IMPORTANTE:**
- `DATABASE_URL` deve referenciar o serviço Postgres: `${{Postgres.DATABASE_URL}}`
- Gere `SECRET_KEY` e `JWT_SECRET_KEY` aleatórias (mínimo 32 caracteres)
- `CORS_ORIGINS` deve incluir a URL do frontend Railway

---

### 2️⃣ **Frontend (React Frontend)**

Acesse: Railway > React Frontend > **Variables** > **New Variable**

Adicione esta variável:

```bash
# Backend API URL
REACT_APP_API_BASE_URL=https://kaizen-lists-api-production.up.railway.app
```

**⚠️ IMPORTANTE:**
- Use a URL pública do backend Railway (sem `/api` no final)

---

### 3️⃣ **PostgreSQL (Postgres)**

✅ **Já está configurado!**

O Railway cria automaticamente estas variáveis:
- `DATABASE_URL` - URL de conexão
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

---

## 🔄 Após Configurar Variáveis

### 1. **Redeploy do Backend**

```bash
Railway > kaizen-lists-api > Settings > Deploy > Redeploy
```

### 2. **Redeploy do Frontend**

```bash
Railway > React Frontend > Settings > Deploy > Redeploy
```

### 3. **Verificar Logs**

Monitore os logs durante o deploy:

**Backend:**
```
✅ Usando PostgreSQL em produção
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
 * Running on http://0.0.0.0:5000
```

**Frontend:**
```
> vite build
✓ built in Xs
Creating optimized production build...
```

---

## 🧪 Testar a Correção

### 1. **Health Check do Backend**

Acesse no navegador:
```
https://kaizen-lists-api-production.up.railway.app/
```

Deve retornar:
```json
{
  "status": "ok",
  "message": "Kaizen Lists API está rodando!",
  "version": "1.0.0"
}
```

### 2. **Testar Login no Frontend**

Acesse:
```
https://kaizen-compras.up.railway.app
```

Faça login com:
- **Email:** andrew.andyoo@gmail.com
- **Senha:** 210891

### 3. **Verificar CORS**

Abra o **Console do Navegador** (F12) e verifique se não há erros de CORS.

---

## 🔍 Troubleshooting

### Erro 502 Bad Gateway persiste?

**1. Verifique se DATABASE_URL está configurada:**

```bash
Railway > kaizen-lists-api > Variables > DATABASE_URL
```

Deve estar como: `${{Postgres.DATABASE_URL}}`

**2. Verifique os logs do backend:**

```bash
Railway > kaizen-lists-api > Deployments > [último deploy] > View Logs
```

Procure por erros como:
- `DATABASE_URL não configurado`
- `connection to server failed`
- `relation "X" does not exist`

**3. Verifique se o PostgreSQL está rodando:**

```bash
Railway > Postgres > Metrics
```

Deve mostrar status **Active**.

---

### CORS ainda bloqueado?

**1. Verifique CORS_ORIGINS no backend:**

```bash
Railway > kaizen-lists-api > Variables > CORS_ORIGINS
```

Deve incluir: `https://kaizen-compras.up.railway.app`

**2. Verifique REACT_APP_API_BASE_URL no frontend:**

```bash
Railway > React Frontend > Variables > REACT_APP_API_BASE_URL
```

Deve ser: `https://kaizen-lists-api-production.up.railway.app`

**3. Limpe o cache do navegador:**

```
Ctrl + Shift + Delete > Limpar cache e cookies
```

---

## 📊 Resumo das Variáveis

### Backend (kaizen-lists-api)

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Conexão PostgreSQL |
| `FLASK_APP` | `run.py` | Arquivo principal Flask |
| `FLASK_CONFIG` | `production` | Ambiente de produção |
| `FLASK_DEBUG` | `0` | Debug desativado |
| `SECRET_KEY` | `[gerar aleatório]` | Chave secreta Flask |
| `JWT_SECRET_KEY` | `[gerar aleatório]` | Chave JWT |
| `CORS_ORIGINS` | `https://kaizen-compras.up.railway.app,http://localhost:3000` | Origins permitidas |

### Frontend (React Frontend)

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `REACT_APP_API_BASE_URL` | `https://kaizen-lists-api-production.up.railway.app` | URL da API |

---

## 🎉 Resultado Esperado

Após configurar corretamente:

✅ Login funciona no Railway  
✅ Dashboard carrega dados  
✅ Listas de compras aparecem  
✅ Lista Mãe (itens) carrega corretamente  
✅ Fornecedores são listados  
✅ Sem erros de CORS no console  
✅ Backend não crasha (502 resolvido)

---

## 📞 Próximos Passos

1. ✅ Configurar variáveis no Railway
2. ✅ Fazer redeploy (backend e frontend)
3. ✅ Testar login e navegação
4. ✅ Verificar se lista mãe carrega itens
5. ✅ Criar primeiro usuário admin se necessário

---

**Última atualização:** 24/12/2025 00:19 BRT
