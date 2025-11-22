# 🚨 TROUBLESHOOTING RENDER - PROBLEMAS COMUNS

## ⚠️⚠️⚠️ ERRO: "no such table: usuarios" (SQLite em produção) ⚠️⚠️⚠️

### SINTOMAS:
- Login falha com erro 502
- Logs mostram: `(sqlite3.OperationalError) no such table: usuarios`
- CORS Missing Allow Origin
- Frontend não consegue fazer login

### CAUSA RAIZ:
**O START COMMAND NO RENDER ESTÁ ERRADO!**

O comando está chamando `create_app()` diretamente sem passar a configuração, então o Flask usa 'development' (SQLite) em vez de 'production' (PostgreSQL).

---

## ✅ SOLUÇÃO DEFINITIVA

### 1. Verificar Start Command no Render

**Dashboard Render → kaizen-lists-api → Settings → Start Command**

❌ **ERRADO:**
```
gunicorn -w 4 -b 0.0.0.0:8080 "kaizen_app:create_app()"
```

✅ **CORRETO:**
```
gunicorn -w 4 -b 0.0.0.0:$PORT run:app
```

### POR QUÊ ISSO FUNCIONA?

**Comando errado:**
- Chama `create_app()` sem argumentos
- Usa config padrão = 'development'
- Tenta usar SQLite
- SQLite não existe no Render
- Erro: "no such table"

**Comando correto:**
- Usa `run.py`
- `run.py` lê `FLASK_CONFIG=production` do ambiente
- Passa `production` para `create_app(config_name)`
- Usa PostgreSQL ✅

---

## 📋 CHECKLIST COMPLETO

Quando der erro de login/502 no Render, verificar NESTA ORDEM:

### 1. ✅ Environment Variables (Render Dashboard → Environment)
Devem existir:
```
FLASK_CONFIG=production
DATABASE_URL=postgresql://... (preenchido automaticamente pelo Render)
```

### 2. ✅ Start Command (Render Dashboard → Settings)
Deve ser:
```
gunicorn -w 4 -b 0.0.0.0:$PORT run:app
```

### 3. ✅ Build Command (Render Dashboard → Settings)
Deve ser:
```
pip install -r requirements.txt
```

### 4. ✅ Pre-Deploy Command (Render Dashboard → Settings)
Pode estar vazio OU:
```
flask db upgrade
```

### 5. ✅ Root Directory
Deve ser:
```
backend
```

---

## 🔍 COMO DIAGNOSTICAR

### Ver logs do Render:
1. Dashboard Render → kaizen-lists-api → Logs
2. Procurar por:
   - `sqlite3.OperationalError` → Start Command errado!
   - `[FLASK] Novo request` → Backend está recebendo requests
   - Código 502 → Backend crashando

### Testar localmente:
```bash
# Simular produção localmente
cd backend
export FLASK_CONFIG=production
export DATABASE_URL=postgresql://...
gunicorn -w 4 -b 0.0.0.0:8080 run:app
```

---

---

## 🚨🚨🚨 ERRO: "relation lista_mae_itens does not exist" 🚨🚨🚨

### SINTOMAS:
- Login funciona ✅
- Mas ao tentar listar/criar listas → erro 502
- Logs mostram: `(psycopg2.errors.UndefinedTable) relation "lista_mae_itens" does not exist`
- Frontend mostra "Erro ao carregar listas"

### CAUSA RAIZ:
**MIGRATIONS NÃO FORAM APLICADAS CORRETAMENTE NO BANCO DE PRODUÇÃO!**

Isso acontece quando:
1. Há múltiplas "heads" (branches divergentes) nas migrations
2. Usamos `flask db stamp head` para "marcar" migrations como aplicadas
3. Mas as tabelas nunca foram criadas de verdade
4. Quando rodamos `flask db upgrade`, ele acha que está tudo aplicado e não faz nada

---

## ✅ SOLUÇÃO COMPLETA PARA MIGRATIONS

### PROBLEMA 1: Múltiplas Heads nas Migrations

**Erro no build:**
```
ERROR [flask_migrate] Error: Multiple head revisions are present
```

**Solução:**
```bash
# Local (com venv ativado)
cd backend
FLASK_APP=run.py flask db merge -m "Merge migration heads" heads
git add migrations/versions/*.py
git commit -m "fix: Merge divergent migration heads"
git push origin master
```

---

### PROBLEMA 2: Tabelas Já Existem (stamp head foi usado)

**Erro no build:**
```
relation "areas" already exists
```

**Causa:** As tabelas foram criadas manualmente ou por migrations antigas, mas o histórico do Alembic não está sincronizado.

**❌ NÃO FUNCIONA:** Apenas rodar `flask db upgrade` (ele pula tudo porque acha que está aplicado)

**✅ SOLUÇÃO DEFINITIVA:**

1. **Criar script para criar tabelas faltantes** (`backend/create_missing_tables.py`):

```python
import os
from kaizen_app import create_app, db
from sqlalchemy import text

config_name = os.getenv('FLASK_CONFIG', 'production')
app = create_app(config_name)

with app.app_context():
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS lista_mae_itens (
        id SERIAL PRIMARY KEY,
        lista_mae_id INTEGER NOT NULL,
        nome VARCHAR(100) NOT NULL,
        unidade VARCHAR(20),
        quantidade_atual FLOAT DEFAULT 0,
        quantidade_minima FLOAT DEFAULT 0,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lista_mae_id) REFERENCES listas(id) ON DELETE CASCADE
    );
    """

    try:
        db.session.execute(text(create_table_sql))
        db.session.commit()
        print("✅ Tabela lista_mae_itens criada com sucesso")
    except Exception as e:
        print(f"❌ Erro: {e}")
        db.session.rollback()
```

2. **Atualizar Build Command no Render:**

```bash
pip install -r requirements.txt && FLASK_APP=run.py python create_missing_tables.py && FLASK_APP=run.py flask db upgrade
```

**O que isso faz:**
- ✅ Instala dependências
- ✅ **Cria tabelas faltantes** (se não existirem)
- ✅ Roda migrations normalmente
- ✅ Se a tabela já existe, não dá erro (CREATE TABLE IF NOT EXISTS)

---

## 🔄 FLUXO COMPLETO DE CORREÇÃO (22/11/2025)

### Problemas encontrados em sequência:

1. **SQLite em produção** → Start Command errado
   - Solução: Mudar para `gunicorn -w 4 -b 0.0.0.0:$PORT run:app`

2. **Múltiplas heads** → Branches divergentes nas migrations
   - Solução: `flask db merge heads`

3. **Tabelas já existem** → Migration inicial tentando criar tudo
   - Tentativa 1: `flask db stamp head` (❌ marcou tudo mas não criou tabelas faltantes)
   - Tentativa 2: `flask db upgrade` (❌ pulou tudo porque estava marcado como aplicado)
   - **Solução final:** Script `create_missing_tables.py` ✅

4. **Tabela lista_mae_itens faltando** → Migration marcada como aplicada mas nunca executada
   - Solução: Script create_missing_tables.py criou a tabela

---

## 📝 HISTÓRICO COMPLETO

**Data:** 22/11/2025

**Problema 1:** Backend usando SQLite em produção
**Causa:** Start Command chamando `create_app()` sem argumentos
**Solução:** Mudar para `run:app` que lê FLASK_CONFIG do ambiente

**Problema 2:** Múltiplas heads nas migrations
**Causa:** Branches divergentes (feature/lista-mae foi mergeada)
**Solução:** `flask db merge heads` + commit + push

**Problema 3:** Tabelas já existem no banco
**Causa:** Banco foi criado anteriormente, histórico Alembic desatualizado
**Solução:** `flask db stamp head` para marcar estado atual

**Problema 4:** Tabela lista_mae_itens não existe
**Causa:** `stamp head` marcou como aplicado mas nunca criou a tabela de verdade
**Solução:** Script `create_missing_tables.py` + atualizar Build Command

---

## ⚡ AÇÃO RÁPIDA - CONFIGURAÇÃO FINAL QUE FUNCIONA

### No Render Dashboard:

**1. Start Command:**
```
gunicorn -w 4 -b 0.0.0.0:$PORT run:app
```

**2. Build Command:**
```
pip install -r requirements.txt && FLASK_APP=run.py python create_missing_tables.py && FLASK_APP=run.py flask db upgrade
```

**3. Environment Variables:**
```
FLASK_CONFIG=production
DATABASE_URL=postgresql://... (auto-preenchido)
CORS_ORIGINS=https://lista-kaizen-app.vercel.app
```

**4. Root Directory:**
```
backend
```

---

## 🎯 REGRAS DE OURO PARA MIGRATIONS

1. **NUNCA** use `flask db stamp head` a não ser que saiba exatamente o que está fazendo
2. **SEMPRE** faça merge de heads divergentes antes de fazer deploy
3. **SE** as tabelas já existirem mas faltarem algumas:
   - Crie um script Python para criar as tabelas faltantes com `CREATE TABLE IF NOT EXISTS`
   - Adicione o script no Build Command
4. **LEMBRE-SE:** Plano Free do Render NÃO tem acesso a:
   - Shell (para rodar comandos manualmente)
   - Pre-Deploy Command (só em planos pagos)
   - Solução: Fazer tudo via Build Command

---

## 🚀 CHECKLIST ANTES DE FAZER DEPLOY

- [ ] Start Command está correto: `gunicorn -w 4 -b 0.0.0.0:$PORT run:app`
- [ ] FLASK_CONFIG=production está nas variáveis de ambiente
- [ ] DATABASE_URL existe (auto-preenchido pelo Render)
- [ ] Build Command inclui script para criar tabelas faltantes
- [ ] Não há múltiplas heads nas migrations (`flask db heads` mostra apenas 1)
- [ ] Root Directory = `backend`

**NÃO PRECISA FAZER PUSH NO GIT PARA MUDAR COMANDOS!** É só configuração do Render.
