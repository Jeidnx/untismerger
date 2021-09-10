if (!localStorage.getItem('jwt')) {
	window.location.href = '/setup';
}

const colorEnum = Object.freeze({
	'Physik': 'teal',
	'Informationstechnik': 'grey',
	'Englisch': 'red',
	'Ethik': 'green',
	'Sport': 'lightblue',
	'Praktische Informatik': 'orange',
	'Mathematik': 'azure',
	'Deutsch': 'lightgrey',
	'Geschichte': 'blueViolet',
	'Politik und Wirtschaft': 'lightgreen'
});

const startTimeEnum = Object.freeze({
	800: 0,
	945: 1,
	1130: 2,
	1330: 3,
	1515: 4
});

var timeTable = JSON.parse(localStorage.getItem('timeTable')) || {};

function getWeekFromDay(datum) {
	let curr = new Date(datum);
	let week = [];

	for (let i = 1; i <= 5; i++) {
		let first = curr.getDate() - curr.getDay() + i;
		let day = new Date(curr.setDate(first)).toISOString().slice(0, 10);
		week.push(day);
	}
	return week;
}

function wocheNeuLaden() {
	console.log('reload');
	let el = document.getElementById('variablerInhalt');

	// Why tf does this not work??
	while (el.firstChild) el.removeChild(el.firstChild);
	//let week = getWeekFromDay(document.getElementById("datumPicker").value);
	week.forEach(async (element) => {
		await getTag(element);
		addDay(element);
	});
	//displayTimeTable(document.getElementById("datumPicker").value);
}
function addDay(datum) {
	if (!timeTable[datum]) {
		throw new Error(
			'To add a day to the Interface, it has to be present in the timeTable Object'
		);
		return;
	}
	const woche = document.getElementById('variablerInhalt');
	let tag = document.createElement('div');
	tag.setAttribute('class', 'tag');
	tag.setAttribute('datum', datum);
	let firstRow = document.createElement('div');
	firstRow.setAttribute('class', 'reihe');
	firstRow.innerHTML = datum;
	tag.appendChild(firstRow);

	for (let i = 0; i < 5; i++) {
		let reihe = document.createElement('div');
		reihe.setAttribute('class', 'reihe');
		timeTable[datum].forEach((element) => {
			if (element['stunde'] === i) {
				reihe.innerHTML = `${element['fach']}
                <p class="raumNr">${element['raum']} - ${element['lehrer']}</p>
                `;
				reihe.style.backgroundColor = colorEnum[element['fach']];
			}
		});

		tag.appendChild(reihe);
	}
	woche.appendChild(tag);
}
async function getTag(datum) {
	return new Promise((resolve, reject) => {
		var xhr = new XMLHttpRequest();
		xhr.addEventListener('load', () => {
			if (!(xhr.status === 200)) {
				reject(xhr.response);
				return;
			}

			var data = JSON.parse(xhr.response);

			for (var i = 0; i < data.length; i++) {
				const first = data[i]['fach'];
				const second = data[i + 1]['fach'];
				if (first === second) {
					data.splice(i + 1, 1);
				}
			}

			// Sortiert die Daten anhand der Zeit
			var arr = [null, null, null, null, null];
			for (var i = 0; i < data.length; i++) {
				const startZeit = data[i]['startZeit'];
				const stunde = startTimeEnum[startZeit];
				arr[stunde] = data[i];
			}

			data.forEach((element) => {
				element['stunde'] = startTimeEnum[element['startZeit']];
				delete element['startZeit'];
			});

			timeTable[datum] = data;
			resolve();
			localStorage.setItem('timeTable', JSON.stringify(timeTable));
		});
		xhr.open('POST', '/getTimeTable');
		xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		xhr.send(`jwt=${localStorage.getItem('jwt')}&datum=${datum}`);
	});
}

function displayTimeTable(date) {
	let wochenAnzeige = document.getElementById('wochenAnzeige');
	let week = getWeekFromDay(date);
	wochenAnzeige.innerHTML = `${week[0]} - ${week[4]}`;

	document.getElementById('variablerInhalt').innerHTML = '';
	week.forEach(async (element) => {
		if (!timeTable[element]) {
			await getTag(element);
			addDay(element);
		} else {
			addDay(element);
		}
	});
}
displayTimeTable(new Date());
