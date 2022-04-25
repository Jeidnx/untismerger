import dayjs from 'dayjs';
import {RedisClientType } from 'redis';
import {Statistic} from '../../globalTypes';
import {errorHandler} from './errorHandler';

let redisClient: RedisClientType;
let routes: string[] = [];

const addRequest = (endpoint: string) => {
	if(routes.includes(endpoint)){
		redisClient.HINCRBY('statistics:' + dayjs().format('YYYY-MM-DD'), endpoint, 1);
	}
};



const getStats = async (): Promise<Statistic[]> => {

	let cursor = 0;
	const keys = [];
	do{
		await redisClient.SCAN(cursor, {
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
		return redisClient.HGETALL(key).then((data) => {
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

function initStatistics(routesIn: string[], redisIn) {
	redisClient = redisIn;
	routes = routesIn;
	console.log('Using statistics');
	console.log('Tracking statistics for: ');
	routes.forEach((route) => {
		console.log(' - ', route);
	});
	return redisClient;
}

export {addRequest,getStats, initStatistics};