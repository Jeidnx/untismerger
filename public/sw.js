const cacheVersion = '3.00';
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
    if (event.request.method === 'POST' || event.request.url.includes("api")) {
        return fetch(event.request);
    }
    event.respondWith(
        // Try the cache
        caches
            .match(event.request)
            .then((response) => {
                if (response) return response;
                //Fallback to network and cache request
                return fetch(event.request).then(networkResponse => {
                    if(networkResponse){
                        return caches.open(cacheName).then(cache => {
                            cache.put(event.request, networkResponse.clone());
                            return networkResponse;
                        })
                    }

                })
            }).catch(() => {
            return caches.match('/_offline.html');

        })
    );
});

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
