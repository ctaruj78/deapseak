const CACHE_NAME = 'deapseak-v2';
const OFFLINE_URL = '/offline.html';

// Файли для кешування при встановленні
const STATIC_CACHE = [
    '/',
    '/index.html',
    '/login.html',
    '/offline.html',
    '/assets/css/style.css',
    '/assets/js/app.js',
    'https://cdn.jsdelivr.net/npm/admin-lte@3.2/dist/css/adminlte.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Встановлення Service Worker
self.addEventListener('install', (event) => {
    console.log('[SW] Install event');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching static files');
            return cache.addAll(STATIC_CACHE).catch(err => {
                console.error('[SW] Cache add failed:', err);
            });
        })
    );
    self.skipWaiting();
});

// Активація Service Worker
self.addEventListener('activate', (event) => {
    console.log('[SW] Activate event');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Обробка запитів
self.addEventListener('fetch', (event) => {
    // Ігноруємо API запити - вони повинні йти на сервер
    if (event.request.url.includes('/api/')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            // Якщо є в кеші - повертаємо з кеша
            if (response) {
                return response;
            }

            // Інакше пробуємо завантажити з мережі
            return fetch(event.request).then((response) => {
                // Якщо відповідь OK - кешуємо
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            }).catch(() => {
                // Якщо офлайн - показуємо offline сторінку
                if (event.request.mode === 'navigate') {
                    return caches.match(OFFLINE_URL);
                }
            });
        })
    );
});

// Обробка повідомлень
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
