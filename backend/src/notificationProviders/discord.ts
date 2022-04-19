/* Used to send notifications via Discord */

import {NotificationProps} from '../../types';
import dm from 'djs-messenger';
import {errorHandler} from '../errorHandler';

export function sendNotification({title, payload, targets}: NotificationProps) {
}

export function initDiscord({
								isUserRegistered,
								removeDiscordID,
								addDiscordID,
								discordToken
							}) {
	dm.login(discordToken).then(client => {
		console.log('[djs-messenger] Logged in as', client.user.tag);
	});

	disUserRegistered = isUserRegistered;
	dremoveDiscordID = removeDiscordID;
	daddDiscordID = addDiscordID;

}

const discordAuthObj: { [key: string]: number } = {};

let disUserRegistered: (username: string) => Promise<boolean>;
let dremoveDiscordID: (id: string) => Promise<string>;
let daddDiscordID: (id: string, username: string) => Promise<string>;

//region Discord stuff
const chats: { [key: string]: string } = {};
dm.onMessage = (msg, id, send) => {
	// Stop receiving notifications
	if (msg.toLowerCase() === 'stop') {
		dremoveDiscordID(id).then((res) => {
			send(res);
		}).catch((err) => {
			errorHandler(err);
			send('Das hat leider nicht geklappt.');
		});
		return;
	}
	// Help command
	if (msg.toLowerCase() === 'help') {
		send('Hilfe: ' +
			'\nUm Benachrichtigungen über Discord zu erhalten, gib hier deinen Untis Namen ein.' +
			'\nWenn du keine Benachrichtigungen mehr erhalten möchtest, gib `stop` ein.' +
			'\nUm von vorne zu Beginnen gib `reset` ein');
		return;
	}

	if (msg.toLowerCase() === 'reset') {
		delete chats.id;
		send('Um Benachrichtigungen über Discord zu erhalten, gib hier deinen Untis Namen ein.');
		return;
	}
	if (chats.id) {
		if (/^\d+$/.test(msg)) {
			if (msg === discordAuthObj[chats.id]?.toString()) {
				daddDiscordID(id, chats.id).then(send).catch((err) => {
					errorHandler(err);
					send('Das hat leider nicht geklappt. Versuche es erneut oder Kontaktiere uns');
				});
			} else {
				send('Der Code ist leider ungültig.');

			}
		} else {
			send('Ungültige Eingabe');
		}
	} else {
		// Expect user Input to be untis name
		if (/\d/.test(msg)) {
			send('Die Eingabe darf keine Zahlen enthalten.');
			return;
		}
		disUserRegistered(msg.toLowerCase()).then(bool => {
			if (!bool) {
				send('`' + msg + '`' + ' ist leider nicht vorhanden.\nGib bitte deinen Untis Namen ein. Wenn du hilfe benötigst gib `help`');
				return;
			}
			chats.id = msg.toLowerCase();
			setTimeout(() => {
				delete chats.id;
			}, 300000);
			send('Du musst als nächstes einen Token von der Website anfordern.' +
				'Gehe dazu auf https://untismerger.tk/settings' +
				'\nAnschließend kannst du den Token einfach hier einfügen.');
		});
	}


};

dm.onUserAdd = (name, id) => {
	dm.sendMessage(
		`Hallo ${name}\num über deinen Discord Account benachrichtigungen zu erhalten, antworte bitte mit deinem Untis Namen.\nWenn du keine Benachrichtigungen mehr erhalten möchtest, gib \`stop\` ein`,
		id)
		.catch(errorHandler);
};

export function addDiscordAuth(id: string, code: number) {
	discordAuthObj[id] = code;
}