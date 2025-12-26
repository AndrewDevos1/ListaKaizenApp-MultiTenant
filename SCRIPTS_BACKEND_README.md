# 🚀 Scripts de Inicialização do Backend

Este diretório contém 3 scripts para iniciar o backend em diferentes modos:

---

## 📋 Scripts Disponíveis

### 1. `./run-backend.sh` (PADRÃO - Automático)
**Detecta automaticamente** qual banco usar baseado no arquivo `.env`:

```bash
./run-backend.sh
```

**Comportamento:**
- ✅ Se `.env` tem `DATABASE_URL=postgresql://...` → Usa Railway PostgreSQL
- ✅ Se `.env` NÃO tem `DATABASE_URL` → Usa SQLite local
- ✅ Se `.env` não existe → Usa SQLite local

**Use quando:** Trabalho normal do dia a dia

---

### 2. `./run-backend-railway.sh` (RAILWAY - Produção)
**Força conexão com Railway PostgreSQL** e valida antes de iniciar:

```bash
./run-backend-railway.sh
```

**Comportamento:**
- 🚂 Exige que `.env` esteja configurado com Railway
- ✅ Valida conexão com PostgreSQL antes de iniciar
- ⚠️  Mostra aviso que está mexendo em PRODUÇÃO
- ❌ Falha se não conseguir conectar

**Use quando:** 
- Testar com dados de produção
- Validar mudanças antes de deploy
- Debugar problemas em produção

**⚠️ CUIDADO:** Você está mexendo no banco REAL!

---

### 3. `./run-backend-local.sh` (LOCAL - SQLite)
**Força uso de SQLite local**, ignorando `.env`:

```bash
./run-backend-local.sh
```

**Comportamento:**
- 💾 Sempre usa `kaizen_dev.db` (SQLite local)
- 🔧 Remove variáveis `DATABASE_URL` do ambiente
- 🚀 Rápido e seguro para desenvolvimento offline

**Use quando:**
- Trabalhar offline sem internet
- Testar mudanças sem afetar produção
- Desenvolvimento rápido com dados locais

---

## 🔧 Configuração do .env

### Para usar Railway PostgreSQL:

```bash
cd backend
cp .env.railway-local .env
# Edite .env e cole a DATABASE_URL do Railway
```

### Para usar SQLite local:

```bash
cd backend
rm .env  # Ou simplesmente não tenha DATABASE_URL no .env
```

---

## 📊 Comparação Rápida

| Script | Banco | Auto-detecta? | Valida conexão? | Seguro offline? |
|--------|-------|---------------|-----------------|-----------------|
| `run-backend.sh` | Auto | ✅ Sim | ❌ Não | ⚠️ Depende do .env |
| `run-backend-railway.sh` | Railway | ❌ Não | ✅ Sim | ❌ Requer internet |
| `run-backend-local.sh` | SQLite | ❌ Não | N/A | ✅ Sim |

---

## 🎯 Exemplos de Uso

### Desenvolvimento normal (auto-detecta):
```bash
./run-backend.sh
```

### Testar com dados de produção:
```bash
./run-backend-railway.sh
```

### Trabalhar offline:
```bash
./run-backend-local.sh
```

### Alternar entre modos:
```bash
# 1. Parar o backend atual (Ctrl+C)

# 2. Escolher o modo:
./run-backend-railway.sh    # Para Railway
# ou
./run-backend-local.sh       # Para SQLite

# 3. Backend inicia no modo escolhido
```

---

## ⚠️ Avisos Importantes

### Railway PostgreSQL:
- 🔴 Você está mexendo no banco de **PRODUÇÃO**
- 📊 Dados reais de usuários e listas
- ⚠️ Migrações afetam produção imediatamente
- 🔒 Não commite `.env` com credenciais

### SQLite Local:
- ✅ Seguro para testes
- 💾 Dados ficam em `kaizen_dev.db`
- 🚀 Rápido e funciona offline
- ⚠️ Dados não sincronizam com produção

---

## 📚 Documentação Relacionada

- `backend/CONECTAR_BANCO_RAILWAY.md` - Guia completo Railway
- `CHECKLIST_CONEXAO_RAILWAY.md` - Checklist de validação
- `QUICK_START_RAILWAY_LOCAL.md` - Setup rápido
- `backend/.env.railway-local` - Template do .env

---

**Atualizado:** 24/12/2025 05:27 BRT
