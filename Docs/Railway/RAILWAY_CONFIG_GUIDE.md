# 🚂 Guia de Configuração - Railway

## ❌ **PROBLEMA ATUAL**

Você está acessando o **frontend em produção (Railway)** que tenta conectar ao **backend local (127.0.0.1:5000)**.

```
Frontend Railway: https://kaizen-compras.up.railway.app
         ↓ (tentando conectar)
Backend Local:    http://127.0.0.1:5000
         ↓
❌ IMPOSSÍVEL! Railway não acessa localhost da sua máquina
```

---

## ✅ **SOLUÇÃO: Configurar Variáveis de Ambiente**

### 📋 **Passo 1: Configurar Backend (kaizen-lists-api)**

No Railway Dashboard, vá em:
```
kaizen-lists-api → Variables → Add Variable
```

Adicione:
```bash
DATABASE_URL=postgresql://postgres:jdmrKwvtVwncIsPChhdOEQLyCSnphyAm@trolley.proxy.rlwy.net:27335/railway
FLASK_CONFIG=production
FLASK_APP=run.py
SECRET_KEY=<seu-secret-key-seguro>
JWT_SECRET_KEY=<seu-jwt-secret-key>
CORS_ORIGINS=https://kaizen-compras.up.railway.app
```

### 📋 **Passo 2: Configurar Frontend (React Frontend)**

No Railway Dashboard, vá em:
```
React Frontend → Variables → Add Variable
```

**ADICIONE ESTA VARIÁVEL:**
```bash
REACT_APP_API_URL=https://kaizen-lists-api-production.up.railway.app/api
```

⚠️ **IMPORTANTE:** Use a URL pública do seu backend no Railway!

### 📋 **Passo 3: Redeploy**

Após adicionar as variáveis:
1. Clique em "Deploy" (ou aguarde auto-deploy)
2. Aguarde o build completar
3. Teste acessando: `https://kaizen-compras.up.railway.app`

---

## 🏠 **PARA DESENVOLVIMENTO LOCAL**

### Opção A: Usar Frontend Local

```bash
# 1. Inicie o backend local
cd backend
./run-backend.sh

# 2. Em outro terminal, inicie o frontend local
cd frontend
npm start

# 3. Acesse http://localhost:3000
```

✅ O arquivo `.env.local` já está configurado para apontar para `http://127.0.0.1:5000/api`

### Opção B: Conectar Frontend Local ao Backend Railway

Edite `frontend/.env.local`:
```bash
REACT_APP_API_URL=https://kaizen-lists-api-production.up.railway.app/api
```

Depois:
```bash
cd frontend
npm start
```

---

## 🔍 **VERIFICAR SE ESTÁ FUNCIONANDO**

### 1. Verificar Backend Railway

Acesse no navegador:
```
https://kaizen-lists-api-production.up.railway.app
```

Deve retornar:
```json
{
  "status": "ok",
  "message": "Kaizen Lists API está rodando!",
  "version": "1.0.0"
}
```

### 2. Verificar CORS

No console do navegador (F12), você deve ver:
```
Access-Control-Allow-Origin: *
```

### 3. Testar Login

1. Acesse o frontend: `https://kaizen-compras.up.railway.app`
2. Abra DevTools (F12) → Console
3. Tente fazer login
4. Veja as requisições na aba Network

---

## 📊 **ARQUITETURA CORRETA**

### Desenvolvimento Local
```
Frontend Local: http://localhost:3000
      ↓
Backend Local:  http://127.0.0.1:5000
      ↓
PostgreSQL Railway (ou SQLite local)
```

### Produção Railway
```
Frontend Railway: https://kaizen-compras.up.railway.app
      ↓
Backend Railway:  https://kaizen-lists-api-production.up.railway.app
      ↓
PostgreSQL Railway
```

---

## 🛠️ **TROUBLESHOOTING**

### Problema: "Network Error" no frontend

**Causa:** Frontend não consegue alcançar o backend

**Solução:**
1. Verifique se `REACT_APP_API_URL` está correto
2. Teste a URL do backend diretamente no navegador
3. Verifique logs do backend no Railway

### Problema: CORS error

**Causa:** Backend não está retornando headers CORS corretos

**Solução:**
1. Backend já está configurado com CORS aberto (origins: "*")
2. Se necessário, especifique origin exato:
   ```python
   CORS_ORIGINS=https://kaizen-compras.up.railway.app
   ```

### Problema: 502 Bad Gateway

**Causa:** Backend crashou ou não está rodando

**Solução:**
1. Veja logs do backend no Railway
2. Verifique se DATABASE_URL está correto
3. Verifique se migrations rodaram corretamente

### Problema: 500 Internal Server Error

**Causa:** Erro no código do backend

**Solução:**
1. Veja logs detalhados no Railway
2. Verifique se todas as variáveis de ambiente estão configuradas
3. Teste endpoints básicos como `/` e `/api/v1/health`

---

## 📝 **CHECKLIST PRÉ-DEPLOY**

Antes de fazer deploy, verifique:

- [ ] Backend:
  - [ ] `DATABASE_URL` configurado
  - [ ] `FLASK_CONFIG=production`
  - [ ] `SECRET_KEY` e `JWT_SECRET_KEY` configurados
  - [ ] Migrations rodaram (`flask db upgrade`)
  - [ ] Health check funciona

- [ ] Frontend:
  - [ ] `REACT_APP_API_URL` aponta para backend correto
  - [ ] Build passa sem erros
  - [ ] Variável de ambiente configurada no Railway

- [ ] Conexão:
  - [ ] Frontend consegue fazer requisição para backend
  - [ ] CORS funcionando
  - [ ] Login funciona

---

## 🚀 **PRÓXIMOS PASSOS**

1. **Agora:** Configure `REACT_APP_API_URL` no Railway
2. **Depois:** Teste login/registro
3. **Finalmente:** Crie um admin user e teste funcionalidades

**URL do Backend Railway:**
```
https://kaizen-lists-api-production.up.railway.app
```

**Adicione no Frontend Railway:**
```
REACT_APP_API_URL=https://kaizen-lists-api-production.up.railway.app/api
```

---

**Última atualização:** Dezembro 2024  
**Hora de Brasília:** 00:00 (UTC-3)
