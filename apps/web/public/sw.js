const CACHE_NAME = 'kaizen-lists-v1';
const STATIC_ASSETS = ['/icons/icon-192.png', '/icons/icon-512.png'];

// Install: pré-cache de assets estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS.filter(() => false)); // não bloquear se ícones não existirem
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
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first (API nunca vai para cache)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Nunca cachear chamadas de API ou requests não-GET
  if (event.request.method !== 'GET' || url.pathname.startsWith('/v1/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cachear apenas respostas bem-sucedidas de assets estáticos
        if (
          response.ok &&
          (url.pathname.startsWith('/icons/') ||
            url.pathname.startsWith('/_next/static/'))
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Fallback: tentar servir do cache
        return caches.match(event.request);
      })
  );
});
