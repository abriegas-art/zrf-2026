// Service worker: cachea la app para que abra sin cobertura (en Zubiazpi hay poca).
const CACHE = 'zrf-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.hostname.includes('script.google') || u.hostname.includes('googleusercontent')) return; // API y fotos: siempre red
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => { if (u.origin === location.origin) caches.open(CACHE).then(c => c.put(e.request, res.clone())); return res; })));
});
