Exploração: Funcionalidades Offline para Kaizen Lists

 📋 Contexto

 Branch: offline
 Objetivo: Explorar e documentar possibilidades de funcionalidades offline para o sistema Kaizen Lists

 ---
 🎯 Casos de Uso Principais

 1. Colaboradores em Campo (Alta Prioridade)

 Cenário: Colaborador fazendo inventário em área sem internet (estoque em porão, câmara fria, etc.)

 Necessidades:
 - Visualizar lista de itens do estoque da sua área
 - Atualizar quantidades de estoque
 - Marcar itens como "precisa comprar"
 - Sincronizar mudanças quando voltar online

 Impacto: 🔥 ALTO - Principal pain point dos usuários

 ---
 2. Compras em Mercado/Fornecedor (Média Prioridade)

 Cenário: Colaborador com lista de compras no mercado sem sinal

 Necessidades:
 - Visualizar lista de compras atribuída
 - Marcar itens como comprados
 - Adicionar observações (preço, marca diferente, etc.)
 - Sincronizar ao retornar

 Impacto: 🟡 MÉDIO - Útil mas workaround existe (print/foto da lista)

 ---
 3. Admin Gerando Pedidos (Baixa Prioridade)

 Cenário: Admin revisando pedidos/cotações offline

 Necessidades:
 - Visualizar pedidos pendentes
 - Visualizar cotações
 - Gerar relatórios básicos

 Impacto: 🟢 BAIXO - Admin geralmente tem acesso confiável à internet

 ---
 🔧 Estratégias Técnicas Possíveis

 Opção A: Progressive Web App (PWA) Completo

 Tecnologias: Service Workers + IndexedDB + Cache API

 Vantagens:
 ✅ Instalável como app nativo
 ✅ Funciona 100% offline após primeiro acesso
 ✅ Sincronização inteligente em background
 ✅ Notificações push

 Desvantagens:
 ❌ Complexidade alta de implementação
 ❌ Gerenciamento de conflitos (2+ users editando offline)
 ❌ Tamanho do cache (muitos dados)
 ❌ Debugging difícil

 Arquivos Impactados:
 - frontend/public/manifest.json (criar)
 - frontend/public/service-worker.js (criar)
 - frontend/src/services/syncService.ts (criar)
 - frontend/src/hooks/useOfflineSync.ts (criar)

 ---
 Opção B: Cache Seletivo com LocalStorage

 Tecnologias: LocalStorage + React Context

 Vantagens:
 ✅ Implementação simples
 ✅ Fácil debug
 ✅ Controle fino do que cachear
 ✅ Sincronização manual clara para usuário

 Desvantagens:
 ❌ Limite de 5-10MB no localStorage
 ❌ Não funciona sem internet inicial
 ❌ Usuário precisa entender sincronização manual

 Arquivos Impactados:
 - frontend/src/context/OfflineContext.tsx (criar)
 - frontend/src/services/cacheService.ts (criar)
 - frontend/src/hooks/useOfflineData.ts (criar)

 ---
 Opção C: Modo Leitura Offline (Híbrido)

 Tecnologias: Service Worker (cache de leitura) + localStorage (edições)

 Vantagens:
 ✅ Melhor dos 2 mundos
 ✅ Leitura sempre disponível
 ✅ Edições são "rascunhos" até sincronizar
 ✅ UX clara (badge "pendente sincronização")

 Desvantagens:
 ❌ Complexidade média
 ❌ Requer educação do usuário

 Arquivos Impactados:
 - frontend/public/sw-cache-only.js (service worker leve)
 - frontend/src/services/offlineDrafts.ts (criar)
 - frontend/src/components/SyncIndicator.tsx (criar)

 ---
 📊 Dados a Cachear (Priorizado)

 🔥 Prioridade ALTA (Essencial Offline)

 1. Estoque da área do usuário (~100-500 items por área)
   - GET /api/v1/areas/{id}/estoque
   - ~50KB por área
 2. Itens globais (~500-2000 items)
   - GET /api/v1/items
   - ~200KB total
 3. Listas atribuídas ao usuário (~10-50 listas)
   - GET /api/v1/listas/minhas
   - ~100KB

 🟡 Prioridade MÉDIA (Útil Offline)

 4. Áreas do restaurante (~5-20 áreas)
   - GET /api/v1/areas
   - ~10KB
 5. Fornecedores (~20-100 fornecedores)
   - GET /api/v1/fornecedores
   - ~50KB

 🟢 Prioridade BAIXA (Apenas leitura)

 6. Pedidos recentes (últimos 30 dias)
   - ~500KB
 7. Cotações ativas
   - ~200KB

 Total estimado para cache completo: ~1.1MB (dentro do limite localStorage)

 ---
 🎨 Componentes UI Necessários

 1. Indicador de Status de Conexão

 Localização: Layout.tsx (navbar)
 <ConnectionIndicator />
 // 🟢 Online | 🔴 Offline | 🟡 Sincronizando...

 2. Badge de Mudanças Pendentes

 Localização: Páginas de estoque/listas
 <PendingChanges count={3} />
 // "3 mudanças não sincronizadas"

 3. Botão de Sincronização Manual

 Localização: Páginas com edição offline
 <SyncButton onSync={handleSync} />
 // "Sincronizar Agora"

 4. Modal de Conflito

 Quando 2+ users editaram mesmo dado
 <ConflictResolutionModal
   local={localData}
   remote={remoteData}
   onResolve={handleResolve}
 />

 ---
 🚀 Plano de Implementação Progressivo

 FASE 1: MVP - Cache de Leitura (1-2 dias)

 Objetivo: Permitir visualização offline do estoque

 1. Service Worker básico para cachear GET requests
 2. Implementar OfflineContext com flag isOnline
 3. Adicionar ConnectionIndicator no navbar
 4. Cachear endpoints prioritários (estoque + itens)

 Resultado: Usuário pode VER dados offline após carregar online uma vez

 FASE 2: Edição Offline Básica (2-3 dias)

 Objetivo: Permitir editar estoque offline

 1. Criar offlineDrafts.ts com localStorage
 2. Modificar formulários de estoque para salvar local
 3. Adicionar PendingChanges badge
 4. Implementar SyncButton com lógica de envio

 Resultado: Usuário pode editar estoque offline e sincronizar depois

 FASE 3: Sincronização Inteligente (3-4 dias)

 Objetivo: Sincronização automática + resolução de conflitos

 1. Background sync quando volta online
 2. Detecção de conflitos (timestamp-based)
 3. ConflictResolutionModal UI
 4. Retry automático de falhas

 Resultado: Sistema robusto de offline-first

 FASE 4: PWA Completo (5-7 dias)

 Objetivo: App instalável

 1. manifest.json completo
 2. Ícones em múltiplas resoluções
 3. Splash screens
 4. Notificações push (opcional)

 Resultado: App instalável no celular como nativo

 ---
 ⚠️ Desafios e Considerações

 1. Conflitos de Dados

 Problema: Admin edita item A online, colaborador edita offline
 Solução:
 - Timestamp + "Last Write Wins" (default)
 - Modal de resolução para edições críticas
 - Histórico de alterações (audit log)

 2. Limite de Storage

 Problema: localStorage limitado a 5-10MB
 Solução:
 - Cachear apenas área do usuário logado
 - TTL de 24h para cache
 - Limpeza automática de dados antigos

 3. Autenticação JWT

 Problema: Token expira (30min default)
 Solução:
 - Refresh token com validade longa
 - Modo "somente leitura" se token expirou offline

 4. Primeiro Carregamento

 Problema: Sem internet no primeiro acesso = app não funciona
 Solução:
 - Tela explicativa: "Conecte à internet para primeira sincronização"
 - Pre-cache durante login (loading mais longo)

 ---
 📈 Métricas de Sucesso

 1. Redução de erros de "sem internet": -90%
 2. Tempo de carregamento offline: <500ms
 3. Taxa de sincronização bem-sucedida: >95%
 4. Adoção de instalação PWA: >30% usuários mobile

 ---
 🔍 Próximos Passos Recomendados

 Para MVP Rápido (Recomendado):

 1. Foco no Caso de Uso #1 (colaborador + estoque)
 2. Opção C - Modo Leitura Híbrido
 3. Implementar FASE 1 + FASE 2 (~4 dias)

 Para Solução Completa:

 1. Implementar todas as 4 fases (~15 dias)
 2. Testes extensivos em campo
 3. Documentação de uso offline

 ---
 📂 Arquivos Principais a Criar

 Backend (Mínimo):

 - Nenhum arquivo novo necessário inicialmente
 - (Opcional) GET /api/v1/sync/status endpoint para verificar pendências

 Frontend:

 1. /frontend/public/service-worker.js - Service Worker
 2. /frontend/public/manifest.json - PWA manifest
 3. /frontend/src/context/OfflineContext.tsx - Estado global offline
 4. /frontend/src/services/cacheService.ts - Gerenciamento de cache
 5. /frontend/src/services/syncService.ts - Lógica de sincronização
 6. /frontend/src/hooks/useOfflineData.ts - Hook para dados offline
 7. /frontend/src/components/ConnectionIndicator.tsx - UI de status
 8. /frontend/src/components/SyncButton.tsx - Botão sincronizar
 9. /frontend/src/components/ConflictModal.tsx - Resolução de conflitos

 ---
 💡 Alternativas Consideradas

 Usar biblioteca third-party:

 - PouchDB + CouchDB: Sync bidirecional automático
   - ❌ Requer trocar backend (ou adaptar)
   - ✅ Robusto e testado em produção
 - Workbox (Google): Framework para Service Workers
   - ✅ Simplifica muito a implementação
   - ✅ Padrões prontos (cache-first, network-first)
   - ⚠️ Dependência adicional (~100KB)
 - Redux Offline: Middleware para Redux
   - ⚠️ Projeto está em manutenção mínima
   - ✅ Padrão conhecido se já usa Redux

 Recomendação: Começar com Workbox para Service Workers (reduz 70% da complexidade)
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌

 Would you like to proceed?

 ❯ 1. Yes, and auto-accept edits
   2. Yes, and manually approve edits
   3. Type here to tell Claude what to change

 ctrl-g to edit in VS Code









==============================================================================================================




























































































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

**Documento criado em**: 2026-01-04
**Versão**: 1.0
**Autor**: Claude (Plan Mode)
**Status**: ✅ Pronto para Implementação
