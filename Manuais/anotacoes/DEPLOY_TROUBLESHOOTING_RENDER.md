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

---

## 🚨 ERRO: "Não consigo deletar listas na web" (22/11/2025)

### SINTOMAS:
- Login funciona ✅
- Listas aparecem ✅
- Mas ao tentar deletar uma lista → **erro aparece na tela**
- **No ambiente local funciona 100%** ✅
- Erro só acontece no Render

### CAUSA RAIZ:
**TABELAS FALTANDO NO BANCO DE PRODUÇÃO (RENDER)!**

Especificamente:
1. ❌ Tabela `fornecedor_lista` não existe
2. ❌ Colunas `responsavel` e `observacao` não existem em `fornecedores`

### POR QUÊ ISSO ACONTECEU?

#### Problema 1: Tabela `fornecedor_lista`
- A tabela está definida no código (`models.py:67`)
- É uma tabela auxiliar para relacionamento many-to-many: `Fornecedor ↔ Lista`
- **MAS nunca foi criada migration para ela!**
- Quando tenta deletar uma lista, o SQLAlchemy tenta acessar essa tabela
- Como ela não existe no Render → **ERRO!**

#### Problema 2: Colunas `responsavel` e `observacao`
- As colunas existem no modelo `Fornecedor` (`models.py:79-80`)
- **MAS nunca foi criada migration para adicionar essas colunas!**
- Provavelmente foram adicionadas manualmente no banco local
- No Render, essas colunas não existem

---

## ✅ SOLUÇÃO COMPLETA

### 1. Criar Migration para `fornecedor_lista`

**Problema:** Alembic não detecta a tabela porque ela já existe no banco local (criada por script).

**Solução:** Criar migration manualmente com verificação de segurança:

```python
# migrations/versions/de9b2e523935_add_fornecedor_lista_junction_table.py

def upgrade():
    from sqlalchemy.engine.reflection import Inspector

    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()

    # Só cria se a tabela NÃO existir
    if 'fornecedor_lista' not in tables:
        op.create_table('fornecedor_lista',
            sa.Column('fornecedor_id', sa.Integer(), nullable=False),
            sa.Column('lista_id', sa.Integer(), nullable=False),
            sa.Column('criado_em', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['fornecedor_id'], ['fornecedores.id'], ),
            sa.ForeignKeyConstraint(['lista_id'], ['listas.id'], ),
            sa.PrimaryKeyConstraint('fornecedor_id', 'lista_id')
        )

def downgrade():
    op.drop_table('fornecedor_lista')
```

### 2. Criar Migration para `responsavel` e `observacao`

```python
# migrations/versions/c73c13f3b371_add_responsavel_and_observacao_fields_.py

def upgrade():
    from sqlalchemy.engine.reflection import Inspector

    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    columns = [col['name'] for col in inspector.get_columns('fornecedores')]

    # Só adiciona se as colunas NÃO existirem
    if 'responsavel' not in columns:
        with op.batch_alter_table('fornecedores', schema=None) as batch_op:
            batch_op.add_column(sa.Column('responsavel', sa.String(length=100), nullable=True))

    if 'observacao' not in columns:
        with op.batch_alter_table('fornecedores', schema=None) as batch_op:
            batch_op.add_column(sa.Column('observacao', sa.String(length=600), nullable=True))

def downgrade():
    with op.batch_alter_table('fornecedores', schema=None) as batch_op:
        batch_op.drop_column('observacao')
        batch_op.drop_column('responsavel')
```

### 3. Atualizar Build Command no Render

**IMPORTANTE:** Como Pre-Deploy Command é só para planos pagos, precisamos rodar migrations no Build Command!

**Build Command atualizado:**
```bash
pip install -r requirements.txt && FLASK_APP=run.py flask db upgrade
```

**O que isso faz:**
1. ✅ Instala dependências
2. ✅ **Roda todas as migrations pendentes**
3. ✅ Cria tabelas/colunas faltantes
4. ✅ Migrations com verificação de segurança não dão erro se tabela/coluna já existir

---

## 🔄 FLUXO COMPLETO DE CORREÇÃO (22/11/2025 - Parte 2)

### Sequência de problemas:

**1. Usuário reporta:** "Não consigo deletar listas na web"
   - ✅ Funciona local
   - ❌ Erro no Render

**2. Diagnóstico:** Tabela `fornecedor_lista` não existe no Render
   - Código: `models.py` define a tabela
   - Banco local: Tabela existe (criada por script)
   - Banco Render: **Tabela NÃO existe!**

**3. Verificação completa de tabelas:**
   - ✅ Comparamos todos os models com as migrations
   - ❌ Encontramos mais problemas: colunas `responsavel` e `observacao` faltando

**4. Solução implementada:**
   - ✅ Criada migration para tabela `fornecedor_lista` (de9b2e523935)
   - ✅ Criada migration para colunas em `fornecedores` (c73c13f3b371)
   - ✅ **Adicionado verificação de segurança** em ambas (IF NOT EXISTS)
   - ✅ Atualizado Build Command para rodar migrations
   - ✅ Commit + Push → Deploy automático no Render

**5. Resultado esperado:**
   - ✅ Tabela `fornecedor_lista` criada
   - ✅ Colunas `responsavel` e `observacao` adicionadas
   - ✅ **Deletar listas funciona!**

---

## 📝 LISTA COMPLETA DE TABELAS (Referência)

### Tabelas Principais (10):
1. `usuarios` → Migration `173f5518beb9` (initial)
2. `itens` → Migration `173f5518beb9` (initial)
3. `areas` → Migration `173f5518beb9` (initial)
4. `fornecedores` → Migration `173f5518beb9` (initial) + `c73c13f3b371` (colunas)
5. `estoques` → Migration `173f5518beb9` (initial)
6. `pedidos` → Migration `173f5518beb9` (initial)
7. `cotacoes` → Migration `173f5518beb9` (initial)
8. `cotacao_itens` → Migration `173f5518beb9` (initial)
9. `listas` → Migration `c568f5f72228`
10. `lista_mae_itens` → Migration `a1b2c3d4e5f6`

### Tabelas Auxiliares/Junção (2):
11. `lista_colaborador` → Migration `c568f5f72228`
12. `fornecedor_lista` → Migration `de9b2e523935` ⚠️ **ADICIONADA 22/11/2025**

---

## 🎯 REGRAS DE OURO PARA MIGRATIONS (Atualizadas)

1. **SEMPRE** crie migrations para TODAS as mudanças no modelo
   - ❌ Não adicione tabelas/colunas só no código
   - ❌ Não crie tabelas manualmente no banco
   - ✅ Use `flask db migrate` para gerar migration
   - ✅ Revise a migration gerada antes de commitar

2. **MIGRATIONS DEVEM SER IDEMPOTENTES**
   - ✅ Adicione verificações de segurança (tabela/coluna existe?)
   - ✅ Use `CREATE TABLE IF NOT EXISTS` quando possível
   - ✅ Verifique com Inspector antes de criar
   - ❌ Nunca assuma que o banco está no estado esperado

3. **QUANDO ALEMBIC NÃO DETECTA MUDANÇAS:**
   - Causa: Tabela/coluna já existe no banco local
   - Solução: Editar migration manualmente
   - Adicionar verificação: `if 'tabela' not in tables:`

4. **BANCO LOCAL DESSINCRONIZADO?**
   - Use `flask db stamp head` para marcar como atualizado
   - Depois crie novas migrations normalmente
   - ⚠️ Cuidado: Isso NÃO cria tabelas faltantes!

5. **NO RENDER (Plano Free):**
   - ❌ Não tem Pre-Deploy Command
   - ✅ Use Build Command: `pip install && flask db upgrade`
   - ✅ Migrations rodam durante o build
   - ✅ Build falha se migration der erro (isso é bom!)

---

## 📊 COMPARAÇÃO: LOCAL vs PRODUÇÃO

### Por que erros só aparecem no Render?

**Banco Local (SQLite):**
- ✅ Desenvolvedor pode rodar scripts manualmente
- ✅ Pode criar tabelas via Python console
- ✅ Pode adicionar colunas direto no banco
- ❌ **Problema:** Código funciona mas migrations não refletem o real

**Banco Produção (PostgreSQL no Render):**
- ❌ Sem acesso direto ao banco
- ❌ Sem shell para rodar scripts
- ✅ **APENAS migrations são aplicadas**
- ✅ **Vantagem:** Revela inconsistências entre código e migrations

### Lição aprendida:
- ✅ **Produção é a fonte da verdade**
- ✅ Se funciona local mas não no Render → **migrations faltando!**
- ✅ Sempre teste migrations em banco limpo antes de fazer deploy

---

## 🚀 CHECKLIST ANTES DE FAZER DEPLOY (Atualizado)

### 1. Verificações de Código:
- [ ] Todas as mudanças em `models.py` têm migrations correspondentes
- [ ] Não há tabelas auxiliares (`db.Table()`) sem migration
- [ ] Não há colunas novas sem migration

### 2. Verificações de Migrations:
- [ ] `flask db heads` mostra apenas 1 head (sem divergências)
- [ ] Todas as migrations têm verificações de segurança
- [ ] Testou migrations em banco limpo (deletar banco local e rodar do zero)

### 3. Configuração Render:
- [ ] Start Command: `gunicorn -w 4 -b 0.0.0.0:$PORT run:app`
- [ ] Build Command: `pip install -r requirements.txt && FLASK_APP=run.py flask db upgrade`
- [ ] Environment: `FLASK_CONFIG=production`
- [ ] Root Directory: `backend`

### 4. Após Deploy:
- [ ] Verificar logs do Render (migrations rodaram?)
- [ ] Testar funcionalidades críticas (login, CRUD)
- [ ] Verificar se erros desapareceram

---

## 💡 DICAS PARA PREVENIR PROBLEMAS

### 1. Sempre que adicionar model/campo:
```bash
# 1. Adicionar no models.py
# 2. Criar migration
cd backend
FLASK_APP=run.py flask db migrate -m "Add campo_x to Model"

# 3. Revisar migration gerada
# 4. Se necessário, adicionar verificações de segurança

# 5. Testar localmente
FLASK_APP=run.py flask db upgrade

# 6. Commit + Push
git add migrations/versions/*.py
git commit -m "feat: Add migration for campo_x"
git push
```

### 2. Antes de criar tabela auxiliar (many-to-many):
```python
# 1. Definir no models.py
tabela_auxiliar = db.Table('tabela_auxiliar', ...)

# 2. IMEDIATAMENTE criar migration
flask db migrate -m "Add tabela_auxiliar junction table"

# 3. ⚠️ Se Alembic não detectar, editar manualmente:
def upgrade():
    from sqlalchemy.engine.reflection import Inspector
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()

    if 'tabela_auxiliar' not in tables:
        op.create_table('tabela_auxiliar', ...)
```

### 3. Script create_missing_tables.py:
- ✅ Útil para recuperação emergencial
- ❌ **NÃO deve ser solução permanente!**
- ✅ Sempre crie migration depois
- ✅ Remova o script do Build Command quando migrations estiverem ok
