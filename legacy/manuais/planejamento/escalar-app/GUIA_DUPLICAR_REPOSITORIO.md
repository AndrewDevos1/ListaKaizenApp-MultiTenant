# GUIA: DUPLICAR PROJETO PARA NOVO REPOSITÓRIO GIT

**Projeto:** Kaizen Lists - Sistema de Gestão de Inventário
**Objetivo:** Criar cópia do projeto em novo repositório para implementar multi-tenant
**Data:** 2025-12-28

---

## ÍNDICE

1. [Por que duplicar o repositório?](#por-que-duplicar-o-repositório)
2. [Estratégias de Duplicação](#estratégias-de-duplicação)
3. [Método Recomendado: Mirror Clone](#método-recomendado-mirror-clone)
4. [Passo a Passo Completo](#passo-a-passo-completo)
5. [Estrutura de Branches](#estrutura-de-branches)
6. [Sincronização entre Repositórios](#sincronização-entre-repositórios)
7. [Melhores Práticas](#melhores-práticas)
8. [Troubleshooting](#troubleshooting)

---

## POR QUE DUPLICAR O REPOSITÓRIO?

### ✅ Vantagens de Trabalhar em Repositório Separado

1. **Zero Risco para Produção**
   - ✅ Código atual permanece intocado
   - ✅ Bugs não afetam usuários
   - ✅ Pode experimentar sem medo

2. **Desenvolvimento Paralelo**
   - ✅ Equipe pode continuar features no repo original
   - ✅ Multi-tenant desenvolvido isoladamente
   - ✅ Sem conflitos de merge

3. **Teste Completo Antes de Migrar**
   - ✅ Testar multi-tenant profundamente
   - ✅ Validar com usuários beta
   - ✅ Deploy em ambiente separado (staging)

4. **Reversão Fácil**
   - ✅ Se algo der errado, descarta o novo repo
   - ✅ Sem necessidade de git revert complexo
   - ✅ Original intacto

5. **Comparação A/B**
   - ✅ Rodar ambas versões simultaneamente
   - ✅ Comparar performance
   - ✅ Migração gradual de usuários

---

## ESTRATÉGIAS DE DUPLICAÇÃO

### Estratégia 1: Mirror Clone (RECOMENDADO)

**O que é:**
- Clonar repositório completo COM HISTÓRICO
- Preserva todos os commits, branches, tags
- Cria cópia exata

**Vantagens:**
- ✅ Mantém todo histórico Git
- ✅ Preserva autoria dos commits
- ✅ Fácil sincronizar mudanças futuras
- ✅ Pode voltar a qualquer commit antigo

**Desvantagens:**
- ⚠️ Tamanho maior (todo histórico)
- ⚠️ Inclui branches antigos (pode limpar depois)

**Quando usar:**
- ✅ **SEMPRE para este projeto** (histórico é valioso)

---

### Estratégia 2: Fresh Start (NÃO RECOMENDADO)

**O que é:**
- Baixar código atual como ZIP
- Criar novo repo do zero
- Fazer commit inicial

**Vantagens:**
- ✅ Repo limpo, sem histórico
- ✅ Tamanho mínimo

**Desvantagens:**
- ❌ Perde TODO histórico
- ❌ Não sabe quem fez o quê
- ❌ Difícil sincronizar com original
- ❌ **NÃO FAZER**

---

### Estratégia 3: Fork (LIMITADO)

**O que é:**
- Usar botão "Fork" no GitHub/GitLab

**Vantagens:**
- ✅ Fácil (1 clique)
- ✅ Mantém link com original

**Desvantagens:**
- ⚠️ Fork fica "conectado" ao repo pai
- ⚠️ Difícil de tornar independente depois
- ⚠️ Pode causar confusão

**Quando usar:**
- 🟡 Se pretende fazer pull request de volta ao original
- 🟡 Se quer manter vínculo permanente

---

## MÉTODO RECOMENDADO: MIRROR CLONE

### Visão Geral

```
Repo Original                    Novo Repo
(ListaKaizenApp)                (ListaKaizenApp-MultiTenant)
    │                                   │
    │ 1. Mirror clone                   │
    ├──────────────────────────────────►│
    │                                   │
    │                                   │ 2. Implementar multi-tenant
    │                                   │    (10 etapas)
    │                                   │
    │ 3. Sincronizar fixes              │
    │    (opcional)                     │
    │◄──────────────────────────────────┤
    │                                   │
    │                                   │ 4. Após validação
    │ 5. Substituir original            │    e testes
    │◄──────────────────────────────────┤
```

---

## PASSO A PASSO COMPLETO

### FASE 1: Preparação

#### Passo 1: Verificar Situação Atual

```bash
# Navegar para projeto atual
cd /home/devos/Codigos-vscode/ListaKaizenApp

# Verificar status
git status

# Ver branches
git branch -a

# Ver remotes
git remote -v
```

**Saída esperada:**
```
origin  https://github.com/SEU_USUARIO/ListaKaizenApp.git (fetch)
origin  https://github.com/SEU_USUARIO/ListaKaizenApp.git (push)
```

---

#### Passo 2: Garantir Commits Estão Salvos

```bash
# Ver últimos commits
git log --oneline -5

# Verificar branch atual
git branch --show-current

# Se tiver mudanças não commitadas
git status

# Se houver mudanças, commitar ANTES
git add .
git commit -m "chore: salvar estado antes de duplicar repo"
git push origin master
```

---

### FASE 2: Criar Novo Repositório no GitHub/GitLab

#### Passo 3: Criar Repo Vazio no GitHub

1. Ir para: https://github.com/new
2. Configurar:
   - **Nome:** `ListaKaizenApp-MultiTenant`
   - **Descrição:** "Sistema multi-tenant para múltiplos restaurantes"
   - **Visibilidade:** Private (ou Public, sua escolha)
   - ⚠️ **NÃO marcar:** "Initialize with README"
   - ⚠️ **NÃO marcar:** "Add .gitignore"
   - ⚠️ **NÃO marcar:** "Add license"
3. Clicar "Create repository"

**URL resultante:**
```
https://github.com/SEU_USUARIO/ListaKaizenApp-MultiTenant.git
```

---

### FASE 3: Mirror Clone (Duplicação Completa)

#### Passo 4: Clonar Repositório Original como Mirror

```bash
# Sair do diretório atual
cd /home/devos/Codigos-vscode

# Clonar como mirror (bare repository)
git clone --mirror https://github.com/SEU_USUARIO/ListaKaizenApp.git ListaKaizenApp-mirror

# Entrar no diretório
cd ListaKaizenApp-mirror
```

**O que é `--mirror`?**
- Clona TUDO: branches, tags, refs
- Cria "bare repository" (sem working directory)
- Usado para duplicação perfeita

---

#### Passo 5: Enviar para Novo Repositório

```bash
# Adicionar novo remote
git remote set-url --push origin https://github.com/SEU_USUARIO/ListaKaizenApp-MultiTenant.git

# Fazer push de tudo
git push --mirror

# Verificar
git remote -v
```

**Saída esperada:**
```
origin  https://github.com/SEU_USUARIO/ListaKaizenApp.git (fetch)
origin  https://github.com/SEU_USUARIO/ListaKaizenApp-MultiTenant.git (push)
```

---

#### Passo 6: Clonar Novo Repositório para Trabalho

```bash
# Voltar para diretório de projetos
cd /home/devos/Codigos-vscode

# Clonar novo repo (agora normal, não mirror)
git clone https://github.com/SEU_USUARIO/ListaKaizenApp-MultiTenant.git

# Entrar no novo projeto
cd ListaKaizenApp-MultiTenant

# Verificar branches
git branch -a

# Checkout na branch master
git checkout master
```

---

#### Passo 7: Limpar Mirror (Opcional)

```bash
# Deletar mirror temporário (não precisa mais)
cd /home/devos/Codigos-vscode
rm -rf ListaKaizenApp-mirror
```

---

### FASE 4: Configurar Novo Repositório

#### Passo 8: Criar Branch para Multi-Tenant

```bash
# Já deve estar em ListaKaizenApp-MultiTenant
cd /home/devos/Codigos-vscode/ListaKaizenApp-MultiTenant

# Criar e mudar para branch escalando-projeto
git checkout -b escalando-projeto

# Verificar branch atual
git branch --show-current
```

**Saída esperada:**
```
escalando-projeto
```

---

#### Passo 9: Verificar Ambiente Funciona

```bash
# Backend
cd backend
source ../.venv/bin/activate  # Linux/macOS
# OU
..\.venv\Scripts\activate  # Windows

# Instalar dependências (se necessário)
pip install -r requirements.txt

# Rodar migrations
flask db upgrade

# Testar backend
flask run --host=0.0.0.0
```

**Em outro terminal:**

```bash
# Frontend
cd /home/devos/Codigos-vscode/ListaKaizenApp-MultiTenant/frontend

# Instalar dependências
npm install

# Rodar frontend
npm start
```

**Verificar:**
- ✅ Backend rodando em http://127.0.0.1:5000
- ✅ Frontend rodando em http://localhost:3000
- ✅ Login funciona
- ✅ Dashboards carregam

---

#### Passo 10: Fazer Commit Inicial da Branch

```bash
# Se fez alguma alteração (como atualizar .env)
git add .
git commit -m "chore: setup inicial do projeto multi-tenant"
git push -u origin escalando-projeto
```

---

### FASE 5: Implementar Multi-Tenant

#### Passo 11: Seguir Plano Multi-Tenant

Agora você está pronto para implementar as **10 etapas** do plano multi-tenant:

```bash
# Ler plano
cat /home/devos/Codigos-vscode/ListaKaizenApp-MultiTenant/Manuais/planejamento/escalar-app/PLANO_MULTI_TENANT.md

# Implementar etapas 1-10
# Cada etapa = 1 commit
```

**Fluxo:**
1. Implementar ETAPA 1
2. Testar
3. Commit: `feat: adicionar modelo Restaurante e tabelas multi-tenant`
4. Push: `git push origin escalando-projeto`
5. Repetir para ETAPAS 2-10

---

## ESTRUTURA DE BRANCHES

### Organização Recomendada

**Novo Repositório (ListaKaizenApp-MultiTenant):**

```
master (ou main)
  │
  └─► escalando-projeto (branch principal de desenvolvimento)
        │
        ├─► feature/super-admin-dashboard (opcional)
        ├─► feature/restaurante-crud (opcional)
        └─► bugfix/auth-issue (opcional)
```

**Branches:**

1. **master/main** - Código estável, cópia do original
2. **escalando-projeto** - Desenvolvimento multi-tenant (10 etapas)
3. **feature/** - Features específicas (opcional, se quiser dividir)
4. **bugfix/** - Correções (opcional)

---

### Workflow de Commits

```bash
# Trabalhar em escalando-projeto
git checkout escalando-projeto

# Implementar etapa
# ... código ...

# Adicionar mudanças
git add .

# Commit seguindo convenção
git commit -m "feat: adicionar modelo Restaurante e tabelas multi-tenant"

# Push
git push origin escalando-projeto

# Repetir para cada etapa (10 commits no total)
```

---

## SINCRONIZAÇÃO ENTRE REPOSITÓRIOS

### Cenário: Bug Crítico Descoberto no Original

**Problema:**
- Você está desenvolvendo multi-tenant no novo repo
- Bug crítico encontrado no repo original
- Precisa trazer a correção para o novo repo

**Solução: Adicionar Original como Remote**

```bash
# No novo repo
cd /home/devos/Codigos-vscode/ListaKaizenApp-MultiTenant

# Adicionar original como "upstream"
git remote add upstream https://github.com/SEU_USUARIO/ListaKaizenApp.git

# Verificar remotes
git remote -v
```

**Saída esperada:**
```
origin     https://github.com/SEU_USUARIO/ListaKaizenApp-MultiTenant.git (fetch)
origin     https://github.com/SEU_USUARIO/ListaKaizenApp-MultiTenant.git (push)
upstream   https://github.com/SEU_USUARIO/ListaKaizenApp.git (fetch)
upstream   https://github.com/SEU_USUARIO/ListaKaizenApp.git (push)
```

---

### Trazer Mudanças do Original

```bash
# Fetch mudanças do original
git fetch upstream

# Ver diferenças
git log upstream/master..HEAD

# Fazer merge seletivo (cherry-pick de commit específico)
git cherry-pick <commit-hash-do-bugfix>

# OU fazer merge completo (cuidado com conflitos)
git merge upstream/master
```

---

### Enviar Mudanças de Volta ao Original

**Cenário:**
- Multi-tenant está pronto
- Quer substituir repo original

**Opção A: Substituir Completamente**

```bash
# No repo original
cd /home/devos/Codigos-vscode/ListaKaizenApp

# Adicionar novo repo como remote
git remote add multitenant https://github.com/SEU_USUARIO/ListaKaizenApp-MultiTenant.git

# Fetch
git fetch multitenant

# Fazer merge da branch escalando-projeto
git merge multitenant/escalando-projeto

# OU fazer hard replace (⚠️ CUIDADO)
git reset --hard multitenant/escalando-projeto
git push origin master --force  # ⚠️ DESTRUTIVO
```

**Opção B: Pull Request (RECOMENDADO)**

1. No GitHub, ir para `ListaKaizenApp-MultiTenant`
2. Criar Pull Request de `escalando-projeto` para `ListaKaizenApp:master`
3. Revisar mudanças
4. Mergear via interface GitHub

---

## MELHORES PRÁTICAS

### ✅ DO's (Fazer)

1. **Commits Frequentes**
   ```bash
   # Commitar após cada etapa do plano
   git add .
   git commit -m "feat: etapa X completa"
   git push origin escalando-projeto
   ```

2. **Mensagens Descritivas**
   ```bash
   # BOM
   git commit -m "feat: adicionar modelo Restaurante e 12 tabelas auxiliares"

   # RUIM
   git commit -m "mudanças"
   ```

3. **Testar Antes de Commitar**
   ```bash
   # Rodar testes
   pytest backend/tests/
   npm test  # frontend

   # Se passou, commitar
   git commit -m "..."
   ```

4. **Push Regularmente**
   ```bash
   # Pelo menos 1x por dia
   git push origin escalando-projeto
   ```

5. **Backup do Banco de Dados**
   ```bash
   # Antes de migrations
   cp backend/kaizen_dev.db backend/kaizen_dev.db.backup
   ```

6. **Branches Descritivas**
   ```bash
   # Se dividir em features
   git checkout -b feature/super-admin-dashboard
   ```

7. **Pull Antes de Push**
   ```bash
   # Se trabalhando em equipe
   git pull origin escalando-projeto
   git push origin escalando-projeto
   ```

---

### ❌ DON'Ts (Não Fazer)

1. **Não Commitar Arquivos Sensíveis**
   ```bash
   # Adicionar ao .gitignore
   .env
   *.db
   __pycache__/
   node_modules/
   ```

2. **Não Fazer Force Push em Branch Compartilhada**
   ```bash
   # ❌ NUNCA fazer isso se outras pessoas usam a branch
   git push --force origin escalando-projeto
   ```

3. **Não Commitar Código Quebrado**
   ```bash
   # Testar ANTES
   flask run  # Deve rodar sem erros
   npm start  # Deve compilar sem erros
   ```

4. **Não Misturar Concerns em Um Commit**
   ```bash
   # ❌ RUIM (muitas coisas)
   git commit -m "adicionar restaurante, corrigir bug, atualizar readme"

   # ✅ BOM (separar)
   git commit -m "feat: adicionar modelo Restaurante"
   git commit -m "fix: corrigir bug de autenticação"
   git commit -m "docs: atualizar README"
   ```

5. **Não Ignorar Conflitos de Merge**
   ```bash
   # Se houver conflito, resolver MANUALMENTE
   git merge upstream/master
   # ... resolver conflitos ...
   git add .
   git commit
   ```

---

## TROUBLESHOOTING

### Problema 1: "Remote already exists"

```bash
# Erro
fatal: remote origin already exists.

# Solução
git remote remove origin
git remote add origin <URL_NOVO_REPO>
```

---

### Problema 2: Push Rejeitado

```bash
# Erro
! [rejected]        master -> master (fetch first)

# Solução
git pull origin master
git push origin master
```

---

### Problema 3: Esqueceu de Criar Branch

```bash
# Commitou direto na master
git branch escalando-projeto  # Criar branch
git reset --hard HEAD~1        # Voltar 1 commit na master
git checkout escalando-projeto # Mudar para branch
```

---

### Problema 4: Arquivo Grande no Git

```bash
# Erro
remote: error: File too large (>100MB)

# Solução: Adicionar ao .gitignore
echo "backend/*.db" >> .gitignore
git rm --cached backend/kaizen_dev.db
git commit -m "chore: remover db do git"
```

---

### Problema 5: Banco de Dados Corrompido

```bash
# Deletar banco
rm backend/kaizen_dev.db

# Recriar do zero
cd backend
flask db upgrade

# OU restaurar backup
cp backend/kaizen_dev.db.backup backend/kaizen_dev.db
```

---

## CHECKLIST DE MIGRAÇÃO

### Antes de Começar

- [ ] Commits do original salvos e pushados
- [ ] Novo repositório criado no GitHub/GitLab
- [ ] Mirror clone executado com sucesso
- [ ] Novo repositório clonado localmente
- [ ] Backend funciona (`flask run`)
- [ ] Frontend funciona (`npm start`)

### Durante Desenvolvimento

- [ ] Branch `escalando-projeto` criada
- [ ] Plano multi-tenant lido
- [ ] ETAPA 1 implementada e commitada
- [ ] ETAPA 2 implementada e commitada
- [ ] ... (repetir para ETAPAS 3-10)
- [ ] Testes executados e passando
- [ ] Pushes regulares para GitHub

### Após Conclusão

- [ ] Todos os 10 commits no GitHub
- [ ] Aplicação testada completamente
- [ ] Deploy em ambiente staging
- [ ] Validação com usuários beta
- [ ] Decisão: substituir repo original ou manter paralelo

---

## RESUMO: COMANDO ÚNICO

Se quiser fazer tudo de uma vez (resumido):

```bash
# 1. Clonar mirror
cd /home/devos/Codigos-vscode
git clone --mirror https://github.com/SEU_USUARIO/ListaKaizenApp.git temp-mirror
cd temp-mirror

# 2. Push para novo repo
git remote set-url --push origin https://github.com/SEU_USUARIO/ListaKaizenApp-MultiTenant.git
git push --mirror

# 3. Clonar novo repo
cd ..
git clone https://github.com/SEU_USUARIO/ListaKaizenApp-MultiTenant.git
cd ListaKaizenApp-MultiTenant

# 4. Criar branch
git checkout -b escalando-projeto

# 5. Limpar mirror
cd ..
rm -rf temp-mirror

# 6. Pronto para desenvolver!
cd ListaKaizenApp-MultiTenant
```

---

## PRÓXIMOS PASSOS

1. ✅ **Executar passos acima** para duplicar repositório
2. ✅ **Criar branch** `escalando-projeto`
3. ✅ **Ler plano multi-tenant** (`PLANO_MULTI_TENANT.md`)
4. ✅ **Implementar ETAPA 1** (modelo Restaurante + tabelas)
5. ✅ **Commitar e pushar**
6. ✅ **Repetir para ETAPAS 2-10**

---

## ARQUIVOS RELACIONADOS

- **Plano Multi-Tenant:** `/home/devos/Codigos-vscode/ListaKaizenApp/Manuais/planejamento/escalar-app/PLANO_MULTI_TENANT.md`
- **Análise React vs Next.js:** `/home/devos/Codigos-vscode/ListaKaizenApp/Manuais/planejamento/escalar-app/ANALISE_REACT_VS_NEXTJS.md`

---

**FIM DO GUIA**

**Dúvidas Comuns:**

**P: Posso deletar o repo original depois?**
R: Sim, mas só após validar que o novo funciona 100%.

**P: Preciso pagar por dois repos no GitHub?**
R: Não, repositórios privados são gratuitos no GitHub.

**P: Posso trabalhar nos dois ao mesmo tempo?**
R: Sim! Repos são independentes.

**P: Como sei se deu certo?**
R: Se `git log` no novo repo mostra histórico completo do original, deu certo.
