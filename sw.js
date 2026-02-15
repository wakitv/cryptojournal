// ===================================
// CryptoTrader Pro v2 - Service Worker
// ===================================

const CACHE_NAME = 'cryptotrader-v2-cache-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/config.js',
    '/js/api.js',
    '/js/app.js',
    '/manifest.json',
    '/assets/icon-192.png',
    '/assets/icon-512.png',
    'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&display=swap',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/flatpickr'
];

// Install
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
            ))
            .then(() => self.clients.claim())
    );
});

// Fetch - cache first, network fallback
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Always fetch Google Apps Script from network
    if (url.hostname === 'script.google.com' || url.hostname === 'script.googleusercontent.com') {
        event.respondWith(fetch(request));
        return;
    }
    
    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // Update cache in background
                    event.waitUntil(
                        fetch(request).then(networkResponse => {
                            if (networkResponse.ok) {
                                caches.open(CACHE_NAME).then(cache => cache.put(request, networkResponse));
                            }
                        }).catch(() => {})
                    );
                    return cachedResponse;
                }
                
                return fetch(request).then(networkResponse => {
                    if (networkResponse.ok && request.method === 'GET') {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
                    }
                    return networkResponse;
                });
            })
            .catch(() => {
                if (request.headers.get('Accept')?.includes('text/html')) {
                    return caches.match('/index.html');
                }
            })
    );
});

// Background sync
self.addEventListener('sync', event => {
    if (event.tag === 'sync-data') {
        event.waitUntil(
            self.clients.matchAll().then(clients => {
                clients.forEach(client => client.postMessage({ type: 'SYNC_COMPLETE' }));
            })
        );
    }
});

// Push notifications
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'Trading reminder!',
        icon: '/assets/icon-192.png',
        badge: '/assets/icon-192.png',
        vibrate: [100, 50, 100]
    };
    event.waitUntil(self.registration.showNotification('CryptoTrader Pro', options));
});
