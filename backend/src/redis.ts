import {Client, Entity, Repository, Schema} from 'redis-om';
import {wait} from './utils';
import {createClient} from 'redis';

let rawClient: ReturnType<typeof createClient>;
let isInitialized = false;
const redisClient = new Client();

async function registerRepository(schema: Schema<Entity>): Promise<Repository<Entity>> {
	while (!isInitialized) {
		console.log('Delaying registration while redis is not initialized');
		await wait(1500);
	}
	const repo = redisClient.fetchRepository(schema);
	return repo.createIndex().then(() => {
		return repo;
	});
}

async function initRedis({username = 'default', password = '', host = 'localhost', port = 6379}: {
	username?: string,
	password?: string,
	host?: string,
	port?: number,
}) {
	const url = `redis://${username}:${password}@${host}:${port || 6379}`;
	rawClient = createClient({url});
	await rawClient.connect();
	await redisClient.use(rawClient);
	await redisClient.set('STARTUP_TEST', '122');
	await redisClient.execute(['DEL', 'STARTUP_TEST']);
	console.log('[redis] Successfully connected');
	isInitialized = true;
}

async function client() {
	while (!isInitialized) {
		await wait(500);
	}
	return rawClient;
}

const Redis = {
	initRedis,
	registerRepository,
	client,
};
export default Redis;