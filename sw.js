// Service worker: la app abre sin cobertura (en Zubiazpi hay poca) pero se actualiza sola cuando hay red.
const CACHE = 'zrf-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.hostname.includes('script.google') || u.hostname.includes('googleusercontent')) return; // API y fotos: siempre red
  if (e.request.method !== 'GET') return;
  // Red primero (para recibir siempre la última versión); si no hay red, la copia guardada.
  e.respondWith(fetch(e.request).then(res => {
    if (u.origin === location.origin) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
