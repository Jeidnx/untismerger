// @ts-nocheck
const cacheVersion = '1.0';
const cacheName = 'untmerger_v' + cacheVersion;
const toCache = [
	'/',
	'/sw.js',
	'/data/timetable.css',
	'/data/timetable.js',
	'/data/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
	console.log('[Service Worker] Installing');
	event.waitUntil(
		caches.open(cacheName).then((cache) => {
			return cache.addAll(toCache);
		})
	)
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
		console.log('[Service Worker] Skipping POST request');
		return;
	}
	
	console.log("[Service Worker] fetching: ");
	console.log(event.request.url);
	event.respondWith(
		caches.match(event.request).then((response) => {
			if (response) {
				console.log("[Service Worker] Cache hit");
				return response;
			}
			console.log("[Service Worker] Cache miss");
			return fetch(event.request);
		})
	)
});
