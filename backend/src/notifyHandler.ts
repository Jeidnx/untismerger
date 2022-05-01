/* Handles cancelled Lessons and periodically checks for cancelled lessons */
import {errorHandler} from './errorHandler';
import * as  WebUntisLib from 'webuntis';
import {RedisClientType} from 'redis';

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
let redisClient: RedisClientType;
let providers: [];
function initNotifications(checkInterval: number, redis, notificationProviders) {
	redisClient = redis;
	providers = notificationProviders;
	setInterval(function () {
		const date = new Date();
		date.setDate(date.getDate() + 7);
		checkCancelled(new Date(), date);
	}, checkInterval * 60 * 60);
}

function checkCancelled(startDate: Date, endDate: Date) {
	return;
/*	const untis = new WebUntisLib.WebUntisSecretAuth(
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


	}).catch(errorHandler);*/
}

async function cancelHandler(elem: WebUntisLib.Lesson, lessonNr: string | number) {
	if (!elem['su'][0] || !elem['su'][0]['name']) {
		return;
	}
	console.log(elem);
	return;
/*	db.query('INSERT IGNORE INTO canceled_lessons (fach, lessonid) VALUES (?, ?)',
		[elem['su'][0]['name'], elem['id']], (err, result) => {
			if (err) {
				errorHandler(err);
				return;
			}
			//@ts-ignore
			if (result.affectedRows > 0) {
				sendNotification(elem.su[0].longname, convertUntisTimeDateToDate(elem.date, elem.startTime), lessonNr);

			}
		});*/
}

async function sendNotification(lesson: string, date: Date, lessonNr: string | number) {
	if (date < new Date()) {
		return;
	}
	const notificationBody = getNotificationBody(lesson, date);

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

export {initNotifications, cancelHandler};