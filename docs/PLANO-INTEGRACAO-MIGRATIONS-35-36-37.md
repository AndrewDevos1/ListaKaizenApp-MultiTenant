# Plano de integração de migrations Prisma — #35, #36, #37 (e #7)

Base: `develop2@c27c6c2`. Última migration existente: `20261117000000_escala_permite_jornada_noturna`.

## Ordem e dono de cada migration

| Ordem | Migration | Issue | Toca em | Regra |
|---|---|---|---|---|
| 1 | `20261117120000_catalogo_itens_fornecedor` | #35 | `itens` (colunas do catálogo, índices), tabelas novas de prévia/importação | Dona das alterações em `itens`/`fornecedores`. Preço atual = `Decimal` exato. |
| 2 | `20261117130000_almoxarifado_mvp` | #37 | Só tabelas NOVAS, com FK para `itens` e `restaurantes` | Não altera colunas existentes. |
| 3 | `20261117135000_historico_precos` | #36 | Tabela nova de eventos de preço; FK para `itens` | Cria só depois de #35 (usa a coluna de preço). Branch encadeada em #35. |
| 4 | `20261117140000_session_timeout` | #7 | `restaurantes`, `usuarios` (colunas novas) | Só depois de #35/#37 mergeadas, para não disputar `schema.prisma`. |

Timestamps estritamente crescentes: o Prisma aplica por ordem lexicográfica do nome. Não renomear depois de publicado.

## Pontos de colisão previstos

1. **`schema.prisma`, modelo `Item`:** #35 adiciona colunas; #37 e #36 adicionam apenas relações inversas. Cada uma em bloco contíguo e pequeno, no fim do modelo, para o merge textual resolver sozinho. Não usar `prisma format` (reformata o arquivo inteiro e cria conflito falso).
2. **`schema.prisma`, modelo `Restaurante`:** #37 adiciona uma relação inversa; #7 adiciona uma coluna. Ordem acima evita conflito.
3. **`app.module.ts`:** cada branch adiciona um import e uma linha em `imports`. Conflito trivial; resolver mantendo ambas.
4. **`Sidebar.tsx`:** #35 e #37 podem adicionar item de menu. Manter blocos separados.

## Procedimento ao integrar (por quem fizer o merge, após revisão humana)

1. Integrar #35. Rodar `prisma migrate deploy` do zero e `prisma migrate diff --exit-code` (zero drift).
2. Rebasear #37 sobre a develop2 atualizada. Resolver `schema.prisma` mantendo as duas mudanças. Reexecutar migrate do zero e testes.
3. Rebasear #36 sobre a #35 já integrada (ou sobre sua branch, se ainda não integrada). Idem.
4. Nunca editar migration já aplicada em qualquer banco. Correção = nova migration.
5. Nenhum `migrate resolve`. Nenhuma migration em banco real nesta fase.

## Validação obrigatória por branch

- `prisma validate`
- `prisma migrate deploy` em PostgreSQL descartável novo
- `prisma migrate diff --from-url <db> --to-schema-datamodel prisma/schema.prisma --exit-code`
- Testes de integração no mesmo banco
- Depois do rebase: repetir os três acima na combinação das branches

## Isolamento de ambiente dos agentes

| Agente | Container | Porta DB | Banco | API | Web |
|---|---|---|---|---|---|
| #35 | `kzn-35-db` | 55490 | `kzn_35_test` | 3035 | 3036 |
| #37 | `kzn-37-db` | 55491 | `kzn_37_test` | 3037 | 3038 |
| #36 | `kzn-36-db` | 55492 | `kzn_36_test` | 3039 | 3040 |

Portas ocupadas por outros projetos e proibidas: 55432–55437, 55447, 55470, 3002, 3003, 3012, 3013, 3024, 3050, 3090, 3091.
