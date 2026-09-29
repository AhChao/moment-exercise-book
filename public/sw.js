// Offline shell. __SW_VERSION__ and __SW_PRECACHE__ are stamped at build time
// (vite.config.ts); the file is not registered in dev, where they are unset.
const VERSION = '__SW_VERSION__'
const PRECACHE = __SW_PRECACHE__
const CACHE = `meb-${VERSION}`
const scope = self.registration.scope

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((p) => new URL(p, scope).href)))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('meb-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return

  // Entry document: network first so a normal reload always reaches the newest build.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req, { cache: 'no-cache' }).catch(() => caches.match(new URL('index.html', scope).href))
    )
    return
  }

  // Everything else is content-hashed or precached: cache first.
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(req, copy))
      }
      return res
    }))
  )
})
