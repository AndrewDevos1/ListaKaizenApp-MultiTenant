# 🚂 Railway - Passo a Passo Final (COPIE E COLE)

## 🎯 Objetivo

Fazer o sistema funcionar 100% em produção no Railway com PostgreSQL.

---

## ✅ PASSO 1 - Configurar Backend

### 1.1 - Abrir Railway Dashboard

1. Acesse: https://railway.app
2. Login
3. Clique no projeto: **comfortable-respect**
4. Clique no serviço: **kaizen-lists-api**

### 1.2 - Configurar Variáveis

1. Clique em **Variables**
2. Clique em **Raw Editor** (botão no topo direito)
3. **APAGUE TUDO** que está lá
4. Cole EXATAMENTE isso:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
SECRET_KEY=Kaiser-Production-2024-Secret-Super-Seguro-Min-32-Chars-12345
JWT_SECRET_KEY=Kaiser-JWT-2024-Min-16-Chars-XPTO
FLASK_APP=run.py
FLASK_CONFIG=production
FLASK_DEBUG=0
CORS_ORIGINS=https://kaizen-compras.up.railway.app
```

5. Clique em **Update Variables** (botão roxo)
6. Aguarde 2 segundos
7. Clique em **Deploy** (botão roxo no topo direito da tela)

### 1.3 - Aguardar Deploy

1. Clique em **Deployments** (menu lateral esquerdo)
2. Aguarde o deploy terminar (status verde ✅)
3. Se der erro, veja os logs em **Deploy Logs**

---

## ✅ PASSO 2 - Configurar Frontend

### 2.1 - Abrir React Frontend

1. No Railway Dashboard, clique em **React Frontend**

### 2.2 - Configurar Variáveis

1. Clique em **Variables**
2. Clique em **Raw Editor**
3. **APAGUE TUDO** que está lá
4. Cole EXATAMENTE isso:

```env
REACT_APP_API_URL=https://kaizen-lists-api-production.up.railway.app/api
```

5. Clique em **Update Variables**
6. Aguarde 2 segundos
7. Clique em **Deploy**

### 2.3 - Aguardar Deploy

1. Clique em **Deployments**
2. Aguarde o deploy terminar (status verde ✅)

---

## ✅ PASSO 3 - Testar

### 3.1 - Abrir Frontend

1. Abra o navegador
2. Acesse: https://kaizen-compras.up.railway.app
3. **Limpe o cache** (Ctrl+Shift+Del → Limpar tudo)
4. Recarregue (F5)

### 3.2 - Fazer Login

1. Email: `andrew.andyoo@gmail.com`
2. Senha: `210891`
3. Clique em **Entrar**

### 3.3 - Criar Lista

1. Vá em **Listas** (menu)
2. Clique em **Nova Lista**
3. Nome: `Teste Railway`
4. Adicione itens (texto ou CSV)
5. Clique em **Criar**

### 3.4 - Ver Lista Mãe

1. Na lista criada, clique em **Ver Detalhes**
2. **Deve aparecer os itens** ✅
3. **Deve aparecer os fornecedores** ✅

---

## 🆘 Se Não Funcionar

### Backend com Erro

#### Ver Logs

1. Railway → **kaizen-lists-api** → **Deployments**
2. Clique no último deploy
3. **Deploy Logs**
4. Procure por:
   - ❌ `[err] connection to server`
   - ❌ `[err] timeout expired`
   - ✅ `✅ Usando PostgreSQL em produção`

#### Erro de Conexão PostgreSQL

Se aparecer: `connection to server at "postgres-production-f11c.up.railway.app"`

**Causa:** Está usando URL pública em vez da interna.

**Solução:**
1. Vá em **kaizen-lists-api** → **Variables**
2. Verifique se `DATABASE_URL=${{Postgres.DATABASE_URL}}`
3. Se estiver diferente, corrija
4. Clique em **Deploy**

### Frontend com Erro CORS

#### Erro no Console do Navegador

Abra o **Console** (F12) e procure por:
- ❌ `CORS policy`
- ❌ `Access-Control-Allow-Origin`

**Solução:**
1. Vá em **kaizen-lists-api** → **Variables**
2. Verifique se `CORS_ORIGINS=https://kaizen-compras.up.railway.app`
3. Se estiver diferente, corrija
4. Clique em **Deploy**

### Frontend não Conecta no Backend

#### Erro 502 Bad Gateway

**Causa:** Backend caiu ou está reiniciando.

**Solução:**
1. Vá em **kaizen-lists-api** → **Deployments**
2. Verifique se o deploy terminou
3. Aguarde 1-2 minutos
4. Tente novamente

#### Erro no Console: `Network Error`

**Causa:** URL da API errada no frontend.

**Solução:**
1. Vá em **React Frontend** → **Variables**
2. Verifique se `REACT_APP_API_URL=https://kaizen-lists-api-production.up.railway.app/api`
3. Se estiver diferente, corrija
4. Clique em **Deploy**

---

## 📋 Checklist Final

Após configurar TUDO:

- [ ] 1. Backend tem variável `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- [ ] 2. Backend tem variável `CORS_ORIGINS=https://kaizen-compras.up.railway.app`
- [ ] 3. Backend deploy terminou com sucesso (✅)
- [ ] 4. Frontend tem variável `REACT_APP_API_URL=https://kaizen-lists-api-production.up.railway.app/api`
- [ ] 5. Frontend deploy terminou com sucesso (✅)
- [ ] 6. Login funciona
- [ ] 7. Criar lista funciona
- [ ] 8. Ver lista mãe (itens) funciona
- [ ] 9. Fornecedores aparecem

---

## 🎉 Resultado Esperado

Quando TUDO estiver funcionando:

✅ Frontend: https://kaizen-compras.up.railway.app
✅ Backend: https://kaizen-lists-api-production.up.railway.app
✅ PostgreSQL: Interno (via Railway)
✅ Login OK
✅ Listas aparecem
✅ Itens aparecem
✅ Fornecedores aparecem
✅ Sem erro 502
✅ Sem erro 500
✅ Sem erro CORS

---

## 📱 Me Avise

Depois de seguir TODOS os passos, me diga:

1. ✅ "Funcionou! Tudo OK!"
2. ❌ "Deu erro X no passo Y"

Se der erro, me mande:
- Screenshot do erro
- Logs do deploy (copie e cole)
- URL que está tentando acessar

---

**Criado em:** 24/12/2025 - 01:14 BRT
**Horário de Brasília:** Sempre 🇧🇷
