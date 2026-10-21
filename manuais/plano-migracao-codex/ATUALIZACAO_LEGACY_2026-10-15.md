# Atualização do legado — diferenças e funcionalidades

## Escopo e baseline

Análise em 15/10/2026 da etapa 2: comparar e documentar, sem implementar a migração.

- Anterior: `/tmp/legacy-backup-20261015-045540`.
- Atual: `legacy/`, sincronizado com `master` de `https://github.com/AndrewDevos1/ListaKaizenApp.git`.
- Método: comparação direta entre snapshots (`git diff --no-index`) e inspeção estática de backend, frontend, migrações e testes.
- Não usar apenas o HEAD do multi-tenant como baseline: já existiam muitas alterações locais antes da sincronização.
- O SHA da origem não foi registrado durante a sincronização. Este relatório descreve snapshots, não atribui mudanças a commits específicos.
- Nenhuma implementação em `legacy/`, `apps/api` ou `apps/web` foi alterada nesta etapa. Testes, migrações e jornadas de navegador não foram executados; presença de código não comprova funcionamento.
- As referências de linha correspondem ao snapshot analisado.

## Resumo do delta

| Área | Mudança desta atualização | Estado observado |
| --- | --- | --- |
| Contador | Novo papel, permissões, vínculos e portal de consulta | Implementação presente; sem validação executada |
| Módulos por restaurante | Ativar/desativar ponto, funcionários e almoxarifado/EPI | Backend, frontend e testes presentes |
| Ponto/banco de horas | Unificação de telas e ampliação do espelho | Alteração de módulo preexistente |
| Faltas/folgas | Classificação diária e efeitos no banco de horas/escala | Defeito impeditivo identificado |
| Solicitação de folga | Modelo e estados | Fluxo de solicitação/aprovação não identificado |
| Atestado | Categoria substitui pagamento de horas | Risco de migração de dados históricos |
| Sessão | Timeout persistido por restaurante/usuário | Expiração server-side não comprovada |
| Interface | PWA, geolocalização, tutorial e navegação | Ajustes incrementais |

## 1. Perfil CONTADOR

Novo papel `CONTADOR`, com permissões individuais para ponto, documentação, uniformes e almoxarifado. Administradores podem configurar os funcionários visíveis ao contador.

A API `/api/contador` inclui consultas de registros, espelho, resumo, estatísticas, contratos, apuração, extrato, funcionários, admissão, documentos, entregas EPI e almoxarifado. Consultas de funcionários/ponto/EPI recebem filtros pelos vínculos autorizados; almoxarifado é consultado por restaurante.

Referências:
- `legacy/backend/kaizen_app/models.py:65` e `:2557`.
- `legacy/backend/kaizen_app/services.py:4429` e `:4641`.
- `legacy/backend/kaizen_app/controllers.py:4728` e `:4862`.
- `legacy/frontend/src/App.tsx:200`.
- `legacy/frontend/src/features/admin/ConfigurarContador.tsx:43`.
- `legacy/frontend/src/features/admin/UserManagement.tsx:520`.
- `legacy/frontend/src/features/admin/GerarConvite.tsx:249`.

Novos componentes incluem `DashboardContador`, `ContadorPonto`, `ContadorFuncionarios`, `ContadorEntregasEPI`, `ContadorAlmoxarifado`, `usePontoDataContador` e `ContadorRoute`.

Limite: a tela de funcionários apresenta tabela básica; a existência de endpoints de admissão/documentos não comprova jornada documental completa (`legacy/frontend/src/features/contador/ContadorFuncionarios.tsx:51`).

## 2. Módulos configuráveis por restaurante

Três controles persistidos, ativos por padrão: ponto, almoxarifado/EPI e funcionários. Há configuração administrativa, retorno no perfil, bloqueio backend com `403 / MODULE_DISABLED`, proteção de rotas e condicionamento de menus/cards.

Referências:
- `legacy/backend/kaizen_app/models.py:183`.
- `legacy/backend/kaizen_app/services.py:4774`.
- `legacy/backend/kaizen_app/controllers.py:145`.
- `legacy/frontend/src/features/admin/Configuracoes.tsx:615`.
- `legacy/frontend/src/App.tsx:168`.
- `legacy/frontend/src/features/collaborator/CollaboratorDashboard.tsx:365`.

Atenção para migração: o decorator permite continuar se o JWT não possui identificador de restaurante. A exceção de SUPER_ADMIN deve ser explícita; ausência de tenant não pode conceder acesso genericamente.

## 3. Ponto e banco de horas

São módulos anteriores, ampliados nesta sincronização:

- Gestão de registros unificada em `BancoHoras`.
- `/admin/registros-ponto` redireciona para `/admin/banco-horas`.
- Componentes separados para registros, resumo, estatísticas, espelho, ajuste e exclusão.
- Espelho mensal inclui folgas e ausências sem marcação, respeitando vigência da escala e limitando o período até hoje. Dias sem escala e sem registros ficam fora.
- Mensagem específica para repetição de marcação quando múltiplas jornadas estão desabilitadas.
- Consultas administrativas passam a tentar processar auto-saída pendente.

Referências: `legacy/frontend/src/App.tsx:168`, `legacy/frontend/src/features/admin/BancoHoras.tsx:852`, `legacy/backend/kaizen_app/services.py:2016`, `:2120`, `:1522` e `:4020`.

Foram adicionados dez arquivos em `legacy/frontend/src/features/admin/banco-horas/`. `GerenciarRegistrosPonto.tsx` e seu teste foram removidos; o CSS foi reorganizado como `ponto-shared.module.css`.

Risco: processamento de auto-saída durante GET exige revisão de idempotência, concorrência e efeitos colaterais.

## 4. Classificação de faltas e folgas

Introduzidos classificação diária `FALTA`/`FOLGA`, modal administrativo, débito opcional no banco de horas, exceção de escala para folga, remoção dos efeitos anteriores na reclassificação e intenção de notificação do colaborador.

Referências: `legacy/backend/kaizen_app/models.py:2236`, `legacy/backend/kaizen_app/controllers.py:2788`, `legacy/frontend/src/features/admin/banco-horas/ClassificarAusenciaModal.tsx:25`.

**Bloqueador identificado por inspeção:** `classificar_ausencia` utiliza `restaurante.id` sem definir `restaurante` na função. Entradas que alcançam esse trecho provocam `NameError`. Referências: `legacy/backend/kaizen_app/services.py:2179` e `:2214`. Não corrigido nesta etapa.

**Solicitação de folga incompleta:** há modelo, estados e vínculos de notificação, mas não foram identificados serviço/rota para solicitar, aprovar ou rejeitar. Não considerar jornada entregue (`legacy/backend/kaizen_app/models.py:2185`).

## 5. Atestado e mudança de enum

`TipoLancamentoBancoHoras` substitui `PAGAMENTO_HORAS` por `ATESTADO`; a interface oferece a nova categoria. Isso não equivale a um módulo completo de gestão de atestados.

Referências: `legacy/backend/kaizen_app/models.py:1880`, `legacy/frontend/src/features/admin/BancoHoras.tsx:1229`.

**Risco de dados:** a migração recria o enum PostgreSQL e converte a coluna sem tratar registros históricos `PAGAMENTO_HORAS`. Esses dados podem impedir upgrade; registros `ATESTADO` apresentam risco equivalente no downgrade. Definir transformação explícita preservando o significado histórico, sem converter pagamentos em atestados.

Referência: `legacy/backend/migrations/versions/20260402120000_update_tipo_lancamento_banco_horas.py:18`.

## 6. Timeout de sessão persistido

O timeout local já existia. Agora há padrão de 30 minutos por restaurante, sobrescrita ou herança por usuário, validação de 5 a 480 minutos e valor resolvido no perfil/JWT de login e impersonação. O frontend sincroniza a configuração.

Referências: `legacy/backend/kaizen_app/models.py:95` e `:174`, `legacy/backend/kaizen_app/services.py:4208` e `:4725`, `legacy/frontend/src/context/AuthContext.tsx:214`.

Limites: claim não comprova aplicação do prazo na expiração do JWT. Restaurar sessão redefine `sessionExpiry` com base no horário atual. Definir separadamente duração absoluta, inatividade e renovação antes de migrar.

## 7. Ajustes secundários

| Alteração | Referência |
| --- | --- |
| Botões atualizar/instalar app no dashboard, reutilizando hooks existentes | `legacy/frontend/src/features/collaborator/CollaboratorDashboard.tsx:771` |
| Orientação de geolocalização específica para iPhone/iPad | `legacy/frontend/src/features/collaborator/RegistroPonto.tsx:110` |
| Tutorial desabilitado inicialmente sem estado válido; saneamento do estado salvo | `legacy/frontend/src/context/TutorialContext.tsx:63` |
| Alias `/admin/dashboard` para `/admin` | `legacy/frontend/src/App.tsx:139` |
| Frontend de `3.0.89` para `3.0.108`, Node `>=20`, script lint e ajustes de regras de testes | `legacy/frontend/package.json:3` e `:43` |

Também mudaram layout, dashboards, configurações do colaborador, lockfile e utilitário de testes. A alteração em `legacy/AGENTS.md` é documental, não funcional.

## 8. Migrações adicionadas

Arquivos em `legacy/backend/migrations/versions/`, ausentes no backup:

| Arquivo | Finalidade |
| --- | --- |
| `20260331130000_add_contador_role_and_permissions.py` | Papel, permissões e vínculos do contador |
| `20260331150000_add_module_toggles_to_restaurantes.py` | Controles de módulos |
| `20260401100000_add_folga_falta_feature.py` | Solicitações de folga, classificações e notificações |
| `20260402120000_update_tipo_lancamento_banco_horas.py` | Substituição do enum |
| `20260401123000_add_session_timeout.py` | Timeout por restaurante/usuário |

A migração de timeout depende de `20260402120000`, apesar do nome cronologicamente anterior. Seguir `down_revision`, não ordem alfabética. Não executar estas migrações Flask no projeto NestJS/Prisma; modelar equivalentes conforme a arquitetura nova.

## 9. Testes e lacunas

- Adicionados cinco testes de controles de módulos: defaults, leitura/atualização, bloqueio de ponto, isolamento entre restaurantes e perfil (`legacy/backend/tests/test_module_toggles.py:24`).
- Adicionados três testes de espelho: vigência no meio do mês, mês completo e folga semanal na terça (`legacy/backend/tests/test_ponto_services.py:1095`).
- Removido `frontend/src/features/admin/GerenciarRegistrosPonto.test.tsx`, com 543 linhas no backup. Não foi identificado substituto entre os arquivos frontend adicionados.
- Não foram identificados no delta testes específicos de portal contador, classificação/reclassificação, timeout ou conversão histórica do enum.
- Estado dos testes: **NÃO EXECUTADOS**. Nenhuma afirmação de aprovação funcional.

## 10. O que já existia antes

Não atribuir à atualização os seguintes módulos. Referências relativas ao backup `/tmp/legacy-backup-20261015-045540/`:

| Funcionalidade anterior | Evidência |
| --- | --- |
| Registro de ponto | `backend/kaizen_app/models.py:1857` |
| Espelho mensal | `backend/kaizen_app/services.py:1914` |
| Escalas temporais | `backend/kaizen_app/services.py:2234` |
| Contratos/apuração de banco de horas | `backend/kaizen_app/services.py:2787` |
| Auto-saída | `backend/kaizen_app/services.py:3467` |
| Funcionários/documentos | `backend/kaizen_app/models.py:2156` |
| Entregas EPI | `backend/kaizen_app/services.py:18839` |
| Timeout local | `frontend/src/features/auth/Login.tsx:103` |
| Instalação PWA e atualização | `frontend/src/hooks/usePWAInstallPrompt.ts:34`, `frontend/src/hooks/useAppRefresh.ts:3` |

## 11. Backlog recomendado para a etapa 3

Esta ordem é proposta, não implementação autorizada nesta etapa. Antes de cada módulo, confrontar o inventário com o que já existe em `apps/api` e `apps/web`; o delta do legado não é uma lista completa das lacunas da migração.

1. **Autorização e módulos:** modelar papel/permissões/vínculos do contador e controles de módulo em Prisma/NestJS. O enum atual em `apps/api/prisma/schema.prisma:10` ainda não contém `CONTADOR`. Aplicar tenant autenticado, módulo ativo, permissão e vínculo em todas as consultas; lista vazia de vínculos deve negar visibilidade.
2. **Portal contador:** reutilizar consultas e componentes existentes com escopo de leitura explícito. Testar acesso cruzado entre tenants, funcionário não vinculado e ausência de permissões.
3. **Ponto e espelho:** verificar dependências preexistentes de escalas/contratos; migrar regras de vigência e ausências. Recuperar cenários do teste removido antes de unificar telas.
4. **Faltas/folgas:** tratar como entrega separada; não portar o defeito identificado. Validação backend, transação, auditoria e reclassificação sem efeitos duplicados. Solicitação/aprovação de folga exige especificação própria.
5. **Categorias de banco de horas:** definir compatibilidade histórica e migração de dados antes de alterar enum. Validar upgrade e rollback com registros antigos.
6. **Sessão:** estabelecer expiração server-side e comportamento de renovação/restauração. Testar herança, sobrescrita, limites e sessão expirada.
7. **Interface:** incorporar ajustes PWA, geolocalização e tutorial após validar compatibilidade com o frontend novo e acessibilidade.

Critério transversal de aceite: testes por módulo, isolamento entre tenants, autorização por recurso, validação de entradas, tratamento de erros e preservação de dados. `legacy/` permanece somente referência.
