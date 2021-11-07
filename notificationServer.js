const webPush = require('web-push');
const fs = require('fs');

if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
	console.log('Missing env vars');
}
// Set the keys used for encrypting the push messages.
webPush.setVapidDetails(
	'https://github.com/Jeidnx',
	process.env.VAPID_PUBLIC_KEY,
	process.env.VAPID_PRIVATE_KEY
);
/* 
Notification Payload should always be formatted as json with the following format:

{
	type: 'type',
	body: "whatever"
}

*/

const subscriptionPath = './subscriptions.json';
let port = process.env.PORT ?? 8081;
let route = '/';

const express = require('express');
const http = require('http');
const app = express();

const subscriptions = {
	list: [],

	init: function () {
		this.list = require(subscriptionPath);
	},
	save: function () {
		fs.writeFileSync(subscriptionPath, JSON.stringify(this.list));
	},
	push: function (/** @type {webPush.PushSubscription} */ e) {
		this.list.push(e);
	}
};
subscriptions.init();

app.use(express.urlencoded({ extended: true }));
http.createServer(app).listen(port);

app.get(route + 'vapidPublicKey', function (req, res) {
	res.send(process.env.VAPID_PUBLIC_KEY);
});

app.post(route + 'register', function (req, res) {
	subscriptions.push(JSON.parse(req.body.subscription));
	res.sendStatus(201);
	subscriptions.save();
});

app.post(route + 'sendNotification', function (req, res) {
	if (!req.body.payload || !req.body.ttl) {
		res.status(400).send('Missing Arguments');
	}
	const payload = req.body.payload;
	const options = {
		TTL: req.body.ttl
	};
	console.log(subscriptions.list);
	subscriptions.list.forEach((/** @type {webPush.PushSubscription} */ user) => {
		webPush
			.sendNotification(user, payload, options)
			.then((response) => {
				if (response.statusCode !== 201) {
					console.log(response);
				}
			})
			.catch(function (error) {
				console.log(error);
			});
	});
	res.status(201).send('created');
});
