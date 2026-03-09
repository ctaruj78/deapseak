// Service Worker для push notifications та PWA
const CACHE_NAME = 'liftmanager-v1.5';
const urlsToCache = [
    '/manifest.json'
];

// Install event
self.addEventListener('install', event => {
    console.log('Service Worker installing v1.5');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
    // Активуємо новий SW без очікування закриття старих вкладок
    self.skipWaiting();
});

// Activate event - очищення старого кешу + примусове перезавантаження всіх сторінок
self.addEventListener('activate', event => {
    console.log('Service Worker activating v1.5 — clearing all caches and reloading clients');
    event.waitUntil(
        caches.keys()
            .then(cacheNames => Promise.all(
                cacheNames.map(name => {
                    console.log('Deleting cache:', name);
                    return caches.delete(name); // видаляємо ВСІ кеші
                })
            ))
            .then(() => self.clients.claim())
            .then(() => self.clients.matchAll({ type: 'window' }))
            .then(clients => {
                // Перезавантажуємо всі відкриті вкладки
                clients.forEach(client => {
                    console.log('Reloading client:', client.url);
                    client.navigate(client.url);
                });
            })
    );
});

// Fetch event - HTML-сторінки та API ЗАВЖДИ з мережі, без кешу
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // HTML сторінки та API — завжди мережа, ніколи кеш
    if (event.request.destination === 'document' ||
        url.pathname.endsWith('.html') ||
        url.pathname === '/' ||
        url.pathname.includes('/api/')) {
        event.respondWith(
            fetch(event.request).catch(() => fetch('/index.html'))
        );
        return;
    }

    // Статичні ресурси (CSS, JS, шрифти) — кеш з фолбеком на мережу
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (event.request.method === 'GET' && response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            });
        }).catch(() => {
            if (event.request.destination === 'document') return fetch('/index.html');
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