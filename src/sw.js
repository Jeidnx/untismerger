// @ts-nocheck
const cacheVersion = '1.86';
const cacheName = 'untmerger_v' + cacheVersion;
const toCache = [
	'/',
	'/data/timetable.css',
	'/data/timetable.js',
	'/data/settings.js',
	'/data/manifest.webmanifest',
	'/icons/icon_apple.png',
	'/icons/icon.png',
	'/settings.html',
	'/data/settings.css',
	'icons/background.png'
];

self.addEventListener('install', (event) => {
	console.log('[Service Worker] Installing');
	self.skipWaiting();
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

self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'INIT_PORT') {
		getVersionPort = event.ports[0];
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
							caches.keys().then((cache) => {
								caches.delete(cache);
							});
							break;
						case 'RELOADCACHE':
							caches
								.keys()
								.then((cache) => {
									caches.delete(cache);
								})
								.then(() => {
									caches.open(cacheName).then((cache) => {
										return cache.addAll(toCache);
									});
								});
					}
			}
		};
	}
});

self.addEventListener('push', function (event) {
	const payload = event.data.json();
	if (payload.type === 'notification') {
		event.waitUntil(
			self.registration.showNotification('Untismerger', {
				body: payload.body
			})
		);
		return;
	}
});
