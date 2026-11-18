# Catálogo de itens por fornecedor (issue #35)

Reusa `Item` (`fornecedorId`, `restauranteId`). Campos novos opcionais: `codigoFornecedor`, `marca`, `descricao`, `precoAtual` (`Decimal(14,2)`).
Único parcial implícito: `(restauranteId, fornecedorId, codigoFornecedor)` (NULL não colide).

## API (`/api/v1/admin/fornecedores/:fornecedorId/itens`, ADMIN/SUPER_ADMIN; SUPER_ADMIN exige `?restauranteId=`)
- `GET ?q=&ativo=` · `POST` · `PUT /:id` · `DELETE /:id` (inativa, nunca remove)
- `POST /importacao/preview` `{formato:'csv'|'texto', conteudo}` → `{token, resumo, linhas[acao]}`; não grava Item. Preview persistido em `catalogo_importacoes` (TTL 24h).
- `POST /importacao/confirmar` `{token}` → grava só linhas `NOVO` em transação; repetir devolve o resultado salvo (`repetida:true`).
- Duplicatas: código do fornecedor; sem código, nome normalizado+unidade. Colisão ambígua → `REVISAO` (nunca sobrescreve).

## Contrato para a #36 (histórico de preços)
`CatalogoFornecedorService.atualizarPrecoItem(tx, itemId, restauranteId, preco)` é o ÚNICO ponto que altera `Item.precoAtual`
(via `atualizar`, dentro de `$transaction`). A #36 deve gravar o histórico nesse método, na mesma transação `tx`.
A importação cria itens novos com preço inicial; não atualiza preço de itens existentes.
