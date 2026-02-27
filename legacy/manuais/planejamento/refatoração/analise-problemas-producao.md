# 🚨 ANÁLISE DE PROBLEMAS EM PRODUÇÃO

**Data**: 2026-01-04
**Ambiente**: Produção (Railway)
**Severity**: 🔴 CRÍTICO (Serviço indisponível)

---

## 📋 SUMÁRIO DOS INCIDENTES

### Problema 1: Frontend SPA Quebrado
- **Sintoma**: GET /login → 404, raiz mostra "Index of build/"
- **Causa Raiz**: build/index.html NÃO FOI GERADO
- **Status**: ⚠️ PENDENTE (rollback temporário aplicado)

### Problema 2: Backend Migration Missing
- **Sintoma**: `Can't locate revision b7c3e9d1f2a4`
- **Causa Raiz**: Rollback removeu migration aplicada no banco
- **Status**: ✅ RESOLVIDO (migration restaurada)

---

## 🔍 ANÁLISE DETALHADA - FRONTEND

### Sintomas Observados

```
GET /login → 404 Not Found
GET / → "Index of build/" (listagem de diretório)
GET /index.html → redirect → / → listagem
```

**Logs**:
- ✓ `npx serve -s build -l $PORT` rodando
- ✗ Página lista arquivos estáticos (não HTML)
- ✗ Sem `index.html` no diretório servido

---

### Causa Raiz: Build Incompleto

**Arquivo analisado**: `frontend/railway.json`

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "CI=false npm install && npm run build"  ← PROBLEMA AQUI
  },
  "deploy": {
    "startCommand": "npx serve -s build -l $PORT",
    "healthcheckPath": "/"  ← PROBLEMA AQUI TAMBÉM
  }
}
```

**3 Problemas Identificados**:

#### 1. CI=false Esconde Erros ❌

```bash
# SEM CI=false
npm run build
# TypeScript error → Exit code 1 → Build FALHA → Deploy PARA

# COM CI=false
CI=false npm run build
# TypeScript error → Exit code 0 → Build CONTINUA → Deploy QUEBRADO
```

**Consequência**: Build pode falhar mas Railway não detecta, deploy continua sem `index.html`.

---

#### 2. Sem Validação de index.html ❌

```bash
"buildCommand": "CI=false npm install && npm run build"
# Se build falhar → index.html não existe → MAS DEPLOY CONTINUA
```

**Solução**:
```bash
"buildCommand": "npm ci && npm run build && test -f build/index.html || exit 1"
                                           ↑ FAZ DEPLOY FALHAR SE ARQUIVO NÃO EXISTIR
```

---

#### 3. Healthcheck Genérico ❌

```json
"healthcheckPath": "/"
```

**Problema**:
- `/` retorna 200 mesmo listando diretório (serve não detecta erro)
- Railway marca como "healthy"
- Usuários veem página quebrada

**Solução**:
```json
"healthcheckPath": "/index.html"
```

**Benefício**:
- Se `index.html` não existir → 404 → Railway FALHA deploy
- Não põe versão quebrada em produção

---

### Por Que build/index.html Não Foi Gerado?

**Hipótese A: Build Falhou por Memória** ⭐ MAIS PROVÁVEL

React build precisa ~2GB RAM:
- Nixpacks pode ter limite de memória
- Build morreu (OOM killed)
- `CI=false` escondeu o erro

**Evidências**:
- CRA com React 19 é pesado
- Build local funciona (mais RAM disponível)
- Problema apareceu depois de mudanças grandes

**Solução**:
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "NODE_OPTIONS='--max-old-space-size=4096' npm ci && npm run build && test -f build/index.html"
  }
}
```

---

**Hipótese B: Erro TypeScript Silencioso**

Código novo (ex: ConflictModal) com erros de tipo:
- `CI=false` ignora erros
- Build não gera output

**Como verificar**:
```bash
cd frontend
npx tsc --noEmit  # Deve mostrar erros TypeScript se existirem
```

---

**Hipótese C: Cache Corrompido**

`node_modules/.cache` do Webpack com estado ruim:
- Build usa cache velho
- Gera saída incompleta

**Solução**:
```json
"buildCommand": "rm -rf node_modules/.cache && npm ci && npm run build && test -f build/index.html"
```

---

## 🔍 ANÁLISE DETALHADA - BACKEND

### Sintomas Observados

```
ERROR [flask_migrate] Can't locate revision identified by 'b7c3e9d1f2a4'
```

Deploy travava no `flask db upgrade`.

---

### Causa Raiz: Rollback Removeu Migration Aplicada

**Timeline do Problema**:

```
1. Deploy original (commit ABC)
   └─ Contém migration b7c3e9d1f2a4
   └─ Railway roda: flask db upgrade
   └─ Banco aplica migration
   └─ Tabela alembic_version: "b7c3e9d1f2a4"

2. Rollback para commit anterior (2f12a2c)
   └─ Commit NÃO TEM migration b7c3e9d1f2a4
   └─ Arquivo removido do repo

3. Novo deploy (pós-rollback)
   └─ Railway roda: flask db upgrade
   └─ Alembic procura b7c3e9d1f2a4 (banco aponta pra ela)
   └─ Arquivo não existe → ERRO
   └─ Gunicorn nunca inicia
```

---

### Explicação Técnica: Como Alembic Funciona

**Tabela de controle** (banco de dados):
```sql
CREATE TABLE alembic_version (
  version_num VARCHAR(32) PRIMARY KEY
);

-- Conteúdo após migration aplicada:
| version_num       |
|-------------------|
| b7c3e9d1f2a4      |  ← Banco "lembra" que aplicou essa migration
```

**Arquivos de migration** (código):
```
backend/migrations/versions/
├── a1b2c3d4e5f6_initial.py           ✓ Existe
├── b7c3e9d1f2a4_add_atualizado_em.py ✗ FOI REMOVIDA NO ROLLBACK
└── c9d8e7f6g5h4_next_migration.py    ✓ Existe
```

**O que acontece no flask db upgrade**:
```python
# 1. Alembic lê banco
current_version = "b7c3e9d1f2a4"  # Da tabela alembic_version

# 2. Alembic procura arquivo
migration_file = "migrations/versions/b7c3e9d1f2a4_*.py"
# Arquivo NÃO EXISTE → FileNotFoundError

# 3. Erro fatal
raise Exception("Can't locate revision b7c3e9d1f2a4")
```

---

### Solução Aplicada: Restaurar Migration

**Commit**: `37c210d`

```bash
# Restaurou arquivo removido
backend/migrations/versions/b7c3e9d1f2a4_add_atualizado_em_to_estoques.py
```

**Por que funcionou**:
- Alembic encontrou o arquivo
- `flask db upgrade` rodou normalmente
- Backend iniciou com sucesso

---

### Regra de Ouro: Migrations São Forward-Only

> **NUNCA fazer rollback que remove migrations aplicadas em produção**

**Processo correto para reverter migration**:

```bash
# ❌ ERRADO: Remover arquivo
git revert HEAD  # Remove migration do código
git push         # Banco quebra no próximo deploy

# ✅ CORRETO: Downgrade + Nova Migration
# 1. Downgrade no banco PRIMEIRO
flask db downgrade -1

# 2. Criar migration que reverte
flask db migrate -m "revert: remove campo atualizado_em"

# 3. Commitar
git add backend/migrations/versions/*
git commit -m "revert: remove campo atualizado_em via downgrade migration"
git push
```

---

## ✅ SOLUÇÕES DEFINITIVAS

### 1. Correção Frontend (URGENTE)

**Arquivo**: `frontend/railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "NODE_OPTIONS='--max-old-space-size=4096' npm ci && npm run build && test -f build/index.html || (echo 'ERROR: build/index.html not found' && ls -laR build && exit 1)"
  },
  "deploy": {
    "startCommand": "npx serve -s build -l $PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "healthcheckPath": "/index.html",
    "healthcheckTimeout": 100
  }
}
```

**Mudanças**:
1. ✅ `NODE_OPTIONS='--max-old-space-size=4096'` → Previne OOM
2. ✅ `npm ci` em vez de `npm install` → Instalação determinística
3. ✅ Removido `CI=false` → Erros não são escondidos
4. ✅ `test -f build/index.html` → Validação obrigatória
5. ✅ `ls -laR build` → Debug se falhar
6. ✅ `healthcheckPath: "/index.html"` → Verifica arquivo específico

---

### 2. Script de Validação (RECOMENDADO)

**Criar**: `frontend/scripts/validate-build.sh`

```bash
#!/bin/bash
set -e

echo "=== Validando build do React ==="

# Verificar index.html existe
if [ ! -f "build/index.html" ]; then
  echo "❌ ERROR: build/index.html não encontrado"
  ls -la build/
  exit 1
fi
echo "✓ index.html existe"

# Verificar tamanho (deve ter >1KB)
SIZE=$(wc -c < build/index.html)
if [ "$SIZE" -lt 1000 ]; then
  echo "❌ ERROR: index.html muito pequeno ($SIZE bytes)"
  cat build/index.html
  exit 1
fi
echo "✓ index.html tem $SIZE bytes"

# Verificar referências JS
if ! grep -q "static/js/main" build/index.html; then
  echo "❌ ERROR: index.html não referencia bundle JS"
  grep "script" build/index.html || true
  exit 1
fi
echo "✓ index.html referencia bundles"

# Verificar arquivos JS existem
JS_COUNT=$(find build/static/js -name "*.js" 2>/dev/null | wc -l)
if [ "$JS_COUNT" -eq 0 ]; then
  echo "❌ ERROR: Nenhum arquivo .js gerado"
  ls -la build/static/ || true
  exit 1
fi
echo "✓ $JS_COUNT arquivos JS gerados"

echo "✅ BUILD VALIDADO COM SUCESSO"
```

**Uso**:
```json
{
  "buildCommand": "npm ci && npm run build && bash scripts/validate-build.sh"
}
```

---

### 3. Documentação de Rollback

**Criar**: `docs/ROLLBACK.md`

```markdown
# Processo de Rollback Seguro

## ⚠️ ANTES DE FAZER ROLLBACK

### Verificar Migrations

```bash
# Listar commits a reverter
git log HEAD~5..HEAD --oneline

# Procurar migrations
git diff HEAD~5..HEAD --name-only | grep migrations/versions
```

**Se houver migrations**:
- ✅ Fazer downgrade no banco ANTES do rollback
- ✅ OU: Manter migrations no código (cherry-pick)
- ❌ NUNCA: Remover migration aplicada no banco

### Processo Correto

**Opção A: Manter Migration no Rollback**
```bash
# 1. Revert código mas mantém migration
git revert --no-commit HEAD
git restore --staged backend/migrations/
git commit -m "revert: rollback code but keep migration"
git push origin master
```

**Opção B: Downgrade Primeiro**
```bash
# 1. Downgrade banco em PRODUÇÃO
# Via Railway console ou SSH:
cd backend && source .venv/bin/activate
flask db downgrade -1

# 2. Rollback código
git revert HEAD
git push origin master
```

## ✅ Pós-Rollback

- [ ] Verificar logs do Railway (build + deploy)
- [ ] Testar rotas críticas (/login, /, /api/health)
- [ ] Confirmar `flask db current` no banco
- [ ] Comunicar time
```

---

## 📊 CHECKLIST DE DEPLOY SEGURO

### Pre-Deploy

**Backend**:
- [ ] Migrations testadas localmente (`flask db upgrade && flask db downgrade && flask db upgrade`)
- [ ] Testes passando (`pytest backend/tests/ -v`)
- [ ] Sem migrations conflitantes (`flask db history`)

**Frontend**:
- [ ] Build local bem-sucedido (`npm run build`)
- [ ] `build/index.html` existe
- [ ] Sem erros TypeScript (`npx tsc --noEmit`)
- [ ] Bundle size razoável (<500KB gzipped)

**Ambos**:
- [ ] PR revisado e aprovado
- [ ] CHANGELOG atualizado

---

### Durante Deploy

**Monitoramento**:
- [ ] Acompanhar logs do Railway em tempo real
- [ ] Verificar build completo (procurar "Creating optimized production build")
- [ ] Verificar deploy iniciou (procurar "Starting...")

**Frontend**:
```bash
# Procurar no log:
✓ "File sizes after gzip"
✓ "The build folder is ready"
✗ "error" ou "failed"
```

**Backend**:
```bash
# Procurar no log:
✓ "Running migrations"
✓ "Booting worker with pid"
✗ "Can't locate revision"
✗ "ImportError" ou "ModuleNotFoundError"
```

---

### Post-Deploy

**Smoke Tests**:
- [ ] Frontend: `curl https://kaizen-compras.up.railway.app/`
  - Deve retornar HTML (não listagem de diretório)
- [ ] Frontend: `curl https://kaizen-compras.up.railway.app/index.html`
  - Deve retornar HTML do React
- [ ] Frontend: `curl https://kaizen-compras.up.railway.app/login`
  - Deve retornar HTML (não 404)
- [ ] Backend: `curl https://kaizen-backend.up.railway.app/api/health`
  - Deve retornar 204 No Content

**Verificações Críticas**:
- [ ] Login funciona (testar com usuário real)
- [ ] Rotas principais carregam
- [ ] API responde
- [ ] Sem erros no console do navegador (F12)

---

## 🎓 LIÇÕES APRENDIDAS

### 1. CI=false em Produção é Perigoso ❌

**Problema**: Esconde erros de build

**Solução**: NUNCA usar CI=false em produção

**Quando usar**: Apenas dev local se quiser warnings sem bloquear

---

### 2. Validação Explícita é Essencial ✅

**Problema**: Build pode falhar silenciosamente

**Solução**: Adicionar `test -f build/index.html || exit 1`

**Benefício**: Deploy falha CEDO (no build, não no runtime)

---

### 3. Healthchecks Devem Ser Específicos ✅

**Problema**: `/` retorna 200 mesmo quebrado

**Solução**: `"healthcheckPath": "/index.html"`

**Benefício**: Railway detecta build quebrado automaticamente

---

### 4. Migrations São Forward-Only ✅

**Problema**: Rollback removeu migration aplicada

**Solução**: Sempre manter migrations ou fazer downgrade explícito

**Regra**: NUNCA remover migration que já está no banco

---

### 5. Logs de Debug Salvam Tempo ✅

**Problema**: Difícil saber o que deu errado

**Solução**: Adicionar `echo` e `ls` no buildCommand

**Benefício**: Debug rápido quando falha

---

## 🚀 PRÓXIMOS PASSOS

### Urgente (Fazer Agora)

1. **Corrigir frontend/railway.json**
   - Adicionar validação de build
   - Mudar healthcheck para /index.html
   - Aumentar memória Node

2. **Testar Build Local**
   ```bash
   cd frontend
   rm -rf build node_modules
   npm ci
   NODE_OPTIONS='--max-old-space-size=4096' npm run build
   test -f build/index.html && echo "✓ OK" || echo "✗ FALHOU"
   ```

3. **Commit e Deploy**
   ```bash
   git add frontend/railway.json
   git commit -m "fix(frontend): prevenir deploy de build incompleto"
   git push origin master
   # Monitorar logs do Railway
   ```

---

### Recomendado (Fazer Depois)

4. **Criar script de validação**
   - `frontend/scripts/validate-build.sh`
   - Verificar todos aspectos do build

5. **Documentar rollback**
   - `docs/ROLLBACK.md`
   - Processo seguro com migrations

6. **Adicionar testes E2E de deploy**
   - Smoke tests automáticos pós-deploy
   - Alertas se algo quebrar

---

## 📝 RESUMO EXECUTIVO

### O Que Aconteceu

- Frontend deploy quebrou (404 em todas rotas SPA)
- Backend deploy falhou (migration não encontrada)
- Rollback aplicado mas frontend ainda quebrado

### Causa Raiz

- **Frontend**: `CI=false` escondeu erro de build, `index.html` não foi gerado
- **Backend**: Rollback removeu migration aplicada no banco

### Status Atual

- ✅ Backend: RESOLVIDO (migration restaurada)
- ⚠️ Frontend: PENDENTE (rollback temporário)

### Ação Necessária

1. Corrigir `frontend/railway.json` (5 min)
2. Testar build local (10 min)
3. Deploy e monitorar (15 min)

**Total estimado**: 30 minutos para resolução completa

---

**Documento criado em**: 2026-01-04
**Autor**: Claude (Análise de Produção)
**Status**: 📋 Aguardando Implementação das Correções
