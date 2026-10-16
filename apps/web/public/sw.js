const CACHE_PREFIX = 'kaizen-lists-';
const CACHE_NAME = `${CACHE_PREFIX}v4`;
const STATIC_ASSETS = [
  '/',
  '/login',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install: pré-cache de assets estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: limpar caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Push: exibir notificação nativa
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'Kaizen Lists';
  const options = {
    body: data.body || 'Nova notificação',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Clique na notificação: abrir/focar a aba
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});

// Fetch: network-first (API nunca vai para cache)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isApiRequest =
    url.pathname === '/v1' ||
    url.pathname.startsWith('/v1/') ||
    url.pathname === '/api' ||
    url.pathname.startsWith('/api/');
  const isDocumentRequest = event.request.mode === 'navigate';
  const isStaticAsset =
    url.pathname.startsWith('/icons/') || url.pathname.startsWith('/_next/static/');
  const isAuthenticatedRequest =
    event.request.headers.has('authorization') || event.request.headers.has('cookie');

  // Nunca cachear chamadas de API ou requests não-GET
  if (
    event.request.method !== 'GET' ||
    isApiRequest ||
    (!isStaticAsset && !isDocumentRequest)
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cachear apenas respostas bem-sucedidas de assets estáticos
        const canCacheDocument = isStaticAsset || !isAuthenticatedRequest;
        if (response.ok && canCacheDocument) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Documentos usam o shell precacheado; dados autenticados nunca têm fallback offline.
        return isDocumentRequest
          ? caches.match(event.request).then((cached) => cached || caches.match('/'))
          : caches.match(event.request, { ignoreSearch: true });
      })
  );
});
