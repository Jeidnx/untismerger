formElem = document.getElementById('form');
formElem.onsubmit = async (e) => {
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
};
