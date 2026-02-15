// service-worker.js
// Кешування сторінок, інструкцій, чек-листів, завдань для офлайн-режиму

const CACHE_NAME = 'deapseak-tech-cache-v3';
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
  // НЕ кешуємо API запити - вони повинні йти напряму до сервера
  if (event.request.url.includes('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Кешуємо тільки статичні ресурси
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
});
