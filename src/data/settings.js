if (!localStorage.getItem('jwt')) {
	window.location.href = '/setup';
}

let swChannel = new MessageChannel();
let serviceWorkerVersion = document.getElementById('serviceWorkerVersion');

swChannel.port1.onmessage = (event) => {
	if (event.data.type === 'VERSION') {
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
// Profil Löschen
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

// Discord notifs
document.getElementById("notificationsDiscord").addEventListener("click", () => {
	window.open("https://discord.gg/P8adQc8N63", '_blank').focus();
})
document.getElementById("discordGetToken").addEventListener("click", () => {
	fetch("/api/getDiscordToken",{
		method: 'POST',
		body: new URLSearchParams({
			'jwt': localStorage.getItem("jwt"),
		})
	}).then(response => response.json()).then(data => {
		let discordReturn;
		if(document.getElementById("discordReturn") !== null){
			discordReturn = document.getElementById("discordReturn");
		}else{
			discordReturn = document.createElement("h4");
			discordReturn.setAttribute("id", "discordReturn");
			document.getElementById("notifications").appendChild(discordReturn);
		}

		if(data.error){
			discordReturn.innerText = data.error;
			return;
		}
		discordReturn.innerText = data.secret;

	}).catch(console.error);
})
document.getElementById("deleteLocalCache").addEventListener("click", () => {
	localStorage.setItem("timeTable", "{}");
})