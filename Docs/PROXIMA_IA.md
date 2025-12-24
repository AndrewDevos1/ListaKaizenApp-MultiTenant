# 📋 Briefing para Próxima IA - Kaizen Lists

**Data**: 24 de Dezembro de 2025  
**Horário**: Brasília (UTC-3)  
**Idioma**: Português Brasileiro

---

## 🎯 **SITUAÇÃO ATUAL DO PROJETO**

### ✅ **O QUE ESTÁ FUNCIONANDO**

#### **Backend (Railway)**
- ✅ Deploy funcionando em: `kaizen-lists-api-production.up.railway.app`
- ✅ PostgreSQL configurado e conectado
- ✅ Migrações rodando corretamente
- ✅ Gunicorn com 4 workers
- ✅ Login e autenticação JWT funcionando
- ✅ Criação de listas funcionando

#### **Frontend (Railway)**
- ✅ Deploy em: `kaizen-compras.up.railway.app`
- ✅ Build passando (após correções de ESLint)
- ✅ Login e registro funcionando
- ✅ Dashboard admin acessível

#### **Ambiente Local**
- ✅ Backend rodando em `http://127.0.0.1:5000`
- ✅ Frontend rodando em `http://localhost:3000`
- ✅ Lista mãe acessível e funcionando localmente

---

## 🔴 **PROBLEMAS PENDENTES**

### **1. Erro 502 em `/api/v1/fornecedores` (Produção)**
```
Status: 502 Bad Gateway
x-railway-fallback: true
x-railway-request-id: Q-On7dCLSBywB9JvozsQ6Q
```

**Causa provável**: Backend crashando ao acessar esta rota específica  
**Onde investigar**: 
- `/backend/kaizen_app/controllers.py` - rota `@api_bp.route('/v1/fornecedores')`
- `/backend/kaizen_app/services.py` - função relacionada a fornecedores
- Logs do Railway: `comfortable-respect/kaizen-lists-api/Logs`

---

### **2. Erro 500 em `/api/admin/listas/1/lista-mae` (Produção)**
```
Status: 500 Internal Server Error
Content-Type: application/json
```

**Local funciona, produção não**  
**Causa provável**: Diferença entre SQLite (local) e PostgreSQL (produção)  
**Onde investigar**:
- `/backend/kaizen_app/services.py` - função `obter_lista_mae`
- Verificar queries SQL específicas de PostgreSQL
- Logs mostram: "Lista encontrada: True, ID=1" mas "Itens encontrados: 0"

---

### **3. Testes Unitários Falhando**
```bash
79 items collected
48% passing
52% failing
```

**Principais falhas**:
- `test_admin_features.py` - Alguns testes de dashboard e atribuição
- `test_models.py` - Modelos Usuario, Pedido, Cotacao, Lista
- `test_repositories.py` - Maioria dos repositórios

**Causa**: Mudança de SQLite para PostgreSQL não refletida nos testes  
**Necessário**: Atualizar fixtures e configurações de teste

---

## 📂 **ESTRUTURA DO PROJETO**

```
ListaKaizenApp/
├── backend/
│   ├── kaizen_app/
│   │   ├── __init__.py          # create_app()
│   │   ├── config.py            # Configurações (Dev/Test/Prod)
│   │   ├── models.py            # Modelos SQLAlchemy
│   │   ├── controllers.py       # Rotas Flask (auth_bp, admin_bp, api_bp)
│   │   ├── services.py          # Lógica de negócios
│   │   ├── repositories.py      # Acesso ao banco
│   │   └── extensions.py        # db, jwt, cors, migrate
│   ├── migrations/              # Alembic migrations
│   ├── tests/                   # Testes pytest
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── features/            # Módulos por funcionalidade
│   │   │   ├── admin/           # Dashboards, listas, fornecedores
│   │   │   ├── auth/            # Login, registro
│   │   │   └── collaborator/    # Dashboard colaborador
│   │   ├── components/          # Layout, ProtectedRoute, AdminRoute
│   │   ├── services/            # API client (axios)
│   │   └── App.tsx              # Rotas principais
│   └── package.json
│
└── Docs/
    ├── ARQUITETURA.md           # Visão geral da arquitetura
    ├── DATABASE.md              # Esquema do banco de dados
    ├── API_ENDPOINTS.md         # Documentação da API
    ├── DEPLOYMENT.md            # Guia de deploy (Railway)
    └── PROXIMA_IA.md            # Este arquivo
```

---

## 🔧 **CONFIGURAÇÕES IMPORTANTES**

### **Variáveis de Ambiente - Railway (Backend)**
```bash
DATABASE_URL=postgresql://postgres:jdmrKwvtVwncIsPChhdOEQLyCSnphyAm@trolley.proxy.rlwy.net:27335/railway
FLASK_APP=run.py
FLASK_CONFIG=production
FLASK_ENV=production
JWT_SECRET_KEY=<gerado_automaticamente>
SECRET_KEY=<gerado_automaticamente>
CORS_ORIGINS=*
```

### **Variáveis de Ambiente - Railway (Frontend)**
```bash
REACT_APP_API_BASE_URL=https://kaizen-lists-api-production.up.railway.app
```

### **Variáveis de Ambiente - Local (.env)**
```bash
# Backend local
DEV_DATABASE_URL=postgresql://postgres:jdmrKwvtVwncIsPChhdOEQLyCSnphyAm@trolley.proxy.rlwy.net:27335/railway
DATABASE_URL=postgresql://postgres:jdmrKwvtVwncIsPChhdOEQLyCSnphyAm@trolley.proxy.rlwy.net:27335/railway

# Frontend local (.env.local)
REACT_APP_API_BASE_URL=http://127.0.0.1:5000
```

---

## 🚀 **COMANDOS ÚTEIS**

### **Backend**
```bash
# Ativar venv
cd backend && source .venv/bin/activate

# Rodar local
./run-backend.sh

# Rodar migrations
flask db upgrade

# Criar nova migration
flask db migrate -m "descrição"

# Rodar testes
pytest tests/ -v

# Com cobertura
pytest tests/ --cov=kaizen_app --cov-report=html
```

### **Frontend**
```bash
cd frontend

# Instalar dependências
npm install

# Rodar local
npm start

# Build produção
npm run build

# Verificar ESLint
npm run lint
```

### **Git**
```bash
# Status
git status

# Commit e push
git add -A
git commit -m "mensagem"
git push origin develop

# Merge develop -> master
git checkout master
git merge develop
git push origin master
git checkout develop
```

---

## 🎯 **PRÓXIMOS PASSOS SUGERIDOS**

### **1. PRIORIDADE ALTA - Corrigir Erros de Produção**

#### **A. Investigar erro 502 em `/api/v1/fornecedores`**
```bash
# Verificar logs do Railway
# Acessar: comfortable-respect/kaizen-lists-api/Logs

# Testar rota localmente
curl -X GET http://127.0.0.1:5000/api/v1/fornecedores \
  -H "Authorization: Bearer SEU_TOKEN"

# Verificar código em:
backend/kaizen_app/controllers.py - linha ~300
backend/kaizen_app/services.py - função get_fornecedores()
```

#### **B. Corrigir erro 500 em lista mãe (produção)**
```bash
# Comparar queries
# Local (SQLite): funciona
# Produção (PostgreSQL): falha

# Investigar:
backend/kaizen_app/services.py - função obter_lista_mae()
# Verificar diferenças entre SQLite e PostgreSQL em:
# - JOINS
# - Tipos de dados
# - Funções específicas do banco
```

### **2. PRIORIDADE MÉDIA - Testes**

#### **Atualizar configuração de testes**
```python
# Editar backend/kaizen_app/config.py
# Mudar TestingConfig para usar PostgreSQL de teste

# Criar novo banco de teste no Railway ou usar Docker local:
docker run --name postgres-test -e POSTGRES_PASSWORD=test123 -p 5433:5432 -d postgres:15
```

#### **Consertar testes falhando**
```bash
# Priorizar:
1. tests/test_models.py - Modelos básicos
2. tests/test_repositories.py - Acesso ao banco
3. tests/test_services.py - Lógica de negócios
4. tests/test_admin_features.py - Features admin
```

### **3. PRIORIDADE BAIXA - Melhorias**

- Adicionar testes de integração E2E
- Melhorar documentação da API (Swagger/OpenAPI)
- Implementar cache (Redis) para queries frequentes
- Configurar CI/CD no GitHub Actions
- Adicionar monitoramento (Sentry, New Relic)

---

## 📞 **INFORMAÇÕES DE CONTATO E ACESSO**

### **Railway**
- **Projeto**: `comfortable-respect`
- **URL Backend**: https://kaizen-lists-api-production.up.railway.app
- **URL Frontend**: https://kaizen-compras.up.railway.app
- **Postgres**: `trolley.proxy.rlwy.net:27335`

### **GitHub**
- **Repositório**: https://github.com/AndrewDevos1/ListaKaizenApp
- **Branch principal**: `master`
- **Branch desenvolvimento**: `develop`

### **Credenciais de Teste**
```
Admin:
Email: andrew.andyoo@gmail.com
Senha: 210891

Token Admin: Kaiser@210891
```

---

## 💡 **DICAS IMPORTANTES**

1. **SEMPRE** testar localmente antes de fazer deploy
2. **SEMPRE** fazer commit e push em `develop` primeiro
3. **SEMPRE** merge `develop -> master` só após testar
4. **SEMPRE** verificar logs do Railway após deploy
5. **NÃO** adicionar `.env` ao git (já está no `.gitignore`)
6. **NÃO** usar `rm -rf` em produção sem backup
7. **VERIFICAR** diferenças entre SQLite e PostgreSQL ao fazer queries
8. **USAR** `flask db migrate` antes de `flask db upgrade` em produção

---

## 📖 **DOCUMENTAÇÃO ADICIONAL**

- `ARQUITETURA.md` - Como o sistema está organizado
- `DATABASE.md` - Estrutura do banco de dados
- `API_ENDPOINTS.md` - Lista completa de endpoints
- `DEPLOYMENT.md` - Processo de deploy no Railway
- `CLAUDE.md` - Instruções específicas para Claude AI

---

## 🐛 **BUGS CONHECIDOS (NÃO URGENTES)**

1. Frontend: Warnings de engines do npm (node 18 vs 20)
2. Frontend: 12 vulnerabilidades de segurança (npm audit)
3. Backend: Avisos de migração em alguns logs
4. Testes: 52% de falha (relacionado à mudança de BD)

---

## ✅ **CHECKLIST PARA INICIAR**

- [ ] Ler este arquivo completamente
- [ ] Ler `ARQUITETURA.md`
- [ ] Verificar estado atual do projeto no Railway
- [ ] Clonar repositório localmente
- [ ] Configurar `.env` files
- [ ] Rodar backend e frontend localmente
- [ ] Verificar logs do Railway
- [ ] Identificar causa do erro 502 em fornecedores
- [ ] Corrigir erro 500 em lista mãe (produção)
- [ ] Rodar e corrigir testes

---

## 🎬 **COMEÇANDO**

```bash
# 1. Clone o projeto
git clone https://github.com/AndrewDevos1/ListaKaizenApp.git
cd ListaKaizenApp

# 2. Configure backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 3. Configure .env (copie as variáveis acima)
nano .env

# 4. Rode migrations
flask db upgrade

# 5. Inicie backend
./run-backend.sh

# 6. Em outro terminal, configure frontend
cd frontend
npm install

# 7. Configure .env.local
echo "REACT_APP_API_BASE_URL=http://127.0.0.1:5000" > .env.local

# 8. Inicie frontend
npm start
```

---

## 🤝 **COMO PEDIR AJUDA**

Se precisar de ajuda, forneça:

1. **O que você está tentando fazer?**
2. **O que aconteceu?** (erro exato, logs)
3. **O que você já tentou?**
4. **Ambiente** (local ou produção Railway?)
5. **Screenshots/logs** se possível

---

**Boa sorte! 🚀**

*Última atualização: 24/12/2025 - 02:38 BRT*
