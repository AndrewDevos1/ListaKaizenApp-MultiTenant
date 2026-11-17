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

## Histórico de preços (#36)

- Tabela `historico_precos_item`, append-only: trigger no banco rejeita UPDATE/DELETE; CHECK impede preço negativo.
- Evento por mudança real de `precoAtual`, gravado na mesma transação em `atualizarPrecoItem`. Preço idêntico = sem evento. Primeira definição: `precoAnterior` nulo.
- Autor, origem (`CATALOGO`), moeda (`BRL`), instante e fornecedor registrados.
- Leitura: `GET /v1/admin/fornecedores/:fid/itens/:id/historico-precos?pagina&tamanho` (ADMIN/SUPER_ADMIN, tenant-safe, tamanho máx. 100).
- Migration: `20261117135000_historico_precos` (depois da #35 `20261117120000`).
- Itens sem histórico anterior (preço setado antes da #36) não têm evento retroativo: política inicial, sem backfill.
