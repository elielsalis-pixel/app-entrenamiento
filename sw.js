const CACHE = 'entreno-v9';
const FILES = ['index.html', 'manifest.json', 'icon.svg', 'biblioteca.js', 'entrenador.js', 'rutinas.js'];

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
  if(e.request.method !== 'GET') return;
  const url = e.request.url;
  // lo de otros sitios (la base en la nube, el ingreso con Google) va directo a la red; solo se guarda el SDK de Firebase
  if(!url.startsWith(self.location.origin) && !url.includes('gstatic.com/firebasejs/')) return;
  const esCodigo = url.endsWith('.html') || url.endsWith('.js') || url.endsWith('.json') || e.request.mode === 'navigate';
  if(esCodigo){
    // red primero: siempre la versión más nueva; sin internet, la guardada
    e.respondWith(
      fetch(e.request).then(res=>{
        const copia = res.clone();
        caches.open(CACHE).then(c=>c.put(e.request, copia));
        return res;
      }).catch(()=> caches.match(e.request))
    );
  } else {
    // fotos y demás: caché primero; lo que se baja se guarda para usarlo sin internet
    e.respondWith(
      caches.match(e.request).then(guardado=>guardado || fetch(e.request).then(res=>{
        if(res.ok && url.startsWith(self.location.origin)){
          const copia = res.clone();
          caches.open(CACHE).then(c=>c.put(e.request, copia));
        }
        return res;
      }))
    );
  }
});
