if (localStorage.getItem('jwt')) {
	window.location.href = '/';
}
if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('/sw.js');
}

let stage = 1;
let submitForm = document.getElementById('form');
let qrButton = document.getElementById('qrButton');
document.getElementById('manuelButton');

barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });

async function startVideo() {
	return new Promise((resolve, reject) => {
		window.navigator.mediaDevices
			.getUserMedia({video: true})
			.then((mStream) => {
				resolve(mStream);
			})
			.catch(() => {
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
							obj[key] = e[1];
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
	let xhr = new XMLHttpRequest();

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
	document.getElementById('captureButton');
	startVideo()
		.then((mStream) => {
			// @ts-ignore
			videoStream.srcObject = mStream;
			// @ts-ignore
			let imageCp = new ImageCapture(mStream.getTracks()[0]);

			let interval = window.setInterval(async () => {
				imageCp.grabFrame().then((bitmap) => {
					detectQR(bitmap)
						.then((qrCode) => {
							document.getElementById('qrStatus').innerHTML = 'Laden...';
							// @ts-ignore
							document.getElementById('usernameInput').value = qrCode.user;
							// @ts-ignore
							document.getElementById('secretInput').value = qrCode.key;
							clearInterval(interval);
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
			}, 1000);
			document.getElementById("qrBackButton").addEventListener("click", () => {
				clearInterval(interval);
				mStream
					.getTracks()
					.forEach((/** @type {{ stop: () => void; }} */ track) => {
						track.stop();
					});
			})
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
