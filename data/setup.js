if (localStorage.getItem('jwt')) {
	window.location.href = '/';
}

submitForm = document.getElementById('form');
/* formElem.onsubmit = async (e) => {
	e.preventDefault();

	let response = await fetch('/setup', {
		method: 'POST',
		//@ts-ignore
		body: new FormData(formElem)
	});

	let result = await response.text();
	console.log(result);

	if (response.status === 200) {
		localStorage.setItem('jwt', result);
		window.location.href = '/';
	} else {
		console.log(response);
		document.getElementById('return1').innerHTML = result;
	}
}; */

submitForm.onsubmit = (e) => {
	e.preventDefault();
	let formBody = '';

	//@ts-ignore
	for (let i = 0; i < submitForm.elements.length; i++) {
		//@ts-ignore
		const element = submitForm.elements[i];
		let value;

		if (element.type === 'checkbox') {
			value = element.checked;
		} else {
			value = element.value;
		}

		formBody += `${element.name}=${value}&`;
	}

	var xhr = new XMLHttpRequest();

	xhr.addEventListener('load', () => {
		if (!(xhr.status === 200)) {
			document.getElementById('return1').innerHTML = xhr.response;
			return;
		}
		localStorage.setItem('jwt', xhr.response);
		window.location.href = '/';
	});
	xhr.open('POST', '/setup');
	xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
	xhr.send(formBody);
};
