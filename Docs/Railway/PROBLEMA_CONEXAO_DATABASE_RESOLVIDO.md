# 🔴 Problema: Erro 500/502 em Produção (Railway)

**Data:** 24/12/2025  
**Status:** ✅ RESOLVIDO

## 🐛 Sintomas

- ❌ Erro 502 em `/api/v1/fornecedores`
- ❌ Erro 500 em `/api/admin/listas/1/lista-mae`
- ✅ Login funcionando
- ✅ Criar lista funcionando

## 🔍 Causa Raiz

O backend no Railway estava usando o **DATABASE_URL externo** do PostgreSQL:
```
postgres-production-f11c.up.railway.app (66.33.22.97):5432
```

No Railway, serviços do mesmo projeto devem se conectar usando o **URL privado/interno**:
```
postgres.railway.internal:5432
```

## ✅ Solução

### No Railway Dashboard

1. Acesse o serviço **Postgres**
2. Vá em **Variables**
3. Copie a variável `DATABASE_URL` que contém `postgres.railway.internal`

4. Acesse o serviço **kaizen-lists-api**
5. Vá em **Variables**
6. **Atualize** a variável `DATABASE_URL` com o valor interno:
   ```
   postgresql://postgres:jdmrKwvtVwncIsPChhdOEQLyCSnphyAm@postgres.railway.internal:5432/railway
   ```

7. Clique em **Deploy** para aplicar

### Diferença entre URLs

| Tipo | Quando usar | Exemplo |
|------|-------------|---------|
| **Privado (Internal)** | Comunicação entre serviços Railway | `postgres.railway.internal:5432` |
| **Público (External)** | Acesso de fora do Railway (local dev) | `postgres-production-f11c.up.railway.app:5432` ou `trolley.proxy.rlwy.net:27335` |

## 🎯 Configuração Correta

### Produção (Railway)
```bash
# backend/.env (NÃO usar - Railway injeta automaticamente)
# DATABASE_URL=postgresql://postgres:...@postgres.railway.internal:5432/railway
```

### Desenvolvimento Local
```bash
# backend/.env
DATABASE_URL=postgresql://postgres:senha@localhost:5432/railway
# OU deixar vazio para usar SQLite automático
```

## 🧪 Como Testar

Após deploy, teste:
```bash
curl https://kaizen-lists-api-production.up.railway.app/api/v1/fornecedores \
  -H "Authorization: Bearer SEU_TOKEN"
```

Deve retornar 200 OK com lista de fornecedores.

## 📝 Lições Aprendidas

1. ✅ Railway oferece DNS interno para comunicação entre serviços
2. ✅ URLs públicos são apenas para acesso externo
3. ✅ Timeouts indicam problema de rede/DNS
4. ✅ Sempre usar variáveis de referência `${{Postgres.DATABASE_URL}}` quando possível
