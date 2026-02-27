# Mapeamento de Endpoints - Estrategia de Cache

## Contexto
- BaseURL do frontend (axios): /api (ver frontend/src/services/api.ts)
- Blueprints:
  - /api/auth
  - /api/admin
  - /api/collaborator
  - /api/public
  - /api/v1
- Observacao: caminhos para /areas e /fornecedores foram padronizados para /api/v1 no frontend (ImportacaoEstoque).

## Endpoints candidatos a cache (GET)
| Endpoint | Metodo | Sensivel | Cache | TTL | Estrategia | Observacoes |
|---|---|---|---|---|---|---|
| /api/v1/items | GET | Nao | Sim | 7d | Cache-First | Dados estaticos |
| /api/v1/areas | GET | Nao | Sim | 7d | Cache-First | Estrutura |
| /api/v1/fornecedores | GET | Nao | Sim | 3d | Cache-First | Lista estavel |
| /api/v1/areas/{id}/estoque | GET | Sim | Sim | 1h | Network-First | Estoque dinamico |
| /api/v1/listas | GET | Sim | Sim | 30m | Network-First | Listas |
| /api/v1/listas/{id}/estoque | GET | Sim | Sim | 1h | Network-First | Estoque por lista |
| /api/collaborator/areas/{id} | GET | Sim | Sim | 24h | Cache-First | Detalhe area colaborador |
| /api/collaborator/areas/{id}/estoque | GET | Sim | Sim | 1h | Network-First | Estoque colaborador |
| /api/collaborator/listas/{id} | GET | Sim | Sim | 24h | Cache-First | Detalhe lista colaborador |
| /api/collaborator/listas/{id}/estoque | GET | Sim | Sim | 1h | Network-First | Estoque lista colaborador |
| /api/collaborator/minhas-listas | GET | Sim | Sim | 30m | Network-First | Listas do colaborador |
| /api/collaborator/minhas-areas-status | GET | Sim | Sim | 30m | Network-First | Status areas colaborador |
| /api/v1/submissoes/me | GET | Sim | Nao | - | Network-Only | Historico pessoal |
| /api/v1/pedidos/me | GET | Sim | Nao | - | Network-Only | Historico pessoal |
| /api/v1/users/stats | GET | Sim | Nao | - | Network-Only | Dados sensiveis |

## Endpoints de escrita (Network-Only)
- /api/v1/estoque/draft (POST)
- /api/v1/pedidos/submit (POST)
- /api/v1/estoque/{id} (PUT)
- /api/collaborator/estoque/{id} (PUT)
- /api/v1/listas/{id}/estoque/submit (POST)
- Todos /api/v1/* com POST/PUT/DELETE
- Todos /api/collaborator/* com POST/PUT/DELETE

## Auth/Public (Network-Only)
- /api/auth/* (login, register, session, profile, notificacoes, etc.)
- /api/public/* (solicitar-restaurante)

## Admin (Network-Only)
- /api/admin/* (gestao, dashboards, importacao, etc.)

## Health/Config
- /api/v1/health (GET/HEAD) -> Network-Only (ping)
- /api/config/sw-enabled (GET) -> Network-Only (kill switch, se implementado)

## Pendencias
- Validar se baseURL em prod/dev eh /api ou /api/v1.
- Revisar chamadas sem prefixo /v1 (ex: /stats/dashboard, /submissions/recent) e alinhar com o backend.
- Ajustar TTL conforme uso real.
