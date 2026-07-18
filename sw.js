const CACHE_NAME = 'love-app-cache-v1.5.9';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './favicon.svg',
  './icons.svg',
  './manifest.json',
  './logo_pwa.png',
  './logo_pwa_small.png'
];

// Install Event: Cache core static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Caching app shell and static assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Cache First with Network Fallback, Network First for navigation/html
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests, external APIs (like Supabase)
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Bypassing caching for media files (mp3) to prevent range request issues in iOS Safari
  if (url.pathname.endsWith('.mp3')) {
    return;
  }

  // Network First for HTML and scripts to ensure we can check updates, Cache First for other static assets
  if (request.mode === 'navigate' || request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
  } else {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          // Serve from cache and update in background
          fetch(request).then(networkResponse => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => cache.put(request, networkResponse));
            }
          }).catch(() => {});
          return cachedResponse;
        }

        return fetch(request).then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
          return networkResponse;
        });
      })
    );
  }
});

// Listen for messages from client (App)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push Event: Handle incoming push notifications from server
self.addEventListener('push', event => {
  let data = { title: 'WeLove', body: 'Bạn có một lời nhắn yêu thương mới! ❤️' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'WeLove', body: event.data.text() };
    }
  }

  const logoPath = './logo_pwa_small.png';
  const options = {
    body: data.body,
    icon: logoPath,
    badge: logoPath,
    vibrate: [100, 50, 100],
    data: data.data || { url: './' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click Event: Focus app or open URL when notification is clicked
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const targetUrl = event.notification.data?.url || './';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // If a window client is already open, focus it
      for (const client of clientList) {
        const clientUrl = new URL(client.url, self.location.href);
        const targetParsedUrl = new URL(targetUrl, self.location.href);
        if (clientUrl.pathname === targetParsedUrl.pathname && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
