/* eslint-disable no-restricted-globals */
/**
 * Minimal Service Worker for the Site Engineer PWA.
 *
 * Scope of caching:
 *  - Shell: cache-first for /engineer routes after first load.
 *  - API: network-first (don't serve stale data); offline writes are queued
 *    by the page itself via IndexedDB (lib/offline-queue.ts), not by the SW.
 */
const CACHE_VERSION = 'rest-engineer-v1';
const SHELL_PATHS = ['/engineer', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((c) => c.addAll(SHELL_PATHS)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Never cache API or auth — let the offline queue handle outages.
  if (
    url.pathname.startsWith('/api-proxy') ||
    url.pathname.startsWith('/api/auth') ||
    req.method !== 'GET'
  ) {
    return;
  }

  // Same-origin GETs: stale-while-revalidate against the shell cache.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(CACHE_VERSION).then(async (cache) => {
        const cached = await cache.match(req);
        const networkFetch = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || networkFetch;
      }),
    );
  }
});
