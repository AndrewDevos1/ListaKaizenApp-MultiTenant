# Progresso — Execucao de Codigo da Migracao (Codex)

## Status Atual
- Estado: EM ANDAMENTO
- Ultimo checkpoint: CP-C005 (concluido)
- Proximo passo: CP-C006 — Definir e iniciar o proximo pacote funcional da migracao
- Pasta de trabalho: `manuais/plano-migracao-codex`

## Checklist Executivo
- [x] CP-C001 — Cobrir regras criticas dos services e corrigir submissao para respeitar `usaThreshold=false`
- [x] CP-C002 — Avaliar lacunas de `GerenciarRestaurantes` no backend (SUPER_ADMIN)
- [x] CP-C003 — Implementar lacunas prioritarias de `GerenciarRestaurantes` no frontend + ajustar DTO de update (`ativo`)
- [x] CP-C004 — Adicionar/expandir testes E2E do fluxo colaborador -> submissao -> admin com banco isolado por schema
- [x] CP-C005 — Validacao final, checkpoint e push
- [ ] CP-C006 — Iniciar proximo bloco de migracao priorizado no plano

## Historico de Checkpoints
| Checkpoint | Data/Hora (BRT) | Acao | Resultado | Proximo passo |
|---|---|---|---|---|
| CP-C001 | 2026-03-05 18:27 | Criados testes unitarios para `ListasService`, `SubmissoesService`, `ListasRapidasService` e `AreasService`; corrigida regra de submissao para ignorar itens com `usaThreshold=false` | Concluido (`13/13` testes) | CP-C002 |
| CP-C002 | 2026-03-05 18:39 | Mapeadas lacunas de `GerenciarRestaurantes` no backend (`create/update/remove` + backup/restore) | Concluido | CP-C003 |
| CP-C003 | 2026-03-05 18:39 | Tela `admin/restaurantes` expandida para criar/editar/ativar-desativar; DTO `UpdateRestauranteDto` atualizado com `ativo`; validacao com build API + build WEB | Concluido | CP-C004 |
| CP-C004 | 2026-03-05 18:57 | Estrutura E2E com schema isolado (`helpers/e2e-db.ts`) e novo teste de fluxo completo colaborador -> submissao -> admin -> aprovacao | Concluido (`2/2` suites, `5/5` testes E2E) | CP-C005 |
| CP-C005 | 2026-03-05 18:57 | Validacao final executada com `npm run test:e2e -- --runInBand test/fluxo-submissao.e2e-spec.ts test/auth.e2e-spec.ts` e preparacao de commit/push do checkpoint | Concluido | CP-C006 |

## Como Retomar
1. Ler este arquivo.
2. Executar o "Proximo passo" de `Status Atual`.
3. Ao finalizar cada checkpoint, atualizar `Status Atual`, `Checklist Executivo` e `Historico de Checkpoints`.
