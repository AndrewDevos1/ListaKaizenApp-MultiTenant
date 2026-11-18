# Issue #7 — auditoria de implementação

Status: BLOQUEADO — sem entrega segura nesta execução.

## Evidências

- Issue #7 e auditoria do legado confirmam resolução `usuário > restaurante > 30`, faixa `5..480`, claim JWT, `/profile` e expiração por inatividade.
- O worktree foi criado em `1ff1d0d` (`origin/develop`), não em uma base que contenha as migrations #35/#36/#37. `develop2` também aponta para `1ff1d0d` nesta cópia local.
- A implementação histórica `c6dcc9e` encontrada no repositório usa migration `20261016000000_add_session_timeout`, colunas nullable no restaurante e fallback por variável de ambiente. Ela não satisfaz a migration exigida `20261117140000_session_timeout` nem o contrato default `NOT NULL 30`.
- A implementação histórica também expõe configuração em `/v1/auth/session-timeout`, mas não entrega com segurança a combinação final pedida de endpoints tenant-scoped, claim/profile, renovação por atividade e precedência validada contra o estado pós-#35/#36/#37.
- O frontend atual usa `localStorage` em `apps/web/src/app/admin/configuracoes/page.tsx` e `apps/web/src/app/collaborator/configuracoes/page.tsx`.

## Decisão

Não aplicar cherry-pick/rebase automático das migrations #35/#36/#37 nem alterar `develop2`, PRs #38–#40, `legacy`, banco real ou Railway. A implementação requer primeiro uma base reconciliada contendo as três migrations e seu schema final; sem isso, qualquer migration/Prisma gerado pode duplicar DDL ou quebrar `migrate deploy`.

## Estado preservado

- Worktree alvo: `feat/issue-7-timeout-sessao`.
- Nenhum arquivo de `legacy` alterado por esta auditoria.
- Nenhuma migration nova de Issue #7 publicada.
- Nenhum push, commit final ou PR Draft criado.
