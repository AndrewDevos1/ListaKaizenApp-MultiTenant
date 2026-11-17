# Almoxarifado MVP

Integre migrations em ordem lexicográfica: primeiro `20261117120000_catalogo_itens_fornecedor` (#35), depois `20261117130000_almoxarifado_mvp` (#37). Esta migration só cria tabelas próprias e referências a `itens`/`restaurantes`; não altera modelos da #35.

Saldo é estoque físico independente de listas, pedidos, recebimentos e cotações. Movimentações são append-only, idempotentes por restaurante/chave e bloqueiam a posição com `SELECT ... FOR UPDATE`.
