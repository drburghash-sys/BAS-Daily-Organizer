const CACHE='bas-unified-v2.1-car-20261011';
const ASSETS=['./','./index.html','./core-v2.js','./tasks-v2.js','./records-v2.js','./vehicle-care-model.js','./vehicle-care-ui.js','./vehicle-care-actions.js','./migration-v2.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));self.skipWaiting();
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
 self.clients.claim();
});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;
 event.respondWith(fetch(event.request).then(resp=>{
   if(resp.ok){let copy=resp.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
   return resp;
 }).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('./index.html'))));
});