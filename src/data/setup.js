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

let barcodeDetector;
if ('BarcodeDetector' in window) {
	// @ts-ignore
	qrButton.disabled = false;
	// @ts-ignore
	barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
}
const videoSettings = {
	video: {
		width: {
			min: 270,
			ideal: 1080,
			max: 1080
		},
		height: {
			min: 270,
			ideal: 1080,
			max: 1080
		},
		aspectRatio: 1,
		frameRate: { max: 30 },
		facingMode: 'environment'
	}
};
async function startVideo() {
	return new Promise((resolve, reject) => {
		navigator.mediaDevices
			.getUserMedia(videoSettings)
			.then((mStream) => {
				resolve(mStream);
				return;
			})
			.catch((err) => {
				reject('Keine Kamera');
			});
	});
}
/**
 * @param {ImageBitmap} bitmap
 */
async function detectQR(bitmap) {
	return new Promise((resolve, reject) => {
		if (typeof barcodeDetector === 'undefined') {
			reject('BarcodeDetector API wird nicht unterstützt.');
			return;
		}
		barcodeDetector
			.detect(bitmap)
			.then((qrArr) => {
				if (qrArr.length > 0) {
					const raw = qrArr[0].rawValue;
					let obj = {};
					raw
						.split('?')[1]
						.split('&')
						.forEach((/** @type {string} */ element) => {
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
}

function submitHandler() {
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
			const message = JSON.parse(xhr.response).message;
			document.getElementById('return1').innerHTML = message;
			document.getElementById('returnJwt').innerHTML = message;
			document.getElementById("return2").innerHTML = message;
			return;
		}

		switch (stage) {
			case 1: {
				if (JSON.parse(xhr.response).jwt) {
					localStorage.setItem('jwt', JSON.parse(xhr.response).jwt);
					window.location.href = '/';
					return;
				}

				stage++;
				document.getElementById('stage1qr').style.display = 'none';
				document.getElementById('stage1manuel').style.display = 'none';
				document.getElementById("stage1password").style.display = 'none';
				document.getElementById('stage2').style.display = '';
				return;
			}
			case 2: {
				localStorage.setItem('jwt', JSON.parse(xhr.response)["jwt"]);
				window.location.href = '/';
				return;
			}
		}
	});
	xhr.open('POST', '/api/setup');
	xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
	xhr.send(formBody);
}

submitForm.onsubmit = (e) => {
	e.preventDefault();
	submitHandler();
};

/**
 * @param {number} number Number
 */
function setStage(number) {
	stage = number;
}
// QR / Video handler
qrButton.addEventListener('click', async () => {
	let videoStream = document.getElementById('videoStream');
	let captureButton = document.getElementById('captureButton');
	startVideo()
		.then((mStream) => {
			// @ts-ignore
			videoStream.srcObject = mStream;
			// @ts-ignore
			let imageCp = new ImageCapture(mStream.getTracks()[0]);

			captureButton.addEventListener('click', async () => {
				imageCp.grabFrame().then((bitmap) => {
					detectQR(bitmap)
						.then((qrCode) => {
							document.getElementById('qrStatus').innerHTML = 'Laden...';
							// @ts-ignore
							document.getElementById('usernameInput').value = qrCode.user;
							// @ts-ignore
							document.getElementById('secretInput').value = qrCode.key;
							submitHandler();

							mStream
								.getTracks()
								.forEach((/** @type {{ stop: () => void; }} */ track) => {
									track.stop();
								});
						})
						.catch(
							(err) => (document.getElementById('qrStatus').innerHTML = err)
						);
				});
			});
		})
		.catch((error) => {
			document.getElementById('qrStatus').innerHTML = error;
		});
});

function resetInputs(){
	document.getElementById("usernameInputPw").value = "";
	document.getElementById("password").value = "";
	document.getElementById("secretInput").value = "";
	document.getElementById("usernameInput").value = "";
	document.getElementById("jwtInput").value = "";
}
