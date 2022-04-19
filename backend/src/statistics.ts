import {errorHandler} from './errorHandler';
import {Pool} from 'mysql2';

let db: Pool;

/// Contains the endpoints to track and their respective count. To track more or less endpoints just add / remove them here.
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

const addRequest = (endpoint: string) => {

};

const getStatistics = () => {

};

function saveData() {
	const date = new Date().toISOString().slice(0, 10);

	db.execute('SELECT json FROM statistics WHERE date = ?', [date], (err, res) => {
		if (err) {
			errorHandler(err);
			return;
		}

		//@ts-ignore
		if (res.length && res.length > 0) {
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
				if (err) {
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
 * Creates scheduler to  write traffic statistics to DB
 */
function initStatisticsScheduler(saveInterval: number, database: Pool) {
	db = database;
	setInterval(function () {
		saveData();
	}, saveInterval * 60 * 1000);
}

export {addRequest, getStatistics, initStatisticsScheduler};