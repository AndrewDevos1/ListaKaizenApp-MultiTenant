# 🚂 Railway - Resumo Visual Rápido

```
┌─────────────────────────────────────────────────────────────────┐
│                     🌐 ARQUITETURA RAILWAY                       │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                  │         │                  │         │                 │
│   React Frontend │────────▶│  Backend Flask   │────────▶│   PostgreSQL    │
│                  │  HTTPS  │                  │  INTERNO│                 │
│  kaizen-compras  │         │ kaizen-lists-api │         │   postgres.     │
│  .up.railway.app │         │ -production...   │         │   railway.      │
│                  │         │                  │         │   internal      │
└──────────────────┘         └──────────────────┘         └─────────────────┘
        │                            │
        │                            │
        ▼                            ▼
   👤 USUÁRIO                   🔐 VARIÁVEIS
```

---

## 🎯 VARIÁVEIS - COPIE E COLE

### 📦 Backend (kaizen-lists-api)

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
SECRET_KEY=Kaiser-Production-2024-Secret-Super-Seguro-Min-32-Chars-12345
JWT_SECRET_KEY=Kaiser-JWT-2024-Min-16-Chars-XPTO
FLASK_APP=run.py
FLASK_CONFIG=production
FLASK_DEBUG=0
CORS_ORIGINS=https://kaizen-compras.up.railway.app
```

### ⚛️ Frontend (React Frontend)

```env
REACT_APP_API_URL=https://kaizen-lists-api-production.up.railway.app/api
```

---

## ⚡ PASSOS RÁPIDOS

```
1️⃣  Railway → kaizen-lists-api → Variables → Raw Editor
    └─ Cole as variáveis do backend
    └─ Update Variables
    └─ Deploy

2️⃣  Railway → React Frontend → Variables → Raw Editor
    └─ Cole as variáveis do frontend
    └─ Update Variables
    └─ Deploy

3️⃣  Aguarde deploys terminarem (✅ verde)

4️⃣  Teste:
    └─ https://kaizen-compras.up.railway.app
    └─ Login: andrew.andyoo@gmail.com / 210891
    └─ Criar lista
    └─ Ver lista mãe
```

---

## 🔴 ERROS COMUNS

### Erro: `postgres-production-f11c.up.railway.app timeout`

**Causa:** Usando URL pública do PostgreSQL

**Solução:**
```env
DATABASE_URL=${{Postgres.DATABASE_URL}}  ✅ CERTO
```

### Erro: `CORS policy`

**Causa:** CORS não configurado

**Solução:**
```env
CORS_ORIGINS=https://kaizen-compras.up.railway.app  ✅ CERTO
```

### Erro: `502 Bad Gateway`

**Causa:** Backend caiu ou reiniciando

**Solução:**
- Aguarde 1-2 minutos
- Veja logs em Deploy Logs

---

## ✅ CHECKLIST

- [ ] Backend tem `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- [ ] Backend tem `CORS_ORIGINS=https://kaizen-compras.up.railway.app`
- [ ] Frontend tem `REACT_APP_API_URL=https://kaizen-lists-api-production.up.railway.app/api`
- [ ] Ambos os deploys terminaram (✅)
- [ ] Login funciona
- [ ] Listas aparecem

---

**🇧🇷 Horário de Brasília sempre!**
**📅 24/12/2025 - 01:14**
