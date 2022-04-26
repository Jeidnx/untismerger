import http from 'http';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2';
import cors from 'cors';
import express from 'express';
import WebUntisLib from 'webuntis';
import crypto from 'crypto';
import dayjs from 'dayjs';

import {errorHandler} from './errorHandler';
import {cancelHandler} from './notifyHandler';
import * as statistics from './statistics';

import {ApiLessonData, CustomExam, CustomHomework, Holiday, Jwt} from '../../globalTypes';

// Notification Providers
import {sendNotification as sendNotificationMail} from './notificationProviders/mail';
import {sendNotification as sendNotificationWebpush} from './notificationProviders/webpush';
import {sendNotification as sendNotificationDiscord} from './notificationProviders/discord';
import {NotificationProps} from '../types';
import {createClient} from 'redis';

// Constants
const INVALID_ARGS = 418;
const SERVER_ERROR = 500;
const JWT_VERSION = 3;

// Environment setup

if (
	!process.env.PORT ||
	!process.env.SCHOOL_DOMAIN ||
	!process.env.SCHOOL_NAME ||
	!process.env.ENCRYPT ||
	!process.env.JWT_SECRET ||
	!process.env.MYSQL_HOST ||
	!process.env.MYSQL_USER ||
	!process.env.MYSQL_PASS ||
	!process.env.MYSQL_DB
) {
	console.error('Missing env vars');
	console.log(process.env);
	process.exit(1);
}

const notificationProviders: ((props: NotificationProps) => void)[] = [];

const startTimes = [
	800, 945, 1130, 1330, 1515
];

const jwtSecret = process.env.JWT_SECRET;
const schoolName = process.env.SCHOOL_NAME;
const schoolDomain = process.env.SCHOOL_DOMAIN;

const db = mysql.createPool({
	host: process.env.MYSQL_HOST,
	port: Number(process.env.MYSQL_PORT) || 3306,
	user: process.env.MYSQL_USER,
	password: process.env.MYSQL_PASS,
	database: process.env.MYSQL_DB
});
try {
	db.query('SELECT * FROM user LIMIT 1', (err) => {
		if (err) {
			console.error(err);
			errorHandler(new Error('Cannot connect to db'));
			process.exit(1);
		}
		console.log('Successfully connected to db');
	});
} catch (e) {
	console.error(e);
	errorHandler(new Error('Cannot connect to db'));
	process.exit(1);
}

/// init vector used for encryption
const iv = Buffer.alloc(16, process.env.SCHOOL_NAME);

const app = express();

// Enable CORS
app.use(cors());

app.use((req, res, next) => {
	next();
	statistics.addRequest(req.path);
});

http.createServer(app).listen(process.env.PORT);

// Notification Provider specific settings
const providers = process.env.NOTIFICATION_PROVIDERS.split(' ').map((provider) => {
	switch(provider) {
		case 'Discord': {
			if(
				!process.env.DISCORD_TOKEN
			){
				console.log('Missing env vars for discord');
				process.exit(1);
			}

			notificationProviders.push(sendNotificationDiscord);
			//TODO: add Discord endpoints
			return 'Discord';
		}
		case 'Mail': {
			if(
				!process.env.SMTP_HOST ||
				!process.env.SMTP_PORT ||
				!process.env.SMTP_USER ||
				!process.env.SMTP_PASS
			){
				console.log('Missing env vars for Mail');
				process.exit(1);
			}

			notificationProviders.push(sendNotificationMail);
			//TODO: Add mail endpoints
			return 'Mail';
		}
		case 'Webpush': {
			if (
				!process.env.VAPID_PUBLIC_KEY ||
				!process.env.VAPID_PRIVATE_KEY
			) {
				console.log('Missing env vars for webpush');
				process.exit(1);
			}
			notificationProviders.push(sendNotificationWebpush);

			app.get('/vapidPublicKey', (req, res) => {
				res.send(process.env.vapidPublicKey);
			});

			app.post('/registerWebpush', express.json(), (req, res) => {
				if (!req.body['subscription'] || !req.body['jwt']) {
					res.status(INVALID_ARGS).send({error: true, message: 'Missing Arguments'});
					return;
				}

				decodeJwt(req.body.jwt).then((decoded) => {
					//TODO: Add subscription

					res.sendStatus(201);
				}).catch((err) => {
					res.status(INVALID_ARGS).json({error: true, message: errorHandler(err)});
				});
			});

			app.post('/unregisterWebpush', express.json(), (req, res) => {
				if (!req.body.jwt) {
					res.status(INVALID_ARGS).send({error: true, message: 'Missing Arguments'});
				}

				//TODO: Implement

				res.status(200).json({message: 'OK'});
			});
			return 'Webpush';
		}
	}
});

console.log('Using these notification providers: ');
providers.forEach((provider) => {
	console.log(' - ' + provider);
});

app.get('/status', (req, res) => {
	db.query('SELECT * FROM user LIMIT 1', (err) => {
		if (err) {
			console.error(err);
			errorHandler(new Error('Cannot connect to db'));
			res.status(500).json({
				api: 'ok',
				db: 'not ok',
				providers,
			});
			return;
		}
		res.json({
			api: 'ok',
			db: 'ok',
			providers,
		});
	});
});
app.get('/timetableWeek', (req, res) => {
	if (!req.query['jwt'] || !req.query['startDate'] || !req.query['endDate']) {
		res.status(INVALID_ARGS).send({error: true, message: 'Missing args'});
		return;
	}

	if (typeof req.query.jwt !== 'string') {
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

							const reqStartDateAsUntisTime = Number(dayjs(req.query.startDate as string).format('YYYYMMDD'));
							const reqEndDateAsUntisTime = Number(dayjs(req.query.endDate as string).format('YYYYMMDD'));

							//TODO: figure this out properly instead of sending everything everytime
							if (
								// eslint-disable-next-line no-constant-condition
								reqStartDateAsUntisTime >= (holiday.startDate as unknown as number) &&
								reqEndDateAsUntisTime <= (holiday.endDate as unknown as number) || true
							) {
								return [{
									startDate: holiday.startDate,
									endDate: holiday.endDate,
									name: holiday.longName,
									shortName: holiday.name,
								}];
							}
							return [];
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
	if (
		!req.body?.loginMethod ||
		!req.body?.username ||
		!req.body[req.body.loginMethod] ||
		!req.body?.lk ||
		!req.body?.fachrichtung ||
		!req.body?.nawi ||
		!req.body?.ek ||
		!req.body?.sp ||
		!req.body?.sonstiges
	) {
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

	const userObj = {
		username: req.body.username,
		lk: req.body.lk,
		fachrichtung: req.body.fachrichtung,
		sonstiges: sonstiges,
		version: JWT_VERSION,
		type: 'password' as const,
		password: encrypt(req.body.password)
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
app.post('/deleteUser', express.urlencoded({extended: true}), (req, res) => {
	if (!req.body['jwt']) {
		res.status(400).json({error: true, message: 'Missing args'});
		return;
	}

	decodeJwt(req.body.jwt).then((decoded) => {
		dbQuery('DELETE user, fach FROM user JOIN fach on user.id = fach.user where username = ?', [hash(decoded.username)]).then((result) => {
			res.json({message: result});
		}).catch((err) => {
			res.status(SERVER_ERROR).json({error: true, message: errorHandler(err)});
		});
	}).catch((err) => {
		res.status(INVALID_ARGS).json({error: true, message: errorHandler(err)});
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
	if (!req.body?.username || !req.body?.password) {
		res.status(400).json({error: true, message: 'Missing arguments'});
		return;
	}

	getUntisSession({
		password: req.body.password,
		username: req.body.username,
	}, false)
		.then((untis) => {
			const username: string = req.body.username.toLowerCase();

			isUserRegistered(username).then((isRegistered) => {
				if (!isRegistered) {
					res.json({message: 'OK'});
					return;
				}

				getUserData(username).then((data) => {
					signJwt({
						...data,
						username: username,
						password: encrypt(req.body.password),
						version: JWT_VERSION,
						type: 'password',
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
		res.status(INVALID_ARGS).json({error: true, message: errorHandler(err)});
	});
});
app.post('/getPreferences', express.json(), (req, res) => {
	if (!req.body.jwt) {
		res.status(400).json({error: true, message: 'Missing Arguments'});
		return;
	}

	decodeJwt(req.body.jwt).then((decoded) => {
		return dbQuery('SELECT settings FROM user WHERE username = ?', [hash(decoded.username)]).then((result: { settings: string }[]) => {
			return result[0].settings;
		}).catch((err) => {
			errorHandler(err);
			return undefined;
		});
	}).then((result) => {
		res.json({data: result});
	}).catch((err) => {
		res.status(INVALID_ARGS).json({error: true, message: errorHandler(err)});
	});
});
app.post('/setPreferences', express.json(), (req, res) => {
	if (!req.body.jwt || !req.body.prefs || typeof req.body.jwt !== 'string') {
		res.status(400).json({error: true, message: 'Missing Arguments'});
		return;
	}

	decodeJwt(req.body.jwt).then((decoded) => {
		dbQuery('UPDATE user set settings = ? WHERE username = ?', [req.body.prefs, hash(decoded.username)]).then(() => {
			res.status(201).send({message: 'created'});
		}).catch((err) => {
			res.status(SERVER_ERROR).json({error: true, message: errorHandler(err)});
		});
	});
});
app.get('/getExams', (req, res) => {
	if (!req.query['jwt'] || typeof req.query.jwt !== 'string') {
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
							startTime: convertUntisTimeDateToDate(exam.examDate, exam.startTime).toDateString(),
							endTime: convertUntisTimeDateToDate(exam.examDate, exam.endTime).toDateString(),
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
				res.status(INVALID_ARGS).json({error: true, message: errorHandler(err)});
			});
		});
});
app.get('/getHomework', (req, res) => {
	if (!req.query['jwt'] || typeof req.query.jwt !== 'string') {
		res.status(400).json({error: true, message: 'Missing Arguments'});
		return;
	}

	decodeJwt(req.query.jwt)
		.then((decoded) => {
			getUntisSession(decoded)
				.then((untis) => {
					const untisPromise: Promise<CustomHomework[]> = untis.getHomeWorksFor(new Date(), new Date(new Date().setFullYear(new Date().getFullYear() + 1))).then((resp) => {
						//@ts-expect-error WebuntisLib has outdated types
						return resp.homeworks.map((homework) => {
							if (homework.completed) return;
							return {
								//@ts-expect-error WebuntisLib has outdated types
								subject: resp.lessons.find((elem) => {
									return elem.id === homework.lessonId;
								}).subject,
								text: homework.text,
								dueDate: convertUntisDateToDate(homework.dueDate).toDateString(),
								attachments: homework.attachments,
							};
						});
					});

					const dbPromise = dbQuery(
						'SELECT subject, text, dueDate FROM hausaufgaben WHERE kurs in (?, ?, ?) and  dueDate > (CURDATE() - INTERVAL 1 DAY)',
						[decoded.fachrichtung, decoded.lk, decoded.sonstiges]).catch((err) => {
						errorHandler(err);
						return [];
					}) as Promise<CustomHomework[]>;

					Promise.all([untisPromise, dbPromise]).then((resArr) => {
						res.json({message: resArr[0].concat(resArr[1]).sort((a, b) => (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()))});
					}).catch((err) => {
						res.status(500).json({error: true, message: errorHandler(err)});
					});
				});
		});
});
app.post('/addExam', express.json(), (req, res) => {
	if (!req.body.jwt || !req.body.exam) {
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
		res.status(INVALID_ARGS).json({error: true, message: errorHandler(err)});
	});
});
app.post('/addHomework', express.json(), (req, res) => {
	if (!req.body.jwt || !req.body.homework) {
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
		res.status(INVALID_ARGS).json({error: true, message: errorHandler(err)});
	});
});

if (process.env.USE_STATISTICS === 'TRUE') {

	if(
		typeof process.env.REDIS_HOST === 'undefined' ||
		typeof process.env.REDIS_PASS === 'undefined'
	){
		console.log('Missing env vars for statistics');
		process.exit(1);
	}

	app.get('/getStats', (req, res) => {
		if (!req.query['jwt'] || typeof req.query.jwt !== 'string') {
			res.status(406).send({error: true, message: 'missing args'});
			return;
		}

		decodeJwt(req.query.jwt).then((decoded) => {
			isUserAdmin(decoded['username']).then(async bool => {
				if (bool) {
					res.json({
						stats: await statistics.getStats(),
						endpoints: ['users', ...routes],
					});

				} else {
					res.status(403).send({error: true, message: 'Missing permissions'});
				}
			});
		});
	});
	//TODO: why does stack.map return undefined four times??
	const routes = [];
	app._router.stack.forEach((middleware) => {
		if(middleware.route){
			routes.push(middleware.route.path);
		}
	});

	const redisClient = createClient({
		password: process.env.REDIS_PASS,
		socket: {
			host: process.env.REDIS_HOST,
		}
	});

	redisClient.on('error', errorHandler);
	redisClient.connect().then(() => {
		console.log('Connected to Redis');
	}).catch(errorHandler);

	statistics.initStatistics(routes, redisClient);
	setInterval( () => {
		console.log('Redis: saving users to hash');
		dbQuery('SELECT COUNT(id) as c FROM user;', []).then((result: { c: number }[]) => {
			redisClient.HSET('statistics:' + dayjs().format('YYYY-MM-DD'), 'users', result[0].c);
		}).catch(errorHandler);
	}, 10 * 60 * 60);
}

function hash(str: string): string {
	return crypto.createHash('sha256').update(str).digest('hex');
}

function encrypt(str: string): string {
	const cipher = crypto.createCipheriv('aes128', process.env.ENCRYPT, iv);
	return cipher.update(str, 'utf8', 'hex') + cipher.final('hex');
}

function decrypt(encrypted: string): string {
	const decipher = crypto.createDecipheriv('aes128', process.env.ENCRYPT, iv);
	return decipher.update(encrypted, 'hex', 'utf-8') + decipher.final('utf8');
}

function isUserAdmin(name: string): Promise<boolean> {
	return dbQuery('SELECT isadmin FROM user WHERE username = ?', [hash(name)])
		.then((res: { isadmin: 0 | 1 }[]) => {
			return res[0].isadmin === 1;
		});
}

function addExam(exam: CustomExam, username: string): Promise<void> {
	return dbQuery(
		'INSERT INTO klausuren (subject, room, startTime, endTime, kurs, user) VALUES (?, ?, ?, ?, ?, ?)',
		[exam.subject, exam.room, exam.startTime, exam.endTime, exam.course, hash(username)])
		.then(() => {
			//TODO: Check if data was added
			return;
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
	return dbQuery('SELECT id FROM user WHERE username = ?', [hash(username)]).then((res: []) => {
		return res.length > 0;
	});
}

function registerUser(userdata: {
	username: string,
	lk: number,
	fachrichtung: number,
	sonstiges: string[],
}): number {
	const others = userdata.sonstiges;
	const randomid = getRandomInt(100000);

	dbQuery('INSERT INTO user (username, lk, fachrichtung, secureid) VALUES (?, ?, ?, ?,)',
		[hash(userdata.username), userdata.lk, userdata.fachrichtung, randomid]).then((result: { insertId: number }) => {
		const id = result.insertId;
		for (const ele of others) {
			dbQuery('INSERT INTO fach (user, fach) VALUES (?, ?)', [id, ele]);
		}
	});

	return randomid;
}

function getRandomInt(max: number): number {
	return Math.floor(Math.random() * max);
}

function getUserData(username: string): Promise<{
	lk: number,
	fachrichtung: number,
	secureid: number,
	sonstiges: string[],
}> {
	return new Promise((resolve) => {
		dbQuery('SELECT id, lk, fachrichtung, secureid FROM user WHERE username = ?', [hash(username)])
			.then(async (res1: {
				lk: number,
				fachrichtung: number,
				secureid: number,
				id: number,
			}[]) => {
				if (!(res1.length > 0)) throw new Error('user not in db');
				const thisUser = res1[0];
				resolve({
					lk: thisUser.lk,
					fachrichtung: thisUser.fachrichtung,
					secureid: thisUser.secureid,
					sonstiges: await dbQuery('SELECT fach FROM fach WHERE user = ?', [res1[0].id]).then((res2: []) => res2.map((elem: { fach: string }) => (elem.fach))),
				});
			});
	});
}

function dbQuery(query: string, queryArgs: unknown[]): Promise<unknown> {
	return new Promise((resolve, reject) => {
		db.query(query, queryArgs, (err, result) => {
			if (err) {
				reject(errorHandler(err));
				return;
			}
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			resolve(result);
		});
	});
}

function convertUntisTimeDateToDate(date: number, startTime: number): Date {

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

function convertUntisDateToDate(date: number): Date {
	const year = Math.floor(date / 10000);
	const month = Math.floor((date - (year * 10000)) / 100);
	const day = (date - (year * 10000) - month * 100);

	return new Date(year, month - 1, day);
}

function signJwt(userObj: Jwt): Promise<string> {
	return new Promise((resolve) => {
		resolve(jwt.sign(userObj, process.env.JWT_SECRET));
	});
}

function getUntisSession(loginData: {
	username: string,
	password: string
}, decryptPassword = true): Promise<WebUntisLib> {
	return new Promise((resolve, reject) => {
		const untis = new WebUntisLib(
			schoolName,
			loginData.username,
			decryptPassword ? decrypt(loginData.password) : loginData.password,
			schoolDomain,
		);
		untis.login().then(() => {
			resolve(untis);
		}).catch(reject);
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