# Repository Guidelines

## Legacy Migration Context
- Este projeto (`ListaKaizenApp-MultiTenant`) mantém a pasta `./legacy` como referência histórica do monólito original (Flask + React Bootstrap).
- Repositório de origem do legado: `https://github.com/AndrewDevos1/ListaKaizenApp.git`.
- Branch de origem do legado: `master`.

## Git Safety (Critical)
- A pasta `legacy` **não** é um repositório git separado.
- Ela compartilha o `.git` do repositório principal `ListaKaizenApp-MultiTenant`.
- **Nunca** executar comandos como `git -C ./legacy remote set-url origin ...`.
- Se isso ocorrer, reverter imediatamente:
  - `git remote set-url origin https://github.com/AndrewDevos1/ListaKaizenApp-MultiTenant.git`

## Correct Procedure to Update `legacy`
1. Clonar o legado em diretório temporário:
   - `git clone --depth=1 --branch master https://github.com/AndrewDevos1/ListaKaizenApp.git /tmp/legacy-clone`
2. Limpar conteúdo atual da pasta `legacy` (incluindo ocultos):
   - `find /home/devos/Codigos-vscode/ListaKaizenApp-MultiTenant/legacy -mindepth 1 -maxdepth 1 -exec rm -rf {} +`
3. Sincronizar conteúdo novo sem copiar `.git`:
   - `rsync -a --exclude='.git' /tmp/legacy-clone/ /home/devos/Codigos-vscode/ListaKaizenApp-MultiTenant/legacy/`
4. Remover clone temporário:
   - `rm -rf /tmp/legacy-clone`

## Notes
- O `--exclude='.git'` no `rsync` é obrigatório.
- Alterações em `legacy/` no `git status` do repositório principal após a atualização são esperadas.

## Mandatory Rule About `legacy`
- **Não modificar a pasta `legacy`** para implementar features da arquitetura nova.
- `legacy` deve ser usada **apenas como referência e estudo** para entender comportamento e apoiar a migração.
- Implementações e ajustes da migração devem ocorrer fora de `legacy` (código novo do multi-tenant).
