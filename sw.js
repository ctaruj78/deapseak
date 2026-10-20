// Service Worker для push notifications та PWA
const CACHE_NAME = 'liftmanager-v2.3';
const urlsToCache = [
    '/manifest.json'
];

// Install event
self.addEventListener('install', event => {
    console.log('Service Worker installing v2.0');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
    // Активуємо новий SW без очікування закриття старих вкладок
    self.skipWaiting();
});

// Activate event - очищення лише власних старих кешів (не чіпаємо кеші service-worker.js)
self.addEventListener('activate', event => {
    console.log('Service Worker activating', CACHE_NAME);
    event.waitUntil(
        caches.keys()
            .then(cacheNames => Promise.all(
                cacheNames
                    .filter(name => name.startsWith('liftmanager-') && name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            ))
            .then(() => self.clients.claim())
    );
});

// Fetch event - HTML-сторінки та API ЗАВЖДИ з мережі, без кешу
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Чужі origin-и (CDN, розширення браузера) та не-GET — не чіпаємо
    if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

    // HTML сторінки та API — завжди мережа, ніколи кеш
    if (event.request.destination === 'document' ||
        url.pathname.endsWith('.html') ||
        url.pathname === '/' ||
        url.pathname.includes('/api/') ||
        url.pathname.includes('/assets/js/')) {  // JS модулі — завжди з мережі (часто змінюються)
        event.respondWith(
            fetch(event.request).catch(() => fetch('/index.html'))
        );
        return;
    }

    // Статичні ресурси (CSS, JS, шрифти) — кеш з фолбеком на мережу
    event.respondWith(
        caches.match(event.request).then(cached => {
            // Кеш з text/html під .js/.css (fallback-сторінка) — ігноруємо
            const cachedBad = cached && /text\/html/i.test(cached.headers.get('content-type') || '') && !/\.html?$/i.test(url.pathname);
            if (cached && !cachedBad) return cached;
            return fetch(event.request).then(response => {
                const isHtml = /text\/html/i.test(response.headers.get('content-type') || '');
                if (event.request.method === 'GET' && response.ok && !(isHtml && /\.(js|css|woff2?|ttf|png|jpe?g|svg|ico)$/i.test(url.pathname))) {
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
        body: data.message || 'Nova mensagem',
        icon: '/assets/img/logo.png',
        badge: '/assets/img/logo.png',
        vibrate: [200, 100, 200],
        data: data.data || {},
        actions: [
            {
                action: 'view',
                title: 'Ver'
            },
            {
                action: 'dismiss',
                title: 'Fechar'
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