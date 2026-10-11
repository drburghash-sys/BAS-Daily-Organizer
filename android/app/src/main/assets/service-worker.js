const CACHE='bas-daily-organizer-v1.3-widget-font-time';
const FILES=['./','./index.html','./planner.js','./share.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./memo.html','./documents.html','./maintenance.html','./car.html'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(x=>x!==CACHE).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(resp=>{if(resp.ok){let clone=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,clone))}return resp})))})
