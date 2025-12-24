# 🎯 PASSO A PASSO: Configurar Railway AGORA

## 📋 O QUE FAZER AGORA (em ordem)

### 🔴 1. Configurar Variáveis no Backend (kaizen-lists-api)

Vá para Railway → **kaizen-lists-api** → aba **Variables**

**Adicione ou edite estas variáveis:**

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
FLASK_APP=run.py
FLASK_CONFIG=production
CORS_ORIGINS=https://kaizen-compras.up.railway.app
SECRET_KEY=<gere uma chave nova - veja abaixo>
JWT_SECRET_KEY=<gere uma chave nova - veja abaixo>
```

### 🔐 2. Gerar Chaves Secretas (no seu terminal Linux)

```bash
# Gerar SECRET_KEY
python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_hex(32))"

# Gerar JWT_SECRET_KEY  
python3 -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_hex(32))"
```

Copie os valores gerados e cole no Railway.

---

### 🎨 3. Configurar Variável no Frontend (React Frontend)

Vá para Railway → **React Frontend** → aba **Variables**

**Adicione esta variável:**

```env
REACT_APP_API_URL=https://kaizen-lists-api-production.up.railway.app
```

**IMPORTANTE:** No Railway, variáveis do React são lidas **APENAS NO BUILD**, então após adicionar esta variável você PRECISA fazer **Redeploy**.

---

### ♻️ 4. Fazer Redeploy dos Serviços

1. **kaizen-lists-api** → clicar nos 3 pontinhos → **Redeploy**
2. Aguardar build terminar (barra verde)
3. **React Frontend** → clicar nos 3 pontinhos → **Redeploy**  
4. Aguardar build terminar

---

### ✅ 5. Verificar se Funcionou

**Logs do Backend (kaizen-lists-api):**
- Deve aparecer: `✅ Usando PostgreSQL em produção`
- NÃO deve aparecer timeout ou erro de conexão

**Testar o Site:**
1. Abrir: https://kaizen-compras.up.railway.app
2. Fazer login com suas credenciais
3. Criar uma lista
4. Adicionar itens à lista
5. Verificar se os fornecedores carregam

---

## 📊 Tabela de Variáveis Corretas

### Backend (kaizen-lists-api)

| Variável | Valor | Obrigatório |
|----------|-------|-------------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | ✅ SIM |
| `FLASK_APP` | `run.py` | ✅ SIM |
| `FLASK_CONFIG` | `production` | ✅ SIM |
| `CORS_ORIGINS` | `https://kaizen-compras.up.railway.app` | ✅ SIM |
| `SECRET_KEY` | *gerar com comando acima* | ✅ SIM |
| `JWT_SECRET_KEY` | *gerar com comando acima* | ✅ SIM |

### Frontend (React Frontend)

| Variável | Valor | Obrigatório |
|----------|-------|-------------|
| `REACT_APP_API_URL` | `https://kaizen-lists-api-production.up.railway.app` | ✅ SIM |

---

## 🐛 Se o Frontend não carregar a API corretamente

O frontend do React precisa ser **rebuild** com a variável correta.

**Motivo:** Vite lê variáveis de ambiente durante o BUILD, não em runtime.

**Solução:**
1. Adicionar `REACT_APP_API_URL` no Railway
2. Fazer **Redeploy** do React Frontend
3. Aguardar build completo
4. Limpar cache do navegador (Ctrl+Shift+Del)
5. Recarregar a página (Ctrl+F5)

---

## 🔍 Checklist Rápido

Marque conforme for fazendo:

- [ ] Variáveis do Backend configuradas
- [ ] SECRET_KEY e JWT_SECRET_KEY gerados
- [ ] DATABASE_URL usando referência do Postgres
- [ ] CORS_ORIGINS apontando para frontend correto
- [ ] Backend fez redeploy com sucesso
- [ ] Variável REACT_APP_API_URL configurada no frontend
- [ ] Frontend fez redeploy com sucesso
- [ ] Login funcionando
- [ ] Dashboard carregando
- [ ] Listas e itens funcionando
- [ ] Fornecedores carregando

---

## 🆘 Troubleshooting Comum

### "502 Bad Gateway"
- Backend crashou
- Verificar logs do Railway
- Provavelmente DATABASE_URL errada

### "CORS Error" no navegador
- CORS_ORIGINS não inclui o domínio do frontend
- Ou frontend foi deployado antes de configurar REACT_APP_API_URL

### "Credenciais inválidas" mas senha está certa
- JWT_SECRET_KEY mudou entre deploys
- Fazer logout e login novamente

### "Lista não encontrada" ou "Fornecedor vazio"
- Banco de dados vazio
- Precisa criar usuário admin e dados iniciais
- Ver seção "Seed do Banco" abaixo

---

## 🌱 Seed do Banco de Dados (Se necessário)

Se o banco estiver vazio, você pode criar um usuário admin:

1. No Railway, abra o **terminal** do serviço kaizen-lists-api
2. Execute:
```bash
export FLASK_APP=run.py
export FLASK_CONFIG=production
python create_admin_user.py
```

Ou se preferir, faça via register na aplicação usando o token admin.

---

**Última atualização:** 24/12/2025 00:30 (Brasília)
