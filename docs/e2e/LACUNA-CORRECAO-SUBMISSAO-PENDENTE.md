# Lacuna: correção de submissão PENDENTE pelo colaborador

Comportamento verificado (E2E L6, `apps/api/test/listas-compras.e2e-spec.ts`):

- Segundo envio da mesma lista pelo mesmo colaborador enquanto há PENDENTE: HTTP 409, sem nova submissão.
- Colaborador NÃO tem rota para editar, rejeitar ou cancelar a própria submissão
  (`PUT /collaborator/submissoes/:id` = 404; rotas `/admin/*` = 403).
- Colaborador pode atualizar o estoque da lista (`PUT /collaborator/listas/:id/estoque`) durante a PENDENTE;
  os pedidos da submissão não mudam (snapshot) e ficam divergentes do estoque até o ADMIN agir.
- Quem corrige: ADMIN, via `PUT /admin/submissoes/:id/editar` (somente PENDENTE, sem pedidos decididos;
  recalcula pedidos na mesma submissão), ou rejeita e o colaborador reenvia.
- Aprovada/rejeitada nunca é alterada; `editar` em aprovada = 400; reenvio após decisão cria submissão nova.

Lacuna: o colaborador depende do ADMIN para corrigir um envio errado.

Proposta segura (NÃO implementada; aguarda decisão do dono do produto):
`POST /collaborator/submissoes/:id/cancelar`
- só dono da submissão e do mesmo restaurante; só status PENDENTE; sem pedidos decididos;
- transição para estado terminal (ex.: CANCELADO/REJEITADO com motivo) em transação com lock da lista;
- não apaga pedidos; registra AppLog; libera novo envio;
- exige migração se o enum `StatusSubmissao` não tiver o estado, e teste E2E de permissões/isolamento.
Alternativa sem migração: colaborador chama `editar` restrito às próprias PENDENTES, reutilizando a regra do ADMIN.
