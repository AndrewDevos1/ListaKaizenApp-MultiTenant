# Progresso — Execucao de Codigo da Migracao (Codex)

## Status Atual
- Estado: EM ANDAMENTO
- Ultimo checkpoint: CP-C001 (servicos criticos + regra de threshold)
- Proximo passo: CP-C002 — Expandir cobertura para fluxo E2E de submissao
- Pasta de trabalho: `manuais/plano-migracao-codex`

## Checklist Executivo
- [x] CP-C001 — Cobrir regras criticas dos services e corrigir submissao para respeitar `usaThreshold=false`
- [ ] CP-C002 — Adicionar/expandir testes E2E do fluxo colaborador -> submissao -> admin
- [ ] CP-C003 — Avaliar lacunas de `GerenciarRestaurantes` no backend (SUPER_ADMIN)
- [ ] CP-C004 — Implementar lacunas prioritarias de `GerenciarRestaurantes` no frontend
- [ ] CP-C005 — Validacao final, checkpoint e push

## Historico de Checkpoints
| Checkpoint | Data/Hora (BRT) | Acao | Resultado | Proximo passo |
|---|---|---|---|---|
| CP-C001 | 2026-03-05 18:27 | Criados testes unitarios para `ListasService`, `SubmissoesService`, `ListasRapidasService` e `AreasService`; corrigida regra de submissao para ignorar itens com `usaThreshold=false` | Concluido (`13/13` testes) | CP-C002 |

## Como Retomar
1. Ler este arquivo.
2. Executar o "Proximo passo" de `Status Atual`.
3. Ao finalizar cada checkpoint, atualizar `Status Atual`, `Checklist Executivo` e `Historico de Checkpoints`.
