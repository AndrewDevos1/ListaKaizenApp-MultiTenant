/* eslint-disable no-restricted-globals */
/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, createHandlerBoundToURL, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<any>;
};

clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// App shell routing for SPA
const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');
registerRoute(
  ({ request, url }) => {
    if (request.mode !== 'navigate') {
      return false;
    }
    if (url.pathname.startsWith('/_')) {
      return false;
    }
    if (url.pathname.match(fileExtensionRegexp)) {
      return false;
    }
    return true;
  },
  createHandlerBoundToURL(process.env.PUBLIC_URL + '/index.html')
);

const apiStaticPatterns = [
  /^\/api\/v1\/items$/,
  /^\/api\/v1\/areas$/,
  /^\/api\/v1\/fornecedores$/,
];

const apiDynamicPatterns = [
  /^\/api\/v1\/areas\/\d+\/estoque$/,
  /^\/api\/v1\/areas\/\d+\/status$/,
  /^\/api\/v1\/listas$/,
  /^\/api\/v1\/listas\/\d+\/estoque$/,
  /^\/api\/admin\/checklists$/,
  /^\/api\/admin\/checklists\/\d+$/,
  /^\/api\/collaborator\/areas\/\d+$/,
  /^\/api\/collaborator\/areas\/\d+\/estoque$/,
  /^\/api\/collaborator\/listas\/\d+$/,
  /^\/api\/collaborator\/listas\/\d+\/estoque$/,
  /^\/api\/collaborator\/minhas-listas$/,
  /^\/api\/collaborator\/minhas-areas-status$/,
];

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
  maxRetentionTime: 24 * 60,
});

registerRoute(
  ({ request, url }) =>
    request.method === 'GET' && apiStaticPatterns.some((pattern) => pattern.test(url.pathname)),
  new CacheFirst({
    cacheName: 'kaizen-static-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 7 * 24 * 60 * 60,
      }),
    ],
  })
);

registerRoute(
  ({ request, url }) =>
    request.method === 'GET' && apiDynamicPatterns.some((pattern) => pattern.test(url.pathname)),
  new NetworkFirst({
    cacheName: 'kaizen-dynamic-v1',
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60,
      }),
    ],
  })
);

(['POST', 'PUT'] as const).forEach((method) => {
  registerRoute(
    ({ url }) => apiSyncPatterns.some((pattern) => pattern.test(url.pathname)),
    new NetworkOnly({
      plugins: [offlineQueue],
    }),
    method
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
