# Processo de Rollback Seguro

## ⚠️ ANTES DE FAZER ROLLBACK

### 1. Verificar Migrations

```bash
# Listar commits a reverter (últimos 5)
git log HEAD~5..HEAD --oneline

# Procurar migrations nos commits
git diff HEAD~5..HEAD --name-only | grep migrations/versions
```

**Se houver migrations em algum dos commits a reverter**:

- ❌ **NUNCA**: Fazer rollback direto removendo o arquivo da migration
- ✅ **SEMPRE**: Fazer downgrade no banco ANTES do rollback do código
- ✅ **OU**: Manter migrations no código (cherry-pick, não remover)

---

### 2. Verificar Dependências de Produção

```bash
# Fazer uma análise rápida:
# - Alguma feature nova depende de dados criados?
# - Há dados em produção que quebram com código antigo?
# - Algum cliente já está usando novo endpoint?
```

---

### 3. Comunicar Time

- Avisar no Slack/Discord sobre intenção de rollback
- Estimar tempo de downtime (~10-15 min)
- Preparar mensagem para usuários se necessário

---

## 🔄 EXECUTAR ROLLBACK

### Opção A: Rollback Simples (sem migrations)

Use quando não há migrations nos commits a reverter:

```bash
# 1. Ver últimos commits
git log --oneline -10

# 2. Reverter (substitua ABC123 pelo commit antes do problema)
git revert HEAD  # Se apenas 1 commit
# OU
git revert --no-edit HEAD~2..HEAD  # Se 2 commits

# 3. Ou fazer reset (mais agressivo, se revert tiver conflitos)
git reset --hard ABC123

# 4. Push
git push origin master --force
```

Railway detectará novo push e redeploy automático.

---

### Opção B: Rollback com Migrations

Use quando há migrations nos commits a reverter:

#### Passo 1: Downgrade Banco PRIMEIRO

```bash
# Via Railway console ou SSH:

# Entrar no container
railway run bash

# Ativar venv
cd backend && source .venv/bin/activate

# Ver migração atual
flask db current

# Fazer downgrade de quantas migrations forem necessárias
flask db downgrade -1  # Reverter 1 migration
# OU
flask db downgrade -2  # Reverter 2 migrations
# OU especificar revisão
flask db downgrade <revision_id>

# Verificar se downgrade foi bem-sucedido
flask db current
```

#### Passo 2: Rollback Código

```bash
# Voltar ao local repo
git log --oneline -10

# Reverter commits
git revert HEAD  # Se apenas 1 commit
# OU
git reset --hard <hash_do_commit_anterior_à_migration>

# Push
git push origin master --force
```

Railway redeploy automático. Desta vez `flask db upgrade` vai funcionar porque:
- Banco já fez downgrade
- Código volta ao estado anterior (sem migrations novas)
- Alembic encontra todas as revisões esperadas

---

### Opção C: Rollback Parcial (Cherry-Pick)

Use quando quer manter algumas mudanças (como migrations):

```bash
# 1. Revert commits mas sem commitar ainda
git revert --no-commit HEAD  # ou HEAD~1..HEAD

# 2. Restaurar migrations (não fazer revert delas)
git restore --staged backend/migrations/
git restore backend/migrations/

# 3. Commitar apenas as mudanças que NÃO são migrations
git commit -m "revert: rollback code but keep migrations

Mantém migrations para banco em produção continuar funcionando."

# 4. Push
git push origin master
```

---

## ✅ PÓS-ROLLBACK IMEDIATO

### Verificações Críticas

```bash
# 1. Monitorar logs do Railway (últimas 5 min)
# - Procurar "ERROR"
# - Verificar "Running migrations"
# - Ver "Starting..." (backend/frontend)

# 2. Testar rotas críticas
curl https://kaizen-compras.up.railway.app/
# Deve retornar HTML (não "Index of build/")

curl https://kaizen-compras.up.railway.app/login
# Deve retornar HTML do React (não 404)

curl https://kaizen-backend.up.railway.app/api/health
# Deve retornar 204 No Content

# 3. Testar login (com usuário real)
# - Acessar https://kaizen-compras.up.railway.app
# - Fazer login
# - Verificar principais rotas carregam

# 4. Verificar banco
# Se você fez downgrade, verificar:
flask db current
# Deve mostrar a revisão esperada
```

---

### Comunicar Sucesso

Avisar no Slack/Discord:
- Rollback concluído às [hora]
- Sistema está online e funcionando
- Banco está consistente
- Próximos passos: investigar problema original

---

## 🚨 EMERGÊNCIA: Rollback Rápido (Bypass Migrations)

Se estiver tudo queimando e precisa de rollback AGORA:

```bash
# 1. Revert código (ignora migrations por enquanto)
git reset --hard <hash_anterior>
git push origin master --force

# 2. Se backend não subir por causa de migrations:
# - Desativar flask db upgrade temporariamente
# - OU: Manter versão anterior da migration (cherry-pick)

# 3. Assim que estabilizar, fazer downgrade correto do banco
```

---

## 📝 CHECKLIST PÓS-ROLLBACK

- [ ] Logs do Railway monitorados (sem erros críticos)
- [ ] Frontend carrega (não "Index of build/")
- [ ] /login não retorna 404
- [ ] /api/health responde
- [ ] Backend iniciou (logs mostram gunicorn started)
- [ ] Banco consistente (flask db current corresponde ao código)
- [ ] Login funciona com usuário real
- [ ] Rotas principais carregam
- [ ] Sem erros em console do navegador (F12)
- [ ] Team comunicada sobre sucesso

---

## 📚 REFERÊNCIAS

### Migrations em Alembic

- [Alembic Downgrade](https://alembic.sqlalchemy.org/en/latest/operations.html#alembic.operations.Operations.downgrade)
- [Alembic History](https://alembic.sqlalchemy.org/en/latest/tutorial.html#upgrading-and-downgrading)

### Git Revert vs Reset

```bash
git revert  # Cria novo commit que desfaz mudanças (seguro)
git reset   # Move HEAD direto para outro commit (agressivo)
```

- Usar `revert` quando commit já foi pushed (público)
- Usar `reset` quando apenas local ou emergency

---

## 🆘 SE ALGO DER ERRADO

1. **Não entre em pânico** - Sistema voltar não deve piorar situação
2. **Revisar logs** - Railway console → Deployments → Ver logs do build/deploy
3. **Checar banco** - Se migration problema, banco pode estar inconsistente
4. **Contactar DevOps** - Se precisa ajuda com Railway ou banco
5. **Escalate** - Se não conseguir resolver em 30min, chamar supervisor

---

**Última atualização**: 2026-01-04
**Mantido por**: DevOps Team
