import http from 'http';
import jwt, { decode, verify } from 'jsonwebtoken';
import mysql from 'mysql2';
import cors from 'cors';
import express, { Request } from 'express';
import WebUntisLib, { Lesson } from 'webuntis';
import crypto from 'crypto';
import dayjs from 'dayjs';

import {configInterface} from './types';
import {Jwt, ApiLessonData, CustomExam, CustomHomework, Holiday} from '../globalTypes';

// Constants
const MISSING_ARGS = 418;
const INVALID_ARGS = 418;
const INVALID_JWT = 418;
const DB_ERROR = 500;
const SERVER_ERROR = 500;


// Statics
const saveInterval = 10; // Interval in minutes when data is saved to database

const startTimes = [
	800, 945, 1130, 1330, 1515
];
const idsToCheck = [
	2267,
	2272,
	2277,
	2282,
	2287,
	2292,
	2232,
	2237,
	2242,
	2247,
	2252,
	2257,
	2262,
];


// Config
let config: configInterface = ({} as configInterface);
try{
	config = require('./data/config.json');
}catch {
	console.log('Cannot load config');
	process.exit(1);
}
const jwtSecret = config.secrets.JWT_SECRET;
const schoolName = config.secrets.SCHOOL_NAME;
const schoolDomain = config.secrets.SCHOOL_DOMAIN;
let db: mysql.Pool;
if (typeof process.env.DEV === 'undefined' || typeof process.env.MAIN === 'undefined' || typeof process.env.PORT === 'undefined') {
	console.log('Missing env vars');
	process.exit(1);
}

if (!(process.env.DEV === 'FALSE')) {
	console.log('Running in DEV Environment');
	db = mysql.createPool(config.mysqlDev);
} else {
	console.log('Running in PROD Environment');
	db = mysql.createPool(config.mysql);
}

try{
	db.query('SELECT * FROM user LIMIT 1', (err) => {
		if(err){
			console.error(err);
			errorHandler(new Error('Cannot connect to db'));
			process.exit(1);
		}
		console.log('Succesfully connected to ' + (!(process.env.DEV === 'FALSE') ? 'DEV' : 'PROD') + ' db');
	});
}catch(e) {
	console.error(e);
	errorHandler(new Error('Cannot connect to db'));
	process.exit(1);
}

const port = process.env.PORT;

if (!jwtSecret || !schoolName || !schoolDomain || !port) {
	console.log('Missing environment or config.json Variables');
	process.exit(1);
}

/// init vector used for encryption
const iv = Buffer.alloc(16, config.secrets.SCHOOL_NAME);

// Init schedulers for recurring tasks
initScheduler();

//region Express Server
const app = express();

// Enable CORS
//@ts-expect-error I dont know why the error throws here, this is the correct way
app.options('*', cors());
app.use(cors());

http.createServer(app).listen(port);

/// Contains the endpoints to track and their respective count. To track more / less endpoints just add / remove them here.
const stats: {
    [key: string]: number,
} = {
	timetableWeek: 0,
	register: 0,
	getStats: 0,
	deleteUser: 0,
	getDiscordToken: 0,
	rawRequest: 0,
	checkCredentials: 0,
	getPreferences: 0,
	setPreferences: 0,
	getExams: 0,
	getHomework: 0,
	addExam: 0,
	addHomework: 0,
};

// Init middleware
app.use((req, res, next) => {
	next();
	const thisPath = req.path.replace('/', '');
	if (typeof stats[thisPath] !== 'undefined') {
		stats[thisPath]++;
	}
});

//TODO: Implement
/// Middleware to check for args
function areArgsInReq(req: Request, args: string[]): boolean {
	if(req.method === 'GET'){

	}
	return false;
}

app.get('/status', (req, res) => {
	db.query('SELECT * FROM user LIMIT 1', (err) => {
		if(err){
			console.error(err);
			errorHandler(new Error('Cannot connect to db'));
			res.status(500).json({
				api: 'ok',
				db: 'not ok',
			});
			return;
		}
		res.json({
			api: 'ok',
			db: 'ok',
		});
	});
});
app.get('/timetableWeek', (req, res) => {
	if (!req.query['jwt'] || !req.query['startDate'] || !req.query['endDate'] ) {
		res.status(MISSING_ARGS).send({error: true, message: 'Missing args'});
		return;
	}

	if(typeof req.query.jwt !== 'string') {
		res.status(INVALID_ARGS).json({error: true, message: 'Invalid Args'});
		return;
	}

	decodeJwt(req.query.jwt)
		.then((decoded) => {
			getUntisSession(decoded)

				.then(async (untis) => {     
					const startDate = new Date(req.query.startDate as string);
					const endDate = new Date(req.query.endDate as string);

					const mappedHolidays = untis.getHolidays().then((holidays): Holiday[] => {
						return holidays.flatMap((holiday) => {
							if(holiday.startDate as any as number > Number(dayjs(req.query.endDate as string).format('YYYYMMDD'))
                         || holiday.endDate as any as number < Number(dayjs(req.query.startDate as string).format('YYYYMMDD'))){
								return [];
							}
							return [{
								startDate: holiday.startDate,
								endDate: holiday.endDate,
								name: holiday.longName,
								shortName: holiday.name,

							}];
						});
					});

					const lk = untis.getTimetableForRange(startDate, endDate, decoded.lk, 1).catch(() => {
						return [];
					});
					const fachRichtung = untis.getTimetableForRange(startDate, endDate, decoded.fachrichtung, 1).catch(() => {
						return [];
					});
					const sonstiges = untis.getTimetableForRange(startDate, endDate, 2232, 1).catch(() => {
						return [];
					});

					const out = [];

					const lkArr = await lk;
					for (let i = 0; i < lkArr.length; i++) {
						const element = lkArr[i];
						if (startTimes.includes(element.startTime)) {
							out.push(element);
							if (element.code === 'cancelled') {
								cancelHandler(element, decoded.lk);
							}
						}
					}

					const frArr = await fachRichtung;
					for (let i = 0; i < frArr.length; i++) {
						const element = frArr[i];
						if (startTimes.includes(element.startTime)) {
							out.push(element);
							if (element.code === 'cancelled') {
								cancelHandler(element, decoded.fachrichtung);
							}
						}


					}
					untis.logout().catch(errorHandler);

					const stArr = await sonstiges;
					outer: for (let i = 0; i < stArr.length; i++) {
						if (!startTimes.includes(stArr[i].startTime)) continue;
						if (stArr[i]['su'].length < 1) continue;
						const element = stArr[i];
						if (element.code === 'cancelled') {
							cancelHandler(element, element.su[0].name);
						}
						for (let j = 0; j < decoded['sonstiges'].length; j++) {
							if (element['su'][0]['name'] === decoded['sonstiges'][j]) {
								out.push(element);
								continue outer;
							}
						}
					}

					const sendArr = out.map((element): ApiLessonData => ({
						date: element.date,
						startTime: element.startTime,
						code: element['code'] || 'regular',
						shortSubject: element['su'][0]
							? element['su'][0]['name'] : '🤷',
						subject: element['su'][0]
							? element['su'][0]['longname'] : '🤷',
						teacher: element['te'][0]
							? element['te'][0]['longname'] : '🤷',
						room: element['ro'][0] ? element['ro'][0]['name'] : '🤷‍',

						//Text stuff
						lstext: element['lstext'] || '',
						info: element['info'] || '',
						subsText: element['substText'] || '',
						sg: element['sg'] || '',
						bkRemark: element['bkRemark'] || '',
						bkText: element['bkText'] || '',
					}));

					res.send({message: 'OK', lessons: sendArr, holidays: await mappedHolidays});
				}).catch((err) => {
					res.status(500).json({error: true, message: errorHandler(err)});
				});
		});
});

app.post('/register', express.json(), (req, res) => {
	if(
		!req.body?.loginMethod ||
        !req.body?.username ||
        !req.body[req.body.loginMethod] ||
        !req.body?.lk ||
        !req.body?.fachrichtung ||
        !req.body?.nawi ||
        !req.body?.ek ||
        !req.body?.sp ||
        !req.body?.sonstiges
	){
		res.status(400).send({
			error: true,
			message: 'Missing Arguments',
		});
		return;
	}
	const sonstiges = req.body.sonstiges;

	['nawi', 'ek', 'sp'].forEach((e) => {
		sonstiges.push(req.body[e]);
	});
	const {
		nawi,ek,sp, disableButton, loginMethod, [req.body.loginMethod]: loginToken,sonstiges: asdf, ...reqData
	} = req.body;

	const userObj = {
		...reqData,
		sonstiges: sonstiges,
		version: 2,
		[loginMethod]: encrypt(loginToken),
		type: loginMethod,
	};
	signJwt({...userObj, secureid: registerUser(userObj)}).then((signed) => {
		res.status(201).json({
			message: 'created',
			jwt: signed,
		});
	}).catch((err) => {
		res.status(500).json({error: true, message: errorHandler(err)});
	});
});

app.get('/getStats', (req, res) => {
	if (!req.query['jwt'] || typeof req.query.jwt !== 'string') {
		res.status(406).send({error: true, message: 'missing args'});
		return;
	}

	decodeJwt(req.query.jwt).then((decoded) => {
		isUserAdmin(decoded['username']).then(async bool => {
			if (bool) {
				res.json({
					requests: await dbQuery('SELECT * FROM statistics;', []).catch((e) => {
						errorHandler(e);
						return {};
					}),
					users: await dbQuery('SELECT COUNT(id) as c FROM user;', []).then((result) => {
						return result[0].c;
					}).catch((err) => {
						errorHandler(err);
						return -1;
					}),
				});

			} else {
				res.status(403).send({error: true, message: 'Missing permissions'});
			}
		});
	});
});

app.post('/deleteUser', express.urlencoded({extended: true}), (req, res) => {
	if (!req.body['jwt']) {
		res.status(400).json({error: true, message: 'Missing args'});
		return;
	}

	decodeJwt(req.body.jwt).then((decoded) => {
		dbQuery('DELETE user, fach FROM user JOIN fach on user.id = fach.user where username = ?', [hash(decoded.username)]).then((result) => {
			res.json({message: result});
		}).catch((err) => {
			res.status(DB_ERROR).json({error: true, message: errorHandler(err)});
		});
	}).catch((err) => {
		res.status(INVALID_JWT).json({error: true, message: errorHandler(err)});
	});
});

app.post('/rawRequest', express.urlencoded({extended: true}), (req, res) => {
	if (!req.body['jwt'] ||
        !req.body['requestType'] ||
        !req.body['requestData']
	) {
		res.status(400).send({error: true, message: 'Missing args'});
		return;
	}

	decodeJwt(req.body.jwt).then((decoded) => {
		const requestData = JSON.parse(req.body['requestData']);

		switch (req.body['requestType']) {
		case 'getTimeTableFor': {
			// Check if requestBody contains data for this request, if yes login and make it
			if (!requestData['date'] || !requestData['id']) {
				res.status(400).send({error: true, message: 'Invalid parameters'});
				return;
			}
			getUntisSession(decoded).then((untis) => {
				untis.getTimetableFor(new Date(requestData['date']), requestData['id'], 1).then((value) => {
					res.send(value);
					untis.logout().then();
				}).catch((err) => {
					res.status(400).send({error: true, message: errorHandler(err)});
				});
			}).catch((err) => {
				res.status(400).send({error: true, message: errorHandler(err)});
			});
			return;
		}
		case 'getOwnTimeTableFor': {
			if (!requestData['date']) {
				res.status(400).send({error: true, message: 'Invalid parameters'});
				return;
			}
			getUntisSession(decoded).then((untis) => {
				untis.getOwnTimetableFor(new Date(requestData['date'])).then((value) => {
					res.send(value);
					untis.logout().then();
				}).catch((err) => {
					res.status(400).send({error: true, message: errorHandler(err)});
				});
			}).catch((err) => {
				res.status(400).send({error: true, message: errorHandler(err)});
			});
			return;
		}
		case 'getTimeTableForRange': {
			// Check if requestBody contains data for this request, if yes login and make it
			if (!requestData['id'] || !requestData['rangeStart'] || !requestData['rangeEnd']) {
				res.status(400).send({error: true, message: 'Invalid parameters'});
				return;
			}
			getUntisSession(decoded).then((untis) => {
				untis.getTimetableForRange(new Date(requestData['rangeStart']), new Date(requestData['rangeEnd']), requestData['id'], 1).then(value => {
					res.send(value);
					untis.logout().then();
				});
			}).catch(err => {
				res.status(400).send({error: true, message: errorHandler(err)});
			});
			return;
		}
		case 'getRooms': {
			getUntisSession(decoded).then((untis) => {
				untis.getRooms().then(value => {
					res.status(200).send(value);
					untis.logout().then();
				});
			}).catch((err) => {
				res.status(400).send({error: true, message: errorHandler(err)});
			});
			return;
		}
		case 'getSubjects': {
			getUntisSession(decoded).then((untis) => {
				untis.getSubjects().then(value => {
					res.status(200).send(value);
					untis.logout().then();
				});
			}).catch((err) => {
				res.status(400).send({error: true, message: errorHandler(err)});
			});
			return;
		}
		case 'getClasses': {
			getUntisSession(decoded).then((untis) => {
				untis.getClasses().then(value => {
					res.status(200).send(value);
					untis.logout().then();
				});
			}).catch((err) => {
				res.status(400).send({error: true, message: errorHandler(err)});
			});
			return;
		}
		case 'getHolidays': {
			getUntisSession(decoded).then((untis) => {
				untis.getHolidays().then(value => {
					res.status(200).send(value);
					untis.logout().then();
				});
			}).catch((err) => {
				res.status(400).send({error: true, message: errorHandler(err)});
			});
			return;
		}
		// Write cases for applicable requests.
		default: {
			res.status(400).send({error: true, message: 'Invalid requestType'});
		}
		}
	}).catch((err) => {
		res.status(400).send({error: true, message: errorHandler(err)});
	});
});

app.post('/checkCredentials', express.json(), (req, res) => {
	if (!req.body?.type || !req.body?.username || !req.body[req.body.type]) {
		res.status(400).json({error: true, message: 'Missing arguments'});
		return;
	}

	getUntisSession({
		type: req.body.type,
		[req.body.type]: req.body[req.body.type],
		username: req.body.username,
		version: config.constants.jwtVersion,
	})
		.then((untis) => {
			const username = req.body.username.toLowerCase();
			const type = req.body.type;
    
			isUserRegistered(username).then((isRegistered) => {
				if(!isRegistered){
					res.json({message: 'OK'});
					return;
				}
    
				getUserData(username).then((data) => {
					signJwt({
						...data,
						username: username,
						[type]: encrypt(req.body[type]),
						type: type,
					}).then((signed) => {
						res.json({
							message: 'OK',
							jwt: signed,
						});
					});
				}).catch((err) => {
					res.status(500).send({
						error: true,
						message: errorHandler(err),
					});
				});
			});
			untis.logout();
		}).catch((err) => {
			res.status(INVALID_JWT).json({error: true, message: errorHandler(err)});
		});
});
app.post('/getPreferences', express.json(), (req, res) => {
	if(!req.body.jwt){
		res.status(400).json({error: true, message: 'Missing Arguments'});
		return;
	}

	decodeJwt(req.body.jwt).then((decoded) => {
		return dbQuery('SELECT settings FROM user WHERE username = ?', [hash(decoded.username)]).then((result) => {
			return result[0]. settings;
		}).catch((err) => {
			errorHandler(err);
			return undefined;
		});
	}).then((result) => {
		res.json({data: result});
	}).catch((err) => {
		res.status(INVALID_JWT).json({error: true, message: errorHandler(err)});
	});
});
app.post('/setPreferences', express.json(), (req, res) => {
	if(!req.body.jwt || !req.body.prefs || typeof req.body.jwt !== 'string'){
		res.status(400).json({error: true, message: 'Missing Arguments'});
		return;
	}

	decodeJwt(req.body.jwt).then((decoded) => {
		dbQuery('UPDATE user set settings = ? WHERE username = ?', [req.body.prefs, hash(decoded.username)]).then(() => {
			res.status(201).send({message: 'created'});
		}).catch((err) => {
			res.status(DB_ERROR).json({error: true, message: errorHandler(err)});
		});
	});
});

app.get('/getExams', (req, res) => {
	if(!req.query['jwt'] || typeof req.query.jwt !== 'string'){
		res.status(400).json({error: true, message: 'Missing Arguments'});
		return;
	}

	decodeJwt(req.query.jwt)
		.then((decoded) => {
			getUntisSession(decoded).then((untis) => {
				const untisPromise = untis.getExamsForRange(new Date(), new Date(new Date().setFullYear(new Date().getFullYear() + 1)), 0, false).then((exams) => {
					return exams.map((exam): CustomExam => {
						return {
							room: exam.rooms[0],
							subject: exam.subject,
							startTime: convertUntisTimeDatetoDate(exam.examDate, exam.startTime).toDateString(),
							endTime: convertUntisTimeDatetoDate(exam.examDate, exam.endTime).toDateString(),
							course: '',
						};
					});
				});

				const dbPromise = dbQuery(
					'SELECT subject, room, startTime, endTime FROM klausuren WHERE kurs in (?, ?, ?) and  endTime > now()',
					[decoded.fachrichtung, decoded.lk, decoded.sonstiges]) as Promise<CustomExam[]>;

				Promise.all([untisPromise, dbPromise]).then((resArr) => {
					res.json({message: resArr[0].concat(resArr[1]).sort((a, b) => (new Date(a.startTime).getTime() - new Date(b.startTime).getTime()))});
				}).catch((err) => {
					res.status(500).json({error: true, message: errorHandler(err)});
				});
        
			}).catch((err) => {
				res.status(INVALID_JWT).json({error: true, message: errorHandler(err)});
			});
		});
});
app.get('/getHomework', (req, res) => {
	if(!req.query['jwt'] || typeof req.query.jwt !== 'string'){
		res.status(400).json({error: true, message: 'Missing Arguments'});
		return;
	}

	decodeJwt(req.query.jwt)
		.then((decoded) => {
			getUntisSession(decoded)
				.then((untis) => {
					const untisPromise: Promise<CustomHomework[]> = untis.getHomeWorksFor(new Date(), new Date(new Date().setFullYear(new Date().getFullYear() + 1))).then((resp) => {
						//@ts-expect-error WebUntisLib is wrong.    
						return resp.homeworks.map((homework) => {
							if(homework.completed) return; 
							return {
								//@ts-expect-error WebUntisLib is wrong.
								subject: resp.lessons.find((elem) => {
									return elem.id === homework.lessonId;
								}).subject,
								text: homework.text,
								dueDate: convertUntisDatetoDate(homework.dueDate).toDateString(),
								attachments: homework.attachments,
							};
						});
					});

					const dbPromise: Promise<CustomHomework[]> = dbQuery(
						'SELECT subject, text, dueDate FROM hausaufgaben WHERE kurs in (?, ?, ?) and  dueDate > (CURDATE() - INTERVAL 1 DAY)',
						[decoded.fachrichtung,decoded.lk, decoded.sonstiges]).catch((err) => {
						errorHandler(err);
						return [];
					});

					Promise.all([untisPromise, dbPromise]).then((resArr) => {
						res.json({message: resArr[0].concat(resArr[1]).sort((a, b) => (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()))});
					}).catch((err) => {
						res.status(500).json({error: true, message: errorHandler(err)});
					});
				});
		});
});

app.post('/addExam', express.json(), (req, res) =>{
	if(!req.body.jwt || !req.body.exam){
		res.status(400).json({error: true, message: 'Missing Arguments'});
		return;
	}

	decodeJwt(req.body.jwt).then((decoded) => {
		addExam(req.body.exam, decoded.username).then(() => {
			res.status(201).send({message: 'created'});
		}).catch((e) => {
			res.status(500).json({error: true, message: e.message});
		});
	}).catch((err) => {
		res.status(INVALID_JWT).json({error: true, message: errorHandler(err)});
	});
});
app.post('/addHomework', express.json(), (req, res) => {
	if(!req.body.jwt || !req.body.homework){
		res.status(400).json({error: true, message: 'Missing Arguments'});
		return;
	}
    
	decodeJwt(req.body.jwt).then((decoded) => {

		addHomework(req.body.homework, decoded.username).then(() => {
			res.status(201).send({message: 'created'});
		}).catch((e) => {
			res.status(500).json({error: true, message: e.message});
		});
	}).catch((err) => {
		res.status(INVALID_JWT).json({error: true, message: errorHandler(err)});
	});
});

function saveData() {
	const date = getDate();

	db.execute('SELECT json FROM statistics WHERE date = ?', [date], (err, res) => {
		if (err) {
			errorHandler(err);
			return;
		}

		//@ts-ignore
		if(res.length && res.length > 0){
			//@ts-ignore
			const dbStats = JSON.parse(res[0].json);
			for (const key in stats) {

				stats[key] = dbStats[key] ?
					stats[key] + dbStats[key] :
					stats[key];
			}
		}

		db.execute('INSERT INTO statistics(date,json) VALUES (?,?) ON DUPLICATE KEY UPDATE json = ?',
			[date, JSON.stringify(stats), JSON.stringify(stats)],
			(err) => {
				if(err){
					errorHandler(err);
					return;
				}
				for (const key in stats) {
					stats[key] = 0;
				}
			});

	});
}

/**
 * Creates scheduler
 */
function initScheduler() {
	setInterval(function () {
		saveData();
	}, saveInterval * 60 * 1000);
}

function initCancelScheduler() {
	setInterval(function () {
		const date = new Date();
		date.setDate(date.getDate() + 7);
		checkCancelled(new Date(), date);
	}, saveInterval * 60 * 1000);
}

function checkCancelled(startDate: Date, endDate: Date) {
	const untis = new WebUntisLib.WebUntisSecretAuth(
		config.secrets.SCHOOL_NAME,
		config.secrets.UNTIS_USERNAME,
		config.secrets.UNTIS_SECRET,
		config.secrets.SCHOOL_DOMAIN
	);
	untis.login().then(async () => {
		await untis.getTimetableForRange(startDate, endDate, 2232, 1).then(lessons => {
			lessons.forEach(lesson => {
				if (!startTimes.includes(lesson.startTime)) return;
				if (lesson.code === 'cancelled') {
					cancelHandler(lesson, lesson.su[0].name);
				}
			});
		}).catch(errorHandler);
		// General courses
		for (let i = 0; i < idsToCheck.length; i++) {
			await untis.getTimetableForRange(startDate, endDate, idsToCheck[i], 1).then(lessons => {
				lessons.forEach(lesson => {
					if (!startTimes.includes(lesson.startTime)) return;
					if (lesson.code === 'cancelled') {
						cancelHandler(lesson, idsToCheck[i].toString());
					}
				});
			}).catch(errorHandler);
		}
		untis.logout().catch(errorHandler);


	}).catch(errorHandler);
}

function getDate() {
	return new Date().toISOString().slice(0, 10);
}

//endregion

function hash(str: string): string {
	return crypto.createHash('sha256').update(str).digest('hex');
}

function encrypt(str: string): string {
	const cipher = crypto.createCipheriv('aes128', config.secrets.ENCRYPT, iv);
	return cipher.update(str, 'utf8', 'hex') + cipher.final('hex');
}

function decrypt(encrypted: string): string {
	const decipher = crypto.createDecipheriv('aes128', config.secrets.ENCRYPT, iv);
	return decipher.update(encrypted, 'hex', 'utf-8') + decipher.final('utf8');
}

function isUserAdmin(name: string): Promise<boolean> {
	return new Promise((resolve, reject) => {
		db.query(
			'SELECT isadmin FROM user WHERE username = ?',
			[hash(name)],
			function (err, result) {
				if (err) {
					errorHandler(err);
					reject(err);
					return;
				}
				// @ts-ignore
				if (result.length === 1) {
					//@ts-ignore
					resolve(result[0].isadmin === 1);
					return;
				}
				resolve(false);
			}
		);
	});
}

function addExam(exam: CustomExam, username: string): Promise<void> {
	return new Promise((resolve, reject) => {
		db.query(
			'INSERT INTO klausuren (subject, room, startTime, endTime, kurs, user) VALUES (?, ?, ?, ?, ?, ?)',
			[exam.subject, exam.room, exam.startTime, exam.endTime, exam.course, hash(username)],
			function (err) {
				if (err) {
					errorHandler(err);
					reject(err);
					return;
				}
				resolve();
			}
		);
	});
}

function addHomework(homework: CustomHomework, username: string): Promise<void> {
	return new Promise((resolve, reject) => {
		db.query(
			'INSERT INTO hausaufgaben (subject, text, dueDate, kurs, user) VALUES (?, ?, ?, ?, ?)',
			[homework.subject, homework.text, homework.dueDate, homework.course, hash(username)],
			function (err) {
				if (err) {
					errorHandler(err);
					reject(err);
					return;
				}
				resolve();
			}
		);
	});
}

function isUserRegistered(username: string): Promise<boolean> {
	return new Promise((resolve, reject) => {
		db.query(
			'SELECT id FROM user WHERE username = ?',
			[hash(username)],
			function (err, result) {
				if (err) {
					errorHandler(err);
					reject(err);
					return;
				}
				//@ts-ignore
				resolve(result.length > 0);
			}
		);
	});
}

function registerUser(userdata: any): number {
	const others = userdata.sonstiges;
	const randomid = getRandomInt(100000);
	db.execute(
		'INSERT INTO user (username, lk, fachrichtung, secureid) VALUES (?, ?, ?, ?)',
		[hash(userdata.username), userdata.lk, userdata.fachrichtung, randomid],
		function (err, result, _) {
			if (err) {
				errorHandler(err);
				return;
			}
			//@ts-ignore
			const id = result.insertId;
			for (const ele of others) {
				db.execute(
					'INSERT INTO fach (user, fach) VALUES (?,?)',
					[id, ele],
					function (err) {
						if (err) {
							errorHandler(err);
						}
					}
				);
			}
		}
	);
	return randomid;
}

function getRandomInt(max: number): number {
	return Math.floor(Math.random() * max);
}

function getUserData(user: string): Promise<any> {
	return new Promise((resolve, reject) => {
		//TODO: This really should be one query to reduce overhead
		db.query(
			'SELECT id, lk, fachrichtung, secureid FROM user WHERE username = ?',
			[hash(user)],
			function (err, result) {
				if (err) {
					errorHandler(err);
					reject(err);
					return;
				}
				// @ts-ignore
				if (result.length === 1) {
					db.query('SELECT fach FROM fach where user = ?',
						//@ts-ignore    
						[result[0].id],
						(err, res2) => {
							if (err) {
								errorHandler(err);
								reject(err);
								return;
							}
							//@ts-ignore
							result[0]['sonstiges'] = [];
							//@ts-ignore
							res2.forEach(fach => {
								//@ts-ignore
								result[0]['sonstiges'].push(fach['fach']);
							});
							//@ts-ignore
							resolve(result[0]);
						});
					return;
				}
				reject('User not found in DB');
			}
		);
	});
}

function dbQuery(query: string, queryArgs: any[] ): Promise<any[]> {
	return new Promise((resolve, reject) => {
		db.query(query, queryArgs, (err, result) => {
			if(err) {
				reject(errorHandler(err));
				return;
			}
			//@ts-expect-error We cant know the result, think of something better...
			resolve(result);
		});
	});
}

async function cancelHandler(elem: Lesson, lessonNr: string | number) {
	if (!elem['su'][0] || !elem['su'][0]['name']) {
		return;
	}
	db.query('INSERT IGNORE INTO canceled_lessons (fach, lessonid) VALUES (?, ?)',
		[elem['su'][0]['name'], elem['id']], (err, result) => {
			if (err) {
				errorHandler(err);
				return;
			}
			//@ts-ignore
			if (result.affectedRows > 0) {
				sendNotification(elem.su[0].longname, convertUntisTimeDatetoDate(elem.date, elem.startTime), lessonNr);
          
			}
		});
}

function convertUntisTimeDatetoDate(date: number, startTime: number): Date {

	const year = Math.floor(date / 10000);
	const month = Math.floor((date - (year * 10000)) / 100);
	const day = (date - (year * 10000) - month * 100);

	let index;
	if (startTime >= 100) {
		index = 2;
	} else {
		index = 1;
	}
	const hour = Math.floor(startTime / Math.pow(10, index));
	const minutes = Math.floor(((startTime / 100) - hour) * 100);

	return new Date(year, month - 1, day, hour, minutes);
}

function convertUntisDatetoDate(date: number): Date {
	const year = Math.floor(date / 10000);
	const month = Math.floor((date - (year * 10000)) / 100);
	const day = (date - (year * 10000) - month * 100);

	return new Date(year, month - 1, day);
}

async function sendNotification(lesson: string, date: Date, lessonNr: string | number) {
	if (date < new Date()) {
		return;
	}
	const notificationBody = getNotificationBody(lesson, date);

	//TODO: Find new notification provider
}

function getNotificationBody(lesson: string, date: Date): string {
	const now = new Date();
	const help = new Date(date);
	if (now.getFullYear() !== date.getFullYear()) {
		return `${lesson} am ${String(date.getDate() + '.' + (date.getMonth() + 1))} entfällt.`;
	}

	for (let i = 0; i < 3; i++) {
		if (now.getDate() === help.getDate() && now.getMonth() === help.getMonth()) {
			console.log(i);
			if (i === 0) {
				return `${lesson} entfällt heute.`;
			}
			if (i === 1) {
				return `${lesson} entfällt morgen.`;
			}
			if (i === 2) {
				return `${lesson} entfällt übermorgen.`;
			}
		}
		now.setDate(now.getDate() + 1);
	}
	return `${lesson} am ${String(date.getDate() + '.' + (date.getMonth() + 1))} entfällt.`;

}

function signJwt(userObj: any): Promise<string> {
	return new Promise((resolve) => {
		userObj.version = config.constants.jwtVersion;
		resolve(jwt.sign(userObj, config.secrets.JWT_SECRET));
	});
}

function errorHandler(error: Error | mysql.QueryError): string {

	// Catch and handle non critical Errors
    
	if (error.name === 'JsonWebTokenError') {
		return 'Ungültiger JWT. Versuche dich neu Anzumelden';
	}
	if (error.message === 'Failed to login. {"jsonrpc":"2.0","id":"Awesome","error":{"message":"bad credentials","code":-8504}}') {
		return 'Ungültige Anmeldedaten';
	}
	if (error.message === 'Server didn\'t returned any result.') {
		return error.message;
	}

	// Everything else gets logged

	console.error(error);
	return error.message ?? 'Default error Message';
}

function getUntisSession(jwt: {type: string, username: string, version: number,}): Promise<WebUntisLib> {
	return new Promise((resolve, reject) => {

		if (!jwt.type || !jwt.version || jwt.version < config.constants.jwtVersion) {
			reject({name: 'Login exception', message: 'Login function got passed an invalid JWT'});

		}
		if (jwt.type === 'secret') {
			const untis = new WebUntisLib.WebUntisSecretAuth(
				config.secrets.SCHOOL_NAME,
				jwt.username,
				//@ts-ignore
				decrypt(jwt.secret),
				config.secrets.SCHOOL_DOMAIN
			);
			untis.login().then(() => {
				resolve(untis);
			}).catch(reject);
			return;
		}
		if (jwt.type === 'password') {
			const untis = new WebUntisLib(
				config.secrets.SCHOOL_NAME,
				jwt.username,
				//@ts-ignore
				decrypt(jwt.password),
				config.secrets.SCHOOL_DOMAIN
			);
			untis.login().then(() => {
				resolve(untis);
			}).catch(reject);
			return;
		}
		throw new Error('Couldn\'t Login with provided JWT\n\n' + JSON.stringify(jwt));
	});
}

function decodeJwt(jwtString: string): Promise<Jwt> {
	return new Promise((resolve, reject) => {
		jwt.verify(jwtString, jwtSecret, (err, decoded) => {
			if (err) {
				reject();
				return;
			}
			resolve((decoded as Jwt));
		});
	});
}