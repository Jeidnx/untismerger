// @ts-nocheck
const cacheVersion = '1.71';
const cacheName = 'untmerger_v' + cacheVersion;
const toCache = [
	'/',
	'/data/timetable.css',
	'/data/timetable.js',
	'/settings.html',
	'/data/settings.js',
	'/data/manifest.webmanifest',
	'/icons/icon_apple.png',
	'/icons/icon.png'
];

const broadcast = new BroadcastChannel('sw-channel');

self.addEventListener('install', (event) => {
	console.log('[Service Worker] Installing');
	event.waitUntil(
		caches.open(cacheName).then((cache) => {
			return cache.addAll(toCache);
		})
	);
});

self.addEventListener('activate', (event) => {
	console.log('[Service Worker] Activate');
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
	if (event.request.method === 'POST') {
		return;
	}

	event.respondWith(
		caches.match(event.request).then((response) => {
			if (response) {
				return response;
			}
			return fetch(event.request);
		})
	);
});

broadcast.onmessage = (event) => {
	switch (event.data.type) {
		case 'GET':
			switch (event.data.body) {
				case 'VERSION':
					broadcast.postMessage({ type: 'VERSION', body: cacheVersion });
					break;
			}
			break;
		case 'POST':
			switch (event.data.body) {
				case 'CLEARCACHE':
					caches.keys().then((cache) => {
						caches.delete(cache);
					});
					break;
			}
	}
};
