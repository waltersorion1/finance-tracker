const CACHE_NAME = 'fintrack-static-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/styles.css',
  '/js/main.js',
  '/js/app/root.js',
  '/js/core/dom.js',
  '/js/core/http.js',
  '/js/core/navigation.js',
  '/js/core/service-worker.js',
  '/js/core/theme.js',
  '/lib/bootstrap/css/bootstrap.min.css',
  '/lib/bootstrap/js/bootstrap.bundle.min.js',
  '/lib/bootstrap-icons/css/bootstrap-icons.css',
  '/lib/bootstrap-icons/fonts/bootstrap-icons.woff',
  '/lib/bootstrap-icons/fonts/bootstrap-icons.woff2',
  '/lib/chartjs/chart.umd.js',
  '/icons/favicon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).catch(() => {
      if (event.request.mode === 'navigate') return caches.match('/index.html');
      return null;
    }))
  );
});
