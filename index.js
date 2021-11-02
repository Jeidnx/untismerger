const WebUntisLib = require('webuntis');
const express = require('express');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const http = require('http');
const mime = require('mime-types');
const crypto = require("crypto");

const classIdEnum = {
	'BBVZ10-1': 2176,
	'BFS10a': 2181,
	'BFS10b': 2186,
	'BFS11a': 2191,
	'BFS11b': 2196,
	'BG11a': 2201,
	'BG11b': 2202,
	'BG11c': 2207,
	'BG11d': 2212,
	'BG11e': 2217,
	'BG11f': 2222,
	'BG11g': 2227,
	'BG12-1': 2232,
	'BG12-2': 2237,
	'BG12-3': 2242,
	'BG12-4': 2247,
	'BG12-5': 2252,
	'BG12-6': 2257,
	'BG12-7': 2262,
	'BG12a': 2267,
	'BG12b': 2272,
	'BG12c': 2277,
	'BG12d': 2282,
	'BG12e': 2287,
	'BG12f': 2292,
	'BG13-1': 2297,
	'BG13-2': 2302,
	'BG13-3': 2307,
	'BG13-4': 2311,
	'BG13-5': 2316,
	'BG13-6': 2321,
	'BG13-7': 2326,
	'BG13a': 2331,
	'BG13b': 2336,
	'BG13c': 2341,
	'BG13d': 2346,
	'BG13e': 2351,
	'BG13f': 2356,
	'BI11': 2361,
	'BI12': 2366,
	'BS10H1': 2371,
	'BS10H2': 2376,
	'BS10I1': 2381,
	'BS10I2': 2386,
	'BS10IT1A': 2391,
	'BS10IT1B': 2396,
	'BS10IT2A': 2401,
	'BS10IT2B': 2406,
	'BS10IT3A': 2411,
	'BS10IT3B': 2416,
	'BS10MTS3': 2421,
	'BS11H1': 2422,
	'BS11H2': 2427,
	'BS11I1': 2432,
	'BS11I2': 2437,
	'BS11I3': 2442,
	'BS12IDB': 2447,
	'BS11IT1A': 2452,
	'BS11IT1B': 2457,
	'BS11IT2A': 2462,
	'BS11IT2B': 2467,
	'BS11IT3A': 2472,
	'BS11IT3B': 2477,
	'BS11MTS2': 2482,
	'BS12H1': 2487,
	'BS12H2': 2492,
	'BS12I1': 2497,
	'BS12I2': 2502,
	'BS12I3': 2507,
	'BS12IT1A': 2512,
	'BS12IT1B': 2517,
	'BS12IT2A': 2522,
	'BS12IT2B': 2527,
	'BS12IT3A': 2532,
	'BS12IT3B': 2537,
	'BS12MTS2': 2542,
	'BS13H1': 2547,
	'BS13I1': 2552,
	'BS13I3': 2557,
	'FLS': 2562,
	'Fö BFS BS FOS': 2567,
	'FöDeu': 2572,
	'FöDeZ': 2577,
	'FöEng': 2582,
	'FöIT': 2587,
	'FöLRS': 2592,
	'FöMa': 2597,
	'FOS11A1': 2602,
	'FOS11A2': 2607,
	'FOS12A1': 2612,
	'FOS12A2': 2617,
	'FOS12B1': 2622,
	'FS01V': 2627,
	'FS03V': 2632,
	'FSBW': 2637,
	'SLT': 2642,
	'Lehrersport': 2647,
	'FS05T': 2652,
	'FS01T': 2657,
	'BS10I3': 2661
};

const jwtSecret = process.env.JWT_SECRET;
const schoolName = process.env.SCHOOL_NAME;
const schoolDomain = process.env.SCHOOL_DOMAIN;
const portenv = process.env.PORT;
const statsfileName = "data/data.json";
const saveInterval = 10; // Interval in minutes when data is saved to statsfileName

let config = null;
try {
	config = require("./data/config.json");
} catch (_) {}
const port = portenv ?? 8080

if (!jwtSecret || !schoolName || !schoolDomain) {
	console.log('Missing environment Variables');
	process.exit(1);
}

// Init stats
// Overall request counting
// User hashed list
let stats = loadData();
initScheduler();
createUserArray();




const app = express();

http.createServer(app).listen(port);

app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
	const date = getDate();
	if(!stats.requests.hasOwnProperty(date)) {
		constructDateStruct(date)
	}
	stats.requests[date]["get"]["/"] += 1;
	res.status(200).send(fs.readFileSync('./src/timetable.html', 'utf-8'));
});
app.get('/setup', (req, res) => {
	const date = getDate();
	if(!stats.requests.hasOwnProperty(date)) {
		constructDateStruct(date)
	}
	stats.requests[date]["get"]["/setup"] += 1;
	res.status(200).send(fs.readFileSync('./src/setup.html', 'utf-8'));
});
app.post('/getTimeTable', (req, res) => {
	const date = getDate();
	if(!stats.requests.hasOwnProperty(date)) {
		constructDateStruct(date)
	}
	stats.requests[date]["post"]["/getTimeTable"] += 1;
	if (!req.body['jwt'] || !req.body['datum']) {
		res.status(406).send('Missing args');
		return;
	}
	jwt.verify(req.body['jwt'], jwtSecret, (err, decoded) => {
		if (err) {
			res.status(406).send('Invalid jwt');
			return;
		}
		const h = hash(decoded["username"])
		if(!stats.registeredUsers.includes(h)) {
			stats.registeredUsers.push(h);
		}

		const untis = new WebUntisLib.WebUntisSecretAuth(
			schoolName,
			decoded['username'],
			decoded['secret'],
			schoolDomain
		);
		untis
			.login()
			.then(async () => {
				const dt = new Date(req.body['datum']);
				var out = [];
				let sonstiges =
					(await untis.getTimetableFor(dt, 2232, 1).catch()) || [];
				let lk =
					(await untis.getTimetableFor(dt, decoded['lk'], 1).catch()) || [];
				let fachRichtung =
					(await untis
						.getTimetableFor(dt, decoded['fachRichtung'], 1)
						.catch()) || [];

				borisLoop: for (let i = 0; i < sonstiges.length; i++) {
					if (sonstiges[i]['su'].length < 1) continue borisLoop;
					let element = sonstiges[i];
					for (let j = 0; j < decoded['sonstiges'].length; j++) {
						if (element['su'][0]['name'] == decoded['sonstiges'][j]) {
							out.push(element);
							continue borisLoop;
						}
					}
				}

				lk.forEach((element) => out.push(element));
				fachRichtung.forEach((element) => out.push(element));
				/*
				out = out.filter((element) => {
					if (!element['code']) return true;
					let buf1 = Buffer.from('cancelled');
					let buf2 = Buffer.from(element['code']);
					return !buf1.equals(buf2);
				});
				*/
				out.sort((a, b) => {
					return a['startTime'] - b['startTime'];
				});

				var sendArr = [];
				out.forEach((element) => {
					sendArr.push({
						startTime: element['startTime'] || 'Untis API 👍',
						code: element['code'] || 'regular',
						shortSubject: element['su'][0]
							? element['su'][0]['name']
							: 'Untis 👍',
						subject: element['su'][0]
							? element['su'][0]['longname']
							: 'Untis API 👍',
						teacher: element['te'][0]
							? element['te'][0]['longname']
							: 'Untis API 👍',
						room: element['ro'][0] ? element['ro'][0]['name'] : 'Untis API 👍'
					});
				});

				res.send(sendArr);
			})
			.catch((err) => {
				console.log(err);
				res.status(200).send([]);
			});
	});
});

app.post('/setup', (req, res) => {
	const date = getDate();
	if(!stats.requests.hasOwnProperty(date)) {
		constructDateStruct(date)
	}
	stats.requests[date]["post"]["/setup"] += 1;
	if (!req.body['stage']) {
		res.status(400).send('Missing Arguments');
		return;
	}
	switch (req.body['stage']) {
		case '1': {
			// Stage 1
			if (req.body['jwt'] && req.body['jwt'] !== '') {
				jwt.verify(req.body['jwt'], jwtSecret, (err, decoded) => {
					if (err) {
						res.status(400).send('Invalid jwt');
						return;
					}
					const untis = new WebUntisLib.WebUntisSecretAuth(
						schoolName,
						decoded['username'],
						decoded['secret'],
						schoolDomain
					);
					untis
						.login()
						.then(() => {
							res.status(200).send(req.body['jwt']);
						})
						.catch((err) => {
							res.status(400).send('Invalid Credentials');
						});
				});
				return;
			} else if (req.body['secret'] && req.body['username']) {
				const untis = new WebUntisLib.WebUntisSecretAuth(
					schoolName,
					req.body['username'],
					req.body['secret'],
					schoolDomain
				);
				untis
					.login()
					.then(() => {
						res.status(200).send('OK');
					})
					.catch((err) => {
						res.status(400).send('Invalid Credentials');
					});
				return;
			}
			res.status(400).send('Missing Arguments');
			return;
		}
		case '2': {
			if (
				!req.body['lk'] ||
				!req.body['fachRichtung'] ||
				!req.body['ek'] ||
				!req.body['sp'] ||
				!req.body['naWi']
			) {
				res.status(400).send('Missing Arguments');
				return;
			}
			// Stage 2
			const potentialCourses = ['DS', 'sn2', 'sn1', 'Ku'];
			let selectedCourses = [];

			potentialCourses.forEach((element) => {
				if (req.body[element] == 'true') {
					selectedCourses.push(element);
				}
			});

			if (!(req.body['naWi'] == 'false')) {
				selectedCourses.push(req.body['naWi']);
			}

			selectedCourses.push(req.body['sp'], req.body['ek']);
			let userObj = {
				username: req.body['username'],
				secret: req.body['secret'],
				lk: classIdEnum[req.body['lk']],
				fachRichtung: classIdEnum[req.body['fachRichtung']],
				sonstiges: selectedCourses
			};
			res.send(jwt.sign(userObj, jwtSecret));
			return;
		}
		default: {
			res.status(400).send('Invalid Arguments');
			return;
		}
	}
});
app.post('/getStats', (req, res) => {
	if (!req.body['jwt']) {
		res.status(406).send('Missing args');
		return;
	}
	jwt.verify(req.body['jwt'], jwtSecret, (err, decoded) => {
		if (err) {
			res.status(406).send('Invalid jwt');
			return;
		}
		res.setHeader("Content-Type", "application/json");
		if(isUserAdmin(decoded["username"])) {
			let st = {};
			st["requests"] = stats.requests;
			st["users"] = stats.registeredUsers.length;
			res.status(200).send(JSON.stringify(st))
		} else {
			res.status(403).send(JSON.stringify({"error": true, "message": "Keine Rechte"}))
		}
	});
})
app.get('*', (req, res) => {
	const date = getDate();
	if(!stats.requests.hasOwnProperty(date)) {
		constructDateStruct(date)
	}
	stats.requests[date]["get"]["*"] += 1;
	if (fs.existsSync('./src' + req.path)) {
		const path = './src' + req.path;
		if (mime.lookup(path)) {
			//@ts-ignore
			res.contentType(mime.lookup(path));
		}

		res.status(200).send(fs.readFileSync(path, 'utf-8'));
		return;
	} else {
		res.status(404).send('404');
	}
});

function loadData() {
	if(!fs.existsSync(statsfileName)) {
		fs.writeFileSync(statsfileName, "{}");
	}
	const filecontent = fs.readFileSync(statsfileName);
	return JSON.parse(filecontent);
}
function saveData() {
	fs.writeFile(statsfileName, JSON.stringify(stats), function (err) {
		if(err)
			console.log(err.message);
		console.log("save")
	});
}
function initScheduler() {
	setInterval(function () {
		saveData();
	}, saveInterval * 60 * 1000);
}
function getDate() {
	return new Date().toISOString().slice(0, 10);
}
function constructDateStruct(s) {
	// Please dont kill me
	stats.requests[s] = {};
	stats.requests[s].get = {};
	stats.requests[s].get["/"] = 0;
	stats.requests[s].get["/setup"] = 0;
	stats.requests[s].get["*"] = 0;
	stats.requests[s].post = {};
	stats.requests[s].post["/setup"] = 0;
	stats.requests[s].post["/getTimeTable"] = 0;
}
function createUserArray() {
	if(!stats.hasOwnProperty("registeredUsers")) {
		stats.registeredUsers = [];
	}
	if(!stats.hasOwnProperty("requests")) {
		stats.requests = {};
	}
}
function hash(str) {
	return crypto.createHash("sha256").update(str).digest("hex");
}
function isUserAdmin(name) {
	if(!config) {
		return false;
	}
	return config.adminuser?.includes(hash(name)) || false;
}