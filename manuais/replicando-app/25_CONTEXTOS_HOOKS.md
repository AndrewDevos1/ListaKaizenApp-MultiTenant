# 25 — Contextos React, Hooks e Padrões Frontend

> Hierarquia de providers, contextos globais, hooks customizados, guards de rota e estrutura de rotas completa do App.

---

## Hierarquia de Providers

**Arquivo:** `frontend/src/index.tsx`

```
ThemeProvider
  └─ AuthProvider
      └─ NotificationProvider
          └─ TutorialProvider
              └─ App (Router + Routes)
```

**Por que essa ordem:**
- Theme disponível durante fluxos de auth (modo escuro no login)
- Auth disponível para Notificações (user ID/role para localStorage)
- Notifications e Tutorial dependem de Auth para contexto do usuário

---

## 1. AuthContext

**Arquivo:** `frontend/src/context/AuthContext.tsx`

### Interface User

```typescript
interface User {
  id: string;
  role: string;                           // ADMIN | SUPER_ADMIN | COLLABORATOR | SUPPLIER
  nome: string;
  email: string;
  restaurante_id?: number | null;
  wizard_status?: Record<string, any>;    // Status do tutorial/onboarding
  impersonated_by?: number | null;        // ID do SUPER_ADMIN se em impersonação
  impersonated_by_nome?: string | null;
  impersonated_by_email?: string | null;
}
```

### Estado

| Variável | Tipo | Uso |
|----------|------|-----|
| `user` | User\|null | Usuário logado |
| `isAuthenticated` | boolean | Token válido presente |
| `loading` | boolean | Verificando auth inicial |
| `sessionWarning` | boolean | Sessão supersedida |
| `showSessionWarning` | boolean | Modal visível |
| `sessionCountdown` | number | Segundos para auto-logout (30s) |

### Funções Exportadas

**`login(token: string)`**
- Decodifica JWT → extrai claims → seta `user`
- Armazena token em `localStorage.accessToken`
- Limpa flags de session warning

**`logout()`**
- Remove `localStorage.accessToken` e `localStorage.sessionExpiry`
- Limpa todos os caches offline (`clearOfflineCaches()`)
- Reseta estado de sessão

### Funcionalidades Especiais

**Sessão Única:**
- Monitora evento customizado `kaizen-session-superseded`
- Exibe modal: "Sua conta foi acessada em outro dispositivo"
- Countdown de 30s antes de logout automático
- Health check: `GET /auth/session` a cada 20s (401 → dispara evento)

**Expiração de Sessão:**
- Verifica `localStorage.sessionExpiry` a cada 60s
- Auto-logout quando expirado

---

## 2. NotificationContext

**Arquivo:** `frontend/src/context/NotificationContext.tsx`

(Detalhado em `19_NOTIFICACOES.md`)

### Resumo rápido

```typescript
// Hook de uso
const { notifications, toasts, unreadCount, addNotification, markAllRead, markRead, clearAll, dismissToast } = useNotifications();
```

---

## 3. ThemeContext

**Arquivo:** `frontend/src/context/ThemeContext.tsx`

```typescript
// Hook de uso
const { isDarkMode, toggleDarkMode } = useTheme();
```

**Persistência:** `localStorage.getItem('darkMode')` (string 'true'/'false')

**Aplicação:** `document.documentElement.setAttribute('data-theme', 'dark' | 'light')`

**CSS:** Seletores `[data-theme="dark"]` nas folhas de estilo

---

## 4. TutorialContext

**Arquivo:** `frontend/src/context/TutorialContext.tsx`

```typescript
const { enabled, seenScreens, availableKeys, progress, enableTutorial, disableTutorial, markSeen } = useTutorial();
```

**Storage:** `kaizen:tutorial:{userId}:{role}`

**Auto-disable:** Quando todos os passos disponíveis para o role são vistos

**Roles de tutorial:** `'ADMIN' | 'SUPER_ADMIN' | 'COLLABORATOR' | 'SUPPLIER'`

---

## Hooks Customizados

### useLocalStorage\<T\>

**Arquivo:** `frontend/src/hooks/useLocalStorage.ts`

```typescript
function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void]
```

- Persiste state no localStorage como JSON
- Fallback silencioso para `initialValue` em caso de erro
- Suporta função updater como `useState`

### useSugestoesPendentes

**Arquivo:** `frontend/src/hooks/useSugestoesPendentes.ts`

```typescript
function useSugestoesPendentes(userRole: string | undefined): {
  count: number;
  loading: boolean;
}
```

- Somente executa para ADMIN/SUPER_ADMIN
- Polling: `GET /admin/sugestoes/pendentes/count` a cada 30s
- Usado em Layout.tsx para badge no menu "Sugestões"

### useListasRapidasPendentes

**Arquivo:** `frontend/src/hooks/useListasRapidasPendentes.ts`

```typescript
function useListasRapidasPendentes(userRole: string | undefined): {
  count: number;
  loading: boolean;
}
```

- Somente para ADMIN/SUPER_ADMIN
- Polling: `GET /admin/listas-rapidas/pendentes/count` a cada 30s
- Gera notificação quando count aumenta:
  ```typescript
  addNotification({
    title: "Novas listas rápidas pendentes",
    type: "warning",
    link: "/admin/listas-rapidas"
  });
  ```

---

## Guards de Rota

### ProtectedRoute.tsx

**Lógica:**
1. `loading === true` → spinner
2. `!isAuthenticated` → redirect `/login`
3. Renderiza `<Outlet />`

**Usado para:** qualquer rota autenticada (wraps o Layout)

### AdminRoute.tsx

**Lógica:**
1. `loading` → spinner
2. `!isAuthenticated` → `/login`
3. `role !== 'ADMIN' && role !== 'SUPER_ADMIN'` → `/login`
4. Renderiza `<Outlet />`

**Usado para:** `/admin/*`

### CollaboratorRoute.tsx

**Lógica:**
1. `loading` → spinner
2. `!isAuthenticated` → `/login`
3. `role === 'ADMIN' || 'SUPER_ADMIN'` → **permite** (admins podem testar fluxos de colaborador)
4. `role !== 'COLLABORATOR'` → `/login`
5. Renderiza `<Outlet />`

**Usado para:** `/collaborator/*`

### PublicRoute.tsx

**Lógica — redireciona autenticados para seu dashboard:**
1. Verifica expiração em localStorage
2. `loading` → spinner
3. Se autenticado → redireciona por role:
   - SUPER_ADMIN → `/admin/global`
   - ADMIN → `/admin`
   - COLLABORATOR → `/collaborator`
   - SUPPLIER → `/supplier`
4. Renderiza `<Outlet />` (páginas públicas)

**Usado para:** `/`, `/login`, `/register`, `/convite`, etc.

### SupplierRoute.tsx

**Lógica:**
1. `!isAuthenticated` → `/supplier/login`
2. `role !== 'SUPPLIER'` → `/login`
3. Renderiza `<Outlet />`

---

## Estrutura de Rotas Completa (App.tsx)

```tsx
<Router>
  <Routes>

    {/* ROTAS PÚBLICAS */}
    <Route element={<PublicRoute />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/convite" element={<RegisterConvite />} />
      <Route path="/register-restaurant" element={<RegisterRestaurant />} />
      <Route path="/supplier/login" element={<SupplierLogin />} />
      <Route path="/supplier/register" element={<SupplierRegister />} />
      <Route path="/supplier/register-convite" element={<SupplierRegisterConvite />} />
    </Route>

    {/* ROTAS PROTEGIDAS (com Layout sidebar) */}
    <Route element={<Layout />}>

      {/* Fornecedores Região (qualquer autenticado) */}
      <Route path="/fornecedores-regiao" element={<ProtectedRoute />}>
        <Route index element={<FornecedoresRegiao />} />
      </Route>

      {/* ADMIN */}
      <Route path="/admin" element={<AdminRoute />}>
        <Route index element={<AdminLanding />} />
        <Route path="gerenciar-usuarios" element={<GerenciarUsuarios />} />
        <Route path="restaurantes" element={<GerenciarRestaurantes />} />
        <Route path="solicitacoes-restaurante" element={<SolicitacoesRestaurante />} />
        <Route path="global" element={<GlobalDashboard />} />
        <Route path="submissoes" element={<GerenciarSubmissoes />} />
        <Route path="submissoes/:id" element={<DetalhesSubmissao />} />
        <Route path="listas-compras" element={<ListasCompras />} />
        <Route path="listas/:id/estoque" element={<GerenciarItensLista />} />
        <Route path="items" element={<ItemManagement />} />
        <Route path="areas" element={<AreaManagement />} />
        <Route path="fornecedores" element={<FornecedorManagement />} />
        <Route path="fornecedores/:id/detalhes" element={<FornecedorDetalhes />} />
        <Route path="gerar-cotacao" element={<GerarCotacao />} />
        <Route path="cotacoes" element={<CotacaoList />} />
        <Route path="cotacoes/:id" element={<CotacaoDetail />} />
        <Route path="sugestoes" element={<GerenciarSugestoes />} />
        <Route path="listas-rapidas" element={<GerenciarListasRapidas />} />
        <Route path="listas-rapidas/:id" element={<DetalhesListaRapida />} />
        <Route path="checklists" element={<GerenciarChecklists />} />
        <Route path="checklists/:id" element={<DetalhesChecklist />} />
        <Route path="merge" element={<MergeSubmissoes />} />
        <Route path="pop-templates" element={<POPTemplates />} />
        <Route path="pop-listas" element={<POPListas />} />
        <Route path="pop-auditoria" element={<POPAuditoria />} />
        <Route path="logs" element={<LogsAuditoria />} />
        <Route path="convites" element={<GerenciarConvites />} />
        <Route path="convites-fornecedor" element={<GerenciarConvitesFornecedor />} />
        <Route path="fornecedores-cadastrados" element={<GerenciarFornecedoresCadastrados />} />
        <Route path="fornecedores-cadastrados/:id" element={<DetalhesFornecedorCadastrado />} />
        <Route path="configuracoes" element={<ConfiguracoesAdmin />} />
      </Route>

      {/* COLLABORATOR */}
      <Route path="/collaborator" element={<CollaboratorRoute />}>
        <Route index element={<CollaboratorDashboard />} />
        <Route path="submissions" element={<MinhasSubmissoes />} />
        <Route path="submissions/:id" element={<DetalhesSubmissaoColaborador />} />
        <Route path="listas" element={<MinhasListasCompras />} />
        <Route path="listas/:listaId/estoque" element={<EstoqueListaCompras />} />
        <Route path="lista-rapida/criar" element={<CriarListaRapida />} />
        <Route path="sugestoes" element={<SugestoesColaborador />} />
        <Route path="pop-listas" element={<MinhasPOPListas />} />
        <Route path="pop-execucoes/:id" element={<ExecutarPOPChecklist />} />
        <Route path="configuracoes" element={<ConfiguracoesColaborador />} />
      </Route>

      {/* SUPPLIER */}
      <Route path="/supplier" element={<SupplierRoute />}>
        <Route index element={<SupplierDashboard />} />
        <Route path="dashboard" element={<SupplierDashboard />} />
        <Route path="perfil" element={<SupplierProfile />} />
        <Route path="itens" element={<SupplierItems />} />
        <Route path="itens/novo" element={<SupplierItemForm mode="create" />} />
        <Route path="itens/:id/editar" element={<SupplierItemForm mode="edit" />} />
        <Route path="itens/:id/historico" element={<SupplierItemPriceHistory />} />
      </Route>

    </Route>
  </Routes>
</Router>
```

---

## Layout.tsx — Hub Central

**Arquivo:** `frontend/src/components/Layout.tsx` (2335 linhas)

O Layout é o componente que envolve todas as rotas protegidas. Ele é responsável por:

### Integração com Contextos

| Contexto | O que usa |
|----------|-----------|
| AuthContext | `user`, `logout`, filtro do menu por role, banner de impersonação |
| NotificationContext | Sino com badge, painel dropdown, adiciona notificações via hooks |
| ThemeContext | Toggle de modo escuro no footer da sidebar |
| TutorialContext | Renderiza TourWizard, botão "Tour da aplicação" |

### Estados de Responsividade

```typescript
const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
const [isCollapsed, setIsCollapsed] = useLocalStorage('sidebarCollapsed', false);
const [isMobileCollapsed, setIsMobileCollapsed] = useState(true);
const isMenuCollapsed = isMobile ? isMobileCollapsed : isCollapsed;
```

### Banners Exibidos (em ordem de precedência)

1. **Impersonação:** "Modo camaleão ativo: você está como {nome} ({role})"
2. **Atualização disponível:** "Nova versão disponível. Atualize."
3. **Atualização aplicada:** "Atualização aplicada com sucesso."
4. **Offline:** "Você está offline. Conecte-se para submeter listas."
5. **Reconectado:** "Conexão restabelecida. Alterações pendentes serão sincronizadas."

### Comportamento da Sidebar

| Dispositivo | Padrão | Comportamento |
|-------------|--------|---------------|
| Desktop | Expandida | `isCollapsed` no localStorage |
| Desktop recolhida | Ícones apenas | Sem labels |
| Mobile | Oculta | Overlay escuro ao abrir |

### Tracking de Atividade

```typescript
// Ao clicar em item do menu:
POST /auth/navbar-activity { path: "/admin/submissoes" }
// Persiste ordem de acesso para sugestão de ícones
```

### Customização do Navbar (SUPER_ADMIN)

```typescript
// Condição para modo de edição
const canEditNavbar = isSuperAdmin && !isMobile && !isMenuCollapsed && layoutLoaded;
```

- Drag-and-drop apenas no desktop expandido
- Duplo-click no label para renomear item
- Salva em `POST /auth/navbar-layout`

---

## Serviço de API (api.ts)

**Arquivo:** `frontend/src/services/api.ts`

```typescript
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000/api',
});

// Interceptor de REQUEST: adiciona JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Interceptor de RESPONSE: detecta rede e sessão
api.interceptors.response.use(
  (response) => {
    dispatchNetworkStatus('online');
    return response;
  },
  (error) => {
    if (isNetworkError(error)) dispatchNetworkStatus('offline');
    if (error?.response?.status === 401) {
      window.dispatchEvent(new Event('kaizen-session-superseded'));
    }
    return Promise.reject(error);
  }
);
```

**Evento `kaizen-network-status`:**
- `detail: { status: 'online' | 'offline' }`
- Deduplicado: só dispara se status mudou

---

## Padrões de Código Frontend

### Formatação de Datas
```typescript
// Todas as datas exibidas em formato brasileiro:
formatarDataBrasilia(isoString)        // "24/02/2026 14:30"
formatarDataBrasiliaSemHora(isoString) // "24 de fevereiro de 2026"
formatarDataHoraBrasilia(isoString)    // "há 2 horas" (relativo)
```

### Tratamento de Erros
```typescript
// Padrão para chamdas de API:
try {
  const response = await api.get('/endpoint');
  setData(response.data);
} catch (error) {
  if (isOfflineError(error)) {
    setError("Sem conexão. Rascunho salvo localmente.");
  } else {
    setError(error.response?.data?.error || "Erro inesperado");
  }
}
```

### Feedback ao Usuário
- Alertas dismissíveis para erros e sucessos (Bootstrap `Alert`)
- Modais de sucesso com countdown e auto-redirect
- Toasts via `NotificationContext.addNotification()`

---

## Resumo de Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `frontend/src/index.tsx` | Montagem dos providers |
| `frontend/src/App.tsx` | Estrutura completa de rotas |
| `frontend/src/context/AuthContext.tsx` | Auth, sessão, impersonação |
| `frontend/src/context/NotificationContext.tsx` | Notificações e toasts |
| `frontend/src/context/ThemeContext.tsx` | Modo escuro |
| `frontend/src/context/TutorialContext.tsx` | Tour de onboarding |
| `frontend/src/hooks/useLocalStorage.ts` | Persistência em localStorage |
| `frontend/src/hooks/useSugestoesPendentes.ts` | Polling de sugestões |
| `frontend/src/hooks/useListasRapidasPendentes.ts` | Polling de listas rápidas |
| `frontend/src/components/ProtectedRoute.tsx` | Guard para autenticados |
| `frontend/src/components/AdminRoute.tsx` | Guard para admins |
| `frontend/src/components/CollaboratorRoute.tsx` | Guard para colaboradores |
| `frontend/src/components/PublicRoute.tsx` | Guard para páginas públicas |
| `frontend/src/components/Layout.tsx` | Sidebar, navbar, banners, impersonação |
| `frontend/src/services/api.ts` | Axios instance, interceptors, network status |
