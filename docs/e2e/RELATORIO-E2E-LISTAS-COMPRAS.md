# Relatório E2E — Listas de Compras

Passos verificados: 30/30 PASS. Banco: PostgreSQL descartável (_test). Cada passo confere resposta da API, estado persistido e permissões.

| Jornada | Ação | HTTP | Efeito verificado | Resultado |
|---|---|---|---|---|
| L1 montagem | ADMIN cria 3 itens | 201x3 | 3 itens persistidos com restauranteId do ADMIN | PASS |
| L1 montagem | ADMIN cria lista com colaborador; colaborador de outro restaurante => 404 e nada criado | 404/201 | lista no banco com 1 colaborador; lista inválida não persistida | PASS |
| L1 montagem | ADMIN adiciona itens com mínimos 10/5/8; duplicado => 409 | 201x3/409 | 3 refs com mínimos corretos; duplicata barrada | PASS |
| L1 montagem | ADMIN configura fardo de 12 com threshold na alface | 200 | qtdFardo=12 persistido | PASS |
| L1 montagem | item de outro restaurante não entra na lista => 404 e nada criado | 404 | nenhum ListaItemRef cross-tenant | PASS |
| L2 colaborador | minhas-listas: col1 vê a lista; col2 (não atribuído) não vê | 200/200 | col1: 1 lista com 3 itens; col2: 0 | PASS |
| L2 colaborador | detalhe da lista: atribuído 200; não atribuído e outro restaurante 404 | 200/404/404 | isolamento por atribuição e por restaurante | PASS |
| L2 colaborador | colaborador não administra: criar lista, ver submissões admin, aprovar => 403 | 403x7 | lista/itens/mínimos intactos | PASS |
| L2 colaborador | colaborador não atribuído não preenche nem submete => 404, sem efeito | 404/404 | quantidadeAtual=0 e 0 submissões | PASS |
| L2 colaborador | tudo acima do mínimo => 422 e nenhuma submissão | 200/422 | 0 submissões, 0 pedidos | PASS |
| L2 colaborador | estoque com refs de outra lista => 404 e nada gravado; quantidade negativa => 400 | 404/400 | nenhuma quantidade alterada nas duas tentativas inválidas | PASS |
| L2 colaborador | preenche tomate=4, cebola=5 (= mínimo), alface=2 e submete => pedidos 6 e 12 | 200/201 | Submissao PENDENTE + pedidos {tomate:6, alface:12}; cebola sem pedido | PASS |
| L2 colaborador | colaborador vê a própria submissão e não a de outro | 200/200/404 | detalhe com 2 pedidos; outro colaborador 404 | PASS |
| L3 admin | lista e detalha submissões (filtro por status) | 200x4 | filtros por status coerentes com o banco | PASS |
| L3 admin | edição inválida (itens duplicados, item fora da lista, tudo acima do mínimo) => 400 e pedidos intactos | 400x3 | pedidos {6,12} e quantidades atuais preservados | PASS |
| L3 admin | edita tomate=8, cebola=1, alface=20 => pedidos recalculados {tomate:2, cebola:4} | 200 | banco: 2 pedidos {2,4}; estoque atual atualizado | PASS |
| L3 admin | edições concorrentes (6x) não duplicam pedidos | 200x6 | exatamente 2 pedidos {7,4} no banco | PASS |
| L3 admin | aprova: submissão e pedidos APROVADO; aprovação repetida é idempotente | 201/201 | 2 pedidos APROVADO; repetição não altera nada | PASS |
| L3 admin | submissão aprovada não pode mais ser editada => 400, pedidos intactos | 400 | pedidos {7,4} preservados | PASS |
| L3 admin | reverte para PENDENTE, rejeita, reverte; aprova 1 pedido e rejeita outro => PARCIAL | 200/201/200/200/400/200 | status PARCIAL; transição inválida barrada | PASS |
| L3 admin | aprovações concorrentes (5x) deixam estado único e consistente | 201x5 | 2 pedidos APROVADO, sem duplicação | PASS |
| L3 admin | arquivar e desarquivar refletem no banco e nos filtros | 200x3 | arquivada true/false persistida | PASS |
| L4 idempotência | 6 envios simultâneos do mesmo colaborador criam apenas 1 submissão PENDENTE | 1x201 + 5x409 | 1 Submissao e 1 Pedido (8) no banco | PASS |
| L4 idempotência | novo envio enquanto há PENDENTE => 409; após decisão, novo envio é permitido | 409/201/201 | 2 submissões ao todo (1 aprovada + 1 nova pendente) | PASS |
| L4 idempotência | lista excluída (soft delete) some do colaborador e não aceita envio | 200/404 | deletado=true; sem novas submissões | PASS |
| L5 isolamento | ADMIN do restaurante 2 não enxerga nem altera lista/submissão do restaurante 1 | 404x12 | lista, pedidos e status do restaurante 1 inalterados | PASS |
| L5 isolamento | listagens do ADMIN 2 contêm só dados do restaurante 2, mesmo com restauranteId=1 na query | 200x3 | filtro vem do token; restauranteId forjado por ADMIN é ignorado | PASS |
| L5 isolamento | colaborador do restaurante 2 não acessa submissão/lista do restaurante 1 | 404x3 | estoque do restaurante 1 inalterado | PASS |
| L5 governança | SUPER_ADMIN exige tenant explícito e respeita o selecionado | 403/200/200/200 | sem tenant => 403; com tenant => só dados dele | PASS |
| L5 governança | flag moduloFuncionarios desligada bloqueia as listas admin e gera AppLog; dados preservados | 200/403x3/200 | AppLog {moduloFuncionarios:true->false}; restaurante 1 segue ativo | PASS |
