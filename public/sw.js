self.addEventListener('install', (event) => {
  console.log('Service Worker de Pachangueo instalado correctamente.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activado.');
});

self.addEventListener('fetch', (event) => {
  // Pasarela básica: dejamos que el navegador gestione las peticiones online con normalidad
  event.respondWith(fetch(event.request));
});