/* Used to send notifications via Discord */

import {NotificationProps} from '../../types';
import dm from 'djs-messenger';
import {errorHandler} from '../errorHandler';
import {RedisClientType} from 'redis';

let redisClient: RedisClientType;
let isRegistered;
let hash;

export function sendNotification({title, payload, targets}: NotificationProps) {
	targets.forEach((target) => {
		redisClient.GET('discordForward:' + target).then((res) => {
			if (typeof res === 'string') {
				dm.sendMessage(
					title + '\n' + payload,
					res);
			}else{
				errorHandler(new Error('Couldnt send notification via Discord to: ' + target));
			}
		}).catch(errorHandler);
	});
}

export function initDiscord(discordToken, redis, isUserRegistered, hashFunc) {
	redisClient = redis;
	isRegistered = isUserRegistered;
	hash = hashFunc;
	dm.login(discordToken).then(client => {
		console.log('[djs-messenger] Logged in as', client.user.tag);
	});
}

type UntisName = string;
type DiscordID = string;
/// Key: UntisName, Value: Authentication code
const discordAuthObj: { [key: UntisName]: number } = {};

/// Key: discordID; value: hashed untis name
const chats: { [key: DiscordID]: UntisName } = {};
/*
discordForward: [hashed untis username]: [discordid]
discordBackward: [discordid]: [hashed untis username]
 */

dm.onMessage = async (msg, id, send, waitFor) => {
	const discordBackward: string | null = await redisClient.GET('discordBackward:' + id).catch((err) => {
		errorHandler(err);
		return null;
	});

	const discordForward: string | null = !discordBackward ? null : await redisClient.GET('discordForward:' + discordBackward).catch((err) => {
		errorHandler(err);
		return null;
	});

	switch (msg.toLowerCase()){
		case 'stop': {
			if(discordBackward && discordForward){
				redisClient.DEL('discordForward:' + discordBackward).then((res) => {
					if(res){
						redisClient.DEL('discordBackward:' + discordForward).then((res2) => {
							if(res2){
								send('Erfolgreich entfernt');
							}else{
								throw new Error('Fehler');
							}
						});
					}else{
						throw new Error('Fehler');
					}
				}).catch((err) => {
					send('Ein Fehler ist aufgetreten:\n' + errorHandler(err));
				});
				return;
			}

			send('Dein Discord Account ist mit keinem Untis account verknüpft.');
			return;
		}
		case 'help': {
			send('Hilfe: ' +
				'\nUm Benachrichtigungen über Discord zu erhalten, gib hier deinen Untis Namen ein.' +
				'\nWenn du keine Benachrichtigungen mehr erhalten möchtest, gib `stop` ein.' +
				'\nUm dir den aktuellen Status anzeigen zu lassen, gib `status` ein.');
			return;
		}
		case 'status': {
			if(discordBackward){
				send('Dein Discord account mit der ID `' + id + '` ist mit dem Untis account mit dem hash `' + discordBackward + '` verbunden.');
				return;
			}
			send('Um deinen Discord account mit deinem Untis account zu verknüpfen, gib hier deinen Untis Namen ein.');
			return;
		}
		default: {
			if(discordBackward && discordForward){
				send('Du bist bereits Registriert.');
				return;
			}

			// Expect user Input to be untis name
			if (/\d/.test(msg)) {
				send('Der Name darf keine Zahlen enthalten.');
				return;
			}
			isRegistered(msg.toLowerCase()).then(async (bool) => {
				if (!bool) {
					send('`' + msg + '`' + ' ist leider nicht bei Untismerger registriert.\nWenn du hilfe benötigst gib `help` ein');
					return;
				}
				chats[id] = hash(msg.toLowerCase());
				send('Du musst als nächstes einen Token von der Website anfordern.' +
					'Gehe dazu auf https://untismerger.hems2.de/settings' +
					'\nAnschließend kannst du den Token einfach hier einfügen.');
				await waitFor(10).then((response) => {
					if (/^\d+$/.test(response)) {
						if (response === discordAuthObj[chats[id]]?.toString()) {
							return redisClient.SET('discordForward:' + chats[id], id).then((res) => {
								if(res === 'OK'){
									return redisClient.SET('discordBackward:' + id, chats[id]).then((res2) => {
										if(res2 === 'OK') {
											send('Dein Discord account mit der ID:`' + id + '` wurde efolgreich mit dem Untis Account mit dem hash `' + chats[id] + '` verbunden.');
											return;
										}
										throw new Error('Fehler');
									});
								}
								throw new Error('Fehler');
							}).catch((err) => {
								send('Ein Fehler ist aufgetreten:\n' + errorHandler(err));
							});
						} else {
							send('Der Code ist leider ungültig. Gib erneut deinen Untis namen ein.');
						}
					} else {
						send('`' + response + '` ist kein gültiges Format für einen Code. Gib erneut deinen Untis namen ein.');
					}

				}).catch(() => {
					send('Zeit abgelaufen. Bitte gib erneut deinen Untis Namen ein.');
				});

				delete discordAuthObj[chats[id]];
				delete chats[id];
			});
		}
	}
};

dm.onUserAdd = (name, id) => {
	dm.sendMessage(
		`Hallo ${name}\num über deinen Discord Account benachrichtigungen zu erhalten, antworte bitte mit deinem Untis Namen.\nWenn du keine Benachrichtigungen mehr erhalten möchtest, gib \`stop\` ein`,
		id).catch(errorHandler);
};

export function getAuthToken(username: string): number | undefined {
	if (!Object.values(chats).includes(hash(username.toLowerCase()))){
		return undefined;
	}

	if (discordAuthObj[hash(username)]) return discordAuthObj[hash(username)];

	const code = parseInt(Math.random().toFixed(6).replace('0.',''));
	discordAuthObj[hash(username)] = code;
	return code;
}