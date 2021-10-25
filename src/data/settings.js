const broadcast = new BroadcastChannel('sw-channel');

broadcast.onmessage = (event) => {
	if (event.data.type == 'VERSION') {
		serviceWorkerVersion.innerHTML = 'Version: ' + event.data.body;
	}
};

let serviceWorkerVersion = document.getElementById('serviceWorkerVersion');
broadcast.postMessage({
	type: 'GET',
	body: 'VERSION'
});
// @ts-ignore
document.getElementById('jwtKeyInput').value = localStorage.getItem('jwt');
document
	.getElementById('serviceWorkerClearCache')
	.addEventListener('click', () => {
		broadcast.postMessage({
			type: 'POST',
			body: 'CLEARCACHE'
		});
	});
document
	.getElementById('serviceWorkerUnregister')
	.addEventListener('click', () => {
		navigator.serviceWorker.getRegistration().then((registration) => {
			registration.unregister();
		});
	});
document
	.getElementById('serviceWorkerReregister')
	.addEventListener('click', () => {
		navigator.serviceWorker.getRegistration().then((registration) => {
			registration.unregister().then(() => {
				setTimeout(() => {
					console.log('Reregistered');
					navigator.serviceWorker.register('/sw.js');
				}, 2000);
			});
		});
	});
