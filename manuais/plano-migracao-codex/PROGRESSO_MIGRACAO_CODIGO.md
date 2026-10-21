# Progresso — Execucao de Codigo da Migracao (Codex)

## Status Atual
- Estado: EM ANDAMENTO
- Ultimo checkpoint: CP-C010 (concluido)
- Proximo passo: CP-C011 — Implementar recebimento (schema + API + web) e fechar paridade do ciclo pos-aprovacao
- Pasta de trabalho: `manuais/plano-migracao-codex`

## Checklist Executivo
- [x] CP-C001 — Cobrir regras criticas dos services e corrigir submissao para respeitar `usaThreshold=false`
- [x] CP-C002 — Avaliar lacunas de `GerenciarRestaurantes` no backend (SUPER_ADMIN)
- [x] CP-C003 — Implementar lacunas prioritarias de `GerenciarRestaurantes` no frontend + ajustar DTO de update (`ativo`)
- [x] CP-C004 — Adicionar/expandir testes E2E do fluxo colaborador -> submissao -> admin com banco isolado por schema
- [x] CP-C005 — Validacao final, checkpoint e push
- [x] CP-C006 — Fechar lacunas de isolamento multi-tenant em `ListasService` (create/add/assign/getMinhasListas) + cobertura unitaria/E2E
- [x] CP-C007 — Fechar lacuna de tenant em `CotacoesService.create` e ampliar E2E de isolamento em `checklists`/`cotacoes`
- [x] CP-C008 — Fechar lacuna de tenant em `AreasService.setColaboradores` e ampliar E2E de isolamento para `areas`
- [x] CP-C009 — Fechar lacuna de tenant em `ListasRapidasService` (itemId cross-tenant) com cobertura unitaria/E2E
- [x] CP-C010 — Consolidar matriz `Legado x Atual x Falta` de listas/submissoes/recebimento e fechar P0 (contrato admin, calculo com `qtdFardo`, permissao por atribuicao de lista)
- [ ] CP-C011 — Implementar recebimento (colaborador/admin) com persistencia, endpoints e telas

## Historico de Checkpoints
| Checkpoint | Data/Hora (BRT) | Acao | Resultado | Proximo passo |
|---|---|---|---|---|
| CP-C001 | 2026-03-05 18:27 | Criados testes unitarios para `ListasService`, `SubmissoesService`, `ListasRapidasService` e `AreasService`; corrigida regra de submissao para ignorar itens com `usaThreshold=false` | Concluido (`13/13` testes) | CP-C002 |
| CP-C002 | 2026-03-05 18:39 | Mapeadas lacunas de `GerenciarRestaurantes` no backend (`create/update/remove` + backup/restore) | Concluido | CP-C003 |
| CP-C003 | 2026-03-05 18:39 | Tela `admin/restaurantes` expandida para criar/editar/ativar-desativar; DTO `UpdateRestauranteDto` atualizado com `ativo`; validacao com build API + build WEB | Concluido | CP-C004 |
| CP-C004 | 2026-03-05 18:57 | Estrutura E2E com schema isolado (`helpers/e2e-db.ts`) e novo teste de fluxo completo colaborador -> submissao -> admin -> aprovacao | Concluido (`2/2` suites, `5/5` testes E2E) | CP-C005 |
| CP-C005 | 2026-03-05 18:57 | Validacao final executada com `npm run test:e2e -- --runInBand test/fluxo-submissao.e2e-spec.ts test/auth.e2e-spec.ts` e preparacao de commit/push do checkpoint | Concluido | CP-C006 |
| CP-C006 | 2026-03-05 19:08 | Corrigido isolamento multi-tenant em `ListasService` (validacao de colaboradores por restaurante e filtro por tenant em `minhas-listas`), com novos testes unitarios e E2E de bloqueio de vinculo cruzado | Concluido (`7/7` unitarios + `2/2` suites E2E, `6/6` testes) | CP-C007 |
| CP-C007 | 2026-03-05 19:21 | `CotacoesService.create` passou a rejeitar submissao de outro tenant; E2E ampliado para bloquear cross-tenant em `checklists` e `cotacoes`; adicionados unitarios de `CotacoesService` | Concluido (`9/9` unitarios + `2/2` suites E2E, `8/8` testes) | CP-C008 |
| CP-C008 | 2026-03-05 20:09 | `AreasService.setColaboradores` passou a validar colaboradores do tenant antes da troca de vinculos; `getColaboradores` filtrado por restaurante; E2E ampliado para bloqueio cross-tenant em `areas` | Concluido (`13/13` unitarios + `2/2` suites E2E, `9/9` testes) | CP-C009 |
| CP-C009 | 2026-03-05 20:41 | `ListasRapidasService` passou a validar `itemId` por tenant em create/add/update; novos unitarios de isolamento e E2E de bloqueio de item cross-tenant | Concluido (`20/20` unitarios + `2/2` suites E2E, `10/10` testes) | CP-C010 |
| CP-C010 | 2026-03-05 22:13 | Criada matriz de paridade em `MATRIZ_LISTAS_SUBMISSAO_RECEBIMENTO.md`; corrigido P0 em listas/submissoes (permite apenas colaborador atribuido, calculo com `qtdFardo`, ajuste de contrato nas telas de detalhe) | Concluido (`10/10` unitarios em `listas.service.spec.ts`, build API/Web e E2E `fluxo-submissao` com `7/7` testes OK) | CP-C011 |

## Como Retomar
1. Ler este arquivo.
2. Executar o "Proximo passo" de `Status Atual`.
3. Ao finalizar cada checkpoint, atualizar `Status Atual`, `Checklist Executivo` e `Historico de Checkpoints`.
