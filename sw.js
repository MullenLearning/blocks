const CACHE = 'blocks-v1';
const SHELL = ['./', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first, so a new version shows up straight away. The cached copy
// covers being offline, and takes over if the connection is too slow.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true });
    // GitHub Pages lets browsers keep a page for 10 minutes without asking
    // again. 'no-cache' makes the browser check with the server every time,
    // so an update shows on the next launch instead of up to 10 minutes later.
    // If a browser refuses that option, fall back to a plain request rather
    // than getting stuck on the cached copy.
    const fresh = fetch(req, { cache: 'no-cache' }).catch(() => fetch(req)).then(res => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    });
    if (!cached) return fresh;
    const slow = new Promise(resolve => setTimeout(() => resolve(cached), 2500));
    return Promise.race([fresh.catch(() => cached), slow]);
  })());
});
