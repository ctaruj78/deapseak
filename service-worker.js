// service-worker.js
// Кешування сторінок, інструкцій, чек-листів, завдань для офлайн-режиму

const CACHE_NAME = 'deapseak-tech-cache-v5';
const urlsToCache = [
  '/',
  '/pages/tech/ar-helper.html',
  '/pages/tech/tools.html',
  '/pages/tech/inspections.html',
  '/pages/tech/knowledge-base.html',
  '/assets/js/modules/ar-helper.js',
  '/assets/js/modules/technician-manager.js',
  '/assets/js/modules/ai-assistant.js',
  '/assets/css/main.css',
  '/data/lifts.json',
  '/data/sample-data.json',
  '/docs/technical-guide.md',
  '/docs/api-documentation.md',
  '/docs/user-manual.pdf'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Пропускаємо крос-оригінальні запити (напр. шрифти через тунель) — щоб уникнути CORS
  if (url.origin !== self.location.origin) {
    return;
  }

  // НЕ кешуємо API запити - вони повинні йти напряму до сервера
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Навігаційні запити (завантаження HTML-сторінок) завжди йдуть напряму до мережі.
  // Без цього service worker може повернути 408 для admin/tech сторінок при
  // будь-якій тимчасовій помилці мережі, навіть коли сервер доступний.
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Кешуємо тільки статичні ресурси того самого походження (JS, CSS, зображення тощо)
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request).catch(() => new Response('', { status: 408, statusText: 'Offline' })))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
});
