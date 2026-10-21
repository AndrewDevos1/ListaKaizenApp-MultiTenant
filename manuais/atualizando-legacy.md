# Como Atualizar a Pasta Legacy

## Contexto

A pasta `./legacy` contém a versão monolítica original do projeto (Flask + React Bootstrap). Ela serve como referência histórica durante a migração para a arquitetura multi-tenant.

**Repositório de origem:** `https://github.com/AndrewDevos1/ListaKaizenApp.git`
**Branch:** `master`

---

## Armadilha Crítica

A pasta `legacy` **NÃO é um repositório git separado**. Ela compartilha o `.git` do repositório principal (`ListaKaizenApp-MultiTenant`).

Por isso, **nunca use** comandos do tipo:
```bash
git -C ./legacy remote set-url origin ...
```
Isso altera o remote do repositório **principal**. Se isso acontecer, reverter imediatamente com:
```bash
git remote set-url origin https://github.com/AndrewDevos1/ListaKaizenApp-MultiTenant.git
```

---

## Processo Correto para Atualizar

```bash
# 1. Clonar o repositório legado em pasta temporária (shallow para ser rápido)
git clone --depth=1 --branch master https://github.com/AndrewDevos1/ListaKaizenApp.git /tmp/legacy-clone

# 2. Limpar a pasta legacy atual
rm -rf /home/devos/Codigos-vscode/ListaKaizenApp-MultiTenant/legacy/*

# 3. Copiar o conteúdo novo (sem o .git)
rsync -a --exclude='.git' /tmp/legacy-clone/ /home/devos/Codigos-vscode/ListaKaizenApp-MultiTenant/legacy/

# 4. Remover o clone temporário
rm -rf /tmp/legacy-clone
```

> O `--exclude='.git'` no rsync é essencial para não sobrescrever o `.git` do repositório principal.

---

## Observações

- Arquivos ocultos (`.gitignore`, `.github/`, `.vercelignore`) são copiados normalmente pelo rsync
- Após a cópia, a pasta legacy aparecerá como modificada no `git status` do repo principal — isso é esperado e normal
