# 🚂 Configuração do Railway - Guia Completo

## ⚠️ PROBLEMA ATUAL

O backend está tentando conectar ao PostgreSQL usando o **domínio público** do Railway, mas deveria usar o **DNS privado interno**.

---

## 📋 CONFIGURAÇÃO CORRETA DAS VARIÁVEIS NO RAILWAY

### 🔹 Serviço: `kaizen-lists-api` (Backend)

Vá em: **kaizen-lists-api → Variables** e configure:

```env
# 🗄️ BANCO DE DADOS - USA DNS PRIVADO DO RAILWAY!
DATABASE_URL=postgresql://postgres:jdmrKwvtVwncIsPChhdOEQLyCSnphyAm@postgres.railway.internal:5432/railway

# ⚙️ CONFIGURAÇÃO DO FLASK
FLASK_APP=run.py
FLASK_CONFIG=production
FLASK_ENV=production
FLASK_DEBUG=0

# 🔐 SEGURANÇA (gere novas chaves!)
SECRET_KEY=sua-chave-secreta-super-segura-aqui-minimo-32-caracteres
JWT_SECRET_KEY=sua-chave-jwt-diferente-super-segura-minimo-32-caracteres

# 🌍 CORS - FRONTEND NO RAILWAY
CORS_ORIGINS=https://kaizen-compras.up.railway.app,https://lista-kaizen-app.vercel.app
```

#### 🔑 IMPORTANTE - DNS CORRETO:
- ❌ **ERRADO:** `postgres-production-f11c.up.railway.app` (público)
- ✅ **CERTO:** `postgres.railway.internal` (privado)

---

### 🔹 Serviço: `React Frontend`

Vá em: **React Frontend → Variables** e configure:

```env
# 🔗 API DO BACKEND - USA DNS PÚBLICO DO RAILWAY
VITE_API_BASE_URL=https://kaizen-lists-api-production.up.railway.app/api
```

---

## 🔧 CONFIGURAÇÃO DE BUILD E DEPLOY

### Backend (`kaizen-lists-api`)

#### Root Directory:
```
backend
```

#### Build Command:
```bash
pip install -r requirements.txt
```

#### Start Command:
```bash
gunicorn -w 4 -b 0.0.0.0:$PORT run:app
```

#### Pre-deploy Command (IMPORTANTE - para rodar migrations):
```bash
flask db upgrade
```

---

### Frontend (`React Frontend`)

#### Root Directory:
```
frontend
```

#### Build Command:
```bash
npm install && npm run build
```

#### Start Command:
```bash
npm run preview -- --host 0.0.0.0 --port $PORT
```

---

## ✅ PASSO A PASSO PARA CORRIGIR

### 1️⃣ Atualizar variável do backend

1. Acesse: **Railway → kaizen-lists-api → Variables**
2. Encontre a variável `DATABASE_URL`
3. **MUDE** de:
   ```
   postgresql://postgres:jdmrKwvtVwncIsPChhdOEQLyCSnphyAm@postgres-production-f11c.up.railway.app:5432/railway
   ```
   
   **PARA:**
   ```
   postgresql://postgres:jdmrKwvtVwncIsPChhdOEQLyCSnphyAm@postgres.railway.internal:5432/railway
   ```

4. Clique em **Update** e depois **Deploy**

---

### 2️⃣ Verificar Public Networking do PostgreSQL

O PostgreSQL **NÃO precisa** de domínio público! Apenas o backend e frontend precisam.

1. Acesse: **Railway → Postgres → Settings → Networking**
2. **Public Networking**: Pode deixar desativado (ou ativado apenas para debug externo)
3. **Private Networking**: ✅ **DEVE estar ativado** (`postgres.railway.internal`)

---

### 3️⃣ Verificar Public Networking do Backend

1. Acesse: **Railway → kaizen-lists-api → Settings → Networking**
2. **Public Networking**: ✅ Ativado
   - Domínio: `kaizen-lists-api-production.up.railway.app`
   - Porta: `$PORT` (Railway define automaticamente)
3. **Private Networking**: ✅ Ativado
   - DNS: `kaizen-lists-api.railway.internal`

---

### 4️⃣ Verificar Public Networking do Frontend

1. Acesse: **Railway → React Frontend → Settings → Networking**
2. **Public Networking**: ✅ Ativado
   - Domínio: `kaizen-compras.up.railway.app`
   - Porta: `$PORT`

---

## 🧪 COMO TESTAR SE ESTÁ FUNCIONANDO

### Teste 1: Health Check do Backend
```bash
curl https://kaizen-lists-api-production.up.railway.app/api/auth/test-users
```

Deve retornar usuários de teste ou erro específico (não 502).

---

### Teste 2: Ver logs do Railway

1. Acesse: **Railway → kaizen-lists-api → Logs**
2. Procure por:
   - ✅ `✅ Usando PostgreSQL em produção`
   - ✅ `INFO  [alembic.runtime.migration] Running upgrade`
   - ❌ **NÃO deve ter:** `timeout expired` ou `connection refused`

---

## 🚨 TROUBLESHOOTING

### Problema: Erro "timeout expired"
**Causa:** DATABASE_URL usa domínio público em vez do privado  
**Solução:** Trocar para `postgres.railway.internal`

### Problema: Erro 502 Bad Gateway
**Causa:** Backend crashou durante o boot ou não está respondendo  
**Solução:** Ver logs completos em **Railway → kaizen-lists-api → Logs**

### Problema: Erro "column listas.deletado does not exist"
**Causa:** Migrations não foram executadas no PostgreSQL  
**Solução:** 
1. Verificar se **Pre-deploy Command** está configurado: `flask db upgrade`
2. Ou rodar manualmente via Railway CLI ou conectando ao shell

### Problema: CORS Error no frontend
**Causa:** Backend não permite origem do frontend  
**Solução:** Adicionar domínio do frontend em `CORS_ORIGINS` do backend

---

## 📝 COMANDOS ÚTEIS

### Conectar ao PostgreSQL via Railway CLI:
```bash
railway connect postgres
# Depois: \dt para listar tabelas
```

### Ver status das migrations:
```bash
railway run flask db current
```

### Rodar migrations manualmente:
```bash
railway run flask db upgrade
```

---

## ✅ CHECKLIST FINAL

- [ ] DATABASE_URL usa `postgres.railway.internal` (não o domínio público)
- [ ] CORS_ORIGINS inclui domínio do frontend
- [ ] Pre-deploy command configurado: `flask db upgrade`
- [ ] Backend tem Public Networking ativado
- [ ] Frontend tem VITE_API_BASE_URL correto
- [ ] Postgres tem Private Networking ativado
- [ ] Deploy sem erros nos logs
- [ ] Login funciona no frontend de produção

---

**Última atualização:** 24/12/2025 - Horário de Brasília  
**Status:** Configuração Railway em andamento
