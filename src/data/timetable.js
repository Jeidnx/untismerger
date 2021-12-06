if (!localStorage.getItem('jwt')) {
	window.location.href = '/setup';
}
if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('/sw.js');
}

let colorEnum = JSON.parse(localStorage.getItem('colorEnum')) || {};

const colorPalette = [
	'#FF7878',
	'#F3F0D7',
	'#D5BFBF',
	'#8CA1A5',
	'#F6C6EA',
	'#BEAEE2',
	'#CDF0EA',
	'#79B4B7',
	'#DE8971',
	'#F3E6E3',
	'#F9F9F9',
	'#E1F2FB',
	'#745C97',
	'#E0C097'
];

const startTimeEnum = {
	800: 0,
	945: 1,
	1130: 2,
	1330: 3,
	1515: 4
};
const reverseStartTimeEnumFormatted = {
	0: "08:00",
	1: "09:45",
	2: "11:30",
	3: "13:30",
	4: "15:15"
}
const reverseEndTimeEnumFormatted = {
	0: "09:30",
	1: "11:15",
	2: "13:00",
	3: "15:00",
	4: "16:45"
}
const weekDayEnum = {
	0: 'Montag',
	1: 'Dienstag',
	2: 'Mittwoch',
	3: 'Donnerstag',
	4: 'Freitag'
};

///Date Obj set to the monday of the week that the user wants to see.
let mondayOfSelectedWeek = new Date(getWeekFromDay(new Date())[0]);

let timeTable = JSON.parse(localStorage.getItem('timeTable')) || {};
/**
 * @param {Date} dateIn
 * @returns {string[]}
 */
function getWeekFromDay(dateIn) {
	// For anyone wondering why this is, try without 😃
	let date = new Date(dateIn);

	let week = [];
	for (let i = 1; i <= 5; i++) {
		let first = date.getDate() - date.getDay() + i;
		let day = new Date(date.setDate(first)).toISOString().slice(0, 10);
		week.push(day);
	}
	return week;
}



/**
 * @param {boolean} purge Should the cache be purged
 * @param {Date} date Date of the week to display
 * @returns {Promise<void>}
 */
function displayWeek(purge, date){
	return new Promise((resolve, reject) => {
		let week = getWeekFromDay(date);

		if(purge){
			getWeek(week).then(() => {
				addWeek(week).then(resolve);
			}).catch(reject);
		}else{
			if(timeTable[week[1]]){
				addWeek(week).then(resolve);
			}else{
				displayWeek(true, new Date(week[1])).then(resolve).catch(reject);
			}
		}
	})
}

/**
 *
 * @param {String[]} week Array of Dates to fetch
 * @return {Promise<void>} Resolves when days have been added to the DOM
 */
function addWeek(week){
	return new Promise((resolve) => {
	const variableContent = document.getElementById('variableContent');
	variableContent.innerHTML = "";
	let weekDisplay = document.getElementById('weekDisplay');
	let firstDay = week[0].split('-');
	let lastDay = week[4].split('-');
	weekDisplay.innerHTML = `${firstDay[2]}.${firstDay[1]} - ${lastDay[2]}.${lastDay[1]}`;

	///If we are currently in the past
	let past = true;

	for(let index = 0; index < 5; index++) {
		let date = week[index];
		let day = document.createElement('div');
		day.classList.add("day");
		let firstRow = document.createElement('div');
		firstRow.classList.add("row");
		firstRow.innerHTML = weekDayEnum[index];
		let today = new Date();


		day.appendChild(firstRow);

		for (let i = 0; i < 5; i++) {
			let containingRow = document.createElement('div');
			containingRow.classList.add("row");

			if(timeTable[date][i]){
				const element = timeTable[date][i];
				let row = document.createElement("div");
				row.classList.add('stunde');
				row.innerHTML = `<p>${element['subject']}<p>
                	<p>${element['room']} - ${element['teacher']}</p>`;
				let infos = document.createElement("div");
				infos.classList.add("infos");
				infos.innerHTML = `
					<p>Fach: ${element["subject"]}<br>Raum: ${element['room']}<br>Lehrer: ${element['teacher']}</p>`

				// Text stuff
				const text = `
					<p>LSText: ${element["lstext"]}<br>
					Info: ${element["info"]}<br>
					SubsText: ${element["substText"]}<br>
					SG: ${element["sg"]}<br>
					bkRemark: ${element["bkRemark"]}<br>
					bkText: ${element["bkText"]}</p>`

				infos.innerHTML += text;


				let button = document.createElement("button");
				button.setAttribute("type", "button");
				button.setAttribute("onclick", `hideInfo(${index}, ${i + 1});`);
				button.classList.add("infoButton");
				button.innerText = "Zurück"
				infos.appendChild(button);
				row.setAttribute("onclick", `displayInfo(${index}, ${i + 1})`);
				if (element['code'] === 'cancelled') {
					//TODO: Stripe things with color / red
					row.classList.add('cancelled');
				}
				if (element['code'] === 'irregular') {
					//TODO: Do something
					row.classList.add('irregular');
				}
				let color = "#FFFFFF", backgroundColor = "#000000";

				// Check if this lesson has passed
				if(past){
					let thisTime = new Date(date + "T" + reverseEndTimeEnumFormatted[i]);
					if(typeof override !== "undefined"){
						today = override;
					}

					if(today < thisTime){
						// This section is only called once, on the transition between past and future.
						past = false;

						// We want a scale from 0 - 100 on how far we progressed. 0 = 9:45; 100 = 11:15
						const start = new Date(date + "T" + reverseStartTimeEnumFormatted[i]);

						let q = Math.abs(today - start);
						let d = Math.abs(thisTime - start);

						const fraction = Math.round((q / d) * 100)
						let progress = document.createElement("div");
						progress.classList.add("progressBar");
						progress.style.top = String(fraction + "%");

						row.appendChild(progress);

						if (!colorEnum[element['subject']]) {
							colorEnum[element['subject']] =
								colorPalette[Math.floor(Math.random() * colorPalette.length)];
						}
						color = getContrastColor(colorEnum[element['subject']]);
						backgroundColor = colorEnum[element['subject']];
					}else{
						backgroundColor = "#525252";
						color = "#d3d3d3";
					}

				}
				if(!past){
					if (!colorEnum[element['subject']]) {
						colorEnum[element['subject']] =
							colorPalette[Math.floor(Math.random() * colorPalette.length)];
					}
					color = getContrastColor(colorEnum[element['subject']]);
					backgroundColor = colorEnum[element['subject']];
				}

				row.style.color = color;
				infos.style.color = color;
				row.style.backgroundColor = backgroundColor;
				infos.style.backgroundColor = backgroundColor;

				containingRow.appendChild(row);
				containingRow.appendChild(infos);
			}
			day.appendChild(containingRow);
		}
		variableContent.appendChild(day)
	}
	localStorage.setItem('colorEnum', JSON.stringify(colorEnum));
	resolve();
	})
}

/**
 *
 * @param {String[]} week
 * @return {Promise<void>} Resolves when all data is saved to the timeTable obj and localstorage
 */
function getWeek(week){
	return new Promise((resolve, reject) => {
		let xhr = new XMLHttpRequest();
		xhr.addEventListener('load', () => {
			if (!(xhr.status === 200)) {
				if(xhr.status === 502){
					reject("Der Server ist wegen Wartungsarbeiten nicht verfügbar.");
					return;
				}
				reject(JSON.parse(xhr.response).message);
				return;
			}

			week.forEach(day => {
				timeTable[day] = [];
				for(let i = 0; i < 5; i++){
					timeTable[day][i] = false;
				}
			})

			let data = JSON.parse(xhr.response).data;

			data.forEach(element => {
				let d = convertUntisDateToDate(element.date).toISOString().slice(0, 10)
				let start = startTimeEnum[element.startTime]
				delete element.startTime;
				delete element.date;
				if(timeTable[d][start]){
					console.log("Got conflict at: ", d, start);
					console.log("Old: ", timeTable[d][start]);
					console.log("New: ", element);
					if(element.code === 'cancelled'){
						return;
					}
				}
				timeTable[d][start] = element;

			})
			localStorage.setItem("timeTable", JSON.stringify(timeTable))
		resolve()

		})
		xhr.open('POST', '/api/getTimeTableWeek');
		xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		xhr.send(`jwt=${localStorage.getItem('jwt')}&startDate=${week[0]}&endDate=${week[4]}`);

})

	/**
	 *
	 * @param {int} date Untis date format
	 * @return {Date} JS Date Object
	 */
	function convertUntisDateToDate(date){

		const year = Math.floor(date / 10000)
		const month = Math.floor((date - (year * 10000)) / 100);
		const day = (date - (year * 10000) - month * 100);

		return new Date(year, month - 1, day, 8)
	}
}


let _startY;
let _startX;

document.body.addEventListener(
	'touchstart',
	(e) => {
		_startY = e.touches[0].pageY;
		_startX = e.touches[0].pageX;
	},
	{ passive: true }
);

document.body.addEventListener(
	'touchmove',
	(e) => {
		const y = e.touches[0].pageY;
		if (document.scrollingElement.scrollTop === 0 && y > _startY + 19) {
			refreshHandler(true);
		}
		const x = e.touches[0].pageX;
		if (document.scrollingElement.scrollLeft === 0 && x < _startX - 100) {
			scrollWeeks(true);
		}
		if (document.scrollingElement.scrollLeft === 0 && x > _startX + 100) {
			scrollWeeks(false);
		}
	},
	{ passive: true }
);
document.body.addEventListener('touchend', (e) => {
	console.log(e);
});
window.onkeydown = function (event) {
	switch (event.key) {
		case 'r': {
			refreshHandler(true);
			break;
		}
		case 'a': {
			scrollWeeks(false);
			break;
		}
		case 'd': {
			scrollWeeks(true);
			break;
		}
	}
};

/**
 * @param {boolean} purge Should the cache be purged?
 * @return {Promise<boolean>} true when site is reloaded, false if nothing happened
 */
async function refreshHandler(purge) {
	return new Promise((resolve) => {
		if (document.body.classList.contains('refreshing')) {
			resolve(false);
			return;
		}
		if (!window.navigator.onLine) {
			if (purge) {
				displayError("Offline");
				resolve(false);
				return;
			} else if (!timeTable[mondayOfSelectedWeek.toISOString().slice(0, 10)]) {
				displayError("Offline");
				resolve(false);
				return;
			}
		}
		document.body.classList.add('refreshing');
		displayWeek(purge, mondayOfSelectedWeek).then(() => {
			document.body.classList.remove('refreshing');
			resolve(true);
		}).catch((err) => {
			document.body.classList.remove('refreshing');
			displayError(err);
			resolve(false);
		})
	});
}
/**
 * @param {boolean} forward true = +1 Week; false = -1 Week
 */
function scrollWeeks(forward) {
	if (document.body.classList.contains('switching')) {
		return;
	}
	document.body.classList.add('switching');

	const initial = new Date(mondayOfSelectedWeek);

	if (forward) {
		mondayOfSelectedWeek.setDate(mondayOfSelectedWeek.getDate() + 7);
		refreshHandler(false).then(function () {
			document.body.classList.remove('switching');
		});
	} else {

		if(mondayOfSelectedWeek.setDate(mondayOfSelectedWeek.getDate() - 7) < new Date(getWeekFromDay(new Date())[0])){
			mondayOfSelectedWeek = initial;
			setTimeout(() => {
				document.body.classList.remove('switching');
			}, 50);
			return;
		}

		refreshHandler(false).then((bool) => {
			if(!bool){
				mondayOfSelectedWeek = initial;
			}
			document.body.classList.remove('switching');
		});
	}
}


/**
 *
 * @param {String} error Error to display;
 */
function displayError(error){
	if(document.body.classList.contains("error")){
		return;
	}
	document.body.classList.add('error');
	document.getElementById("errorMessage").innerText = error;
	setTimeout(() => {
		document.body.classList.remove('error');
	}, 5000);
}
refreshHandler(false);

function displayInfo(x, y){
	document.getElementById('variableContent').children[x].children[y].children[1].classList.add("infosDisplay");
}

function hideInfo(x, y){
	document.getElementById('variableContent').children[x].children[y].children[1].classList.remove("infosDisplay");
}


/**
 *
 * @param hex Hex color as Input
 * @return {string} Hex code, black or white
 */
function getContrastColor(hex){
	if (hex.indexOf('#') === 0) {
		hex = hex.slice(1);
	}
	// convert 3-digit hex to 6-digits.
	if (hex.length === 3) {
		hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
	}
	if (hex.length !== 6) {
		throw new Error('Invalid HEX color.');
	}
	const r = parseInt(hex.slice(0, 2), 16),
		g = parseInt(hex.slice(2, 4), 16),
		b = parseInt(hex.slice(4, 6), 16);
	return (r * 0.299 + g * 0.587 + b * 0.114) > 186
		? '#000000'
		: '#FFFFFF';
}