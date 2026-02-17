# 🔍 Como Verificar os Logs do Railway

## 📊 Logs do Backend (kaizen-lists-api)

Railway → **kaizen-lists-api** → aba **Deployments** → clicar no último deploy → aba **Deploy Logs**

### ✅ Logs Corretos (Sucesso)

Você deve ver:

```
✅ Usando PostgreSQL em produção
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade...
[FLASK] Iniciando servidor Flask...
```

### ❌ Logs com Erro (Falha)

**Erro de conexão ao banco:**
```
connection to server at "postgres-production-f11c.up.railway.app" failed: timeout expired
```
**Solução:** DATABASE_URL está usando URL pública. Trocar para `${{Postgres.DATABASE_URL}}`

**Erro de variável faltando:**
```
ValueError: ❌ DATABASE_URL não configurado!
```
**Solução:** Adicionar variável DATABASE_URL no Railway

**Erro de migração:**
```
sqlalchemy.exc.ProgrammingError: relation "listas" does not exist
```
**Solução:** Migrations não rodaram. Verificar se flask db upgrade executou no build.

---

## 🎨 Logs do Frontend (React Frontend)

Railway → **React Frontend** → aba **Deployments** → clicar no último deploy → aba **Build Logs**

### ✅ Logs Corretos (Sucesso)

```
Building production bundle...
✓ built in XXXms
Optimizing dependencies...
Build completed successfully
```

### ❌ Logs com Erro (Falha)

**Variável de ambiente não detectada:**
```
Warning: REACT_APP_API_URL not defined
Using default: http://localhost:5000
```
**Solução:** Adicionar `REACT_APP_API_URL` no Railway e fazer **Redeploy**

---

## 🧪 Testar Conexão Backend-Frontend

### Teste 1: Backend está rodando?

Abrir no navegador:
```
https://kaizen-lists-api-production.up.railway.app/api/auth/test
```

**Esperado:** Retorno JSON ou erro 404 (mas não 502/503)

### Teste 2: Frontend consegue chamar Backend?

Abrir console do navegador (F12) no site:
```
https://kaizen-compras.up.railway.app
```

**Inspecionar requests:**
1. Aba **Network**
2. Fazer login
3. Ver se chamadas para `kaizen-lists-api-production.up.railway.app` estão com status 200

**Se aparecer CORS error:**
- Verificar CORS_ORIGINS no backend

**Se aparecer 502 Bad Gateway:**
- Backend crashou ou não está rodando
- Verificar logs do backend

---

## 🐛 Comandos Úteis (Railway CLI)

Se tiver Railway CLI instalado:

```bash
# Ver logs em tempo real do backend
railway logs --service kaizen-lists-api

# Ver logs em tempo real do frontend
railway logs --service react-frontend

# Ver status dos serviços
railway status

# Fazer redeploy via CLI
railway redeploy --service kaizen-lists-api
```

---

## 📞 Verificar Health do Postgres

Railway → **Postgres** → aba **Deployments**

**Status deve estar verde** e mostrando:
```
✓ PostgreSQL is ready to accept connections
```

Se estiver vermelho, o banco está down (improvável no Railway).

---

## 🔐 Conectar ao Postgres Manualmente (Debug)

Se precisar verificar as tabelas:

1. Railway → **Postgres** → aba **Database**
2. Clicar em "Open in Browser" ou usar um cliente PostgreSQL
3. Usar as credenciais da variável `DATABASE_URL`

**Verificar se tabelas existem:**
```sql
\dt
```

**Deve aparecer:**
- listas
- lista_mae_itens
- usuarios
- fornecedores
- etc.

Se não aparecer nenhuma tabela, as migrations não rodaram!

---

## 🚨 SOS: Nada Funciona!

**Resetar tudo e começar do zero:**

1. Railway → **kaizen-lists-api** → Settings → Delete Service
2. Railway → **React Frontend** → Settings → Delete Service
3. Railway → **Postgres** → Settings → Delete Volume (cuidado! perde dados)
4. Criar os 3 serviços novamente
5. Configurar variáveis corretamente
6. Deploy

**OU simplesmente:**
1. Corrigir variáveis
2. Redeploy tudo
3. Aguardar 2-3 minutos
4. Testar novamente

---

**Última atualização:** 24/12/2025 00:35 (Brasília)
