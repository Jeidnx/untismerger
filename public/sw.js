const cacheVersion = '3.1.3';
const cacheName = 'untismerger_v' + cacheVersion;


self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing');
    self.skipWaiting();
    event.waitUntil(
        caches.open(cacheName).then((cache) => {
            return cache.add("/_offline.html");
        })
    );
});

self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activate');
    //Clear old caches
    event.waitUntil(
        caches.keys().then((thisCache) => {
            return Promise.all(
                thisCache.map((thisCacheName) => {
                    if (thisCacheName !== cacheName) {
                        return caches.delete(thisCacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;

    if(request.method === "GET"){
        event.respondWith(fetch(request).catch((e) => {
            console.error("Konnte Seite nicht Laden " + e);
            return caches.open(cacheName).then((cache) => {
                return cache.match("_offline.html");
            })
        }))
    }
})

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'INIT_PORT') {
        let messagePort = event.ports[0];
        messagePort.onmessage = (event) => {
            switch (event.data.type) {
                case 'GET':
                    switch (event.data.body) {
                        case 'VERSION':
                            messagePort.postMessage({
                                type: 'VERSION',
                                body: cacheVersion
                            });
                            break;
                    }
                    break;
                case 'POST':
                    switch (event.data.body) {
                        case 'CLEARCACHE':
                            caches.keys().then((cachesToDelete) => {
                                cachesToDelete.forEach((cache) => {
                                    caches.delete(cache)
                                })
                            }).then(() => {
                                caches.open(cacheName).then((cache) => {
                                    return cache.add("/_offline.html");
                                })
                            })
                    }
            }
        };
    }
});

self.addEventListener('push', function (event) {
    console.log("Got Push: ", event.data.text());
    const payload = event.data.json();
    if (payload.type === 'notification') {
        event.waitUntil(
            self.registration.showNotification('Untismerger', {
                body: payload.body
            })
        );
    }
});
