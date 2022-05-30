import dayjs from 'dayjs';
import {Statistic} from '../../globalTypes';
import {errorHandler} from './utils';
import Redis from './redis';

let routes: string[] = [];

const addRequest = async (endpoint: string) => {
	if(routes.includes(endpoint)){
		(await Redis.client()).HINCRBY('statistics:' + dayjs().format('YYYY-MM-DD'), endpoint, 1);
	}
};



const getStats = async (): Promise<Statistic[]> => {

	let cursor = 0;
	const keys = [];
	do{
		await (await Redis.client()).SCAN(cursor, {
			MATCH: 'statistics:*',
		}).then((data) => {
			cursor = data.cursor;
			keys.push(...data.keys);
		});
	} while (cursor !== 0);

	keys.sort((a, b) => {
		return Number(a.substring(11).split('-').join('')) - Number(b.substring(11).split('-').join(''));
	});

	return await Promise.all(keys.map(async (key) => {
		const date = key.substring(11);
		return (await Redis.client()).HGETALL(key).then((data) => {
				return {
					date: date,
					requests: data as {users: string, [key: string]: string},
				};
			}).catch(err => {
				errorHandler(err);
				return {
					date: date,
					requests: {users: -1,},
				};
			});
	}));
};

function initStatistics(routesIn: string[], countUsers: () => Promise<number>) {
	routes = routesIn;
	console.log('[Statistics] Tracking statistics for: ');
	routes.forEach((route) => {
		console.log('[Statistics] - ', route);
	});

	setInterval(() => {
		countUsers().then(async (users) => {
			(await Redis.client()).HSET('statistics:' + dayjs().format('YYYY-MM-DD'), {users});
		});
	}, 10 * 60 * 60 * 60);
}

export {addRequest,getStats, initStatistics};