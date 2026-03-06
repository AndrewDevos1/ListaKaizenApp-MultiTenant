# Checklist de Atualização de Documentação (Pós-Migração)

## Objetivo
Alinhar a documentação com o estado real atual do projeto `ListaKaizenApp-MultiTenant`.

## Checklist

1. Atualizar o ponteiro oficial do projeto.
Arquivos: `/home/devos/Codigos-vscode/ListaKaizenApp-MultiTenant/manuais/plano-migracao/PONTEIRO.md`, `/home/devos/Codigos-vscode/ListaKaizenApp-MultiTenant/manuais/plano-migracao/RELATORIO_FINAL.md`.

2. Corrigir “estado atual” da visão geral.
Arquivos: `/home/devos/Codigos-vscode/ListaKaizenApp-MultiTenant/manuais/plano-migracao/00_VISAO_GERAL.md`.
Ajustes: remover “Import CSV pendente” e “Offline/PWA planejado”, alinhar auth sem refresh token, alinhar comando/stack real (`npm`, não `pnpm`).

3. Converter os documentos de fase em histórico concluído.
Arquivos:
- `/home/devos/Codigos-vscode/ListaKaizenApp-MultiTenant/manuais/plano-migracao/01_FASE_CORE.md`
- `/home/devos/Codigos-vscode/ListaKaizenApp-MultiTenant/manuais/plano-migracao/02_FASE_USUARIOS.md`
- `/home/devos/Codigos-vscode/ListaKaizenApp-MultiTenant/manuais/plano-migracao/03_FASE_OPERACIONAL.md`
- `/home/devos/Codigos-vscode/ListaKaizenApp-MultiTenant/manuais/plano-migracao/04_FASE_MODULOS.md`
- `/home/devos/Codigos-vscode/ListaKaizenApp-MultiTenant/manuais/plano-migracao/05_FASE_AVANCADA.md`
Ajustes: remover blocos “fase X não iniciada”.

4. Padronizar schema documental com o schema real.
Arquivos: os 5 arquivos de fase acima + `/home/devos/Codigos-vscode/ListaKaizenApp-MultiTenant/apps/api/prisma/schema.prisma`.
Ajustes: trocar exemplos `String + cuid` por `Int + autoincrement` onde hoje o projeto já usa `Int`.

5. Corrigir verbos/rotas de endpoints para bater com controllers.
Arquivos:
- `/home/devos/Codigos-vscode/ListaKaizenApp-MultiTenant/manuais/plano-migracao/04_FASE_MODULOS.md`
- `/home/devos/Codigos-vscode/ListaKaizenApp-MultiTenant/manuais/plano-migracao/05_FASE_AVANCADA.md`
- `/home/devos/Codigos-vscode/ListaKaizenApp-MultiTenant/manuais/replicando-app/09_ENDPOINTS_REFERENCIA.md`
Referência de código:
- `/home/devos/Codigos-vscode/ListaKaizenApp-MultiTenant/apps/api/src/modules/listas-rapidas/listas-rapidas.controller.ts`
- `/home/devos/Codigos-vscode/ListaKaizenApp-MultiTenant/apps/api/src/modules/import/import.controller.ts`
- `/home/devos/Codigos-vscode/ListaKaizenApp-MultiTenant/apps/api/src/modules/push/push.controller.ts`

6. Definir fonte de verdade da documentação funcional.
Arquivo: `/home/devos/Codigos-vscode/ListaKaizenApp-MultiTenant/manuais/replicando-app/00_INDICE.md`.
Ajustes: deixar explícito que `legacy/manuais/replicando-app` é referência histórica e que a implementação atual é Nest/Next no `apps/`.

7. Sincronizar o índice `replicando-app` da raiz com o conjunto completo.
Arquivo: `/home/devos/Codigos-vscode/ListaKaizenApp-MultiTenant/manuais/replicando-app/00_INDICE.md`.
Ajustes: incluir `04.2_Organizar_Listas.md` como referência (sem mexer em `legacy`).

8. Limpeza de ruído documental.
Arquivos:
- `/home/devos/Codigos-vscode/ListaKaizenApp-MultiTenant/manuais/replicando-app/Chat2.md`
- `/home/devos/Codigos-vscode/ListaKaizenApp-MultiTenant/manuais/replicando-app/chat-checklistdecompras.md`
- `/home/devos/Codigos-vscode/ListaKaizenApp-MultiTenant/manuais/chatbackup.md`
Ajustes: mover para “anotações” ou retirar do fluxo oficial.

9. Validação final automática da documentação.
Comandos: buscar termos obsoletos (`cuid`, `não iniciada`, `planejado`, `refresh token`) e rotas divergentes.

10. Fechar com um commit único de docs.
Mensagem sugerida: `docs: alinhar plano de migração com estado pós-migração real`.
