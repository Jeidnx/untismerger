import {Client, Entity, Repository, Schema, Search} from 'redis-om';
import {errorHandler} from './utils';
import {LessonData} from '../../globalTypes';
import {Dayjs} from 'dayjs';
import { createClient } from 'redis';

const client = createClient();

let connectionString;

let isInitialized = false;
const redisClient = new Client();
redisClient.use(client);

async function registerRepository(schema: Schema<Entity>):Promise<Repository<Entity>>  {
	while(!isInitialized){
		console.log('Delaying registration while redis is not initialized');
		await new Promise((resolve, reject) => {setTimeout(resolve, 2000);});
	}
	const repo = redisClient.fetchRepository(schema);
	return repo.createIndex().then(() => {
		return repo;
	});
}

async function connect(){
	if(!redisClient.isOpen()){
		return redisClient.open(connectionString);
	}
	return Promise.resolve();
}

function initRedis({username = 'default', password = '', host = 'localhost', port = 6379}: {
	username?: string,
	password?: string,
	host?: string,
	port?: number,
}){
	connectionString = `redis://${username}:${password}@${host}:${port || 6379}`;
	redisClient.open(connectionString).then(() => {
		redisClient.set('STARTUP_TEST', '122').then(async () => {
			await redisClient.execute(['DEL', 'STARTUP_TEST']);
			console.log('[redis] Successfully connected');
			isInitialized = true;
		}).catch((err) => {
			console.log(errorHandler(err));
			process.exit(0);
		});
	});
}

const Redis = {
	initRedis,
	registerRepository,
	client,
};
export default Redis;