let swChannel = new MessageChannel();
let serviceWorkerVersion = document.getElementById('serviceWorkerVersion');

swChannel.port1.onmessage = (event) => {
	if (event.data.type == 'VERSION') {
		serviceWorkerVersion.innerHTML = 'Version: ' + event.data.body;
	}
};

navigator.serviceWorker.register('/sw.js').then((swRegistration) => {
	navigator.serviceWorker.controller.postMessage(
		{
			type: 'INIT_PORT'
		},
		[swChannel.port2]
	);
	swChannel.port1.postMessage({
		type: 'GET',
		body: 'VERSION'
	});
});

// @ts-ignore
document.getElementById('jwtKeyInput').value = localStorage.getItem('jwt');

// Update service worker
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
					window.location.reload();
				}, 2000);
			});
		});
	});
// Reload Cache
document
	.getElementById('serviceWorkerReloadCache')
	.addEventListener('click', () => {
		swChannel.port1.postMessage({
			type: 'POST',
			body: 'RELOADCACHE'
		});
	});
// JWT Key löschen
document.getElementById('localStorageDelJWT').addEventListener('click', () => {
	if (
		window.confirm(
			'Bist du dir sicher? Eine erneute anmeldung ist erfoderlich.'
		)
	) {
		localStorage.removeItem('jwt');
		window.location.href = '/setup';
	}
});

//Setup color picker
const colorEnum = JSON.parse(localStorage.getItem('colorEnum'));
function colorPickerInit() {
	var colorPickerHTML =
		"<h3>Farben für deine Fächer Auswählen</h3><button id='colorPickerRefresh'>Zurücksetzen</button><table><tr><th>Fach</th><th>Farbe</th></tr>";
	for (var key in colorEnum) {
		colorPickerHTML += `<tr><td>${key}</td><td><input type="color" id="${key}" value="${colorEnum[key]}"/></td></tr>`;
	}
	colorPickerHTML +=
		"</table><button id='colorPickerSubmit'>Speichern</button>";
	document.getElementById('colorPicker').innerHTML = colorPickerHTML;
}
colorPickerInit();
document.getElementById('colorPickerSubmit').addEventListener('click', () => {
	for (var key in colorEnum) {
		// @ts-ignore
		colorEnum[key] = document.getElementById(key).value;
	}
	localStorage.setItem('colorEnum', JSON.stringify(colorEnum));
});
document.getElementById('colorPickerRefresh').addEventListener('click', () => {
	colorPickerInit();
});
