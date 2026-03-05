# Progresso — Execucao de Codigo da Migracao (Codex)

## Status Atual
- Estado: EM ANDAMENTO
- Ultimo checkpoint: CP-C004 (tentativa de E2E bloqueada por infra de banco)
- Proximo passo: CP-C005 — Commit/push das melhorias de GerenciarRestaurantes e ajustes de base E2E
- Pasta de trabalho: `manuais/plano-migracao-codex`

## Checklist Executivo
- [x] CP-C001 — Cobrir regras criticas dos services e corrigir submissao para respeitar `usaThreshold=false`
- [x] CP-C002 — Avaliar lacunas de `GerenciarRestaurantes` no backend (SUPER_ADMIN)
- [x] CP-C003 — Implementar lacunas prioritarias de `GerenciarRestaurantes` no frontend + ajustar DTO de update (`ativo`)
- [ ] CP-C004 — Adicionar/expandir testes E2E do fluxo colaborador -> submissao -> admin (bloqueado por acesso ao DB remoto no ambiente atual)
- [ ] CP-C005 — Validacao final, checkpoint e push

## Historico de Checkpoints
| Checkpoint | Data/Hora (BRT) | Acao | Resultado | Proximo passo |
|---|---|---|---|---|
| CP-C001 | 2026-03-05 18:27 | Criados testes unitarios para `ListasService`, `SubmissoesService`, `ListasRapidasService` e `AreasService`; corrigida regra de submissao para ignorar itens com `usaThreshold=false` | Concluido (`13/13` testes) | CP-C002 |
| CP-C002 | 2026-03-05 18:39 | Mapeadas lacunas de `GerenciarRestaurantes` no backend (`create/update/remove` + backup/restore) | Concluido | CP-C003 |
| CP-C003 | 2026-03-05 18:39 | Tela `admin/restaurantes` expandida para criar/editar/ativar-desativar; DTO `UpdateRestauranteDto` atualizado com `ativo`; validacao com build API + build WEB | Concluido | CP-C004 |
| CP-C004 | 2026-03-05 18:39 | Ajustada base de E2E (`@types/supertest` + tipagem no spec), mas execucao E2E bloqueada por indisponibilidade de DB remoto (`metro.proxy.rlwy.net:56395`) | Parcial (bloqueado por infra) | CP-C005 |

## Como Retomar
1. Ler este arquivo.
2. Executar o "Proximo passo" de `Status Atual`.
3. Ao finalizar cada checkpoint, atualizar `Status Atual`, `Checklist Executivo` e `Historico de Checkpoints`.
