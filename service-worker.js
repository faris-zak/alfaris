const CACHE_NAME = 'afm-field-notes-v20';

const APP_SHELL = [
  './',
  './index.html',
  './styles.css?v=18',
  './script.js',
  './site.webmanifest',
  './assets/imgs/favicon.ico',
  './assets/imgs/favicon-16x16.webp',
  './assets/imgs/favicon-32x32.webp',
  './assets/imgs/apple-touch-icon.png',
  './assets/imgs/android-chrome-192x192.png',
  './assets/imgs/android-chrome-512x512.png',
  './assets/imgs/ascent-window-transparent.svg',
  './assets/imgs/portrait.webp',
  './assets/imgs/og-image.png',
  './assets/imgs/crunchlabs-space-selfie.webp',
  './assets/certificates/NASA-Space-Apps-Challenge-2023.pdf',
  './assets/certificates/IELTS-Academic-IDP-results-redacted.webp',
];

const publicUrls = new Set(APP_SHELL.map((path) => new URL(path, self.location.href).href));
const canCache = (response) => response.ok && !response.redirected
  && !/\b(?:private|no-store)\b/i.test(response.headers.get('cache-control') || '');

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => Promise.all(APP_SHELL.map(async (path) => {
      const response = await fetch(new URL(path, self.location.href).href, { credentials: 'omit' });
      if (canCache(response)) await cache.put(path, response);
    })))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames
        .filter((cacheName) => cacheName.startsWith('afm-field-notes-') && cacheName !== CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== self.location.origin || !publicUrls.has(requestUrl.href)) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (canCache(response)) {
            const responseCopy = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', responseCopy)));
          }
          return response;
        })
        .catch(() => caches.open(CACHE_NAME).then((cache) => cache.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => cache.match(event.request)).then((cachedResponse) => (
      cachedResponse || fetch(event.request).then((response) => {
        if (canCache(response)) {
          const responseCopy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseCopy)));
        }
        return response;
      })
    ))
  );
});
