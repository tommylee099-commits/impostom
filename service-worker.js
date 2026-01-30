const CACHE_NAME = 'impostor-game-v' + Date.now(); // Genera versión nueva cada vez
const urlsToCache = [
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Bowlby+One&family=Fredoka:wght@400;500;600&display=swap'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  // Forzar que el nuevo service worker tome control inmediatamente
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Borrar TODOS los caches viejos
          if (cacheName !== CACHE_NAME) {
            console.log('Borrando cache viejo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Tomar control de todas las páginas inmediatamente
      return self.clients.claim();
    })
  );
});

// Interceptar peticiones - NETWORK FIRST para HTML
self.addEventListener('fetch', (event) => {
  // Para archivos HTML, siempre buscar en la red primero
  if (event.request.url.includes('.html') || event.request.url.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Guardar la respuesta actualizada en cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Si falla la red, usar cache
          return caches.match(event.request);
        })
    );
  } else {
    // Para otros archivos (CSS, JS, imágenes), usar cache first
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request).then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
            return response;
          });
        })
    );
  }
});