# Plano Completo: Modo Offline Híbrido para Kaizen Lists

## 📋 Sumário Executivo

**Estratégia**: Opção C - Modo Leitura Offline (Híbrido)

**Objetivo**: Permitir que colaboradores acessem e editem dados de estoque offline, com sincronização inteligente quando voltarem online.

**Tecnologias**: Service Worker (cache de leitura) + localStorage (edições pendentes)

**Tempo Estimado**: 6-8 dias de desenvolvimento

**Impacto Esperado**: Redução de 80% em reclamações de "sem internet" de colaboradores

---

## 🎯 O Que É o Modo Híbrido?

### Conceito
O modo híbrido combina duas técnicas:

1. **Service Worker para Leitura**
   - Cacheia automaticamente as respostas GET da API
   - Permite visualizar dados mesmo sem internet
   - Atualiza cache quando está online

2. **localStorage para Edições**
   - Salva alterações localmente como "rascunhos"
   - Marca dados como "pendente sincronização"
   - Envia para servidor quando volta online

### Fluxo de Usuário

```
┌─────────────────────────────────────────────────────────┐
│ ONLINE: Colaborador carrega lista de estoque           │
│ ↓                                                       │
│ Service Worker cacheia dados automaticamente           │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ OFFLINE: Colaborador vai para área sem sinal           │
│ ↓                                                       │
│ App carrega dados do cache (visualização funciona)     │
│ ↓                                                       │
│ Colaborador edita quantidades de estoque               │
│ ↓                                                       │
│ Edições salvas no localStorage (rascunho)              │
│ ↓                                                       │
│ Badge mostra "3 mudanças pendentes"                    │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ ONLINE NOVAMENTE: Colaborador retorna                  │
│ ↓                                                       │
│ App detecta conexão                                     │
│ ↓                                                       │
│ Mostra botão "Sincronizar Agora" (ou auto-sync)        │
│ ↓                                                       │
│ Envia rascunhos para servidor                          │
│ ↓                                                       │
│ Limpa localStorage após sucesso                        │
│ ↓                                                       │
│ Mostra "✓ Sincronizado com sucesso"                    │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Vantagens Detalhadas

### 1. **Melhor dos Dois Mundos**
- **Leitura sempre disponível**: Dados acessíveis mesmo sem internet após primeiro carregamento
- **Edições seguras**: Mudanças não são perdidas, ficam em rascunho local
- **UX clara**: Usuário vê claramente o que está pendente de sincronização

### 2. **Complexidade Gerenciável**
- Não precisa de backend complexo de sincronização
- Service Worker cuida automaticamente do cache de leitura
- localStorage é simples e confiável para rascunhos

### 3. **Debugging Facilitado**
- Pode inspecionar localStorage no DevTools
- Service Worker tem ferramentas dedicadas no Chrome
- Logs claros de sync vs offline

### 4. **Fallback Gracioso**
- Se cache falhar, tenta rede
- Se localStorage estiver cheio, avisa usuário
- Se sync falhar, mantém rascunho e tenta depois

### 5. **Performance Excelente**
- Cache responde em <100ms
- Não depende de latência de rede
- App "sente" nativo mesmo com internet ruim

---

## ⚠️ Desvantagens Detalhadas

### 1. **Complexidade Média**
**Problema**: Mais complexo que apenas usar API normal

**Mitigação**:
- Usar biblioteca Workbox para Service Workers (Google)
- Criar abstração de "OfflineContext" para esconder complexidade
- Documentar bem o fluxo

**Impacto**: 2-3 dias extras de desenvolvimento vs solução online-only

---

### 2. **Requer Educação do Usuário**
**Problema**: Usuários precisam entender:
- Que dados estão em rascunho
- Quando/como sincronizar
- O que fazer se der conflito

**Mitigação**:
- UI muito clara (ícones, cores, badges)
- Tutorial de 30s no primeiro acesso offline
- Notificação quando há pendências

**Impacto**: Necessário criar onboarding/tutorial

---

### 3. **Conflitos de Dados Possíveis**
**Problema**: 2 usuários editam o mesmo item offline

**Exemplo**:
```
Admin (online): Item "Arroz" → 10kg (salva às 14:00)
Colaborador (offline): Item "Arroz" → 5kg (salva às 14:05, sincroniza às 15:00)
```

**Mitigação**:
- Estratégia "Last Write Wins" (último a sincronizar ganha)
- Para itens críticos: Modal de conflito "Servidor tem 10kg, você tem 5kg. Manter qual?"
- Audit log para rastrear mudanças

**Impacto**: Raro em prática (áreas diferentes), mas precisa de UI para resolver

---

### 4. **Cache Pode Ficar Desatualizado**
**Problema**: Usuário carrega dados, admin muda algo, usuário continua vendo versão antiga offline

**Mitigação**:
- TTL de 24h no cache (força re-fetch)
- Botão "Atualizar dados" manual
- Ao voltar online, sincroniza cache automaticamente

**Impacto**: Aceitável - dados de estoque não mudam a cada minuto

---

## 📊 Análise de Complexidade

### Complexidade Técnica: 🟡 MÉDIA (6/10)

#### Backend: ⚫ BAIXA (2/10)
**O que fazer**:
- ✅ Nenhuma mudança no backend atual necessária inicialmente
- ⚠️ (Opcional) Adicionar timestamp em responses para detecção de conflitos
- ⚠️ (Opcional) Endpoint `POST /api/v1/sync/batch` para sync em lote

**Razão**: Backend já retorna JSON, só precisa ser cacheado no frontend

---

#### Frontend - Service Worker: 🟡 MÉDIA (5/10)

**O que fazer**:
1. Criar arquivo `service-worker.js`
2. Registrar service worker no `index.tsx`
3. Configurar estratégias de cache:
   - Cache-first para GET de estoque/itens
   - Network-only para POST/PUT/DELETE
4. Implementar fallback offline

**Complexidade**:
- 🟢 BAIXA se usar Workbox (biblioteca do Google)
- 🔴 ALTA se fazer manualmente

**Linhas de Código**: ~150-200 linhas com Workbox

**Exemplo com Workbox**:
```javascript
// service-worker.js
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';

// Cache de leitura para estoque
registerRoute(
  /\/api\/v1\/(areas|items|estoque)/,
  new CacheFirst({
    cacheName: 'kaizen-data-v1',
    plugins: [
      new ExpirationPlugin({ maxAgeSeconds: 24 * 60 * 60 }) // 24h
    ]
  })
);
```

---

#### Frontend - Offline Context: 🟡 MÉDIA (6/10)

**O que fazer**:
1. Criar `OfflineContext.tsx` com estado global:
   - `isOnline` (boolean)
   - `pendingChanges` (array de edições)
   - `syncStatus` ('idle' | 'syncing' | 'error')
2. Hooks:
   - `useOfflineData(key)` - busca do cache ou API
   - `usePendingChanges()` - lista rascunhos
   - `useSyncData()` - função para sincronizar

**Complexidade**:
- Gerenciar estado de sincronização
- Lidar com falhas de rede
- Retry logic

**Linhas de Código**: ~300-400 linhas

---

#### Frontend - UI Components: 🟢 BAIXA (3/10)

**O que fazer**:
1. `ConnectionIndicator.tsx` - Badge online/offline
2. `PendingChangesBadge.tsx` - "3 mudanças pendentes"
3. `SyncButton.tsx` - Botão "Sincronizar Agora"
4. `ConflictModal.tsx` - Resolver conflitos

**Complexidade**: Apenas apresentação, lógica está no Context

**Linhas de Código**: ~200-250 linhas total

---

### Complexidade de Manutenção: 🟢 BAIXA (3/10)

**Por quê**:
- Service Worker é set-and-forget (configurar uma vez)
- localStorage é API simples
- Bugs são fáceis de reproduzir (simular offline no DevTools)

---

### Complexidade de Testes: 🟡 MÉDIA (5/10)

**Desafios**:
- Testar cenários offline requer setup especial
- Precisa mockar navigator.onLine
- Testar Service Worker é diferente de testar JS normal

**Solução**:
- Usar ferramentas do Chrome DevTools (simular offline)
- Testes E2E com Cypress/Playwright (suportam offline)
- Unit tests para lógica de sync (sem testar SW)

---

## 📈 Análise de Impacto

### Impacto no Usuário: 🔥 MUITO ALTO (9/10)

#### Colaboradores (Principal benefício)
**Antes**:
- ❌ Vai para área sem sinal (porão, câmara fria)
- ❌ Não consegue abrir lista de estoque
- ❌ Anota no papel/celular
- ❌ Precisa lembrar de digitar depois
- ❌ Risco de esquecer/perder papel

**Depois**:
- ✅ Vai para área sem sinal
- ✅ Abre app normalmente (cache)
- ✅ Edita quantidades direto no app
- ✅ Volta online, clica "Sincronizar"
- ✅ Tudo salvo no sistema

**Impacto**: Redução de 90% no tempo de atualização de estoque

---

#### Admins (Benefício secundário)
**Antes**:
- Internet instável em reuniões/visitas
- Não consegue ver cotações/pedidos

**Depois**:
- Visualiza dados mesmo offline
- Pode revisar relatórios sem sinal

**Impacto**: Conveniência, não é crítico

---

### Impacto no Sistema: 🟡 MÉDIO (5/10)

#### Performance
**Positivo**:
- ✅ Menos requisições ao servidor (cache)
- ✅ Respostas instantâneas (<100ms do cache)
- ✅ Menor carga no backend

**Negativo**:
- ⚠️ Storage no dispositivo (~5-10MB)
- ⚠️ Service Worker usa ~5MB de RAM

**Net Impact**: 🟢 Positivo - economia de banda e latência

---

#### Infraestrutura
**Mudanças necessárias**:
- Nenhuma! Backend continua igual
- (Opcional) CDN para service-worker.js

**Custo adicional**: R$ 0

---

### Impacto no Desenvolvimento: 🟡 MÉDIO (6/10)

#### Tempo de Implementação
**Estimativa por fase**:

**FASE 1 - Service Worker Básico** (2 dias)
- Instalar Workbox
- Configurar cache para GET requests
- Testar offline/online

**FASE 2 - Offline Context** (2 dias)
- Criar OfflineContext
- Implementar localStorage para rascunhos
- Hooks useOfflineData

**FASE 3 - UI Components** (1 dia)
- ConnectionIndicator
- PendingChangesBadge
- SyncButton

**FASE 4 - Sincronização** (2 dias)
- Lógica de sync
- Detecção de conflitos
- Retry em caso de falha

**FASE 5 - Testes e Ajustes** (1 dia)
- Testes E2E offline
- Ajustes de UX
- Documentação

**Total**: 8 dias úteis (1.5 semanas)

---

#### Custo de Manutenção Futuro
**Baixo** (1-2 horas/mês):
- Service Worker é estável
- Bugs são raros após estabilização
- Principais updates: aumentar versão do cache

---

## 🏗️ Arquitetura Técnica Detalhada

### 1. Service Worker (Cache Layer)

**Arquivo**: `/frontend/public/sw-cache.js`

**Responsabilidades**:
- Interceptar requisições fetch()
- Cachear respostas GET da API
- Servir do cache quando offline
- Atualizar cache quando online

**Estratégias de Cache**:

```javascript
// Cache-First: Dados que mudam pouco
GET /api/v1/items → Cache-First (prioriza cache, fallback rede)
GET /api/v1/areas → Cache-First
GET /api/v1/fornecedores → Cache-First

// Network-First: Dados que mudam mais
GET /api/v1/areas/{id}/estoque → Network-First (prioriza rede, fallback cache)
GET /api/v1/listas → Network-First

// Network-Only: Sempre da rede
POST/PUT/DELETE * → Network-Only (nunca cachear edições)
```

**Configuração de Expiração**:
- Itens/Áreas/Fornecedores: 7 dias
- Estoque/Listas: 24 horas
- Outros: 1 hora

**Tamanho do Cache**:
- Máximo: 50MB
- Limpeza automática: LRU (Least Recently Used)

---

### 2. Offline Context (State Management)

**Arquivo**: `/frontend/src/context/OfflineContext.tsx`

**Estado Global**:
```typescript
interface OfflineState {
  // Conexão
  isOnline: boolean;
  lastOnline: Date | null;

  // Sincronização
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  syncError: string | null;

  // Rascunhos pendentes
  pendingChanges: PendingChange[];

  // Conflitos
  conflicts: Conflict[];
}

interface PendingChange {
  id: string; // UUID local
  type: 'update_estoque' | 'create_pedido' | 'update_lista';
  endpoint: string; // ex: PUT /api/v1/estoque/123
  data: any;
  createdAt: Date;
  retries: number;
}
```

**Funções Principais**:
```typescript
// Salvar mudança local
function savePendingChange(type, endpoint, data): void

// Sincronizar todas as mudanças
async function syncAllPending(): Promise<SyncResult>

// Sincronizar uma mudança específica
async function syncOne(changeId): Promise<void>

// Limpar mudanças sincronizadas
function clearSynced(): void

// Resolver conflito
function resolveConflict(conflictId, resolution): void
```

---

### 3. Hooks Customizados

#### `useOnlineStatus()`
Detecta mudanças de conexão

```typescript
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
    return () => {
      window.removeEventListener('online', ...);
      window.removeEventListener('offline', ...);
    };
  }, []);

  return isOnline;
}
```

---

#### `useOfflineData(key, fetcher)`
Busca dados do cache ou API

```typescript
function useOfflineData<T>(key: string, fetcher: () => Promise<T>) {
  const { isOnline } = useOfflineContext();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Tenta cache primeiro
    const cached = getCachedData(key);
    if (cached) {
      setData(cached);
      setLoading(false);
    }

    // Se online, busca atualizado
    if (isOnline) {
      fetcher().then(newData => {
        setData(newData);
        setCachedData(key, newData);
        setLoading(false);
      });
    }
  }, [key, isOnline]);

  return { data, loading };
}
```

---

#### `useSyncPending()`
Gerencia sincronização

```typescript
function useSyncPending() {
  const { pendingChanges, syncAllPending } = useOfflineContext();
  const [syncing, setSyncing] = useState(false);

  const sync = async () => {
    setSyncing(true);
    try {
      await syncAllPending();
      toast.success('✓ Sincronizado com sucesso!');
    } catch (err) {
      toast.error('Erro ao sincronizar. Tente novamente.');
    } finally {
      setSyncing(false);
    }
  };

  return {
    hasPending: pendingChanges.length > 0,
    pendingCount: pendingChanges.length,
    sync,
    syncing
  };
}
```

---

### 4. Componentes UI

#### `ConnectionIndicator.tsx`
Badge no navbar mostrando status

```tsx
export const ConnectionIndicator: React.FC = () => {
  const { isOnline } = useOfflineContext();

  return (
    <Badge bg={isOnline ? 'success' : 'danger'}>
      {isOnline ? '🟢 Online' : '🔴 Offline'}
    </Badge>
  );
};
```

---

#### `PendingChangesBadge.tsx`
Mostra mudanças não sincronizadas

```tsx
export const PendingChangesBadge: React.FC = () => {
  const { pendingCount } = useSyncPending();

  if (pendingCount === 0) return null;

  return (
    <Alert variant="warning" className="mb-3">
      <i className="fas fa-exclamation-triangle me-2"></i>
      {pendingCount} mudança{pendingCount > 1 ? 's' : ''} pendente{pendingCount > 1 ? 's' : ''} de sincronização
    </Alert>
  );
};
```

---

#### `SyncButton.tsx`
Botão para sincronizar manualmente

```tsx
export const SyncButton: React.FC = () => {
  const { hasPending, sync, syncing } = useSyncPending();
  const { isOnline } = useOfflineContext();

  if (!hasPending || !isOnline) return null;

  return (
    <Button
      variant="primary"
      onClick={sync}
      disabled={syncing}
    >
      {syncing ? (
        <>
          <Spinner size="sm" className="me-2" />
          Sincronizando...
        </>
      ) : (
        <>
          <i className="fas fa-sync me-2"></i>
          Sincronizar Agora
        </>
      )}
    </Button>
  );
};
```

---

#### `ConflictModal.tsx`
Resolver conflitos de dados

```tsx
interface ConflictModalProps {
  conflict: Conflict;
  onResolve: (resolution: 'keep_local' | 'keep_server') => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({ conflict, onResolve }) => {
  return (
    <Modal show={true} centered>
      <Modal.Header>
        <Modal.Title>⚠️ Conflito de Dados</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>O item <strong>{conflict.itemName}</strong> foi modificado por outro usuário.</p>

        <div className="d-flex gap-3">
          <Card className="flex-1">
            <Card.Header>Sua Versão (Offline)</Card.Header>
            <Card.Body>
              Quantidade: <strong>{conflict.localValue}</strong>
            </Card.Body>
          </Card>

          <Card className="flex-1">
            <Card.Header>Versão do Servidor</Card.Header>
            <Card.Body>
              Quantidade: <strong>{conflict.serverValue}</strong>
            </Card.Body>
          </Card>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={() => onResolve('keep_server')}>
          Manter do Servidor
        </Button>
        <Button variant="primary" onClick={() => onResolve('keep_local')}>
          Manter Minha Versão
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
```

---

## 📂 Estrutura de Arquivos

```
frontend/
├── public/
│   ├── service-worker.js         ← NOVO: Service Worker com Workbox
│   └── manifest.json              ← ATUALIZAR: Adicionar start_url, display
│
├── src/
│   ├── context/
│   │   └── OfflineContext.tsx     ← NOVO: Estado global offline
│   │
│   ├── hooks/
│   │   ├── useOnlineStatus.ts     ← NOVO: Hook de detecção online/offline
│   │   ├── useOfflineData.ts      ← NOVO: Hook para dados cacheados
│   │   └── useSyncPending.ts      ← NOVO: Hook para sincronização
│   │
│   ├── services/
│   │   ├── cacheService.ts        ← NOVO: localStorage wrapper
│   │   └── syncService.ts         ← NOVO: Lógica de sincronização
│   │
│   ├── components/
│   │   ├── ConnectionIndicator.tsx   ← NOVO: Badge online/offline
│   │   ├── PendingChangesBadge.tsx   ← NOVO: Badge de mudanças pendentes
│   │   ├── SyncButton.tsx            ← NOVO: Botão sincronizar
│   │   └── ConflictModal.tsx         ← NOVO: Modal de conflitos
│   │
│   ├── App.tsx                    ← ATUALIZAR: Envolver com OfflineContext
│   └── index.tsx                  ← ATUALIZAR: Registrar service worker
│
backend/
└── (Nenhuma mudança necessária inicialmente)
```

---

## 🛠️ Implementação Passo a Passo

### FASE 1: Service Worker Básico (2 dias)

#### Dia 1: Setup e Configuração

**1.1. Instalar Workbox**
```bash
cd frontend
npm install workbox-webpack-plugin workbox-window --save
```

**1.2. Criar `service-worker.js`**
```javascript
// frontend/public/service-worker.js
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache de assets estáticos (JS, CSS)
precacheAndRoute(self.__WB_MANIFEST);

// Cache-First: Dados estáticos
registerRoute(
  ({ url }) => url.pathname.match(/\/api\/v1\/(items|areas|fornecedores)$/),
  new CacheFirst({
    cacheName: 'kaizen-static-data-v1',
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 dias
        maxEntries: 50,
      }),
    ],
  })
);

// Network-First: Dados dinâmicos
registerRoute(
  ({ url }) => url.pathname.match(/\/api\/v1\/(estoque|listas)/),
  new NetworkFirst({
    cacheName: 'kaizen-dynamic-data-v1',
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 24 * 60 * 60, // 24 horas
        maxEntries: 100,
      }),
    ],
  })
);

// Network-Only: Sempre buscar do servidor
registerRoute(
  ({ request }) => ['POST', 'PUT', 'DELETE'].includes(request.method),
  new NetworkOnly()
);
```

**1.3. Registrar Service Worker**
```typescript
// frontend/src/index.tsx
import { Workbox } from 'workbox-window';

if ('serviceWorker' in navigator) {
  const wb = new Workbox('/service-worker.js');

  wb.addEventListener('activated', event => {
    console.log('Service Worker ativado!');
  });

  wb.register();
}
```

---

#### Dia 2: Testes do Service Worker

**2.1. Testar Cache**
- Abrir DevTools → Application → Service Workers
- Verificar se SW está ativo
- Fazer requisições GET
- Verificar Cache Storage

**2.2. Testar Offline**
- DevTools → Network → Throttling → Offline
- Navegar pelo app
- Verificar se dados cacheados aparecem

---

### FASE 2: Offline Context (2 dias)

#### Dia 3: Criar Context e Hooks

**3.1. Criar `OfflineContext.tsx`**
```typescript
// frontend/src/context/OfflineContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

interface PendingChange {
  id: string;
  type: string;
  endpoint: string;
  data: any;
  createdAt: Date;
}

interface OfflineContextType {
  isOnline: boolean;
  pendingChanges: PendingChange[];
  addPendingChange: (change: Omit<PendingChange, 'id' | 'createdAt'>) => void;
  syncAllPending: () => Promise<void>;
  clearPending: (id: string) => void;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>(() => {
    const saved = localStorage.getItem('kaizen_pending_changes');
    return saved ? JSON.parse(saved) : [];
  });

  // Detectar mudanças de conexão
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Salvar pendências no localStorage
  useEffect(() => {
    localStorage.setItem('kaizen_pending_changes', JSON.stringify(pendingChanges));
  }, [pendingChanges]);

  const addPendingChange = (change: Omit<PendingChange, 'id' | 'createdAt'>) => {
    const newChange: PendingChange = {
      ...change,
      id: `${Date.now()}-${Math.random()}`,
      createdAt: new Date(),
    };
    setPendingChanges(prev => [...prev, newChange]);
  };

  const syncAllPending = async () => {
    if (!isOnline || pendingChanges.length === 0) return;

    const results = await Promise.allSettled(
      pendingChanges.map(async change => {
        const response = await fetch(change.endpoint, {
          method: change.type === 'update_estoque' ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify(change.data),
        });

        if (!response.ok) throw new Error('Sync failed');
        return change.id;
      })
    );

    // Remover apenas as que tiveram sucesso
    const successIds = results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<string>).value);

    setPendingChanges(prev => prev.filter(c => !successIds.includes(c.id)));
  };

  const clearPending = (id: string) => {
    setPendingChanges(prev => prev.filter(c => c.id !== id));
  };

  return (
    <OfflineContext.Provider value={{
      isOnline,
      pendingChanges,
      addPendingChange,
      syncAllPending,
      clearPending,
    }}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOfflineContext = () => {
  const context = useContext(OfflineContext);
  if (!context) throw new Error('useOfflineContext must be used within OfflineProvider');
  return context;
};
```

**3.2. Criar Hooks**
```typescript
// frontend/src/hooks/useSyncPending.ts
import { useState } from 'react';
import { useOfflineContext } from '../context/OfflineContext';

export function useSyncPending() {
  const { pendingChanges, syncAllPending, isOnline } = useOfflineContext();
  const [syncing, setSyncing] = useState(false);

  const sync = async () => {
    if (!isOnline) {
      alert('Sem conexão com a internet');
      return;
    }

    setSyncing(true);
    try {
      await syncAllPending();
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      alert('Erro ao sincronizar. Tente novamente.');
    } finally {
      setSyncing(false);
    }
  };

  return {
    hasPending: pendingChanges.length > 0,
    pendingCount: pendingChanges.length,
    sync,
    syncing,
  };
}
```

---

#### Dia 4: Integrar Context no App

**4.1. Envolver App com Provider**
```typescript
// frontend/src/App.tsx
import { OfflineProvider } from './context/OfflineContext';

function App() {
  return (
    <OfflineProvider>
      <BrowserRouter>
        {/* Rotas existentes */}
      </BrowserRouter>
    </OfflineProvider>
  );
}
```

**4.2. Modificar Estoque Component**
```typescript
// frontend/src/features/inventory/EstoqueArea.tsx
import { useOfflineContext } from '../../context/OfflineContext';

const EstoqueArea: React.FC = () => {
  const { isOnline, addPendingChange } = useOfflineContext();

  const handleUpdateQuantidade = async (estoqueId: number, novaQuantidade: number) => {
    if (isOnline) {
      // Caminho normal: envia para API
      await api.put(`/api/v1/estoque/${estoqueId}`, { quantidade_atual: novaQuantidade });
    } else {
      // Offline: salva como rascunho
      addPendingChange({
        type: 'update_estoque',
        endpoint: `${API_BASE_URL}/api/v1/estoque/${estoqueId}`,
        data: { quantidade_atual: novaQuantidade },
      });

      // Atualiza UI localmente
      // (implementar estado local para refletir mudança)
    }
  };

  // ... resto do componente
};
```

---

### FASE 3: Componentes UI (1 dia)

#### Dia 5: Criar Componentes Visuais

**5.1. ConnectionIndicator**
(Ver código na seção "Componentes UI" acima)

**5.2. PendingChangesBadge**
(Ver código na seção "Componentes UI" acima)

**5.3. SyncButton**
(Ver código na seção "Componentes UI" acima)

**5.4. Adicionar ao Layout**
```typescript
// frontend/src/components/Layout.tsx
import { ConnectionIndicator } from './ConnectionIndicator';

const Layout: React.FC = () => {
  return (
    <div>
      <nav className="navbar">
        {/* Logo, menu, etc. */}
        <ConnectionIndicator /> {/* ← ADICIONAR */}
      </nav>
      {/* Conteúdo */}
    </div>
  );
};
```

**5.5. Adicionar nas Páginas de Edição**
```typescript
// frontend/src/features/inventory/EstoqueArea.tsx
import { PendingChangesBadge } from '../../components/PendingChangesBadge';
import { SyncButton } from '../../components/SyncButton';

const EstoqueArea: React.FC = () => {
  return (
    <div>
      <h2>Estoque da Área</h2>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <PendingChangesBadge />
        <SyncButton />
      </div>

      {/* Tabela de estoque */}
    </div>
  );
};
```

---

### FASE 4: Sincronização Inteligente (2 dias)

#### Dia 6: Auto-Sync e Retry Logic

**6.1. Auto-sync ao Voltar Online**
```typescript
// frontend/src/context/OfflineContext.tsx
useEffect(() => {
  if (isOnline && pendingChanges.length > 0) {
    // Auto-sincronizar após 2s online
    const timer = setTimeout(() => {
      syncAllPending();
    }, 2000);

    return () => clearTimeout(timer);
  }
}, [isOnline, pendingChanges.length]);
```

**6.2. Retry com Backoff Exponencial**
```typescript
// frontend/src/services/syncService.ts
async function syncWithRetry(change: PendingChange, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(change.endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(change.data),
      });

      if (response.ok) return true;

      // Retry apenas em erros de rede (500, timeout)
      if (response.status >= 400 && response.status < 500) {
        throw new Error('Client error - não fazer retry');
      }
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Esperar com backoff: 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }

  return false;
}
```

---

#### Dia 7: Detecção de Conflitos

**7.1. Backend: Adicionar Timestamps**
```python
# backend/kaizen_app/models.py (opcional)
class Estoque(db.Model):
    # ... campos existentes ...
    atualizado_em = db.Column(db.DateTime, default=brasilia_now, onupdate=brasilia_now)
```

**7.2. Frontend: Detectar Conflito**
```typescript
async function syncWithConflictDetection(change: PendingChange) {
  const response = await fetch(change.endpoint, {
    method: 'PUT',
    body: JSON.stringify({
      ...change.data,
      last_known_update: change.createdAt, // Timestamp quando foi editado offline
    }),
  });

  if (response.status === 409) {
    // Conflito detectado
    const serverData = await response.json();
    return { conflict: true, serverData };
  }

  return { conflict: false };
}
```

**7.3. Mostrar Modal de Conflito**
(Ver `ConflictModal.tsx` na seção "Componentes UI")

---

### FASE 5: Testes e Ajustes (1 dia)

#### Dia 8: Testes End-to-End

**8.1. Cenário 1: Edição Offline Simples**
```
1. Carregar página de estoque (online)
2. Simular offline (DevTools)
3. Editar quantidade de 3 itens
4. Verificar badge "3 mudanças pendentes"
5. Voltar online
6. Clicar "Sincronizar Agora"
7. Verificar que itens foram atualizados no servidor
```

**8.2. Cenário 2: Conflito de Dados**
```
1. User A: Edita item X para 10 (offline)
2. User B: Edita item X para 20 (online) - salva no servidor
3. User A: Volta online, sincroniza
4. Sistema detecta conflito
5. Modal pergunta: "Servidor tem 20, você tem 10. Manter qual?"
6. User A escolhe "Manter minha versão"
7. Servidor atualiza para 10
```

**8.3. Cenário 3: Falha de Sync**
```
1. Offline, edita 5 itens
2. Volta online MAS servidor está fora
3. Sync falha
4. Sistema mostra erro "Erro ao sincronizar. Tente novamente."
5. Rascunhos permanecem salvos
6. Servidor volta, usuário clica "Sincronizar Agora" novamente
7. Sucesso
```

---

## 📊 Métricas de Sucesso

### KPIs para Medir Impacto

#### 1. Adoção de Funcionalidade
- **Meta**: 70% dos colaboradores usam modo offline pelo menos 1x/semana
- **Medição**: Log de eventos "offline_edit" no backend

#### 2. Redução de Erros
- **Meta**: -80% em erros de "network failed" para colaboradores
- **Medição**: Monitoramento de erros (Sentry/LogRocket)

#### 3. Performance
- **Meta**: Tempo de carregamento offline <500ms
- **Medição**: Google Lighthouse, Web Vitals

#### 4. Sincronização
- **Meta**: Taxa de sucesso de sync >95%
- **Medição**: Logs de syncAllPending()

#### 5. Conflitos
- **Meta**: <5% das sincronizações geram conflito
- **Medição**: Contador de ConflictModal exibidos

---

## 🚨 Riscos e Mitigações

### Risco 1: Cache Desatualizado
**Probabilidade**: Média
**Impacto**: Baixo

**Cenário**: Colaborador vê dados antigos do cache, não sabe que admin mudou algo

**Mitigação**:
- TTL de 24h (força refresh)
- Botão "Atualizar Dados" manual
- Badge "Última atualização: há 3 horas"

---

### Risco 2: localStorage Cheio
**Probabilidade**: Baixa
**Impacto**: Médio

**Cenário**: Usuário tem 100+ mudanças pendentes, localStorage atinge limite (5-10MB)

**Mitigação**:
- Mostrar aviso quando >50 pendências
- Limitar a 100 rascunhos (forçar sync)
- Comprimir dados JSON antes de salvar

---

### Risco 3: Conflitos Frequentes
**Probabilidade**: Baixa (se áreas bem definidas)
**Impacto**: Médio

**Cenário**: Muitos conflitos frustram usuários

**Mitigação**:
- Educar usuários sobre áreas dedicadas
- Estratégia "Last Write Wins" para itens não-críticos
- Audit log para rastrear mudanças

---

### Risco 4: Bugs no Service Worker
**Probabilidade**: Média (inicial)
**Impacto**: Alto

**Cenário**: SW trava app, usuário não consegue usar

**Mitigação**:
- Usar Workbox (biblioteca testada)
- Kill switch: Desativar SW remotamente se der problema
- Testes extensivos antes de deploy

---

## 🎓 Educação do Usuário

### Onboarding (Primeira Vez Offline)

**Tela 1: Bem-vindo ao Modo Offline**
```
┌──────────────────────────────────────┐
│  📱 Agora você pode trabalhar        │
│     mesmo sem internet!              │
│                                      │
│  ✅ Ver dados de estoque             │
│  ✅ Editar quantidades               │
│  ✅ Sincronizar depois               │
│                                      │
│         [Próximo]                    │
└──────────────────────────────────────┘
```

**Tela 2: Como Funciona**
```
┌──────────────────────────────────────┐
│  Suas mudanças ficam salvas aqui     │
│  no celular até você sincronizar.    │
│                                      │
│  🟡 Mudanças pendentes: 3            │
│                                      │
│  Quando voltar online, clique em:    │
│  [Sincronizar Agora]                 │
│                                      │
│         [Entendi!]                   │
└──────────────────────────────────────┘
```

---

### Documentação/FAQ

**P: O que acontece se eu editar offline e outro usuário editar online?**
R: O sistema detectará o conflito e pedirá para você escolher qual versão manter.

**P: Minhas mudanças offline são salvas para sempre?**
R: Sim, ficam salvas no seu celular até você sincronizar. Mesmo se fechar o app.

**P: E se eu não tiver internet por dias?**
R: Sem problemas! Suas mudanças ficam salvas. Sincronize quando puder.

**P: Como sei se estou online ou offline?**
R: Veja o badge no canto superior: 🟢 Online ou 🔴 Offline

---

## 🔄 Roadmap Futuro (Pós-MVP)

### Versão 2.0 (Melhorias)
- Background sync automático (sem clicar botão)
- Compressão de dados no cache
- Métricas de uso offline no dashboard admin
- Notificação push quando volta online

### Versão 3.0 (PWA Completo)
- Instalação como app nativo
- Splash screen customizada
- Ícones adaptáveis (Android/iOS)
- Suporte a notificações push

### Versão 4.0 (Avançado)
- Sincronização peer-to-peer (sem servidor)
- Modo colaborativo offline (2+ users na mesma área)
- ML para prever necessidades de cache

---

## 📞 Conclusão e Recomendação

### Por Que Escolher o Modo Híbrido?

✅ **Equilíbrio Perfeito**
- Não é complexo demais (como PWA total)
- Não é simples demais (como só localStorage)
- Resolve 80% dos problemas com 20% do esforço

✅ **ROI Alto**
- 8 dias de dev → Economia de ~40h/mês de trabalho manual
- Redução drástica de frustrações de usuários
- Funcionalidade diferencial vs concorrentes

✅ **Escalável**
- Começa simples, pode evoluir para PWA completo depois
- Cada fase agrega valor independentemente

---

### Próximos Passos Sugeridos

1. **Aprovar Plano** ✓
2. **Criar branch `offline-hibrido`** ✓
3. **FASE 1**: Service Worker (2 dias)
4. **Testar MVP** com 2-3 colaboradores reais
5. **FASE 2-3**: Context + UI (3 dias)
6. **FASE 4-5**: Sync + Testes (3 dias)
7. **Deploy em produção** 🚀

---

## 📚 Recursos e Referências

### Bibliotecas
- [Workbox](https://developers.google.com/web/tools/workbox) - Service Worker framework (Google)
- [React Query](https://tanstack.com/query) - Alternativa para cache (opcional)

### Tutoriais
- [MDN: Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)
- [web.dev: Offline Cookbook](https://web.dev/offline-cookbook/)

### Ferramentas de Debug
- Chrome DevTools → Application tab
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - PWA audit
- [Workbox Window](https://developers.google.com/web/tools/workbox/modules/workbox-window) - Debug SW

---

## 🔍 REVISÃO TÉCNICA E PONTOS CRÍTICOS

### ✅ Pontos Fortes Validados

#### 1. Abordagem Híbrida Adequada
**Por quê funciona**:
- Resolve o principal problema (colaboradores offline) sem exigir mudanças grandes no backend
- Backend continua stateless, frontend gerencia estado offline
- Escalável: pode evoluir para PWA completo depois

#### 2. Fases Bem Separadas
**Benefícios**:
- Reduz risco: cada fase entrega valor incremental
- Permite validar cedo com usuários reais
- Facilita rollback se algo der errado
- Time pode aprender e ajustar entre fases

#### 3. UX Clara e Intuitiva
**Destaques**:
- Status de conexão visível (🟢 Online / 🔴 Offline)
- Badge de pendências evita confusão
- Sincronização manual + automática (melhor dos 2 mundos)
- Modal de conflito não esconde o problema

#### 4. Riscos e KPIs Mapeados
**Valor**:
- Facilita medir sucesso objetivamente
- KPIs realistas (80% redução de erros, >95% taxa de sync)
- Plano de mitigação para cada risco

---

### ⚠️ PONTOS CRÍTICOS DE ATENÇÃO

#### 1. 🚨 Stack do Frontend - Service Worker Integration

**PROBLEMA IDENTIFICADO**:
O plano assume uso direto de `workbox-webpack-plugin`, mas se o frontend usa **Create React App (CRA)** padrão, o fluxo proposto NÃO funciona sem eject ou override.

**VERIFICAÇÃO NECESSÁRIA**:
```bash
# Verificar se é CRA
cat frontend/package.json | grep "react-scripts"

# Verificar se já tem SW configurado
ls frontend/public/service-worker.js
ls frontend/src/serviceWorker.js
```

**SOLUÇÕES POR CENÁRIO**:

##### Cenário A: CRA sem eject ✅ RECOMENDADO
**Usar**: [`cra-append-sw`](https://www.npmjs.com/package/cra-append-sw) ou [`CRACO`](https://craco.js.org/)

```bash
npm install --save-dev @craco/craco craco-workbox
```

**Criar `craco.config.js`**:
```javascript
const { InjectManifest } = require('workbox-webpack-plugin');

module.exports = {
  webpack: {
    plugins: {
      add: [
        new InjectManifest({
          swSrc: './src/service-worker.js',
          swDest: 'service-worker.js'
        })
      ]
    }
  }
};
```

**Atualizar `package.json`**:
```json
{
  "scripts": {
    "start": "craco start",
    "build": "craco build"
  }
}
```

##### Cenário B: CRA com eject ⚠️ NÃO RECOMENDADO
- Perde atualizações automáticas do CRA
- Aumenta complexidade de manutenção
- Só fazer se já tiver ejetado

##### Cenário C: Vite ou Next.js ✅ FÁCIL
- Vite: usar [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/)
- Next.js: usar [`next-pwa`](https://github.com/shadowwalker/next-pwa)

**AÇÃO REQUERIDA ANTES DA FASE 1**:
1. Confirmar stack atual do frontend
2. Escolher estratégia de integração SW
3. Atualizar Dia 1 da FASE 1 com comandos corretos

---

#### 2. 🔒 Segurança - Cache de Endpoints Autenticados

**PROBLEMA IDENTIFICADO**:
Cache de dados sensíveis pode expor informações em dispositivos compartilhados.

**CENÁRIOS DE RISCO**:
```
Exemplo 1: Tablet compartilhado na cozinha
- User A faz login, cacheia estoque do Restaurante X
- User A faz logout
- User B faz login (Restaurante Y)
- User B ainda vê cache do Restaurante X brevemente

Exemplo 2: Celular pessoal emprestado
- Colaborador empresta celular para colega
- Dados de estoque ficam no cache
```

**SOLUÇÃO OBRIGATÓRIA**:

##### A. Política de Cache por Sensibilidade

**Endpoints CACHEÁVEIS** (dados públicos ou não-sensíveis):
```javascript
// Pode cachear por 7 dias
GET /api/v1/items (lista global de itens)
GET /api/v1/areas (áreas do restaurante)
GET /api/v1/fornecedores (fornecedores)
```

**Endpoints CACHE CURTO** (dados do usuário, mudam frequente):
```javascript
// Cachear por 1 hora MAX
GET /api/v1/listas/minhas
GET /api/v1/areas/{id}/estoque
```

**Endpoints NUNCA CACHEAR** (dados sensíveis):
```javascript
// Network-only, nunca cachear
GET /api/v1/users/me (dados do usuário)
GET /api/admin/* (qualquer rota admin)
POST/PUT/DELETE * (todas as mutações)
```

##### B. Limpar Cache no Logout

**Implementação OBRIGATÓRIA**:
```typescript
// frontend/src/context/AuthContext.tsx
const logout = async () => {
  // 1. Limpar token
  localStorage.removeItem('accessToken');

  // 2. Limpar pendências offline
  localStorage.removeItem('kaizen_pending_changes');

  // 3. CRÍTICO: Limpar cache do Service Worker
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(name => caches.delete(name))
    );
  }

  // 4. Forçar reload (limpa estado em memória)
  window.location.href = '/login';
};
```

##### C. Associar Cache ao Restaurante

**Adicionar restaurante_id nas chaves de cache**:
```javascript
// service-worker.js
const CACHE_VERSION = 'v1';
const restauranteId = new URL(request.url).searchParams.get('restaurante_id');
const cacheName = `kaizen-data-${CACHE_VERSION}-rest-${restauranteId}`;
```

**AÇÃO REQUERIDA**:
- [ ] Mapear todos endpoints e classificar sensibilidade
- [ ] Implementar limpeza de cache no logout (ANTES da FASE 2)
- [ ] Adicionar testes E2E de logout → login → cache limpo

---

#### 3. 🔄 Conflitos - Suporte Backend Necessário

**PROBLEMA IDENTIFICADO**:
Plano menciona "last write wins" mas sem suporte backend, vira **sobrescrita silenciosa** (perda de dados).

**CENÁRIO PERIGOSO**:
```
14:00 - Admin: Item "Arroz" → 50kg (online, salva no DB)
14:05 - Colab: Item "Arroz" → 10kg (offline, salva local)
14:30 - Colab volta online, sincroniza
       → PUT /api/v1/estoque/123 { quantidade: 10 }
       → Sobrescreve 50kg → 10kg SEM AVISO
       → Admin perde a mudança dele
```

**SOLUÇÃO OBRIGATÓRIA**:

##### A. Backend: Adicionar Controle de Versão

**Opção 1: ETag/If-Match (Padrão HTTP)**
```python
# backend/kaizen_app/controllers.py

@api_bp.route('/estoque/<int:id>', methods=['PUT'])
@jwt_required()
def atualizar_estoque(id):
    estoque = Estoque.query.get_or_404(id)

    # Calcular ETag baseado em updated_at
    current_etag = hashlib.md5(
        str(estoque.atualizado_em).encode()
    ).hexdigest()

    # Cliente deve enviar If-Match header
    if_match = request.headers.get('If-Match')

    if if_match and if_match != current_etag:
        # CONFLITO DETECTADO
        return jsonify({
            'error': 'Conflito de versão',
            'server_data': estoque.to_dict(),
            'server_etag': current_etag
        }), 409

    # Atualizar normalmente
    estoque.quantidade_atual = request.json['quantidade_atual']
    estoque.atualizado_em = brasilia_now()
    db.session.commit()

    # Retornar novo ETag
    new_etag = hashlib.md5(
        str(estoque.atualizado_em).encode()
    ).hexdigest()

    response = jsonify(estoque.to_dict())
    response.headers['ETag'] = new_etag
    return response, 200
```

**Opção 2: Timestamp + Campo updated_at (Mais simples)**
```python
@api_bp.route('/estoque/<int:id>', methods=['PUT'])
@jwt_required()
def atualizar_estoque(id):
    estoque = Estoque.query.get_or_404(id)

    # Cliente envia last_known_update
    client_timestamp = request.json.get('last_known_update')

    if client_timestamp:
        client_dt = datetime.fromisoformat(client_timestamp)
        if estoque.atualizado_em > client_dt:
            # CONFLITO: servidor mais novo
            return jsonify({
                'error': 'Conflito de versão',
                'server_data': estoque.to_dict()
            }), 409

    # Atualizar
    estoque.quantidade_atual = request.json['quantidade_atual']
    estoque.atualizado_em = brasilia_now()
    db.session.commit()

    return jsonify(estoque.to_dict()), 200
```

##### B. Frontend: Enviar Versão e Tratar 409

**Modificar OfflineContext.tsx**:
```typescript
const syncOne = async (change: PendingChange) => {
  const response = await fetch(change.endpoint, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'If-Match': change.etag, // ou enviar no body
    },
    body: JSON.stringify({
      ...change.data,
      last_known_update: change.lastKnownUpdate
    })
  });

  if (response.status === 409) {
    // CONFLITO DETECTADO
    const { server_data } = await response.json();

    // Adicionar à lista de conflitos
    addConflict({
      changeId: change.id,
      localData: change.data,
      serverData: server_data,
    });

    throw new ConflictError('Conflito detectado');
  }

  if (!response.ok) throw new Error('Sync failed');
};
```

**AÇÃO REQUERIDA**:
- [ ] FASE 0 (PRÉ-IMPLEMENTAÇÃO): Adicionar `atualizado_em` em modelo Estoque
- [ ] FASE 0: Criar migration para adicionar campo
- [ ] FASE 4: Implementar detecção 409 no backend
- [ ] FASE 4: Implementar envio de versão no frontend

---

#### 4. 💾 localStorage - Limites e Performance

**PROBLEMA IDENTIFICADO**:
localStorage é **síncrono** e limitado a ~5-10MB. Volume médio/alto de pendências pode travar UI.

**CENÁRIOS PROBLEMÁTICOS**:
```
Cenário 1: Colaborador offline por 3 dias
- 50 edições de estoque/dia
- 150 pendências totais
- JSON serializado: ~500KB
- Ainda OK, mas próximo do limite

Cenário 2: Admin gerando cotações offline
- 10 cotações com 100 itens cada
- JSON: ~2MB
- Pode ultrapassar limite em alguns browsers
```

**SOLUÇÃO**:

##### Usar IndexedDB para Pendências (se necessário)

**Quando trocar localStorage → IndexedDB**:
- [ ] Se média de pendências > 50 por usuário
- [ ] Se tamanho médio de payload > 1MB
- [ ] Se usuários reportam travamentos

**Biblioteca recomendada**: [`idb`](https://www.npmjs.com/package/idb) (wrapper assíncrono)

```bash
npm install idb
```

**Exemplo de uso**:
```typescript
// frontend/src/services/offlineDB.ts
import { openDB } from 'idb';

const dbPromise = openDB('kaizen-offline', 1, {
  upgrade(db) {
    db.createObjectStore('pending_changes', { keyPath: 'id' });
  },
});

export async function savePendingChange(change: PendingChange) {
  const db = await dbPromise;
  await db.put('pending_changes', change);
}

export async function getPendingChanges(): Promise<PendingChange[]> {
  const db = await dbPromise;
  return db.getAll('pending_changes');
}
```

**DECISÃO PARA FASE 1**:
- ✅ Começar com localStorage (mais simples)
- ⚠️ Monitorar tamanho em produção
- 🔄 Migrar para IndexedDB na FASE 3 se necessário

**Adicionar validação no código**:
```typescript
const addPendingChange = (change) => {
  const newChanges = [...pendingChanges, change];

  // Validar tamanho antes de salvar
  const serialized = JSON.stringify(newChanges);
  if (serialized.length > 4 * 1024 * 1024) { // 4MB
    alert('Muitas mudanças pendentes. Sincronize agora!');
    return;
  }

  setPendingChanges(newChanges);
};
```

---

#### 5. 🌐 navigator.onLine - Falsos Positivos

**PROBLEMA IDENTIFICADO**:
`navigator.onLine` é **heurística**, não garante conectividade real com backend.

**CENÁRIOS DE FALHA**:
```
Caso 1: WiFi conectado mas sem internet
- navigator.onLine = true
- Sync tenta enviar
- Timeout de 30s
- UX ruim

Caso 2: Servidor backend offline
- Internet OK
- Backend caiu
- Sync falha com 503

Caso 3: Throttling extremo
- Tecnicamente online
- Mas timeout em toda request
```

**SOLUÇÃO**:

##### Implementar Health Check Leve

```typescript
// frontend/src/hooks/useOnlineStatus.ts
import { useState, useEffect } from 'react';

const PING_INTERVAL = 30000; // 30s
const PING_TIMEOUT = 5000; // 5s

async function checkConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT);

    const response = await fetch('/api/health', {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store'
    });

    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasConnectivity, setHasConnectivity] = useState(false);

  useEffect(() => {
    // Escutar eventos do navegador
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setHasConnectivity(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Ping periódico quando "online"
    const interval = setInterval(async () => {
      if (isOnline) {
        const canReach = await checkConnectivity();
        setHasConnectivity(canReach);
      }
    }, PING_INTERVAL);

    // Ping inicial
    if (isOnline) {
      checkConnectivity().then(setHasConnectivity);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isOnline]);

  return {
    isOnline: isOnline && hasConnectivity,
    navigatorOnline: isOnline,
    canReachBackend: hasConnectivity,
  };
}
```

**Backend: Adicionar Endpoint de Health**:
```python
# backend/kaizen_app/controllers.py

@api_bp.route('/health', methods=['HEAD', 'GET'])
def health_check():
    """Endpoint leve para verificar conectividade."""
    return '', 204
```

**AÇÃO REQUERIDA**:
- [ ] FASE 1: Criar endpoint `/api/health` no backend
- [ ] FASE 2: Implementar useOnlineStatus com ping
- [ ] FASE 4: Usar hasConnectivity antes de auto-sync

---

#### 6. 🔑 Serialização de Datas e IDs

**PROBLEMA IDENTIFICADO**:
Datas JavaScript (Date objects) não serializam bem para localStorage.

**CENÁRIO DE BUG**:
```typescript
// Salvar
const change = {
  createdAt: new Date(), // Date object
};
localStorage.setItem('data', JSON.stringify(change));

// Carregar
const loaded = JSON.parse(localStorage.getItem('data'));
console.log(typeof loaded.createdAt); // "string" ❌
console.log(loaded.createdAt instanceof Date); // false ❌
```

**SOLUÇÃO**:

##### A. Sempre usar ISO 8601 para Datas

```typescript
// Salvar (serializar para ISO)
const change: PendingChange = {
  id: crypto.randomUUID(), // ✅ UUID v4
  createdAt: new Date().toISOString(), // ✅ ISO string
  data: { ... }
};

// Carregar (reidratar para Date se necessário)
const loadPendingChanges = (): PendingChange[] => {
  const saved = localStorage.getItem('kaizen_pending_changes');
  if (!saved) return [];

  const parsed = JSON.parse(saved);

  // Reidratar datas
  return parsed.map(change => ({
    ...change,
    createdAt: new Date(change.createdAt), // ISO → Date
  }));
};
```

##### B. Usar crypto.randomUUID() para IDs

```typescript
// ✅ CORRETO - UUID padrão
const id = crypto.randomUUID(); // "550e8400-e29b-41d4-a716-446655440000"

// ❌ EVITAR - Colisões possíveis
const id = `${Date.now()}-${Math.random()}`;
```

**AÇÃO REQUERIDA**:
- [ ] Definir type PendingChange com createdAt: string (não Date)
- [ ] Adicionar helper serializeDate() e deserializeDate()
- [ ] Usar crypto.randomUUID() em todos IDs locais

---

### ✅ AJUSTES RECOMENDADOS NO PLANO

#### 1. Política Clara de Cache por Endpoint

**Criar Tabela de Decisão**:

| Endpoint | Estratégia | TTL | Motivo |
|----------|-----------|-----|--------|
| `GET /api/v1/items` | Cache-First | 7 dias | Dados globais, mudam raramente |
| `GET /api/v1/areas` | Cache-First | 7 dias | Estrutura fixa do restaurante |
| `GET /api/v1/fornecedores` | Cache-First | 3 dias | Lista de fornecedores estável |
| `GET /api/v1/areas/{id}/estoque` | Network-First | 1 hora | Dados dinâmicos, mas cache útil offline |
| `GET /api/v1/listas/minhas` | Network-First | 30 min | Muda frequente |
| `GET /api/v1/users/me` | Network-Only | - | Dados sensíveis |
| `POST/PUT/DELETE *` | Network-Only | - | Mutações nunca cacheadas |

**Implementar no Service Worker**:
```javascript
// service-worker.js
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, NetworkOnly } from 'workbox-strategies';

// Cache-First (7 dias)
registerRoute(
  /\/api\/v1\/(items|areas|fornecedores)$/,
  new CacheFirst({
    cacheName: 'kaizen-static-v1',
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 7 * 24 * 60 * 60,
        maxEntries: 100,
      })
    ]
  })
);

// Network-First (1 hora)
registerRoute(
  /\/api\/v1\/(estoque|listas)/,
  new NetworkFirst({
    cacheName: 'kaizen-dynamic-v1',
    networkTimeoutSeconds: 5, // Fallback para cache após 5s
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60, // 1 hora
        maxEntries: 50,
      })
    ]
  })
);

// Network-Only (sem cache)
registerRoute(
  ({ url, request }) => {
    return url.pathname.startsWith('/api/v1/users') ||
           ['POST', 'PUT', 'DELETE'].includes(request.method);
  },
  new NetworkOnly()
);
```

---

#### 2. Atualizar Estado Local/Cache Após Sync

**PROBLEMA**: Após sync bem-sucedido, UI pode mostrar dados antigos do cache.

**SOLUÇÃO**: Invalidar cache e re-fetch

```typescript
const syncAllPending = async () => {
  const results = await Promise.allSettled(
    pendingChanges.map(change => syncOne(change))
  );

  const successIds = results
    .filter(r => r.status === 'fulfilled')
    .map((r, i) => pendingChanges[i].id);

  // Remover pendências sincronizadas
  setPendingChanges(prev => prev.filter(c => !successIds.includes(c.id)));

  // ✅ CRÍTICO: Invalidar cache e re-fetch
  if ('caches' in window) {
    const cache = await caches.open('kaizen-dynamic-v1');

    // Deletar caches afetados
    for (const change of pendingChanges.filter(c => successIds.includes(c.id))) {
      await cache.delete(change.endpoint);
    }
  }

  // Re-fetch dados atualizados
  window.location.reload(); // Ou usar React Query invalidation
};
```

**Alternativa com React Query** (melhor):
```typescript
import { useQueryClient } from '@tanstack/react-query';

const syncAllPending = async () => {
  const queryClient = useQueryClient();

  // ... sync logic ...

  // Invalidar queries afetadas
  await queryClient.invalidateQueries({ queryKey: ['estoque'] });
  await queryClient.invalidateQueries({ queryKey: ['listas'] });
};
```

---

#### 3. Garantir Idempotência na Fila

**PROBLEMA**: Retry pode duplicar operações se não for idempotente.

**SOLUÇÃO**: Preferir PUT com chave estável

```typescript
// ❌ NÃO idempotente
POST /api/v1/pedidos
{ item_id: 1, quantidade: 5 }
// Retry = pedido duplicado

// ✅ Idempotente
PUT /api/v1/estoque/123
{ quantidade_atual: 10 }
// Retry = mesmo resultado

// ✅ Idempotente com chave local
PUT /api/v1/pedidos/temp-550e8400-e29b
{ item_id: 1, quantidade: 5, idempotency_key: "550e8400-..." }
// Backend deduplica por idempotency_key
```

**Backend: Suportar Idempotency Key** (opcional mas recomendado):
```python
@api_bp.route('/pedidos', methods=['POST'])
@jwt_required()
def criar_pedido():
    idempotency_key = request.json.get('idempotency_key')

    if idempotency_key:
        # Verificar se já existe
        existing = Pedido.query.filter_by(
            idempotency_key=idempotency_key
        ).first()

        if existing:
            return jsonify(existing.to_dict()), 200  # Retornar existente

    # Criar novo pedido
    pedido = Pedido(**request.json)
    db.session.add(pedido)
    db.session.commit()

    return jsonify(pedido.to_dict()), 201
```

---

#### 4. Kill Switch para Service Worker

**PROBLEMA**: Bug crítico no SW pode travar app em produção.

**SOLUÇÃO**: Endpoint remoto para desativar SW

```typescript
// frontend/src/index.tsx
import { Workbox } from 'workbox-window';

async function checkKillSwitch(): Promise<boolean> {
  try {
    const response = await fetch('/api/config/sw-enabled');
    const { enabled } = await response.json();
    return enabled;
  } catch {
    return true; // Assumir enabled se não conseguir verificar
  }
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  // Verificar kill switch
  const swEnabled = await checkKillSwitch();

  if (!swEnabled) {
    console.warn('[SW] Service Worker desabilitado remotamente');

    // Desregistrar SW existente
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }

    // Limpar caches
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));

    return;
  }

  // Registrar normalmente
  const wb = new Workbox('/service-worker.js');
  await wb.register();
}

registerServiceWorker();
```

**Backend: Endpoint de Config**:
```python
# backend/kaizen_app/controllers.py

@api_bp.route('/config/sw-enabled', methods=['GET'])
def check_sw_enabled():
    """Kill switch para desabilitar Service Worker remotamente."""
    # Pode vir de variável de ambiente ou banco
    sw_enabled = os.getenv('SERVICE_WORKER_ENABLED', 'true') == 'true'

    return jsonify({'enabled': sw_enabled}), 200
```

**Usar em emergências**:
```bash
# Desabilitar SW em produção
export SERVICE_WORKER_ENABLED=false
# Reiniciar backend
# Todos os clientes desabilitarão SW no próximo reload
```

---

## 📋 CHECKLIST ANTES DE INICIAR (PRÉ-FASE 1)

### ✅ Preparação Técnica

- [ ] **Confirmar stack do frontend**
  - [ ] Verificar se é CRA, Vite, ou Next.js
  - [ ] Escolher estratégia de integração SW (CRACO/vite-plugin-pwa)
  - [ ] Instalar dependências necessárias

- [ ] **Mapear endpoints**
  - [ ] Listar todos endpoints usados pelo app
  - [ ] Classificar por sensibilidade (público/privado/sensível)
  - [ ] Definir estratégia de cache (Cache-First/Network-First/Network-Only)
  - [ ] Definir TTL por categoria

- [ ] **Backend: Preparar suporte a conflitos**
  - [ ] Adicionar campo `atualizado_em` em modelo Estoque (se não existir)
  - [ ] Criar migration para adicionar campo
  - [ ] Implementar lógica de detecção 409 em PUT /estoque
  - [ ] Criar endpoint `/api/health` para ping

- [ ] **Segurança**
  - [ ] Revisar quais dados podem ser cacheados
  - [ ] Implementar limpeza de cache no logout
  - [ ] Adicionar restaurante_id nas chaves de cache

- [ ] **Configuração de ambiente**
  - [ ] Adicionar `SERVICE_WORKER_ENABLED` em variáveis de ambiente
  - [ ] Configurar kill switch endpoint

### ✅ Backlog da Fase 1 (MVP)

**Objetivo**: Service Worker básico funcionando com cache de leitura

**Critérios de Aceite**:
- [ ] SW registrado e ativo em produção
- [ ] GET /api/v1/items cacheado (Cache-First, 7 dias)
- [ ] GET /api/v1/areas/{id}/estoque cacheado (Network-First, 1h)
- [ ] POST/PUT/DELETE nunca cacheados (Network-Only)
- [ ] Usuário consegue visualizar estoque offline após carregar online
- [ ] Cache é limpo no logout
- [ ] Nenhum erro no console relacionado ao SW

**Testes Obrigatórios**:
1. **Teste Offline Básico**
   - Login online
   - Carregar página de estoque
   - DevTools → Network → Offline
   - Recarregar página
   - ✅ Dados aparecem do cache

2. **Teste de Logout**
   - Login
   - Carregar estoque
   - Logout
   - Login com outro usuário
   - ✅ Cache anterior foi limpo

3. **Teste de Atualização**
   - Carregar estoque (cacheia)
   - Admin muda dados no servidor
   - Voltar online
   - ✅ Dados atualizados aparecem (Network-First funciona)

---

## 🎯 PRÓXIMOS PASSOS PRÁTICOS

### Passo 1: Confirmar Stack (30 min)

```bash
# Executar no terminal
cd frontend

# Verificar CRA
cat package.json | grep "react-scripts"

# Verificar se já tem SW
ls public/service-worker.js
ls src/service-worker*.js

# Verificar versão do React
cat package.json | grep "\"react\""
```

**Decisão**: Escolher estratégia de integração SW baseado no resultado

---

### Passo 2: Mapear Endpoints (1-2 horas)

**Criar arquivo**: `manuais/planejamento/refatoração/mapeamento-endpoints-cache.md`

**Template**:
```markdown
# Mapeamento de Endpoints - Estratégia de Cache

## Endpoints Públicos (Sem Auth)
| Endpoint | Método | Cache? | TTL | Estratégia |
|----------|--------|--------|-----|------------|
| /api/auth/login | POST | Não | - | Network-Only |

## Endpoints Autenticados - Leitura
| Endpoint | Método | Sensível? | Cache? | TTL | Estratégia |
|----------|--------|-----------|--------|-----|------------|
| /api/v1/items | GET | Não | Sim | 7d | Cache-First |
| /api/v1/areas/{id}/estoque | GET | Sim | Sim | 1h | Network-First |

## Endpoints Autenticados - Escrita
| Endpoint | Método | Cache? |
|----------|--------|--------|
| /api/v1/estoque/{id} | PUT | Não (Network-Only) |
```

**Ação**: Preencher tabela com TODOS os endpoints do sistema

---

### Passo 3: Atualizar Plano de Implementação (2 horas)

**Revisar FASE 1**:
- Substituir comandos genéricos por comandos específicos do stack
- Adicionar verificações de segurança (logout, cache)
- Atualizar código do service-worker.js com políticas corretas

**Adicionar FASE 0 (PRÉ-IMPLEMENTAÇÃO)**:
1. Backend: Migration para `atualizado_em`
2. Backend: Endpoint `/api/health`
3. Backend: Lógica 409 em PUT /estoque
4. Frontend: Instalar CRACO/dependências SW
5. Frontend: Implementar limpeza de cache no logout

---

### Passo 4: Validar com Time (30 min)

**Apresentar**:
- Mapeamento de endpoints
- Estratégias de cache
- Cronograma atualizado (FASE 0 + FASE 1-5)
- Riscos e mitigações

**Aprovar**:
- Começar implementação
- Alocar recursos (devs, QA)
- Definir critérios de sucesso

---

**Documento atualizado em**: 2026-01-04
**Versão**: 2.0 (Revisão Técnica Completa)
**Autor**: Claude (Plan Mode) + Revisão do Usuário
**Status**: ⚠️ Aguardando Confirmação de Stack e Mapeamento de Endpoints
