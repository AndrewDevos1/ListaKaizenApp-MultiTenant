export async function hardRefreshApp() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }

    // Alinha com o legado: força navegação com query cache-busting.
    const url = new URL(window.location.href);
    url.searchParams.set('hardRefresh', Date.now().toString());
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}
