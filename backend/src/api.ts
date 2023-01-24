import http from 'http';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import express from 'express';
import { WebUntisSecretAuth } from 'webuntis';
import { authenticator as Authenticator } from 'otplib';
import crypto from 'crypto';
import dayjs from 'dayjs';
import { LessonData, Lessons, DayData, TimetableData } from './types';

import { errorHandler, convertUntisTimeDateToDate, hash, convertUntisDateToDate } from './utils';
import * as statistics from './statistics';

import Redis from './redis';

// Constants
const INVALID_ARGS = 418;
const SERVER_ERROR = 500;

// Environment setup

if (
	!process.env.SCHOOL_DOMAIN ||
	!process.env.SCHOOL_NAME ||
	!process.env.ENCRYPT ||
	!process.env.JWT_SECRET ||
	!process.env.REDIS_HOST ||
	typeof process.env.REDIS_PASS === 'undefined'
) {
	console.error('Missing env vars');
	console.log(process.env);
	process.exit(1);
}

type Jwt = {
	username: string,
	secret: string,
	secureid: number,
}

const jwtSecret = process.env.JWT_SECRET;
const schoolName = process.env.SCHOOL_NAME;
const schoolDomain = process.env.SCHOOL_DOMAIN;

Redis.initRedis({
	host: process.env.REDIS_HOST,
	port: Number(process.env.REDIS_PORT),
	password: process.env.REDIS_PASS,
	username: process.env.REDIS_USER,
});

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

app.get('/timetableWeek', (req, res) => {
	if (!req.query['jwt'] || !req.query['startDate'] || !req.query['endDate']) {
		res.status(INVALID_ARGS).send({ error: true, message: 'Missing args' });
		return;
	}

	if (typeof req.query.jwt !== 'string') {
		res.status(INVALID_ARGS).json({ error: true, message: 'Invalid Args' });
		return;
	}

	decodeJwt(req.query.jwt).then(getUntisSession).then(async (untis) => {
		const startDate = new Date(req.query.startDate as string);
		const endDate = new Date(req.query.endDate as string);

		const startRequest = new Date().getMilliseconds();
		const timegrid = await untis.getTimegrid().then((tg) => {
			//console.log(tg[0].timeUnits);
			const tObj: { [key: number]: number } = {};
			tg[0].timeUnits.forEach((tu) => {
				tObj[tu.startTime] = Number(tu.name);
			})
			return tObj
		}).catch((err) => {
			console.error(errorHandler(err));
			throw new Error("Couldn't parse Timegrid");
		})
		untis.getOwnClassTimetableForRange(startDate, endDate).then((lessons): TimetableData => {

			const week: string[] = [];
			let start: string = startDate.toISOString().slice(0, 10);
			const end: string = endDate.toISOString().slice(0, 10);
			while (start < end) {
				start = startDate.toISOString().slice(0, 10);
				week.push(start);
				startDate.setDate(startDate.getDate() + 1);
			};

			let data: { [key: string]: DayData } = {};
			week.forEach((day) => {
				data[day] = [];
				//TODO: check if there is a holiday and insert that where applicable
			})

			let maxDayLength = 0;
			lessons.forEach((lesson) => {
				const convertedDate = dayjs(WebUntisSecretAuth.convertUntisDate(lesson.date + ""));
				const date = convertedDate.format('YYYY-MM-DD');

				const index = timegrid[lesson.startTime];
				if (index > maxDayLength) {
					//size arrays
					maxDayLength = index;
					week.forEach((day) => {
						for (let i = 0; i < maxDayLength; i++) {
							if (typeof data[day][i] == 'undefined') data[day][i] = [];
						}
					})
				}

				//console.log(date, " + ", lesson.startTime + " + ", timegrid[lesson.startTime]);
				if (typeof data[date] == 'undefined') return;
				if (typeof data[date][index] == 'undefined') data[date][index] = [];
				const offset = (data[date][index] as any).length;
				data[date][index][offset] = {
					code: "regular",
					...lesson,
				};
				//console.log(lesson.startTime);

				//TODO: figure out what lesson this is and insert accordingly
			})
			return {
				week,
				timetable: data,
			};
		}).then((parsed) => {
			res.send({ message: 'OK', lessons: parsed, timing: (new Date().getMilliseconds() - startRequest) / 1000 });
		}).catch((err) => {
			res.status(500).json({ error: true, message: errorHandler(err) });
		})
	}).catch((err) => {
		res.status(500).json({ error: true, message: errorHandler(err) })
	})
})

app.post('/register', express.json(), (req, res) => {
	if (
		!req.body?.username ||
		!req.body?.secret) {
		res.status(400).send({
			error: true,
			message: 'Missing Arguments',
		})
	};

	const userObj = {
		username: req.body.username,
		secret: req.body.secret,
	};

	getUntisSession(userObj).then(() => {
		console.log("success");
		signJwt({
			...userObj,
			secureid: registerUser(userObj.username)
		}).then((signed) => {
			res.status(201).json({
				message: 'created',
				jwt: signed,
			});
		}).catch((err) => {
			res.status(500).json({ error: true, message: errorHandler(err) });
		});
	}).catch((err) => {
		console.error(err);
		res.status(400).json({ error: true, message: "Invalid credentials" });
	})
})

app.post('/deleteUser', express.urlencoded({ extended: true }), (req, res) => {
	if (!req.body['jwt']) {
		res.status(400).json({ error: true, message: 'Missing args' });
		return;
	}

	decodeJwt(req.body.jwt).then(() => {
		//TODO: delete user from redis db
	});
});

app.post('/checkCredentials', express.json(), (req, res) => {
	if (!req.body?.username || !req.body?.secret) {
		res.status(400).json({ error: true, message: 'Missing arguments' });
		return;
	}

	getUntisSession({
		secret: req.body.secret,
		username: req.body.username,
	})
		.then((untis) => {
			const username: string = req.body.username.toLowerCase();

			isUserRegistered(username).then((isRegistered) => {
				if (!isRegistered) {
					res.json({ message: 'OK' });
					return;
				}

				signJwt({
					secureid: getRandomInt(100000),
					username: username,
					secret: encrypt(req.body.secret),
				}).then((signed) => {
					res.json({
						message: 'OK',
						jwt: signed,
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
			res.status(INVALID_ARGS).json({ error: true, message: errorHandler(err) });
		});
});
app.post('/getPreferences', express.json(), (req, res) => {
	if (!req.body.jwt) {
		res.status(400).json({ error: true, message: 'Missing Arguments' });
		return;
	}

	decodeJwt(req.body.jwt).then((decoded) => {
		//TODO: get user prefs from redis db
	}).then((result) => {
		res.json({ data: result });
	}).catch((err) => {
		res.status(INVALID_ARGS).json({ error: true, message: errorHandler(err) });
	});
});
app.post('/setPreferences', express.json(), (req, res) => {
	if (!req.body.jwt || !req.body.prefs || typeof req.body.jwt !== 'string') {
		res.status(400).json({ error: true, message: 'Missing Arguments' });
		return;
	}

	decodeJwt(req.body.jwt).then((decoded) => {
		//TODO: save user prefs
	}).catch((err) => {
		res.status(INVALID_ARGS).json({ error: true, message: errorHandler(err) });
	});
});

if (process.env.USE_STATISTICS === 'TRUE') {
	app.get('/getStats', (req, res) => {
		//TODO: http basic auth
		if (!req.query['jwt'] || typeof req.query.jwt !== 'string') {
			res.status(406).send({ error: true, message: 'missing args' });
			return;
		}

		decodeJwt(req.query.jwt).then(async (decoded) => {
			res.json({
				stats: await statistics.getStats(),
				endpoints: ['users', ...routes],
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

	const countUsers = () => {
		return Promise.resolve(-1);
	}
	statistics.initStatistics(routes, countUsers);
}

function encrypt(str: string): string {
	const cipher = crypto.createCipheriv('aes128', process.env.ENCRYPT, iv);
	return cipher.update(str, 'utf8', 'hex') + cipher.final('hex');
}

function decrypt(encrypted: string): string {
	const decipher = crypto.createDecipheriv('aes128', process.env.ENCRYPT, iv);
	return decipher.update(encrypted, 'hex', 'utf-8') + decipher.final('utf8');
}

function isUserRegistered(username: string): Promise<boolean> {
	//TODO: redis
	return Promise.resolve(false);
}

function registerUser(username: string): number {
	const randomid = getRandomInt(100000);
	//TODO redis

	return randomid;
}

function getRandomInt(max: number): number {
	return Math.floor(Math.random() * max);
}

async function getTargets(lessonNr: string | number) {
	//TODO redis
}

function signJwt(userObj: Jwt): Promise<string> {
	return new Promise((resolve) => {
		resolve(jwt.sign(userObj, process.env.JWT_SECRET));
	});
}

function getUntisSession(loginData: {
	username: string,
	secret: string
}): Promise<WebUntisSecretAuth> {
	return new Promise((resolve, reject) => {
		const untis = new WebUntisSecretAuth(
			schoolName,
			loginData.username,
			loginData.secret,
			schoolDomain,
			'Awesome',
			Authenticator
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