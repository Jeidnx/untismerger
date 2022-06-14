import {Client, Entity, Repository, Schema} from 'redis-om';
import {createClient} from 'redis';
import {config} from '../../config.js';

const redisClient = new Client();

const client = createClient({
	username: config.redisUser,
	password: config.redisPass,
	socket: {
		host: config.redisHost,
		port: config.redisPort
	}
});
console.log('[Redis] Initializing');
await client.connect();
await redisClient.use(client);
await redisClient.set('STARTUP_TEST', '122');
await redisClient.execute(['DEL', 'STARTUP_TEST']);

console.log('[Redis] Successfully connected');

async function registerRepository(schema: Schema<Entity>):Promise<Repository<Entity>>  {
	const repo = redisClient.fetchRepository(schema);
	return repo.createIndex().then(() => {
		return repo;
	});
}

export function getRedisData(): {
	/// Register a new Repository with Redisearch
	registerRepository: typeof registerRepository,
	/// Redis client object for all kinds of queries
	client: typeof client,
}{
	return {
		registerRepository,
		client,
	};
}