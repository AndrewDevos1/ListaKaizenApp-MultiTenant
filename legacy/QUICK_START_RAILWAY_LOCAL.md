# 🚀 QUICK START - Conexão Local Railway

## ⚡ Setup Rápido (3 passos)

```bash
# 1. Copie o template
cd backend
cp .env.railway-local .env

# 2. Cole a DATABASE_URL do Railway no .env
# (Pegue em: Railway → Postgres → Connect → Connection String)

# 3. Inicie o backend
source .venv/bin/activate
python run.py
```

## ✅ Validar

```bash
# Health check básico
curl http://localhost:5000/api/health

# Health check do banco
curl http://localhost:5000/api/health/db

# Ou use o script automático
./backend/validate_railway_connection.sh
```

## 📚 Documentação Completa

- **`backend/CONECTAR_BANCO_RAILWAY.md`** - Guia detalhado completo
- **`CHECKLIST_CONEXAO_RAILWAY.md`** - Checklist passo a passo
- **`backend/.env.railway-local`** - Template do .env
- **`Docs/Railway/`** - Todas as configs do Railway

## ⚠️ Importante

- Você está mexendo no banco de **PRODUÇÃO**
- NÃO commite o arquivo `.env` com credenciais
- Cuidado com migrações - elas afetam produção!

---

**Branch:** `conectando-banco-remoto`  
**Data:** 24/12/2025 05:16 BRT
