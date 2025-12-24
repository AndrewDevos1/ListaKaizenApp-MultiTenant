# 🚂 VARIÁVEIS PRONTAS PARA COPIAR NO RAILWAY

## 📦 Backend (kaizen-lists-api)

Vá para Railway → **kaizen-lists-api** → aba **Variables** → **Raw Editor**

Cole isso:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
FLASK_APP=run.py
FLASK_CONFIG=production
CORS_ORIGINS=https://kaizen-compras.up.railway.app
SECRET_KEY=1930433fc715424171d1b40d3c6f66aded205682c358aa2f41e99988e8cc77f2
JWT_SECRET_KEY=27c6d58563ccbfed01f520340aed354f20a363f64141f41e3b91b77663a030bf
```

**Depois clique em "Save" e faça Redeploy!**

---

## 🎨 Frontend (React Frontend)

Vá para Railway → **React Frontend** → aba **Variables** → **Raw Editor**

Cole isso:

```env
REACT_APP_API_URL=https://kaizen-lists-api-production.up.railway.app
```

**Depois clique em "Save" e faça Redeploy!**

---

## ✅ Checklist Rápido

1. [ ] Copiar variáveis do backend → Salvar → Redeploy
2. [ ] Copiar variável do frontend → Salvar → Redeploy
3. [ ] Aguardar ambos os deploys terminarem (verde)
4. [ ] Abrir https://kaizen-compras.up.railway.app
5. [ ] Fazer login
6. [ ] Testar criar lista e adicionar itens

---

## 🎯 URLs Finais

- **Frontend:** https://kaizen-compras.up.railway.app
- **Backend API:** https://kaizen-lists-api-production.up.railway.app
- **Database:** postgres.railway.internal (privado)

---

**Gerado em:** 24/12/2025 00:30 (Horário de Brasília)
