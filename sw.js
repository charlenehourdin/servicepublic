/* Service Worker — cache des ressources statiques */
const CACHE = 'servicepublic-v3';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/main.js',
  './fonts/source-sans-3-400.woff2',
  './fonts/source-sans-3-600.woff2',
  './fonts/source-sans-3-700.woff2',
  './fonts/archivo-expanded.woff2',
  './img/hero-illustration.jpg',
  './img/logo-1.png',
  './img/logo-2.png',
  './img/logo-3.png',
  './img/logo-4.png',
  './img/logo-5.png',
  './img/logo-6.png'
];

self.addEventListener('install', (event)=>{
  event.waitUntil(
    caches.open(CACHE).then((cache)=> cache.addAll(ASSETS)).then(()=> self.skipWaiting())
  );
});

self.addEventListener('activate', (event)=>{
  event.waitUntil(
    caches.keys().then((keys)=>
      Promise.all(keys.filter((k)=> k !== CACHE).map((k)=> caches.delete(k)))
    ).then(()=> self.clients.claim())
  );
});

self.addEventListener('fetch', (event)=>{
  const { request } = event;
  if(request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((cached)=>{
      if(cached) return cached;
      return fetch(request).then((response)=>{
        const url = new URL(request.url);
        if(response.ok && url.origin === self.location.origin){
          const clone = response.clone();
          caches.open(CACHE).then((cache)=> cache.put(request, clone));
        }
        return response;
      }).catch(()=> cached);
    })
  );
});
