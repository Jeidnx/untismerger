if (!localStorage.getItem('jwt')) {
	window.location.href = '/setup';
}

let swChannel = new MessageChannel();
let serviceWorkerVersion = document.getElementById('serviceWorkerVersion');

swChannel.port1.onmessage = (event) => {
	if (event.data.type == 'VERSION') {
		serviceWorkerVersion.innerHTML = 'Version: ' + event.data.body;
	}
};

navigator.serviceWorker.register('/sw.js');

navigator.serviceWorker.ready.then((swRegistration) => {
	swRegistration.active.postMessage(
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

// Update service worker
document
	.getElementById('serviceWorkerReregister')
	.addEventListener('click', () => {
		navigator.serviceWorker.getRegistration().then((registration) => {
			if (typeof registration == 'undefined') {
				navigator.serviceWorker.register('/sw.js');
				setTimeout(() => {
					window.location.reload();
				}, 2000);
				return;
			}
			registration.unregister().then(() => {
				window.location.reload();
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
// JWT Kopieren
document.getElementById('resetProfile').addEventListener('click', () => {
	if(window.confirm("Bist du dir sicher? Alle Daten werden gelöscht.")){
		fetch('/api/deleteUser', {
			method: 'POST',
			body: new URLSearchParams({
				'jwt': localStorage.getItem("jwt")
			})
		}).then(res => {
			if(res.status === 200){
				localStorage.removeItem('jwt');
				window.location.href = '/setup';
			}else{
				console.log(res);
			}
		});
	}
});
// Back Button
document.getElementById('backButton').addEventListener('click', () => {
	window.location.href = '/';
});

//Setup color picker
const colorEnum = JSON.parse(localStorage.getItem('colorEnum'));
function colorPickerInit() {
	let colorPickerHTML =
		'<h3>Farben für deine Fächer Auswählen</h3><table><tr><th>Fach</th><th>Farbe</th></tr>';
	for (let key in colorEnum) {
		colorPickerHTML += `<tr><td>${key}</td><td><input type="color" id="${key}" value="${colorEnum[key]}"/></td></tr>`;
	}
	colorPickerHTML +=
		"</table><button id='colorPickerRefresh'>Zurücksetzen</button><button id='colorPickerSubmit'>Speichern</button>";
	document.getElementById('colorPicker').innerHTML = colorPickerHTML;
}
colorPickerInit();
document.getElementById('colorPickerSubmit').addEventListener('click', () => {
	for (let key in colorEnum) {
		// @ts-ignore
		colorEnum[key] = document.getElementById(key).value;
	}
	localStorage.setItem('colorEnum', JSON.stringify(colorEnum));
});
document.getElementById('colorPickerRefresh').addEventListener('click', () => {
	colorPickerInit();
});
document.getElementById("notificationsGet").addEventListener("click", () => {
	let notificationReturn = document.getElementById("notificationsReturn");
	getNotificationSubscription().then(e => notificationReturn.innerText = e).catch(e => notificationReturn.innerText = e);
})
// Service worker push notification
function getNotificationSubscription() {
	return new Promise((resolve, reject) => {
	Notification.requestPermission().then((permission) => {
		if (permission === 'granted') {
			navigator.serviceWorker.ready
				.then(function (registration) {
					// Use the PushManager to get the user's subscription to the push service.
					return registration.pushManager
						.getSubscription()
						.then(async function (subscription) {
							if (subscription) {
								return subscription;
							}

							const response = await fetch(
								'/api/vapidPublicKey'
							);
							const vapidPublicKey = await response.text();
							const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

							return registration.pushManager.subscribe({
								userVisibleOnly: true,
								applicationServerKey: convertedVapidKey
							});
						});
				})
				.then(function (subscription) {
					if(!subscription){
						return;
					}

					let xhr = new XMLHttpRequest();
					xhr.addEventListener('load', () => {
						if (!(xhr.status === 201)) {
							reject("Konnte Subscription Object nicht an den Server Senden.");
						}else{
							resolve("Erfolgreich Angelegt");
						}
					})
					xhr.open('POST', '/api/register', true);
					xhr.setRequestHeader(
						'Content-type',
						'application/x-www-form-urlencoded'
					);
					xhr.send('subscription=' + JSON.stringify(subscription) + '&jwt=' + localStorage.getItem("jwt"));
				});
		}
	}).catch(reject);
	})
}
function urlBase64ToUint8Array(base64String) {
	let padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	let base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

	let rawData = window.atob(base64);
	let outputArray = new Uint8Array(rawData.length);

	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}

