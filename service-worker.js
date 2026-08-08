const CACHE_NAME = 'afm-field-notes-v10';

const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './site.webmanifest',
  './assets/imgs/favicon.ico',
  './assets/imgs/favicon-16x16.png',
  './assets/imgs/favicon-32x32.png',
  './assets/imgs/apple-touch-icon.png',
  './assets/imgs/android-chrome-192x192.png',
  './assets/imgs/android-chrome-512x512.png',
  './assets/imgs/ascent-window-transparent.svg',
  './assets/imgs/portrait.webp',
  './assets/imgs/og-image.png',
  './assets/imgs/crunchlabs-space-selfie.webp',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames
        .filter((cacheName) => cacheName !== CACHE_NAME)
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

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', responseCopy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => (
      cachedResponse || fetch(event.request).then((response) => {
        if (response.ok) {
          const responseCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseCopy));
        }
        return response;
      })
    ))
  );
});
