let queryDB: (query: string, args: unknown[]) => Promise<unknown>;

/// Contains the endpoints to track and their respective count. To track more or less endpoints just add / remove them here.
let stats: { [key: string]: number, } = {};

const addRequest = (endpoint: string) => {
	if(typeof stats[endpoint] !== 'undefined') stats[endpoint]++;
};

function saveData() {
	const date = new Date().toISOString().slice(0, 10);

	queryDB('SELECT json FROM statistics WHERE date = ?', [date]).then((res: {json: any}[]) => {
		if (res.length && res.length > 0) {
			const dbStats = JSON.parse(res[0].json);
			for (const key in stats) {

				stats[key] = dbStats[key] ?
					stats[key] + dbStats[key] :
					stats[key];
			}
		}

		queryDB('INSERT INTO statistics(date,json) VALUES (?,?) ON DUPLICATE KEY UPDATE json = ?', [date, JSON.stringify(stats), JSON.stringify(stats)]).then(() => {
			for (const key in stats) {
				stats[key] = 0;
			}
		});
	});
}

/**
 * Creates scheduler to  write traffic statistics to DB
 */
function initStatisticsScheduler(saveInterval: number, routes, queryFunc: (query: string, args: unknown[]) => Promise<unknown>) {
	queryDB = queryFunc;
	stats = routes.reduce((a, v) => ({ ...a, [v]: 0}), {}) ;
	console.log('Using statistics');
	console.log('Tracking statistics for: ', routes);
	setInterval(function () {
		saveData();
	}, saveInterval * 60 * 1000);
}

export {addRequest, initStatisticsScheduler};