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

const json = JSON.parse(localStorage.getItem("colorEnum"));
function colorPickerInit(){
    var colorPickerHTML = "<h3>Farben für deine Fächer Auswählen</h3><button id='colorPickerRefresh'>Aktualisieren</button><table><tr><th>Fach</th><th>Farbe</th></tr>";
    for (var key in json) {
        colorPickerHTML += `<tr><td>${key}</td><td><input type="color" id="${key}" value="${json[key]}"/></td></tr>`
    }
    colorPickerHTML += "</table><button id='colorPickerSubmit'>Absenden</button>"
    document.getElementById("colorPicker").innerHTML = colorPickerHTML;
}
colorPickerInit();
document.getElementById("colorPickerSubmit").addEventListener('click', () => {
    for (var key in json) {
        json[key]=document.getElementById(key).value;
    }
    localStorage.setItem('colorEnum',JSON.stringify(json))
})
document.getElementById("colorPickerRefresh").addEventListener('click',()=>{
    colorPickerInit();
})
