// Meu Ministério — funciona sem internet e sempre busca a versão mais nova quando há internet.
const CACHE = 'meu-ministerio-v5';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './maskable-512.png', './apple-touch-icon.png', './favicon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(CORE.map(u => fetch(u, { cache: 'no-store' }).then(r => c.put(u, r)))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Arquivo de versão: sempre da rede, nunca do cache.
  if (url.origin === location.origin && url.pathname.endsWith('/version.json')) return;
  // Página e código: rede primeiro, sem cache do navegador; sem internet, usa a cópia salva.
  if (req.mode === 'navigate' || (url.origin === location.origin && /\.(html|js|webmanifest)$/.test(url.pathname))) {
    const key = req.mode === 'navigate' ? './index.html' : req;
    e.respondWith(fetch(req, { cache: 'no-store' })
      .then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(key, c)); } return r; })
      .catch(() => caches.match(key).then(hit => hit || caches.match('./index.html'))));
    return;
  }
  // Ícones e fontes: cache primeiro.
  if (url.origin === location.origin || url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); }
      return r;
    })));
  }
});
