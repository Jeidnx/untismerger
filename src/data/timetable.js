if (!localStorage.getItem('jwt')) {
	window.location.href = '/setup';
}
if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('/sw.js');
}

const colorEnum = {
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
};

const startTimeEnum = Object.freeze({
	800: 0,
	945: 1,
	1130: 2,
	1330: 3,
	1515: 4
});
const weekDayEnum = {
	0: 'Montag',
	1: 'Dienstag',
	2: 'Mittwoch',
	3: 'Donnerstag',
	4: 'Freitag'
};
const indexDayEnum = {
	Montag: 0,
	Dienstag: 1,
	Mittwoch: 2,
	Donnerstag: 3,
	Freitag: 4
};

var timeTable = JSON.parse(localStorage.getItem('timeTable')) || {};
/**
 *
 * @param {Date} date
 * @returns {string[]}
 */
function getWeekFromDay(date) {
	let curr = date;
	let week = [];

	for (let i = 1; i <= 5; i++) {
		let first = curr.getDate() - curr.getDay() + i;
		let day = new Date(curr.setDate(first)).toISOString().slice(0, 10);
		week.push(day);
	}
	return week;
}

/**
 *
 * @param {string} date
 * @param {number} index
 * @returns {Promise<number>} Number of element Added
 */
async function addDay(date, index) {
	return new Promise((resolve, reject) => {
		const variableContent = document.getElementById('variableContent');
		let day = document.createElement('div');
		day.setAttribute('class', 'day');
		let firstRow = document.createElement('div');
		firstRow.setAttribute('class', 'row');
		firstRow.innerHTML = weekDayEnum[index];
		day.appendChild(firstRow);

		for (let i = 0; i < 5; i++) {
			let row = document.createElement('div');
			row.setAttribute('class', 'row');
			timeTable[date].forEach((element) => {
				if (element['stunde'] === i) {
					row.innerHTML = `${element['fach']}
                <p class="raumNr">${element['raum']} - ${element['lehrer']}</p>
                `;
					row.style.backgroundColor = colorEnum[element['fach']];
				}
			});

			day.appendChild(row);
		}
		variableContent.appendChild(day);
		if (variableContent.childElementCount === 5) {
			let itemArr = [];
			let items = variableContent.children;
			for (let i = 0; i < items.length; i++) {
				itemArr.push(items[i]);
			}
			itemArr.sort((a, b) => {
				let ab = indexDayEnum[a.children[0].innerHTML];
				let ba = indexDayEnum[b.children[0].innerHTML];
				return ab - ba;
			});
			variableContent.innerHTML = '';
			for (let i = 0; i < itemArr.length; ++i) {
				variableContent.appendChild(itemArr[i]);
			}
		}

		resolve(variableContent.childElementCount);
	});
}

/**
 *
 * @param {string} datum
 * @returns {Promise<void>}
 */
async function getDay(datum) {
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

			// sort data
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
		});
		xhr.open('POST', '/getTimeTable');
		xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		xhr.send(`jwt=${localStorage.getItem('jwt')}&datum=${datum}`);
	});
}

/**
 * @param {boolean} purge
 * @returns {Promise<void>}
 */
async function displayWeek(purge) {
	return new Promise((resolve, reject) => {
		let weekDisplay = document.getElementById('weekDisplay');
		let week = getWeekFromDay(new Date());
		weekDisplay.innerHTML = `${week[0]} - ${week[4]}`;
		document.getElementById('variableContent').innerHTML = '';

		if (purge) {
			for (let i = 0; i < 5; i++) {
				getDay(week[i])
					.then(() => {
						addDay(week[i], i).then((childCount) => {
							if (childCount === 5) {
								resolve();
								localStorage.setItem('timeTable', JSON.stringify(timeTable));
							}
						});
					})
					.catch(console.log);
			}
		} else {
			for (let i = 0; i < 5; i++) {
				if (timeTable[week[i]]) {
					addDay(week[i], i).then((childCount) => {
						if (childCount === 5) {
							resolve();
							localStorage.setItem('timeTable', JSON.stringify(timeTable));
						}
					});
				} else {
					getDay(week[i])
						.then(() => {
							addDay(week[i], i).then((childCount) => {
								if (childCount === 5) {
									resolve();
									localStorage.setItem('timeTable', JSON.stringify(timeTable));
								}
							});
						})
						.catch(console.log);
				}
			}
		}
	});
}

displayWeek(false);

let _startY;
const body = document.body;

body.addEventListener(
	'touchstart',
	(e) => {
		_startY = e.touches[0].pageY;
	},
	{ passive: true }
);

body.addEventListener(
	'touchmove',
	async (e) => {
		const y = e.touches[0].pageY;
		if (document.scrollingElement.scrollTop === 0 && y > _startY + 40) {
			refreshHandler();
		}
	},
	{ passive: true }
);

window.onkeydown = function (event) {
	if (event.key === 'r') {
		refreshHandler();
	}
};

function refreshHandler() {
	if (body.classList.contains('refreshing')) {
		return;
	}
	if (!window.navigator.onLine) {
		body.classList.add('offline');
		setTimeout(() => {
			body.classList.remove('offline');
		}, 3000);
		return;
	}
	body.classList.add('refreshing');
	displayWeek(true).then(() => {
		body.classList.remove('refreshing');
	});
}
