// Service Worker для push notifications та PWA
const CACHE_NAME = 'liftmanager-v1.1';
const urlsToCache = [
    '/',
    '/index.html',
    '/login.html',
    '/manifest.json',
    '/assets/css/main.css',
    '/assets/css/auth.css',
    '/assets/js/config.js',
    '/assets/js/auth.js',
    '/assets/js/common.js',
    '/assets/img/logo.png',
    // AdminLTE assets
    'https://cdn.jsdelivr.net/npm/admin-lte@3.2/dist/css/adminlte.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://code.jquery.com/jquery-3.6.0.min.js',
    'https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/js/bootstrap.bundle.min.js',
    'https://cdn.jsdelivr.net/npm/admin-lte@3.2/dist/js/adminlte.min.js'
];

// Install event - кешування ресурсів
self.addEventListener('install', event => {
    console.log('Service Worker installing.');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting();
});

// Activate event - очищення старого кешу
self.addEventListener('activate', event => {
    console.log('Service Worker activating.');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - обслуговування запитів з кешу
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Повертаємо з кешу, якщо є
                if (response) {
                    return response;
                }

                // Інакше робимо запит до мережі
                return fetch(event.request).then(response => {
                    // Не кешуємо API запити або POST запити
                    if (!event.request.url.includes('/api/') &&
                        event.request.method !== 'POST') {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                    }
                    return response;
                });
            })
            .catch(() => {
                // Fallback для офлайн режиму
                if (event.request.destination === 'document') {
                    return caches.match('/index.html');
                }
            })
    );
});

// Push event - обробка push повідомлень
self.addEventListener('push', event => {
    console.log('Push received:', event);

    let data = {};
    if (event.data) {
        data = event.data.json();
    }

    const options = {
        body: data.message || 'Нове повідомлення',
        icon: '/assets/img/logo.png',
        badge: '/assets/img/logo.png',
        vibrate: [200, 100, 200],
        data: data.data || {},
        actions: [
            {
                action: 'view',
                title: 'Переглянути'
            },
            {
                action: 'dismiss',
                title: 'Закрити'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'LiftManager', options)
    );
});

// Notification click event
self.addEventListener('notificationclick', event => {
    console.log('Notification click received:', event);

    event.notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    // Відкриваємо додаток
    event.waitUntil(
        clients.openWindow(event.notification.data.url || '/')
    );
});

// Background sync для офлайн дій
self.addEventListener('sync', event => {
    console.log('Background sync triggered:', event.tag);

    if (event.tag === 'background-sync') {
        event.waitUntil(syncOfflineData());
    }
});

// Синхронізація офлайн даних
async function syncOfflineData() {
    try {
        // Тут можна додати логіку синхронізації офлайн даних
        console.log('Syncing offline data...');

        // Повідомляємо клієнтів про успішну синхронізацію
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_COMPLETE',
                success: true
            });
        });
    } catch (error) {
        console.error('Sync failed:', error);

        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_FAILED',
                error: error.message
            });
        });
    }
}

// Message event - комунікація з main thread
self.addEventListener('message', event => {
    console.log('Message received in SW:', event.data);

    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});