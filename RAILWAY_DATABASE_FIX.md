# 🚂 Railway - Correção da Conexão PostgreSQL

## 🔴 Problema Identificado

O backend do Railway está tentando conectar ao PostgreSQL usando a **URL pública** (`postgres-production-f11c.up.railway.app:5432`), mas dentro do Railway você deve usar a **URL privada interna**.

**Erro no log:**
```
connection to server at "postgres-production-f11c.up.railway.app" (66.33.22.97), port 5432 failed: timeout expired
```

---

## ✅ Solução: Usar a URL Privada do PostgreSQL

### Passo 1️⃣: Pegar a URL Correta do PostgreSQL

No Railway, vá para o serviço **Postgres** → aba **Variables**:

**Use ESTA variável:**
```
${{Postgres.DATABASE_URL}}
```

Ou copie a **URL PRIVADA** que está em formato:
```
postgresql://postgres:SENHA@postgres.railway.internal:5432/railway
```

### Passo 2️⃣: Configurar no Backend (kaizen-lists-api)

No serviço **kaizen-lists-api** → aba **Variables**:

1. Clique em **New Variable**
2. **Name:** `DATABASE_URL`
3. **Value:** `${{Postgres.DATABASE_URL}}` (isso cria referência automática)
4. Clique em **Add**

**OU manualmente copie:**
```
postgresql://postgres:jdmrKwvtVwncIsPChhdOEQLyCSnphyAm@postgres.railway.internal:5432/railway
```

### Passo 3️⃣: Redeploy

Após adicionar a variável, clique em **Deploy** para aplicar as mudanças.

---

## 📌 Variáveis Obrigatórias no Backend (kaizen-lists-api)

Certifique-se que essas variáveis estão configuradas:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
FLASK_APP=run.py
FLASK_CONFIG=production
JWT_SECRET_KEY=<gerar uma chave segura>
SECRET_KEY=<gerar uma chave segura>
CORS_ORIGINS=https://kaizen-compras.up.railway.app
```

---

## 🔐 Gerar Chaves Secretas (se não tiver)

Execute localmente:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Use os 2 valores gerados para `SECRET_KEY` e `JWT_SECRET_KEY`.

---

## 🧪 Testar Conexão

Depois do redeploy, teste:

1. **Login:** `https://kaizen-compras.up.railway.app/`
2. **Dashboard:** Ver resumo de dados
3. **Lista Mae:** Criar lista e adicionar itens

---

## 📊 Como saber se está funcionando?

No Railway, aba **Logs** do backend, você deve ver:
```
✅ Usando PostgreSQL em produção
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
```

**NÃO deve aparecer:**
```
⚠️ PostgreSQL não configurado. Usando SQLite
connection to server at "postgres-production-f11c.up.railway.app" failed
```

---

## 🚨 Troubleshooting

### Erro: "could not translate host name"
- Verifique que está usando `postgres.railway.internal` (não a URL pública)

### Erro: "password authentication failed"
- Verifique a senha copiada corretamente
- Use `${{Postgres.DATABASE_URL}}` para evitar erro de cópia

### Erro 502 Bad Gateway
- Backend crashou durante o start
- Verifique os logs no Railway
- Provavelmente DATABASE_URL está incorreta

---

## ✅ Checklist Final

- [ ] Variável `DATABASE_URL` no backend aponta para `${{Postgres.DATABASE_URL}}`
- [ ] Todas as outras variáveis estão configuradas (SECRET_KEY, JWT_SECRET_KEY, CORS_ORIGINS)
- [ ] Backend deployado com sucesso (status verde)
- [ ] Logs mostram "✅ Usando PostgreSQL em produção"
- [ ] Login funcionando em https://kaizen-compras.up.railway.app
- [ ] Dashboard carregando dados
- [ ] Listas criadas aparecem com itens

---

## 📝 Resumo de URLs

| Ambiente | Backend | Frontend | Database |
|----------|---------|----------|----------|
| **Railway (Produção)** | `kaizen-lists-api-production.up.railway.app` | `kaizen-compras.up.railway.app` | `postgres.railway.internal:5432` |
| **Local (Desenvolvimento)** | `http://127.0.0.1:5000` | `http://localhost:3000` | SQLite (`kaizen_dev.db`) |

---

**Data:** 24/12/2025  
**Horário:** 00:24 (Brasília)  
**Status:** Guia de correção criado ✅
