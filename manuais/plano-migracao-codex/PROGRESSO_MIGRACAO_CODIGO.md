# Progresso — Execucao de Codigo da Migracao (Codex)

## Status Atual
- Estado: EM ANDAMENTO
- Ultimo checkpoint: CP-C007 (concluido)
- Proximo passo: CP-C008 — Expandir cobertura de isolamento/roles para outros fluxos administrativos
- Pasta de trabalho: `manuais/plano-migracao-codex`

## Checklist Executivo
- [x] CP-C001 — Cobrir regras criticas dos services e corrigir submissao para respeitar `usaThreshold=false`
- [x] CP-C002 — Avaliar lacunas de `GerenciarRestaurantes` no backend (SUPER_ADMIN)
- [x] CP-C003 — Implementar lacunas prioritarias de `GerenciarRestaurantes` no frontend + ajustar DTO de update (`ativo`)
- [x] CP-C004 — Adicionar/expandir testes E2E do fluxo colaborador -> submissao -> admin com banco isolado por schema
- [x] CP-C005 — Validacao final, checkpoint e push
- [x] CP-C006 — Fechar lacunas de isolamento multi-tenant em `ListasService` (create/add/assign/getMinhasListas) + cobertura unitaria/E2E
- [x] CP-C007 — Fechar lacuna de tenant em `CotacoesService.create` e ampliar E2E de isolamento em `checklists`/`cotacoes`
- [ ] CP-C008 — Cobrir isolamento/roles em fluxos administrativos restantes

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

## Como Retomar
1. Ler este arquivo.
2. Executar o "Proximo passo" de `Status Atual`.
3. Ao finalizar cada checkpoint, atualizar `Status Atual`, `Checklist Executivo` e `Historico de Checkpoints`.
