// service-worker-client.js
// Service Worker для PWA клієнтської панелі

const CACHE_NAME = 'liftmaster-client-cache-v4';
// Кешуємо тільки статичні активи — HTML і JS завжди завантажуються з мережі
const urlsToCache = [
  '/assets/css/main.css',
  '/assets/img/icons/pwa-icon-192.png',
  '/assets/img/icons/pwa-icon-512.png'
];

self.addEventListener('install', event => {
  // Кешуємо кожен ресурс окремо, щоб один failure не вбив весь install
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        urlsToCache.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Не вдалося закешувати:', url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const { request } = event;

  // Обробляємо лише GET-запити з того самого origin, щоб уникнути CORS-проблем
  if (request.method !== 'GET') return;
  if (!request.url.startsWith(self.location.origin)) return;

  // ⚡ API-запити ЗАВЖДИ йдуть через мережу (not cached)
  // Кешування API відповідей викликає баги (застарілі дані про ліфти, заявки і т.д.)
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      // HTML-сторінки та JS-модулі — завжди беремо з мережі (щоб не показувати стару версію)
      const isHtml = url.pathname.endsWith('.html') || url.pathname === '/';
      const isJs = url.pathname.endsWith('.js');
      if (isHtml || isJs) {
        return fetch(request).catch(() => cached || Response.error());
      }

      if (cached) return cached;

      return fetch(request).then(response => {
        // Кешуємо лише успішні відповіді того самого origin (але не API)
        if (
          response.ok &&
          response.type === 'basic' &&
          response.url.startsWith(self.location.origin)
        ) {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, toCache));
        }
        return response;
      }).catch(err => {
        console.warn('[SW] Fetch помилка, відповідь з кешу або порожня:', request.url, err);
        // Для HTML-навігації — повернути закешовану головну сторінку
        if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
          return caches.match('/pages/client/my-lifts.html') || Response.error();
        }
        return Response.error();
      });
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => clients.forEach(client => client.navigate(client.url)))
  );
});
