# 11 — Funcionalidade Offline

> O app funciona sem internet: Service Worker com Workbox, rascunhos em IndexedDB + localStorage, BackgroundSync para sincronizar POSTs pendentes.

---

## Visão Geral

```
┌──────────────────────────────────────────────────────────┐
│                  ONLINE                                    │
│  API real → resposta → cache (NetworkFirst/CacheFirst)    │
└──────────────────────────────┬───────────────────────────┘
                               │ perde conexão
                               ▼
┌──────────────────────────────────────────────────────────┐
│                  OFFLINE                                   │
│  GET → serve do cache (SW)                                │
│  PUT/POST de dados → fila BackgroundSync                  │
│  Rascunhos locais → IndexedDB (offlineDrafts.ts)          │
└──────────────────────────────┬───────────────────────────┘
                               │ reconecta
                               ▼
┌──────────────────────────────────────────────────────────┐
│                  SYNC                                      │
│  BackgroundSync envia fila → API                          │
│  Layout exibe "Conectado novamente!"                      │
└──────────────────────────────────────────────────────────┘
```

---

## Service Worker (Workbox)

**Arquivo:** `frontend/src/service-worker.ts`

### Estratégias de Cache

#### 1. CacheFirst — dados estáticos do catálogo

```typescript
const apiStaticPatterns = [
  /^\/api\/v1\/items$/,
  /^\/api\/v1\/areas$/,
  /^\/api\/v1\/fornecedores$/,
];

registerRoute(
  ({ request, url }) =>
    request.method === 'GET' && apiStaticPatterns.some(p => p.test(url.pathname)),
  new CacheFirst({
    cacheName: 'kaizen-static-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
);
```

**Comportamento:** Serve do cache imediatamente. Atualiza o cache em background. TTL: 7 dias.

#### 2. NetworkFirst — dados dinâmicos do estoque

```typescript
const apiDynamicPatterns = [
  /^\/api\/v1\/areas\/\d+\/estoque$/,
  /^\/api\/v1\/listas\/\d+\/estoque$/,
  /^\/api\/admin\/checklists\/\d+$/,
  /^\/api\/collaborator\/listas\/\d+\/estoque$/,
  /^\/api\/collaborator\/minhas-listas$/,
  // + outros padrões dinâmicos
];

registerRoute(
  ({ request, url }) =>
    request.method === 'GET' && apiDynamicPatterns.some(p => p.test(url.pathname)),
  new NetworkFirst({
    cacheName: 'kaizen-dynamic-v1',
    networkTimeoutSeconds: 5,  // ← fallback para cache após 5s
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 }),
    ],
  })
);
```

**Comportamento:** Tenta rede primeiro. Se falhar ou demorar >5s, serve do cache. TTL: 1 hora.

#### 3. BackgroundSync — mutações POST/PUT

```typescript
const apiSyncPatterns = [
  /^\/api\/v1\/estoque\/draft$/,
  /^\/api\/v1\/pedidos\/submit$/,
  /^\/api\/v1\/listas\/\d+\/estoque\/submit$/,
  /^\/api\/collaborator\/estoque\/\d+$/,
  /^\/api\/admin\/checklists\/\d+\/itens\/\d+\/marcar$/,
  /^\/api\/admin\/checklists\/\d+\/finalizar$/,
  /^\/api\/admin\/checklists\/\d+\/reabrir$/,
];

const offlineQueue = new BackgroundSyncPlugin('kaizen-offline-queue', {
  maxRetentionTime: 24 * 60,  // retém por 24 horas
});

(['POST', 'PUT'] as const).forEach((method) => {
  registerRoute(
    ({ url }) => apiSyncPatterns.some(p => p.test(url.pathname)),
    new NetworkOnly({ plugins: [offlineQueue] }),
    method
  );
});
```

**Comportamento:** Tenta enviar imediatamente. Se falhar (offline), entra na fila `kaizen-offline-queue`. Quando o dispositivo reconectar, o SW tenta reenviar automaticamente (até 24h).

#### 4. App Shell (SPA)

```typescript
// Garante que navegações sem arquivo (rotas SPA) sempre retornam index.html
registerRoute(
  ({ request, url }) =>
    request.mode === 'navigate' &&
    !url.pathname.startsWith('/_') &&
    !url.pathname.match(/\/[^/?]+\.[^/]+$/),
  createHandlerBoundToURL(process.env.PUBLIC_URL + '/index.html')
);
```

### Atualização do SW

O SW responde à mensagem `SKIP_WAITING` para ativar nova versão imediatamente:

```typescript
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```

---

## Rascunhos Offline (IndexedDB + localStorage)

**Arquivo:** `frontend/src/services/offlineDrafts.ts`

### Armazenamento

```
Primário:  IndexedDB
  DB_NAME:    'kaizen-offline'
  STORE_NAME: 'drafts'
  keyPath:    'key'

Fallback:  localStorage
  Prefixo: 'kaizen-offline-draft:'
```

### Tipo

```typescript
type OfflineDraft<T> = {
  key: string;        // ex: "draft:lista:42"
  updatedAt: number;  // timestamp ms
  items: T[];
  originalItems?: T[];
  meta?: Record<string, unknown>;
};
```

### Construção da chave

```typescript
// Escopo: 'area' ou 'lista', id: número da lista/área
export const buildDraftKey = (scope: 'area' | 'lista', id: string | number) =>
  `draft:${scope}:${id}`;
// Exemplo: "draft:lista:42"
```

### API Pública

```typescript
// Salvar rascunho (IndexedDB com fallback localStorage)
await saveOfflineDraft<EstoqueItem>({ key, updatedAt: Date.now(), items });

// Carregar rascunho
const draft = await getOfflineDraft<EstoqueItem>(key);

// Remover rascunho (apaga de ambos IndexedDB e localStorage)
await removeOfflineDraft(key);

// Mesclar rascunho com dados frescos da API
const merged = mergeDraftItems(baseItems, draftItems);
// → preserva quantidade_atual do draft para cada item.id correspondente
```

### Fluxo na tela de estoque

```
1. Carregar lista do servidor
2. Verificar: existe draft salvo? (getOfflineDraft)
   → Se sim: mesclar com dados frescos (mergeDraftItems)
   → Se não: usar dados do servidor
3. Usuário edita quantidades
4. A cada alteração: saveOfflineDraft (debounced)
5. Usuário submete:
   → POST para API
   → Se sucesso: removeOfflineDraft
   → Se falha (offline): draft permanece, BackgroundSync enfileira POST
```

---

## Detecção de Status de Rede

### api.ts — interceptor de resposta

**Arquivo:** `frontend/src/services/api.ts:36`

```typescript
const NETWORK_STATUS_EVENT = 'kaizen-network-status';
type NetworkStatus = 'online' | 'offline';
let lastNetworkStatus: NetworkStatus | null = null;

// Deduplicação: só dispara se o status mudou
const dispatchNetworkStatus = (status: NetworkStatus) => {
  if (lastNetworkStatus === status) return;
  lastNetworkStatus = status;
  window.dispatchEvent(new CustomEvent(NETWORK_STATUS_EVENT, { detail: { status } }));
};

// Interceptor de resposta:
api.interceptors.response.use(
  (response) => {
    dispatchNetworkStatus('online');   // ← qualquer resposta bem-sucedida
    return response;
  },
  (error) => {
    if (isNetworkError(error)) {
      dispatchNetworkStatus('offline'); // ← erro de rede
    }
    return Promise.reject(error);
  }
);
```

### Critérios de isNetworkError

```typescript
const isNetworkError = (error: any) =>
  error?.code === 'ERR_NETWORK' ||
  error?.message === 'Network Error' ||
  error?.response?.status === 0 ||
  (typeof navigator !== 'undefined' && navigator.onLine === false);
```

### Layout.tsx — banner de status

**Arquivo:** `frontend/src/components/Layout.tsx:679`

```typescript
const [isOnline, setIsOnline] = React.useState(() =>
  typeof navigator !== 'undefined' ? navigator.onLine : true
);
const [showOnlineNotice, setShowOnlineNotice] = React.useState(false);

// Listeners para o evento customizado e para navigator.onLine
React.useEffect(() => {
  const handleNetworkStatus = (e: CustomEvent) => {
    const status = e.detail.status as 'online' | 'offline';
    setIsOnline(status === 'online');
    if (status === 'online') setShowOnlineNotice(true);
  };
  window.addEventListener('kaizen-network-status', handleNetworkStatus as EventListener);
  window.addEventListener('online',  () => setIsOnline(true));
  window.addEventListener('offline', () => setIsOnline(false));
  return () => { /* removeEventListeners */ };
}, []);
```

O banner "Você está offline" é exibido no topo da página quando `isOnline === false`.

Quando reconecta, exibe brevemente "Conectado novamente!" e some após alguns segundos.

---

## Limpeza ao Fazer Logout

**Arquivo:** `frontend/src/context/AuthContext.tsx:63`

```typescript
const clearOfflineCaches = useCallback(async () => {
  // Remove chave de mudanças pendentes do localStorage
  localStorage.removeItem('kaizen_pending_changes');

  // Deleta todos os caches do Service Worker que começam com 'kaizen-'
  if (!('caches' in window)) return;
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter(name => name.startsWith('kaizen-'))
      .map(name => caches.delete(name))
  );
}, []);

// Chamado automaticamente no logout:
const logout = useCallback(() => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('sessionExpiry');
  setUser(null);
  void clearOfflineCaches();  // ← limpa caches kaizen-static-v1, kaizen-dynamic-v1, kaizen-offline-queue
}, [clearOfflineCaches]);
```

---

## Atualização de Versão (SW Update Flow)

O Layout verifica se há nova versão disponível:

```typescript
// States no Layout.tsx:685
const [swUpdateAvailable, setSwUpdateAvailable] = React.useState(false);
const [versionUpdateAvailable, setVersionUpdateAvailable] = React.useState(false);
const updateAvailable = swUpdateAvailable || versionUpdateAvailable;
```

Quando `updateAvailable === true`, o Layout exibe um banner "Nova versão disponível" com botão "Atualizar". Ao clicar:
1. Envia `SKIP_WAITING` ao SW
2. Força recarga da página (`window.location.reload()`)

A versão do frontend é detectada via:
```typescript
const getFrontendVersion = () =>
  process.env.REACT_APP_VERSION ||
  process.env.REACT_APP_COMMIT_SHA ||
  process.env.REACT_APP_BUILD_SHA ||
  process.env.REACT_APP_BUILD_ID ||
  packageJson.version ||
  'dev';
```

---

## PWA — Instalável

O app é instalável como PWA. O `manifest.json` está em `frontend/public/manifest.json`.

O CRA (Create React App) registra o Service Worker automaticamente via `serviceWorkerRegistration.ts`.

---

## Resumo de Caches

| Nome do cache | Estratégia | TTL | Conteúdo |
|---------------|------------|-----|----------|
| `kaizen-static-v1` | CacheFirst | 7 dias | itens, áreas, fornecedores |
| `kaizen-dynamic-v1` | NetworkFirst | 1 hora | estoques, listas, checklists |
| `kaizen-offline-queue` | BackgroundSync | 24 horas | POSTs/PUTs pendentes |
| `workbox-precache-v2-*` | Precache | build | HTML, JS, CSS, assets |

Todos os caches `kaizen-*` são limpos no logout.

---

## Resumo de Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `frontend/src/service-worker.ts` | Workbox: estratégias CacheFirst, NetworkFirst, BackgroundSync |
| `frontend/src/services/offlineDrafts.ts` | IndexedDB + localStorage para rascunhos |
| `frontend/src/services/api.ts` | Detecta erro de rede, dispara evento `kaizen-network-status` |
| `frontend/src/context/AuthContext.tsx` | `clearOfflineCaches()` no logout |
| `frontend/src/components/Layout.tsx` | Banner de status de rede, isOnline state, SW update flow |
| `frontend/public/manifest.json` | Metadados do PWA |
