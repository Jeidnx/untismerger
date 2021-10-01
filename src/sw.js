// @ts-nocheck
const cacheVersion = '1.5';
const cacheName = 'untmerger_v' + cacheVersion;
const toCache = [
	'/',
	'/data/timetable.css',
	'/data/timetable.js',
	'/data/manifest.webmanifest',
	'/icons/icon_apple.png',
	'/icons/icon.png'
];

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
