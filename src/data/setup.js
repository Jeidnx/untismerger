if (localStorage.getItem('jwt')) {
	window.location.href = '/';
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
				console.log('stage1 complete');
				document.getElementById('stage1qr').style.visibility = 'hidden';
				document.getElementById('stage1manuel').style.visibility = 'hidden';
				document.getElementById('stage2').style.visibility = 'visible';
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
