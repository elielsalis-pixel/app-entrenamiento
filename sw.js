const CACHE = 'entreno-v2';
const FILES = ['index.html', 'manifest.json', 'icon.svg', 'exercise-map.js'];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e=>{
  const isCode = e.request.url.endsWith('.html') || e.request.url.endsWith('.js') || e.request.url.endsWith('.json') || e.request.mode === 'navigate';
  if(isCode){
    // red primero: siempre busca la versión más nueva; si no hay internet, usa la guardada
    e.respondWith(
      fetch(e.request).then(res=>{
        const copy = res.clone();
        caches.open(CACHE).then(c=>c.put(e.request, copy));
        return res;
      }).catch(()=> caches.match(e.request))
    );
  } else {
    // imágenes y el resto: caché primero, para no gastar datos de más
    e.respondWith(
      caches.match(e.request).then(cached=>cached || fetch(e.request))
    );
  }
});
