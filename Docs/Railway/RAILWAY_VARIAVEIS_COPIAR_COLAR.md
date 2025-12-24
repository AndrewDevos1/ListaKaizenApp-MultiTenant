# 🚂 Railway - Variáveis para Copiar e Colar

## ⚡ AÇÃO RÁPIDA

### 1️⃣ Backend (kaizen-lists-api)

Vá em: **Railway Dashboard** → **kaizen-lists-api** → **Variables** → **Raw Editor**

Cole EXATAMENTE isso (substitua os valores marcados):

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
SECRET_KEY=Kaiser-Production-2024-Secret-Super-Seguro-Min-32-Chars
JWT_SECRET_KEY=Kaiser-JWT-2024-Min-16-Chars
FLASK_APP=run.py
FLASK_CONFIG=production
FLASK_DEBUG=0
CORS_ORIGINS=https://kaizen-compras.up.railway.app
```

**✅ Clique em "Update Variables"**
**✅ Clique em "Deploy" (botão roxo no topo direito)**

---

### 2️⃣ Frontend (React Frontend)

Vá em: **Railway Dashboard** → **React Frontend** → **Variables** → **Raw Editor**

Cole EXATAMENTE isso:

```env
REACT_APP_API_BASE_URL=https://kaizen-lists-api-production.up.railway.app
```

**✅ Clique em "Update Variables"**
**✅ Clique em "Deploy" (botão roxo no topo direito)**

---

## 🔍 Explicação das Variáveis

### Backend

| Variável | Valor | Explicação |
|----------|-------|------------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | 🔗 Conecta no PostgreSQL Railway via rede interna |
| `SECRET_KEY` | `Kaiser-Production-2024...` | 🔐 Chave para sessões Flask (mude para algo único) |
| `JWT_SECRET_KEY` | `Kaiser-JWT-2024...` | 🔐 Chave para tokens JWT (mude para algo único) |
| `FLASK_APP` | `run.py` | 📄 Arquivo principal do Flask |
| `FLASK_CONFIG` | `production` | ⚙️ Modo produção |
| `FLASK_DEBUG` | `0` | 🚫 Debug desligado (segurança) |
| `CORS_ORIGINS` | `https://kaizen-compras.up.railway.app` | 🌐 Permite frontend acessar API |

### Frontend

| Variável | Valor | Explicação |
|----------|-------|------------|
| `REACT_APP_API_BASE_URL` | `https://kaizen-lists-api-production.up.railway.app` | 🔗 URL pública da API |

---

## ⚠️ IMPORTANTE

### ❌ NÃO USE a URL pública do PostgreSQL

**ERRADO:**
```
DATABASE_URL=postgresql://postgres:senha@postgres-production-f11c.up.railway.app:5432/railway
```

**CERTO:**
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

O `${{Postgres.DATABASE_URL}}` faz o Railway usar automaticamente a URL **interna** (`.railway.internal`).

---

## 🎯 Checklist Pós-Configuração

Após configurar e fazer deploy:

- [ ] 1. Aguardar deploy do backend terminar (Activity → kaizen-lists-api)
- [ ] 2. Aguardar deploy do frontend terminar (Activity → React Frontend)
- [ ] 3. Abrir frontend: https://kaizen-compras.up.railway.app
- [ ] 4. Fazer login
- [ ] 5. Criar uma lista nova
- [ ] 6. Verificar se os itens aparecem
- [ ] 7. Verificar se fornecedores aparecem

---

## 🆘 Se Der Erro

### Ver Logs do Backend

1. Railway → **kaizen-lists-api** → **Deployments**
2. Clique no último deploy
3. **Deploy Logs** → Procure por:
   - ✅ `✅ Usando PostgreSQL em produção`
   - ❌ Qualquer linha com `[err]`

### Ver Logs do Frontend

1. Railway → **React Frontend** → **Deployments**
2. Clique no último deploy
3. **Deploy Logs** → Verifique se o build passou

---

## 🔄 Redeploy Forçado

Se precisar forçar um novo deploy:

1. Vá no serviço (backend ou frontend)
2. Clique em **Settings**
3. Role até o final
4. **Redeploy** (ou faça uma mudança pequena e commit)

---

**Última atualização:** 24/12/2025 - 01:14 BRT
