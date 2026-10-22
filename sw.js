const CACHE='pillars-v13';
const ASSETS=['./','./core.js?v=pillars-v13','./career-roadmap-data.js?v=roadmap-v3','./career-roadmap-ui.js?v=roadmap-v3','./enhancements.js?v=pillars-v13','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    const freshUrl=new URL(request.url);
    freshUrl.searchParams.set('_app_version',CACHE);
    event.respondWith(fetch(freshUrl.href,{cache:'no-store'}).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}
      return response;
    }).catch(()=>caches.match(request)));
    return;
  }
  event.respondWith(fetch(request).then(response=>{
    if(response.ok&&!response.redirected){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}
    return response;
  }).catch(()=>caches.match(request)));
});

