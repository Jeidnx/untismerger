if (localStorage.getItem('jwt')) {
	window.location.href = '/';
}
/*
if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('/sw.js');
}*/
const videoSettings = {
	video: {
		width: {
			min: 480,
			ideal: 1080,
			max: 1080
		},
		height: {
			min: 480,
			ideal: 1080,
			max: 1080
		},
		facingMode: 'environment'
	}
};
let mStream;
async function startVideo() {
	return new Promise((resolve, reject) => {
		navigator.mediaDevices.getUserMedia(videoSettings).then((mStream) => {
			resolve(mStream);
		});
	});
}
async function detectQR() {
	return new Promise((resolve, reject) => {
		startVideo().then((mediaStream) => {
			// @ts-ignore
			let imageCp = new ImageCapture(mediaStream.getTracks()[0]);
			imageCp.takePhoto().then((photo) => {
				// @ts-ignore
				let barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
				createImageBitmap(photo).then((bitmap) => {
					barcodeDetector
						.detect(bitmap)
						.then((qrArr) => {
							if (qrArr.length > 0) {
								const raw = qrArr[0].rawValue;
								let obj = {};
								raw
									.split('?')[1]
									.split('&')
									.forEach((element) => {
										const e = element.split('=');
										const key = e[0];
										const val = e[1];
										obj[key] = val;
									});

								resolve(obj);
								return;
							}
							reject('Konnte kein QR Code finden');
						})
						.catch(console.log);
				});
			});
		});
	});
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
			document.getElementById('returnJwt').innerHTML = xhr.response;
			return;
		}

		switch (stage) {
			case 1: {
				if (xhr.response !== 'OK') {
					localStorage.setItem('jwt', xhr.response);
					window.location.href = '/';
					return;
				}

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
