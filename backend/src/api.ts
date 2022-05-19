import http from 'http';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2';
import cors from 'cors';
import express from 'express';
import WebUntisLib from 'webuntis';
import crypto from 'crypto';
import dayjs from 'dayjs';

import {convertUntisTimeDateToDate, errorHandler, hash} from './utils';
import * as Notify from './notifyHandler';
import * as statistics from './statistics';
import Redis from './redis';
import Lesson from './lesson';

import {CustomExam, CustomHomework, Holiday, Jwt, LessonData} from '../../globalTypes';

// Notification Providers
import {sendNotification as sendNotificationMail} from './notificationProviders/mail';
import {sendNotification as sendNotificationWebpush} from './notificationProviders/webpush';
import {NotificationProps,} from '../types';
import Discord from './notificationProviders/discord';
import User from './user';


// Constants
const INVALID_ARGS = 418;
const SERVER_ERROR = 500;
const JWT_VERSION = 3;

// Environment setup

if (
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

Redis.initRedis({
	host: process.env.REDIS_HOST,
	password: process.env.REDIS_PASS,
	username: process.env.REDIS_USER,
	port: Number(process.env.REDIS_PORT),
});

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

http.createServer(app).listen(8080);

// Notification Provider specific settings
const providers = process.env.NOTIFICATION_PROVIDERS ? process.env.NOTIFICATION_PROVIDERS.split(' ').flatMap((provider) => {
	switch (provider) {
		case 'discord': {
			if (
				!process.env.DISCORD_TOKEN
			) {
				console.log('Missing env vars for discord');
				process.exit(1);
			}

			notificationProviders.push(Discord.sendNotification);

			app.get('/discordToken', (req, res) => {

				if (!req.query.jwt) {
					res.status(INVALID_ARGS).json({error: true, message: 'Invalid Args'});
				}

				decodeJwt(req.query.jwt as unknown as string).then((decoded) => {
					Discord.getAuthToken(decoded.username).then((token) => {
						res.json({token});
					}).catch((err) => {
						res.status(INVALID_ARGS).json({error: true, message: err});
					});
				});
			});

			Discord.initDiscord(process.env.DISCORD_TOKEN);
			return ['Discord'];
		}
		case 'Mail': {
			if (
				!process.env.SMTP_HOST ||
				!process.env.SMTP_PORT ||
				!process.env.SMTP_USER ||
				!process.env.SMTP_PASS
			) {
				console.log('Missing env vars for Mail');
				process.exit(1);
			}

			notificationProviders.push(sendNotificationMail);
			//TODO: Add mail endpoints
			return ['Mail'];
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
			return ['Webpush'];
		}
		default: {
			return [];
		}
	}
}) : [];

if (providers.length > 0) {
	Notify.initNotifications(1, notificationProviders, getTargets);
	console.log('Using notification providers: ');
	providers.forEach((provider) => {
		console.log(' - ' + provider);
	});
}

app.get('/info', (req, res) => {
	db.query('SELECT * FROM user LIMIT 1', (err) => {
		if (err) {
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
					const dataObj = JSON.parse(decoded.data);

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

					const lk = untis.getTimetableForRange(startDate, endDate, dataObj.lk, 1).catch(() => {
						return [];
					});
					const fachRichtung = untis.getTimetableForRange(startDate, endDate, dataObj.fr, 1).catch(() => {
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
								Notify.cancelHandler(element, dataObj.lk);
							}
						}
					}

					const frArr = await fachRichtung;
					for (let i = 0; i < frArr.length; i++) {
						const element = frArr[i];
						if (startTimes.includes(element.startTime)) {
							out.push(element);
							if (element.code === 'cancelled') {
								Notify.cancelHandler(element, dataObj.fr);
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
							Notify.cancelHandler(element, element.su[0].name);
						}
						for (let j = 0; j < decoded['sonstiges'].length; j++) {
							if (element['su'][0]['name'] === decoded['sonstiges'][j]) {
								out.push(element);
								continue outer;
							}
						}
					}

					const sendArr = out.map((element): LessonData => ({
						startTime: convertUntisTimeDateToDate(element.date, element.startTime),
						endTime: convertUntisTimeDateToDate(element.date, element.endTime),
						code: element['code'] || 'regular',
						updatedAt: -1,
						courseNr: -1,
						courseShortName: '',
						courseName: '',
						//TOOD
						shortSubject: element['su'][0]
							? element['su'][0]['name'] : '🤷',
						subject: element['su'][0]
							? element['su'][0]['longname'] : '🤷',
						teacher: element['te'][0]
							? element['te'][0]['longname'] : '🤷',
						shortTeacher: element.su[0] ? element.su[0].longname : '🤷‍',
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
app.post('/register', express.json(), async (req, res) => {
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
		password: encrypt(req.body.password),
		data: JSON.stringify({
			lk: req.body.lk,
			fr: req.body.fachrichtung,
			so: sonstiges,
		})
	};
	const user = await User.registerUser(userObj);

	signJwt({
		...userObj,
		//@ts-ignore
		secId: user.secId,
		version: JWT_VERSION,
	}).then((signed) => {
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
			const hUsername: string = hash(username);

			User.isUserRegistered(hUsername).then(() => {
				User.searchUser(hUsername).then((data) => {
					signJwt({
						username: username,
						password: encrypt(req.body.password),
						//@ts-ignore
						secId: data.secId,
						//@ts-ignore
						data: data.data,
						version: JWT_VERSION,
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

				const dataObj = JSON.parse(decoded.data);

				const dbPromise = dbQuery(
					'SELECT subject, room, startTime, endTime FROM klausuren WHERE kurs in (?, ?, ?) and  endTime > now()',
					[dataObj.fr, dataObj.lk, dataObj.so]) as Promise<CustomExam[]>;

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

					const dataObj = JSON.parse(decoded.data);

					const dbPromise = dbQuery(
						'SELECT subject, text, dueDate FROM hausaufgaben WHERE kurs in (?, ?, ?) and  dueDate > (CURDATE() - INTERVAL 1 DAY)',
						[dataObj.fr, dataObj.lk, dataObj.sonstiges]).catch((err) => {
						errorHandler(err);
						return [];
					}) as Promise<CustomHomework[]>;

					Promise.all([untisPromise, dbPromise]).then((resArr) => {
						res.json({message: resArr[0].concat(resArr[1]).sort((a, b) => (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()))});
					}).catch((err) => {
						res.status(500).json({error: true, message: errorHandler(err)});
					});
				}).catch((err) => {
				res.status(INVALID_ARGS).json({error: true, message: errorHandler(err)});
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



app.post('/search', express.json(), (req, res) => {
	if (
		!req.body.jwt ||
		!req.body.startTime ||
		!req.body.endTime ||
		!req.body.query
	) {
		res.status(INVALID_ARGS).json({error: true, message: 'Invalid args'});
		return;
	}

	const startTime = dayjs(req.body.startTime);
	const endTime = dayjs(req.body.endTime);

	if(!startTime.isValid() || !endTime.isValid()){
		res.status(INVALID_ARGS).json({error: true, message: 'Invalid Date'});
		return;
	}

	decodeJwt(req.body.jwt as string).then(getUntisSession).then(async (untis) => {
		const start = performance.now();
		const q = req.body.query;
		(await Lesson.searchLesson(dayjs(req.body.startTime), dayjs(req.body.endTime)))
			.and('subject').match(q)
			.or('shortSubject').match(q)
			.or('teacher').match(q)
			.or('shortTeacher').match(q)
			.or('room').match(q)
			.or('courseName').match(q)
			.or('courseShortName').match(q)
			.return.sortAsc('startTime').all().then((searchRes) => {
			res.json({time: Number(performance.now() - start).toFixed(2), result: searchRes});
		}).catch((err) => {
			res.status(INVALID_ARGS).json({error: true, message: errorHandler(err)});
		});
	}).catch((err) => {
		res.status(INVALID_ARGS).json({error: true, message: errorHandler(err)});
	});
});

if (process.env.USE_STATISTICS === 'TRUE') {
	app.get('/getStats', (req, res) => {
		if (!req.query['jwt'] || typeof req.query.jwt !== 'string') {
			res.status(406).send({error: true, message: 'missing args'});
			return;
		}

		decodeJwt(req.query.jwt).then((decoded) => {
			User.getUserGroups(hash(decoded.username)).then(async (groups) => {
				if(groups.includes('moderator')){
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
		if (middleware.route) {
			routes.push(middleware.route.path);
		}
	});

	statistics.initStatistics(routes);
}

function encrypt(str: string): string {
	const cipher = crypto.createCipheriv('aes128', process.env.ENCRYPT, iv);
	return cipher.update(str, 'utf8', 'hex') + cipher.final('hex');
}

function decrypt(encrypted: string): string {
	const decipher = crypto.createDecipheriv('aes128', process.env.ENCRYPT, iv);
	return decipher.update(encrypted, 'hex', 'utf-8') + decipher.final('utf8');
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
async function getTargets(lessonNr: string | number) {
	return dbQuery('SELECT username from user LEFT JOIN fach on user.id = fach.user WHERE ? in (lk, fachrichtung, fach.fach) GROUP BY username;', [lessonNr]).then((res) => {
		return (res as { username: string }[]).map((e) => e.username);
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
				reject(err);
				return;
			}
			resolve((decoded as Jwt));
		});
	});
}