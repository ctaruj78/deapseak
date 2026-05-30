// service-worker-client.js
// Service Worker para PWA do painel de cliente

const CACHE_NAME = 'liftmaster-client-cache-v4';
// Cache apenas de ativos estaticos; HTML e JS devem vir sempre da rede
const urlsToCache = [
  '/assets/css/main.css',
  '/assets/img/icons/pwa-icon-192.png',
  '/assets/img/icons/pwa-icon-512.png'
];

self.addEventListener('install', event => {
  // Faz cache por recurso para evitar falha total no install
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        urlsToCache.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Nao foi possivel fazer cache:', url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const { request } = event;

  // Processa apenas pedidos GET do mesmo origin para evitar problemas de CORS
  if (request.method !== 'GET') return;
  if (!request.url.startsWith(self.location.origin)) return;

  // API requests passam sempre pela rede (not cached)
  // Cache de respostas de API causa dados desatualizados
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      // Paginas HTML e modulos JS devem vir sempre da rede
      const isHtml = url.pathname.endsWith('.html') || url.pathname === '/';
      const isJs = url.pathname.endsWith('.js');
      if (isHtml || isJs) {
        return fetch(request).catch(() => cached || Response.error());
      }

      if (cached) return cached;

      return fetch(request).then(response => {
        // Faz cache apenas de respostas bem sucedidas do mesmo origin
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
        console.warn('[SW] Erro de fetch, resposta de cache ou vazia:', request.url, err);
        // Para navegacao HTML, tenta devolver a pagina principal em cache
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
