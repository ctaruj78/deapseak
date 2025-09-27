// service-worker-client.js
// Service Worker для PWA клієнтської панелі

const CACHE_NAME = 'liftmaster-client-cache-v1';
const urlsToCache = [
  '/pages/client/my-lifts.html',
  '/pages/client/requests.html',
  '/assets/js/modules/lifts-manager.js',
  '/assets/js/modules/client-manager.js',
  '/assets/js/modules/ai-assistant.js',
  '/assets/js/modules/language-switcher.js',
  '/assets/js/modules/voice-assistant-client.js',
  '/assets/js/modules/push-notifications-client.js',
  '/assets/css/main.css',
  '/assets/img/icons/pwa-icon-192.png',
  '/assets/img/icons/pwa-icon-512.png',
  '/docs/user-manual.pdf',
  '/docs/technical-guide.md',
  '/docs/api-documentation.md'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
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
