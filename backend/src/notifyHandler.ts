/* Handles cancelled Lessons and periodically checks for cancelled lessons */
import * as  WebUntisLib from 'webuntis';
import {RedisClientType} from 'redis';
import {NotificationProps} from '../types';
import {convertUntisTimeDateToDate, errorHandler} from './utils';

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
let providers: ((props: NotificationProps) => void)[] = [];
let getTargets;
function initNotifications(checkInterval: number, notificationProviders, getTargetsFromDb) {
	getTargets = getTargetsFromDb;
	providers = notificationProviders;
	setInterval(function () {
		const date = new Date();
		date.setDate(date.getDate() + 7);
		checkCancelled(new Date(), date);
	}, checkInterval * 60 * 60);
}

function checkCancelled(startDate: Date, endDate: Date) {
	return;
	//TODO
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
	redisClient.GET('sentNotifications:' + elem.id).then((res) => {
		if(res === 'sent'){
			return;
		}

		const date = convertUntisTimeDateToDate(elem.date, elem.startTime);
		if(date > new Date()){
			sendNotification(elem,lessonNr, date);
			redisClient.SET('sentNotifications:' + elem.id, 'sent');
		}
	});
}

async function sendNotification(elem: WebUntisLib.Lesson,lessonNr: string | number, date: Date) {
	return new Promise((resolve, reject) => {
		getTargets(lessonNr).then((res) => {
			const notify: NotificationProps = {
				title: 'Unterricht entfällt:',
				payload: getNotificationBody(elem.su[0].longname, date),
				targets: res,
			};

			providers.forEach((provider) => {
				provider(notify);
			});
		}).catch(reject);
	});
}

function getNotificationBody(lesson: string, date: Date): string {
	const now = new Date();
	const help = new Date(date);
	if (now.getFullYear() !== date.getFullYear()) {
		return `${lesson} am ${String(date.getDate() + '.' + (date.getMonth() + 1))} entfällt.`;
	}

	for (let i = 0; i < 3; i++) {
		if (now.getDate() === help.getDate() && now.getMonth() === help.getMonth()) {
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

export {initNotifications, cancelHandler};