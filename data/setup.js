if (localStorage.getItem('jwt')) {
	window.location.href = '/';
}

let submitForm = document.getElementById('form');

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
