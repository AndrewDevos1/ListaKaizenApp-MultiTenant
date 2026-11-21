# Relatório E2E — Ponto e RH

Passos verificados: 44/44 PASS. Banco: PostgreSQL descartável (_test). Cada passo confere resposta da API, estado persistido e permissões.

| Jornada | Ação | HTTP | Efeito verificado | Resultado |
|---|---|---|---|---|
| J1 diurna | ADMIN cria escala seg-sex 08-17, sáb/dom folga | 201 | escala + 7 dias persistidos; AppLog CRIAR_ESCALA_TRABALHO | PASS |
| J1 diurna | sobreposição de escala é recusada | 400 | continua 1 escala no banco | PASS |
| J1 diurna | status inicial só permite ENTRADA | 200 | tiposDisponiveis=[ENTRADA] | PASS |
| J1 diurna | sem token => 401; ENTRADA 08:00 BRT => 201 | 201 | registro ENTRADA 11:00Z, dataOperacional 2026-11-03 | PASS |
| J1 diurna | ENTRADA duplicada => 400, sem novo registro | 400 | banco mantém 1 registro | PASS |
| J1 diurna | RETORNO sem PAUSA => 400 (sequência inválida) | 400 | banco mantém 1 registro | PASS |
| J1 diurna | PAUSA <60s após ENTRADA => 429, sem registro | 429 | antirrajada: banco mantém 1 registro | PASS |
| J1 diurna | PAUSA 12:00 BRT (início do intervalo) => 201 | 201 | próximo permitido: RETORNO | PASS |
| J1 diurna | SAIDA durante intervalo => 400; PAUSA repetida => 400 | 400/400 | banco mantém 2 registros | PASS |
| J1 diurna | RETORNO 13:00 BRT sem informar tipo (inferido) => 201 | 201 | tipo inferido RETORNO | PASS |
| J1 diurna | SAIDA 18:05 BRT => 201, jornada encerrada | 201 | 4 registros ordenados no PostgreSQL, mesma dataOperacional | PASS |
| J1 diurna | nova ENTRADA no mesmo dia após SAIDA => 400 (limite diário) | 400 | banco mantém 4; status jornadaEncerrada=true | PASS |
| J1 diurna | histórico filtra por data e rejeita datas inválidas | 200/200/400/400 | 4 itens no dia, 0 fora do período | PASS |
| J1 diurna | espelho: 545 min realizados (intervalo descontado), 540 previstos, saldo +5 | 200/400 | cálculo confere com batidas do banco; sábado/domingo previsto 0 | PASS |
| J1 diurna | banco de horas: ADMIN lança +120 e -30; COLLAB vê saldo; AppLog gravado | 201x3/400/200 | soma DB = 120; mês nov=90, dez=30; 3 AppLogs | PASS |
| J1 diurna | espelho incorpora banco: dia 03/11 saldo = 5 + 90 = 95 | 200 | lançamentos aparecem no espelho e compõem o saldo | PASS |
| J2 noturna | escala 18:00-02:00 todos os dias | 201 | escala noturna persistida | PASS |
| J2 noturna | ENTRADA 31/10 18:00 BRT | 201 | dataOperacional 2026-10-31 | PASS |
| J2 noturna | PAUSA 22:00 BRT já em 01/11 UTC mantém a jornada de 31/10 | 201 | dataOperacional continua 2026-10-31 | PASS |
| J2 noturna | após meia-noite BRT: status mostra jornada aberta; nova ENTRADA => 400 | 200/400 | jornada não é duplicada na virada do dia | PASS |
| J2 noturna | RETORNO 22:30 BRT e SAIDA 02:00 BRT de 01/11 | 201/201 | 4 registros, todos com dataOperacional 2026-10-31 | PASS |
| J2 noturna | espelho 2026-10: 450 min (4h + 3h30), previsto 480, saldo -30 | 200/200 | horas só no mês da dataOperacional (outubro) | PASS |
| J2 noturna | nova jornada 01/11 18:00 BRT abre dataOperacional de novembro | 201/201/200 | 01/11 = 480 min, saldo 0 | PASS |
| J3 atestados | cria atestados PENDENTES; duplicado => 409 | 201x5/409 | 5 atestados PENDENTE no banco; duplicata barrada | PASS |
| J3 atestados | atestado PENDENTE ainda não abona o espelho | 200 | abono 0 enquanto PENDENTE | PASS |
| J3 atestados | ADMIN aprova parcial e integral, rejeita um; segunda decisão => 400 | 200/200/200/400 | situação persistida + 3 AppLogs; decisão única | PASS |
| J3 atestados | ADMIN aprova e depois cancela atestado: abono só enquanto aprovado | 200 | abono 540 -> 0 após cancelamento | PASS |
| J3 atestados | ADMIN classifica FOLGA (04/11) e FALTA (06/11); FALTA notifica o colaborador uma vez | 201x3 | 2 classificações (upsert), 1 notificação de falta | PASS |
| J3 atestados | espelho: cada dia reflete folga/falta/abono; totais conferem | 200 | abonado 1320, previsto 2700, saldo -1380 (calculado a mão) | PASS |
| J4 concorrência | 8 ENTRADAs simultâneas do mesmo colaborador => 1x201 e 7x400 | 1x201 + 7x400 | lock advisory: exatamente 1 registro no banco | PASS |
| J4 concorrência | dois colaboradores batendo ao mesmo tempo não se bloqueiam | 201/200 | 1 registro para o 2º colaborador | PASS |
| J4 concorrência | 6 criações idênticas de atestado => 1x201 e 5x409 | 1x201 + 5x409 | unique da solicitação evita duplicidade | PASS |
| J5 isolamento | cada colaborador registra no próprio restaurante | 201/201 | registros com restauranteId distintos; histórico só do próprio | PASS |
| J5 isolamento | ADMIN A não cria escala/atestado/banco/ausência para usuário do restaurante B => 404 | 404x4 | nenhuma linha criada em nome do restaurante A | PASS |
| J5 isolamento | ADMIN A não lista dados de B nem escolhendo restauranteId na query | 200/200 | listas filtradas pelo restaurante do token | PASS |
| J5 isolamento | espelho do colaborador A não contém batidas de B | 200 | 1 batida, só do próprio usuário | PASS |
| J5 rbac | COLLABORATOR em rotas administrativas => 403 e nada persistido | 403x6 | contagem de lançamentos inalterada | PASS |
| J5 rbac | SUPER_ADMIN não usa rotas de colaborador; ADMIN não lê logs globais | 403/403 | papéis respeitados | PASS |
| J6 governança | tenant com moduloPonto=false => 403 e nada gravado | 403/403 | 0 registros no banco | PASS |
| J6 governança | SUPER_ADMIN respeita o tenant selecionado: A (ligado)=200, C (desligado)=403, sem tenant=403 | 200/403/403 | flag do tenant escolhido na query; sem fallback global | PASS |
| J6 governança | SUPER_ADMIN desliga moduloPonto: bloqueia API, dados preservados, AppLog antes/depois | 200/403x3 | dados intactos; 1 AppLog {moduloPonto: true->false} | PASS |
| J6 governança | PUT idempotente não gera AppLog; religar restaura acesso aos mesmos dados | 200/200/200 | no-op sem log; reativação gera 2º log e devolve a mesma batida | PASS |
| J6 governança | somente SUPER_ADMIN altera módulos e lê AppLog; ADMIN/COLLAB => 403 sem efeito | 403/403/200 | flag inalterada; log consultável via API | PASS |
| J6 governança | moduloFuncionarios=false bloqueia atestados e ausências; ponto segue ativo | 403/403/200 | flags independentes; 0 atestados criados | PASS |
