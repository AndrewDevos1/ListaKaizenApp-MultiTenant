# Integração MVP RH -> develop2

Base: develop2 @ 1ff1d0d. Cadeia auditada: #13 -> #14 -> #15 -> #16 -> #17 -> #23 -> #25 -> #26 -> #27 (head 41da0a5).

## Achados da auditoria
- #14 (634bdfd) NÃO contém o fix de #13 (b1b02ba): bases desalinhadas; merge de #13 antes de #27 conflita em auth.service.ts (resolvido mantendo `restauranteId` + `modulos` via `include: restaurante`).
- Sem commits duplicados (patch-id) na cadeia.
- #24 (c90f848): grupo RECURSOS HUMANOS, 'recursos-humanos' em defaultGroups e CSS de contraste já estão no Sidebar de #27. Único delta: rótulo "Meu Espelho Mensal", superado por "Espelho de Ponto" + "Banco de Horas". Redundante; sem merge. Resolve #31.

## Defeitos encontrados na consolidação (corrigidos, com regressão)
1. Espelho: dias futuros/dia corrente sem jornada geravam saldo -08:00 (dívida projetada). Agora `saldoOperacionalMinutos = null` até o dia encerrar. Abono de atestado limitado ao faltante (sem dupla contagem com horas trabalhadas).
2. Migration 20261117000000: CHECK `dias_escala_trabalho_horarios_check` exigia entrada < saida e rejeitava 18:00-02:00 (teste de integração noturna falhava).
3. ConvitesModule usava ModuloGuard sem importar RestaurantesModule: API não subia. Teste `app.module.di.spec.ts`.

## Gates (resultado consolidado)
Jest 97/97 (inclui integração noturna com TEST_DATABASE_URL descartável), tsc API/Web, eslint API (0 erros) e Web (0 erros, 151 warnings), build API/Web (57/57), `test:migrate-deploy` (migrate deploy do zero, sem drift).
