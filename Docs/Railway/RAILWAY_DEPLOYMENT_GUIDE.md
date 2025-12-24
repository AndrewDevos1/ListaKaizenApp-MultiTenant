# Railway Deployment Guide - Kaizen Lists

**Data:** 24 de Dezembro de 2025, 21:50 BRT

---

## 🚂 POR QUE RAILWAY?

### ✅ Vantagens sobre Render + Vercel:

1. **Tudo em um lugar** - Backend, Frontend e PostgreSQL no mesmo projeto
2. **PostgreSQL GRÁTIS** - 500MB persistente (vs SQLite efêmero no Render)
3. **Sem Cold Start** - Serviços ficam ativos (plano free generoso)
4. **Deploy Unificado** - Um git push atualiza tudo
5. **CORS Simplificado** - Mesma origem ou subdomínios fáceis
6. **Melhor DX** - Interface mais moderna e Railway CLI poderoso

---

## 📋 CONFIGURAÇÃO PASSO A PASSO

### **1. Criar Conta no Railway**

1. Acesse: https://railway.app/
2. Clique em "Login with GitHub"
3. Autorize o Railway a acessar seus repositórios

---

### **2. Criar Novo Projeto**

1. No Dashboard do Railway, clique em **"New Project"**
2. Selecione **"Deploy from GitHub repo"**
3. Escolha o repositório: **`AndrewDevos1/ListaKaizenApp`**
4. Branch: **`master`**

---

### **3. Adicionar PostgreSQL**

1. No projeto criado, clique em **"+ New"**
2. Selecione **"Database" → "Add PostgreSQL"**
3. Railway cria automaticamente:
   - Banco PostgreSQL
   - Variável `DATABASE_URL` disponível para todos os serviços

---

### **4. Configurar Backend (Flask)**

1. Clique em **"+ New" → "Service"**
2. Selecione o repositório novamente
3. Configure:
   - **Name:** `kaizen-backend`
   - **Root Directory:** `/backend`
   - **Start Command:** `gunicorn -w 4 -b 0.0.0.0:$PORT run:app`

#### Variáveis de Ambiente:
```
FLASK_CONFIG=production
FLASK_APP=run.py
DATABASE_URL=${{Postgres.DATABASE_URL}}
SECRET_KEY=<gerar-chave-segura>
```

#### Build Command:
```bash
pip install -r requirements.txt && flask db upgrade && python diagnose_system.py
```

---

### **5. Configurar Frontend (React)**

1. Clique em **"+ New" → "Service"**
2. Selecione o repositório novamente
3. Configure:
   - **Name:** `kaizen-frontend`
   - **Root Directory:** `/frontend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npx serve -s build -l $PORT`

#### Variáveis de Ambiente:
```
REACT_APP_API_URL=${{kaizen-backend.RAILWAY_PUBLIC_DOMAIN}}
NODE_ENV=production
```

---

### **6. Configurar Domínios**

Railway gera domínios automáticos:
```
Backend:  kaizen-backend-production.up.railway.app
Frontend: kaizen-frontend-production.up.railway.app
```

Ou configure domínio customizado:
1. Em cada serviço → **Settings** → **Domains**
2. Adicione: `api.seudominio.com` (backend)
3. Adicione: `app.seudominio.com` (frontend)

---

## 🔧 AJUSTES NO CÓDIGO

### **1. Atualizar config.py do Backend**

```python
class ProductionConfig(Config):
    """Configurações para produção no Railway"""
    # Railway fornece DATABASE_URL automaticamente
    database_url = os.environ.get('DATABASE_URL')
    
    if not database_url:
        # Fallback para SQLite se não houver PostgreSQL
        sqlite_path = os.path.join(basedir, '..', 'kaizen_prod.db')
        database_url = f'sqlite:///{sqlite_path}'
    
    # Railway já fornece no formato correto postgresql://
    SQLALCHEMY_DATABASE_URI = database_url
```

### **2. Atualizar .env.local do Frontend**

```bash
# URL do backend no Railway
REACT_APP_API_URL=https://kaizen-backend-production.up.railway.app
```

---

## 📊 COMPARAÇÃO DE CUSTOS

| Plataforma | Backend | Frontend | Database | Total/mês |
|------------|---------|----------|----------|-----------|
| **Render + Vercel** | Free (frio) | Free | SQLite efêmero | $0 (limitado) |
| **Railway** | $5 (500h) | $5 (500h) | Free (500MB) | $5-10 (melhor) |

### Railway Free Tier:
- ✅ $5 de crédito grátis/mês
- ✅ 500 horas de execução
- ✅ PostgreSQL 500MB persistente
- ✅ Sem cold start
- ✅ 100GB egress

---

## 🚀 DEPLOY AUTOMÁTICO

Após configuração inicial:
```bash
# Qualquer push para master faz deploy automático
git push origin master

# Railway detecta mudanças e:
# 1. Faz build do backend
# 2. Roda migrações (flask db upgrade)
# 3. Inicia gunicorn
# 4. Faz build do frontend (npm run build)
# 5. Serve frontend com serve
# 6. Tudo fica online em ~2-3 minutos
```

---

## ✅ CHECKLIST DE MIGRAÇÃO

- [ ] Criar conta no Railway
- [ ] Criar novo projeto a partir do GitHub
- [ ] Adicionar PostgreSQL ao projeto
- [ ] Configurar serviço Backend (Flask)
  - [ ] Root: `/backend`
  - [ ] Variáveis de ambiente
  - [ ] Build e Start commands
- [ ] Configurar serviço Frontend (React)
  - [ ] Root: `/frontend`
  - [ ] Variáveis de ambiente
  - [ ] Build e Start commands
- [ ] Conectar DATABASE_URL do Postgres ao Backend
- [ ] Fazer primeiro deploy (git push)
- [ ] Criar usuário admin via Railway Shell
- [ ] Testar endpoints da API
- [ ] Atualizar DNS (se domínio customizado)
- [ ] Desativar Render e Vercel (opcional)

---

## 🔥 DICAS PRO

### **1. Railway CLI**
```bash
# Instalar
npm i -g @railway/cli

# Login
railway login

# Link projeto
railway link

# Ver logs em tempo real
railway logs

# Abrir shell no backend
railway shell
```

### **2. Monitoramento**
- Railway fornece métricas de CPU, RAM, Network
- Logs em tempo real no dashboard
- Alertas de erro via webhook

### **3. Rollback Fácil**
- Railway mantém histórico de deploys
- Rollback para versão anterior em 1 clique

---

## 📞 PROBLEMAS COMUNS

### Erro: "Port already in use"
**Solução:** Railway define $PORT automaticamente, use:
```python
port = int(os.environ.get('PORT', 5000))
```

### Erro: "Module not found"
**Solução:** Adicione ao `requirements.txt` ou `package.json`

### Frontend não conecta ao Backend
**Solução:** Verifique REACT_APP_API_URL nas env vars

---

## 🎯 RESULTADO FINAL

```
✅ Backend Flask rodando no Railway
✅ Frontend React rodando no Railway
✅ PostgreSQL persistente (bye bye SQLite efêmero!)
✅ Deploy automático via git push
✅ Logs centralizados
✅ Métricas e monitoramento
✅ Sem cold start
✅ Tudo em um lugar!
```

---

**Pronto para migrar?** Railway é MUITO mais simples e profissional! 🚂✨
