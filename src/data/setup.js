if (localStorage.getItem('jwt')) {
	window.location.href = '/';
}

if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('/sw.js');
}

let stage = 1;
let submitForm = document.getElementById('form');
let qrButton = document.getElementById('qrButton');
let manuelButton = document.getElementById('manuelButton');

submitForm.onsubmit = (e) => {
	e.preventDefault();

	let formBody = `stage=${stage}`;
	//@ts-ignore
	for (let i = 0; i < submitForm.elements.length; i++) {
		//@ts-ignore
		const element = submitForm.elements[i];
		if (element.type == 'submit') {
			continue;
		}

		let value;
		if (element.type === 'checkbox') {
			value = element.checked;
		} else {
			value = element.value;
		}

		formBody += `&${element.name}=${value}`;
	}
	var xhr = new XMLHttpRequest();

	xhr.addEventListener('load', () => {
		if (!(xhr.status === 200)) {
			document.getElementById('return1').innerHTML = xhr.response;
			return;
		}
		switch (stage) {
			case 1: {
				stage++;
				document.getElementById('stage1qr').style.display = 'none';
				document.getElementById('stage1manuel').style.display = 'none';
				document.getElementById('stage2').style.display = '';
				return;
			}
			case 2: {
				localStorage.setItem('jwt', xhr.response);
				window.location.href = '/';
				return;
			}
		}
	});
	xhr.open('POST', '/setup');
	xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
	xhr.send(formBody);
};
/**
 * @param {number} number Number
 */
function setStage(number) {
	stage = number;
}
