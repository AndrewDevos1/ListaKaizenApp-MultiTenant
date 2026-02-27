# Relatório Final — Migração Legacy → Multi-Tenant

**Data de conclusão:** 2026-02-27
**Última atualização:** 2026-02-27
**Branch:** `restaurando-design`
**Commits de checkpoint:**

| Fase | Commit | Descrição |
|------|--------|-----------|
| Fase 1 | `1e0917d` | Submissões, Pedidos, Gestão de Usuários |
| Fase 2 | `776dfe0` | Fornecedores, threshold e fardo em listas |
| Fase 3 | `3fee2c8` | Merge WhatsApp, Cotações, Checklists |
| Fase 4 | `1068990` | Listas Rápidas, Sugestões, POPs |
| Fase 5 | `9680bfd` | Notificações, Convites, Export CSV, Auditoria |
| Revisão | `52f0800` | Correções pós-revisão de paridade com legado |
| Pós-migração | `b51db5a` | Navbar paridade com legado + correções runtime |
| Pós-migração | `4699363` | Fix hydration mismatch no body |
| Pós-migração | `c565ea4` | Perfil/senha colaborador + Dashboard Global SUPER_ADMIN |
| Pós-migração | `90c57de` | Fix campo `usuario` em submissões + Editar Perfil/Mudar Senha admin |
| Pós-migração | `8467985` | Catálogo Global, Estatísticas de Estoque, endpoint /estatisticas |
| Pós-migração | `cc76a20` | Mudar Senha unificado dentro do Editar Perfil |
| Melhoria UX | `48379ae` | Sistema global de Toast estilo macOS |
| Infra | `993eb2c` | Seed de dados completo + manual PWA |
| PWA | `d8c8768` | Botão de instalação PWA + Service Worker + manifest |
| PWA | `f50f79f` | Ícones PWA 192×512 gerados do logo Kaizen |
| Fix | `f74c945` | Corrigir stale closure no hook usePWAInstall |
| PWA | `0ac7e08` | Web Push Notifications com VAPID, PushModule e SW handler |

---

## Stack do Projeto Multi-Tenant

| Camada | Tecnologia |
|--------|-----------|
| Backend | NestJS + TypeScript |
| ORM | Prisma (PostgreSQL) |
| Auth | JWT + Guards (RolesGuard + TenantGuard) |
| Frontend | Next.js 15 (App Router) |
| UI | React Bootstrap + react-icons |
| Banco | PostgreSQL (Railway) |
| Monorepo | Turborepo + npm workspaces |

---

## Módulos Migrados

### ✅ Fase 1 — Fluxo Core

| Módulo | Backend | Frontend |
|--------|---------|----------|
| Atualização de estoque (colaborador) | `PUT /v1/collaborator/listas/:id/estoque` | `/collaborator/listas/[id]` |
| Submissão de lista (colaborador) | `POST /v1/collaborator/listas/:id/submeter` | Botão "Submeter" na página acima |
| Gerenciar submissões (admin) | `GET/PUT /v1/admin/submissoes/*` | `/admin/submissoes` + `/admin/submissoes/[id]` |
| Histórico de submissões (colaborador) | `GET /v1/collaborator/submissoes/*` | `/collaborator/submissoes` + `/collaborator/submissoes/[id]` |
| Gerenciar usuários (admin) | `GET/PUT /v1/admin/usuarios/*` | `/admin/usuarios` |

### ✅ Fase 2 — Fornecedores e Catálogo

| Módulo | Backend | Frontend |
|--------|---------|----------|
| CRUD Fornecedores | `GET/POST/PUT/DELETE /v1/admin/fornecedores` | `/admin/fornecedores` |
| Detalhe Fornecedor (itens vinculados) | `GET /v1/admin/fornecedores/:id` | `/admin/fornecedores/[id]` |
| Vínculo Item ↔ Fornecedor | Filtro `?fornecedorId=` em itens | Coluna e filtro na tela de itens |
| Configuração de threshold/fardo | `PUT /v1/admin/listas/:id/itens/:itemRefId` | Edição inline na tela de lista |

### ✅ Fase 3 — Cotações, Merge e Checklists

| Módulo | Backend | Frontend |
|--------|---------|----------|
| Merge para WhatsApp | `POST /v1/admin/submissoes/merge-preview` e `/merge-whatsapp` | Modal 3 etapas na tela de submissões |
| CRUD Cotações | `GET/POST/PUT /v1/admin/cotacoes/*` | `/admin/cotacoes` + `/admin/cotacoes/[id]` |
| CRUD Checklists | `GET/POST/PUT /v1/admin/checklists/*` | `/admin/checklists` + `/admin/checklists/[id]` |
| Criar Checklist de submissão | `POST /v1/admin/checklists` | Botão "Criar Checklist" no detalhe da submissão |

### ✅ Fase 4 — Listas Rápidas, Sugestões e POPs

| Módulo | Backend | Frontend |
|--------|---------|----------|
| Listas Rápidas (colaborador) | `GET/POST/PUT /v1/collaborator/listas-rapidas/*` | `/collaborator/listas-rapidas` + `/[id]` |
| Listas Rápidas (admin) | `GET/PUT /v1/admin/listas-rapidas/*` | `/admin/listas-rapidas` + `/[id]` |
| Sugestões de Itens (colaborador) | `GET/POST /v1/collaborator/sugestoes/*` | `/collaborator/sugestoes` |
| Sugestões de Itens (admin) | `GET/PUT /v1/admin/sugestoes/*` | `/admin/sugestoes` |
| Templates POP (admin) | `GET/POST/PUT/DELETE /v1/admin/pop/templates/*` | `/admin/pop/templates` + `/[id]` |
| Execuções POP (admin) | `GET /v1/admin/pop/execucoes` | `/admin/pop/execucoes` |
| Executar POP (colaborador) | `GET/POST/PUT /v1/collaborator/pop/*` | `/collaborator/pop` + `/execucoes` + `/execucoes/[id]` |

### ✅ Fase 5 — Infraestrutura Avançada

| Módulo | Backend | Frontend |
|--------|---------|----------|
| Notificações | `GET/PUT /v1/notificacoes/*` | Sino `NotificationBell` na Sidebar |
| Convites (admin) | `POST/GET/PUT /v1/admin/convites/*` | `/admin/convites` |
| Registro via convite | `GET /v1/convites/validar` (público) | `/convite` (página pública) |
| Exportar CSV — Itens | `GET /v1/admin/itens/exportar-csv` | Botão "Exportar CSV" em `/admin/items` |
| Exportar CSV — Fornecedores | `GET /v1/admin/fornecedores/exportar-csv` | Botão "Exportar CSV" em `/admin/fornecedores` |
| Auditoria/Logs | `GET /v1/admin/logs` (SUPER_ADMIN) | `/admin/logs` |

---

## Bugs Encontrados e Corrigidos na Revisão

### Backend (3 bugs corrigidos)

#### Bug 1 — `updatePedidoStatus` sem validação de estado
**Arquivo:** `apps/api/src/modules/submissoes/submissoes.service.ts`
**Problema:** Permitia alterar status de pedido independente do estado atual.
**Correção:** Adicionado guard: apenas pedidos com `status === PENDENTE` podem ser alterados individualmente.

#### Bug 2 — `atualizarEstoque` sem verificação de pertencimento do itemRef
**Arquivo:** `apps/api/src/modules/listas/listas.service.ts`
**Problema:** Verificava apenas que a lista pertencia ao restaurante, mas não que os `itemRefId`s enviados pertenciam àquela lista.
**Correção:** Adicionado cross-check: todos os `itemRefId`s são validados contra a lista antes de atualizar.

#### Bug 3 — `submeter` (lista rápida) sem validação de lista vazia
**Arquivo:** `apps/api/src/modules/listas-rapidas/listas-rapidas.service.ts`
**Problema:** Permitia submeter listas sem itens para aprovação.
**Correção:** Verificação de `ListaRapidaItem.count > 0` antes de mudar status.

### Frontend (4 telas corrigidas)

#### Tela: `collaborator/listas/[id]` — Atualização de Estoque
- Coluna "Pedido" ausente → adicionada com badge colorido
- Input `type="number"` bloqueava vírgula → alterado para `type="text" inputMode="decimal"`
- Badges de resumo (Total / Em falta) ausentes → adicionados
- Rascunho localStorage não sincronizava corretamente → corrigido

#### Tela: `admin/submissoes` — Gerenciar Submissões
- Campo de busca ausente → adicionado com filtro em tempo real
- Select-all ignorava filtro → corrigido para selecionar apenas itens filtrados
- Tabs sem conteúdo limpo → removido resíduo HTML
- Tab-switch não resetava busca/seleção → corrigido

#### Tela: `collaborator/submissoes` — Histórico Submissões
- Filtro de status ausente → adicionado `Form.Select` com `useMemo`
- Empty state não distinguia busca vazia → mensagem condicional

#### Tela: `admin/sugestoes` — Sugestões de Itens
- Aprovação sem modal de edição → adicionado modal com campo `unidade` editável e `mensagem_admin`
- Rejeição sem motivo → adicionado modal com campo de motivo opcional

---

## Isolamento Multi-Tenant — Verificações

| Módulo | Status |
|--------|--------|
| Auth + Restaurante | ✅ OK |
| Listas (CRUD) | ✅ OK (corrigido: validação de itemRef) |
| Submissões + Pedidos | ✅ OK |
| Fornecedores | ✅ OK |
| Cotações | ✅ OK |
| Checklists | ✅ OK |
| Listas Rápidas | ✅ OK (corrigido: validação de lista vazia) |
| Sugestões | ✅ OK |
| POPs | ✅ OK |
| Notificações | ✅ OK |
| Convites | ✅ OK |
| Logs | ✅ OK (SUPER_ADMIN only) |

---

## Campos Sensíveis

| Campo | Exposto? |
|-------|---------|
| `senha` (hash) | ❌ Nunca retornado |
| `sessionToken` | ❌ Nunca retornado |
| `cnpj` do Restaurante | ✅ Apenas para próprio restaurante |

---

## Schema Prisma — Modelos Implementados

```
Restaurante, Usuario, Item, Area
Lista, ListaColaborador, ListaItemRef
Fornecedor
Submissao, Pedido
Cotacao, CotacaoItem
Checklist, ChecklistItem
ListaRapida, ListaRapidaItem
SugestaoItem
POPTemplate, POPPasso, POPExecucao, POPExecucaoItem
Notificacao
ConviteToken
AppLog
```

**Total: 21 modelos + 13 enums**

---

## Diferenças Intencionais em Relação ao Legado

| Aspecto | Legado | Multi-Tenant |
|---------|--------|-------------|
| Status submissão parcial | `PARCIALMENTE_APROVADO` | `PARCIAL` (mais conciso) |
| Checklist a partir de submissão | Apenas `APROVADO` | `APROVADO` ou `PARCIAL` (melhoria) |
| Fornecedor: campos | `contato`, `meio_envio` | `cnpj`, `telefone`, `email` (mais estruturado) |
| IDs | Integer autoincrement | Integer autoincrement (mesmo padrão) |
| Auth | Session token / Flask | JWT Bearer (stateless) |

---

## Páginas Implementadas (Pós-Migração)

Páginas adicionais criadas após a revisão de paridade com o legado:

| Página | Rota | Quem acessa |
|--------|------|-------------|
| Editar Perfil | `/admin/editar-perfil` | Admin |
| Mudar Senha | `/admin/mudar-senha` | Admin |
| Editar Perfil | `/collaborator/perfil` | Colaborador |
| Mudar Senha | `/collaborator/mudar-senha` | Colaborador |
| Dashboard Global | `/admin/global` | SUPER_ADMIN |
| Catálogo Global | `/admin/catalogo-global` | Admin |
| Estatísticas | `/admin/estatisticas` | Admin |

**Endpoint adicionado:** `PUT /v1/auth/profile` — atualizar nome/email/username do usuário logado.

**Endpoint adicionado:** `GET /v1/items/estatisticas` — retorna resumo de estoque, submissões por status e lista de itens com situação de estoque.

**Endpoint adicionado:** `GET /v1/restaurantes/stats/global` — retorna totais globais e lista de restaurantes (SUPER_ADMIN).

---

## Bugs Corrigidos (Pós-Migração)

| Bug | Arquivo(s) | Descrição |
|-----|-----------|-----------|
| `user.sub` undefined | pop, sugestoes, listas-rapidas controllers | JwtStrategy retorna `id`, não `sub` |
| Auth prefix `/v1/auth` | auth.controller.ts + AuthContext.tsx | Prefixo de versão estava ausente |
| Campo `usuario` vs `colaborador` | admin/submissoes + [id]/page.tsx | Interface TypeScript usava `colaborador.usuario` mas API retorna `usuario` direto |
| TipoPOP enum errado | pop/templates, collaborator/pop | `PREPARACAO/SEGURANCA` não existem — correto: `OPERACIONAL/PERSONALIZADO` |
| Hydration mismatch body | layout.tsx | VS Code adiciona `vsc-initialized` ao body; corrigido com `suppressHydrationWarning` |
| Route `PUT /v1/admin/listas` | admin/listas/[id]/page.tsx | Rota correta é `PUT /v1/listas/:id/itens/:itemRefId` |

---

## Melhorias de UX Implementadas

### Toast Global (estilo macOS)

**Commit:** `48379ae`

Sistema de notificações não-intrusivas implementado globalmente via `ToastProvider` + `ToastContainer`.

| Arquivo | Papel |
|---------|-------|
| `contexts/ToastContext.tsx` | Provider + hook `useToast` com atalhos `success/error/warning/info` |
| `components/ToastContainer.tsx` | Renderiza toasts via `createPortal` no `document.body` |
| `components/ToastContainer.module.css` | Estilo + animações (slide + fade, barra de progresso) |

**Características:**
- Posição: canto inferior esquerdo
- Animação: slide da esquerda + easing elástico na entrada, fade + encolhe na saída
- Barra de progresso animada indicando tempo restante
- Auto-dismiss: 4s padrão · 6s para erros · 0 = persistente
- Empilhamento vertical sem sobreposição
- `aria-live="polite"` para leitores de tela
- Tema dark nativo; override automático para `prefers-color-scheme: light`

**Como usar em qualquer página:**
```tsx
const { success, error, warning, info } = useToast();

success('Salvo!', 'Registro criado com sucesso');
error('Falha', 'Não foi possível conectar');
```

---

---

## PWA — Progressive Web App

### Instalação como App (`d8c8768`, `f50f79f`, `f74c945`)

| Arquivo | Papel |
|---------|-------|
| `apps/web/public/sw.js` | Service Worker: network-first, cache de assets estáticos, handlers push e notificationclick |
| `apps/web/src/app/manifest.ts` | Manifest Next.js 15: nome, tema, ícones, `display: standalone` |
| `apps/web/public/icons/icon-192.png` | Ícone PWA 192×192 (logo Kaizen em fundo branco) |
| `apps/web/public/icons/icon-512.png` | Ícone PWA 512×512 (logo Kaizen em fundo branco) |
| `apps/web/src/hooks/usePWAInstall.ts` | Hook: detecta `beforeinstallprompt`, iOS Safari, standalone mode, timeout 3s |
| `apps/web/src/components/InstallAppButton.tsx` | Botão visível apenas quando instalável; iOS mostra dialog manual |
| `apps/web/src/components/SwRegister.tsx` | Registra o SW após `page load` (não bloqueia carregamento) |

**Compatibilidade:**

| Plataforma | Comportamento |
|------------|---------------|
| Chrome/Edge (desktop/Android) | Prompt nativo de instalação |
| Safari (iOS/iPadOS) | Dialog passo-a-passo manual |
| Firefox | Botão oculto (sem suporte nativo) |
| App já instalado | Botão oculto automaticamente |

---

### Web Push Notifications (`0ac7e08`)

Notificações nativas do OS que aparecem mesmo com o app fechado.

**Backend:**

| Arquivo | Papel |
|---------|-------|
| `apps/api/src/modules/push/push.service.ts` | Inicializa VAPID, salva/remove assinaturas, envia push via `web-push` |
| `apps/api/src/modules/push/push.controller.ts` | `GET /v1/push/vapid-public-key`, `POST/DELETE /v1/push/subscribe` |
| `apps/api/src/modules/push/push.module.ts` | Módulo NestJS exportando `PushService` |
| Prisma: `PushSubscription` | Armazena endpoint, p256dh e auth por dispositivo/usuário |

`NotificacoesService.criar()` chama `PushService.sendToUser()` automaticamente após gravar cada notificação no banco (fire-and-forget). Assinaturas inválidas (HTTP 410/404) são removidas automaticamente.

**Frontend:**

| Arquivo | Papel |
|---------|-------|
| `apps/web/src/hooks/usePushNotifications.ts` | Gerencia permissão, subscribe, unsubscribe; estados: `idle | loading | subscribed | denied | unsupported` |
| `apps/web/src/components/PushNotificationButton.tsx` | Botão "Ativar notificações" nos dashboards; muda para "Notificações ativas" quando subscrito |
| `apps/web/public/sw.js` | Handlers `push` (exibe notificação nativa) e `notificationclick` (foca/abre aba) |

**Variáveis de ambiente necessárias:**
```env
# apps/api/.env
VAPID_PUBLIC_KEY=<chave_publica>
VAPID_PRIVATE_KEY=<chave_privada>
VAPID_SUBJECT=mailto:admin@kaizenlists.com

# apps/web/.env.local
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<mesma_chave_publica>
```

**Como testar:**
1. Abrir dashboard no Chrome (desktop ou Android)
2. Clicar em "Ativar notificações" — browser solicita permissão
3. Aceitar → assinatura salva no banco
4. Qualquer ação que gere uma `Notificacao` no backend dispara push automaticamente

---

## Lacunas Menores (Baixa Prioridade)

Os seguintes itens do legado **não foram portados** por serem edge cases ou de baixa prioridade:

- Busca/filtro de itens na tela de atualização de estoque (colaborador)
- Versão mobile com cards para tabelas de submissões
- Ordenação clicável por colunas em tabelas
- Importação de fornecedores via CSV (apenas exportação foi implementada)
- Importação de itens via CSV
- Feature `compartilhado_regiao` para fornecedores (feature multi-tenant regional)
- Edição inline de quantidades solicitadas na submissão (expressões matemáticas "5+3")
- Modal de sucesso com redirect automático pós-submissão de estoque
- Sugestão de item integrada na tela de atualização de estoque
- Dashboard Global com drag-and-drop e múltiplos gráficos (versão simplificada implementada)
- GerenciarRestaurantes com painel completo de impersonação e logs por restaurante

---

## Como Executar o Projeto

```bash
# Na raiz do monorepo
npm run dev   # inicia api (porta 3001) e web (porta 3000)

# Apenas backend
cd apps/api && npm run start:dev

# Apenas frontend
cd apps/web && npm run dev

# Aplicar mudanças de schema
cd apps/api && npx prisma db push
```

---

## Dados de Teste (Seed)

Execute `npx ts-node apps/api/prisma/seed.ts` para popular o banco.

| Credencial | Email | Senha | Role |
|-----------|-------|-------|------|
| Super Admin | `superadmin@kaizen.com` | `admin123` | SUPER_ADMIN |
| Super Admin (legacy) | `admin@kaizen.com` | `admin123` | SUPER_ADMIN |
| Admin Demo | `admin@demo.com` | `admin123` | ADMIN |
| Colaborador 1 | `colab1@demo.com` | `admin123` | COLLABORATOR |
| Colaborador 2 | `colab2@demo.com` | `admin123` | COLLABORATOR |

Dados incluídos: 5 fornecedores, 10 itens, 2 áreas, 2 listas, 2 submissões (PENDENTE + APROVADA), 1 lista rápida, 1 sugestão, 1 template POP, 3 convites.

---

## Próximos Passos Sugeridos

1. **Testes automatizados**: Criar testes unitários para os services críticos (`submissoes`, `listas`, `listas-rapidas`)
2. **E2E com Playwright**: Testar fluxo completo de submissão de ponta a ponta
3. **PWA/Offline** ✅ Implementado: Service Worker + manifest + botão de instalação + Web Push
4. **Import CSV**: Implementar importação de itens e fornecedores via CSV
5. **Notificações push** ✅ Implementado: `NotificacoesService` dispara push automático em cada notificação criada
6. **GerenciarRestaurantes**: Tela completa de gestão de restaurantes para SUPER_ADMIN (CRUD + impersonação)
