import { readFile } from 'node:fs/promises';

const sw = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
const manifest = await readFile(new URL('../src/app/manifest.ts', import.meta.url), 'utf8');
const adminDashboard = await readFile(new URL('../src/app/admin/dashboard/page.tsx', import.meta.url), 'utf8');
const registration = await readFile(new URL('../src/components/SwRegister.tsx', import.meta.url), 'utf8');
const installButton = await readFile(new URL('../src/components/InstallAppButton.tsx', import.meta.url), 'utf8');
const installHook = await readFile(new URL('../src/hooks/usePWAInstall.ts', import.meta.url), 'utf8');

const required = [
  [sw, "'/login'"],
  [sw, "startsWith('/v1/')"],
  [sw, "startsWith('/api/')"],
  [sw, "startsWith(CACHE_PREFIX)"],
  [sw, "event.request.headers.has('authorization')"],
  [sw, "event.request.headers.has('cookie')"],
  [sw, "event.request.method !== 'GET'"],
  [registration, 'controllerchange'],
  [registration, 'kaizen-sw-reloaded-at'],
  [manifest, "display: 'standalone'"],
  [manifest, "src: '/icons/icon-192.png'"],
  [adminDashboard, '<InstallAppButton />'],
  [installButton, 'if (await install())'],
  [installButton, "success('Aplicativo instalado'"],
  [installHook, "navigator.platform === 'MacIntel'"],
  [installHook, 'navigator.maxTouchPoints > 1'],
  [installHook, 'crios|fxios|edgios'],
];

for (const [source, expected] of required) {
  if (!source.includes(expected)) throw new Error(`Missing PWA check: ${expected}`);
}

const precachedRoutes = ['/', '/login'];
for (const route of precachedRoutes) {
  if (!sw.includes(`'${route}'`)) throw new Error(`Missing precached shell route: ${route}`);
}
for (const route of ['/admin/dashboard', '/collaborator/dashboard']) {
  if (sw.includes(`'${route}'`)) throw new Error(`Authenticated route must not be precached: ${route}`);
}

if (!sw.includes('cache.addAll(STATIC_ASSETS)')) throw new Error('Shell is not precached');
if (!sw.includes("url.pathname.startsWith('/_next/static/')")) {
  throw new Error('Build chunks are not covered by the static asset cache path');
}
if (!sw.includes("const isPublicDocument = url.pathname === '/' || url.pathname === '/login'")) {
  throw new Error('Public document allowlist is missing');
}
if (!sw.includes("(!isDocumentRequest || !isPublicDocument)")) {
  throw new Error('Protected documents are not excluded from cache handling');
}
if (!sw.includes('return isPublicDocument')) {
  throw new Error('Offline document fallback is not limited to public documents');
}
for (const route of ['/admin/', '/collaborator/']) {
  if (sw.includes(`url.pathname.startsWith('${route}')`)) {
    throw new Error(`Protected document route is explicitly cacheable: ${route}`);
  }
}
if (/cache\.put\([^\n]*\/(?:v1|api)/.test(sw)) {
  throw new Error('API response is eligible for cache.put');
}
const cachePutIndex = sw.indexOf('cache.put(');
const requiredBeforeCachePut = [
  'const isApiRequest',
  'const isAuthenticatedRequest',
  "event.request.method !== 'GET'",
];
if (cachePutIndex < 0 || requiredBeforeCachePut.some((token) => sw.indexOf(token) < 0 || sw.indexOf(token) > cachePutIndex)) {
  throw new Error('API/auth/method guards must precede every cache.put');
}
if (!sw.includes("event.request.headers.has('authorization')") ||
    !sw.includes("event.request.headers.has('cookie')")) {
  throw new Error('Fetch guard does not exclude authenticated requests');
}
if (!/startsWith\(CACHE_PREFIX\)[\s\S]*CACHE_NAME/.test(sw)) {
  throw new Error('Cache cleanup is not scoped to the application prefix');
}
if (!registration.includes('controllerchange') ||
    !registration.includes('kaizen-sw-reloaded-at') ||
    !registration.includes('window.location.reload()')) {
  throw new Error('Service worker update lacks guarded reload');
}
if (!registration.includes('Date.now() - lastReload < 5000')) {
  throw new Error('Service worker update reload is not loop-guarded');
}

console.log('PWA checks passed');
