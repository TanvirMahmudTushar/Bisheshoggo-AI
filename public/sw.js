// Bisheshoggo AI - Service Worker
// Makes the app shell (and the fully client-side "Offline Dr" triage engine)
// loadable with no network connection. Without this file the "offline-first
// PWA" the README describes didn't actually exist: nothing cached the app,
// so a fresh page load while offline had nothing to serve.

const CACHE_NAME = "bisheshoggo-shell-v1"

// Core routes worth having ready even before the user has visited them once.
const PRECACHE_URLS = ["/", "/check-symptoms", "/manifest.json", "/icon-192.png", "/icon-512.png"]

self.addEventListener("install", (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {
        // Best-effort: a single missing/blocked URL shouldn't abort install.
      }),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Page navigations: prefer the network (so users online always see the
  // latest build), fall back to whatever was last cached when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(async () => (await caches.match(request)) || (await caches.match("/"))),
    )
    return
  }

  // Static assets (JS/CSS chunks, images, fonts): serve from cache instantly
  // if we have them, and refresh the cache in the background when online.
  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    ["image", "font", "style", "script"].includes(request.destination)

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
            return response
          })
          .catch(() => cached)
        return cached || network
      }),
    )
  }
})
