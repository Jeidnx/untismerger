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
    //TODO: Im pretty sure this isn't working properly
    event.respondWith(
        fetch(event.request).then(networkResponse => {
            if (!networkResponse) {
                return caches.match('/_offline.html').then((offlinePage) => {
                    if(!offlinePage){
                        return new Response("Kann Offline Seite nicht finden.", {
                            status: 418,
                        })
                    }
                    return offlinePage
                })
            }
            return networkResponse
        })
    )
})

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'INIT_PORT') {
        let getVersionPort = event.ports[0];
        getVersionPort.onmessage = (event) => {
            switch (event.data.type) {
                case 'GET':
                    switch (event.data.body) {
                        case 'VERSION':
                            getVersionPort.postMessage({
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
                            });
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
