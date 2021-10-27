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
	.getElementById('serviceWorkerReregister')
	.addEventListener('click', () => {
		navigator.serviceWorker.getRegistration().then((registration) => {
			if (typeof registration == 'undefined') {
				navigator.serviceWorker.register('/sw.js');
				return;
			}
			registration.unregister().then(() => {
				setTimeout(() => {
					console.log('Reregistered');
					navigator.serviceWorker.register('/sw.js');
				}, 2000);
			});
		});
	});
function updatePage() {
	broadcast.postMessage({
		type: 'GET',
		body: 'VERSION'
	});
	// @ts-ignore
	document.getElementById('jwtKeyInput').value = localStorage.getItem('jwt');
}
function deleteLocalCache() {
	localStorage.removeItem('timeTable');
}

document
	.getElementById('serviceWorkerReloadCache')
	.addEventListener('click', () => {
		broadcast.postMessage({
			type: 'POST',
			body: 'RELOADCACHE'
		});
	});
document.getElementById('colorPickerRefresh').addEventListener('click', () => {
	document.getElementById('colorPickerData').innerHTML = localStorage
		.getItem('colorEnum')
		// @ts-ignore
		.replaceAll(',', ',\n');
});
document.getElementById('colorPickerData').innerHTML = localStorage
	.getItem('colorEnum')
	// @ts-ignore
	.replaceAll(',', ', \n');
document.getElementById('colorPickerSubmit').addEventListener('click', () => {
	localStorage.setItem(
		'colorEnum',
		// @ts-ignore
		document.getElementById('colorPickerData').innerHTML.replaceAll('\n', '')
	);
});
