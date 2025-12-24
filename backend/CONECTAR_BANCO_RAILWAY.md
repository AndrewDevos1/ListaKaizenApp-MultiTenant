# 🔗 Conectar Ambiente Local ao Banco PostgreSQL do Railway

**Data:** 24/12/2025 05:16 (Horário de Brasília)  
**Branch:** `conectando-banco-remoto`  
**Objetivo:** Configurar desenvolvimento local para usar o mesmo banco de produção.

---

## 📋 Pré-requisitos

✅ Banco PostgreSQL configurado e funcionando no Railway  
✅ Backend funcionando em produção no Railway  
✅ Ambiente virtual Python ativo localmente  
✅ psycopg2-binary instalado (já está no requirements.txt)

---

## 🚀 Passo a Passo

### 1️⃣ Obter a URL do Banco PostgreSQL

#### Opção A: Via Interface do Railway
1. Acesse [Railway Dashboard](https://railway.app)
2. Entre no projeto **ListaKaizenApp**
3. Clique no serviço **Postgres**
4. Vá na aba **Connect**
5. Copie o valor de **Postgres Connection URL**

Formato esperado:
```
postgresql://postgres:SenhaAleatoria@viaduct.proxy.rlwy.net:12345/railway
```

#### Opção B: Via Variáveis do Backend
1. No Railway, acesse o serviço **kaizen-lists-api**
2. Vá na aba **Variables**
3. Procure por `DATABASE_URL`
4. Copie o valor completo

---

### 2️⃣ Configurar Arquivo .env Local

No diretório `backend/`, crie ou edite o arquivo `.env`:

```bash
cd backend
cp .env.railway-local .env
```

Edite o `.env` e cole a URL real do banco:

```env
# Ambiente
FLASK_ENV=development
FLASK_CONFIG=development
FLASK_APP=run.py
FLASK_DEBUG=1

# 🔗 Banco Railway (Cole a URL real aqui!)
DATABASE_URL=postgresql://postgres:SuaSenhaReal@viaduct.proxy.rlwy.net:12345/railway
DEV_DATABASE_URL=${DATABASE_URL}

# 🔐 Chaves (mesmas do Railway)
SECRET_KEY=1930433fc715424171d1b40d3c6f66aded205682c358aa2f41e99988e8cc77f2
JWT_SECRET_KEY=27c6d58563ccbfed01f520340aed354f20a363f64141f41e3b91b77663a030bf

# 🌐 CORS (permitir frontend local)
CORS_ORIGINS=*
```

---

### 3️⃣ Validar Configuração

#### A) Verificar se o config.py está correto

O arquivo `backend/kaizen_app/config.py` já está configurado para:
- ✅ Priorizar `DATABASE_URL` em desenvolvimento
- ✅ Converter `postgres://` para `postgresql://`
- ✅ Fallback para SQLite se não houver PostgreSQL

#### B) Ativar ambiente virtual

```bash
cd backend
source .venv/bin/activate  # Linux/Mac
# ou
.venv\Scripts\activate     # Windows
```

#### C) Instalar/atualizar dependências

```bash
pip install -r requirements.txt
```

---

### 4️⃣ Executar Migrações (se necessário)

⚠️ **CUIDADO:** Você está mexendo no banco de **PRODUÇÃO**!

```bash
# Ver status atual das migrações
flask db current

# Se precisar aplicar migrações pendentes
flask db upgrade

# Para ver histórico
flask db history
```

---

### 5️⃣ Iniciar o Backend Local

```bash
python run.py
```

Você deve ver:
```
✅ Usando PostgreSQL no desenvolvimento
 * Running on http://127.0.0.1:5000
```

---

## ✅ Checklist de Validação

Execute estas verificações para garantir que está tudo funcionando:

### 1. Health Check
```bash
curl http://localhost:5000/api/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "message": "API is running"
}
```

### 2. Teste de Conexão com Banco
```bash
curl http://localhost:5000/api/health/db
```

**Resposta esperada:**
```json
{
  "database": "connected",
  "type": "postgresql"
}
```

### 3. Verificar Estrutura de Tabelas

```bash
# Entrar no console Python
python

# No console:
from kaizen_app import create_app
from kaizen_app.extensions import db

app = create_app()
with app.app_context():
    # Ver todas as tabelas
    print(db.engine.table_names())
    
    # Contar usuários
    from kaizen_app.models import User
    print(f"Total de usuários: {User.query.count()}")
```

### 4. Testar Rotas Principais

#### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kaizen.com","password":"admin123"}'
```

#### Listar Colaboradores (com token)
```bash
TOKEN="seu_token_aqui"
curl -X GET http://localhost:5000/api/collaborators \
  -H "Authorization: Bearer $TOKEN"
```

#### Listar Listas
```bash
curl -X GET http://localhost:5000/api/lists \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎯 Testes Automatizados

Rode a suíte de testes conectado ao banco Railway:

```bash
# Testes unitários
pytest backend/tests/ -v

# Teste específico de admin
pytest backend/tests/test_admin_features.py -v

# Teste de criação de usuário
python backend/test_create_user.py
```

---

## ⚠️ Avisos Importantes

### 🔴 Você está mexendo em PRODUÇÃO!

1. **Dados reais:** Tudo que você criar/alterar estará no banco de produção
2. **Migrações:** Cuidado ao aplicar migrações - afeta produção imediatamente
3. **Deletar dados:** MUITO cuidado! Não há como desfazer facilmente
4. **Commits:** Não commite o arquivo `.env` com credenciais reais

### 🔒 Segurança

- ✅ O `.gitignore` já ignora arquivos `.env`
- ✅ Nunca compartilhe a `DATABASE_URL` publicamente
- ✅ Use VPN se estiver em rede pública
- ✅ Não exponha o servidor local para internet

### 💾 Backup Recomendado

Antes de alterações importantes, faça backup:

```bash
# Via Railway CLI (se instalado)
railway run pg_dump > backup_$(date +%Y%m%d_%H%M%S).sql

# Ou via interface do Railway:
# Settings → Backups → Create Backup
```

---

## 🔧 Troubleshooting

### Erro: "connection refused"
- ✅ Verifique se a URL está correta
- ✅ Confirme que o serviço Postgres está rodando no Railway
- ✅ Teste conexão com `psql` ou DBeaver

### Erro: "relation does not exist"
- ✅ Execute `flask db upgrade`
- ✅ Verifique se as migrações estão aplicadas no Railway

### Erro: "SSL connection"
- ✅ A config.py já adiciona `sslmode=prefer` automaticamente
- ✅ Certifique-se que psycopg2-binary está instalado

### Performance lenta
- ✅ Normal - o banco está na nuvem Railway
- ✅ Latência de rede afeta velocidade
- ✅ Para dev offline, use SQLite (remova DATABASE_URL do .env)

---

## 🔄 Voltar para SQLite Local

Se quiser voltar a usar SQLite localmente:

```bash
# Edite o .env e comente/remova a DATABASE_URL
# DATABASE_URL=...

# Ou simplesmente delete o .env e use o padrão
rm backend/.env

# O config.py fará fallback automático para SQLite
```

---

## 📚 Arquivos Relacionados

- `backend/.env` - Configurações locais (não versionado)
- `backend/.env.railway-local` - Template para conexão Railway
- `backend/.env.example` - Template para SQLite local
- `backend/kaizen_app/config.py` - Configurações por ambiente
- `backend/COMO_OBTER_URL_RAILWAY.md` - Como pegar credenciais
- `Docs/Railway/RAILWAY_VARIAVEIS_PRONTAS.md` - Variáveis de produção

---

## 📞 Suporte

Se algo der errado:

1. Verifique os logs do Railway: `railway logs`
2. Consulte `Docs/Railway/RAILWAY_TROUBLESHOOTING_LOGS.md`
3. Reverta mudanças locais e teste direto no Railway

---

**✅ Setup concluído!** Agora você está desenvolvendo localmente com o banco de produção.

**Última atualização:** 24/12/2025 05:16 BRT
