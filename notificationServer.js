const webPush = require('web-push');
const config = require("./data/config.json")

const TTL = config.constants.ttl;

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


const iv = new Buffer.alloc(16, config.secrets.SCHOOL_NAME);
let port = process.env.PORT;
let route = '/notification/';

const express = require('express');
const http = require('http');
const mysql = require("mysql2");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const app = express();
const jwtSecret = config.secrets.JWT_SECRET;

const db = mysql.createPool(config.mysql);

app.use(express.urlencoded({ extended: true }));
http.createServer(app).listen(port);

app.get(route + 'vapidPublicKey', (req, res) => {
	res.status(200).send(process.env.VAPID_PUBLIC_KEY);
})

app.post(route + 'register', function (req, res) {
	if(!req.body["subscription"] || !req.body['jwt']) {
		res.status(400).send({error: true, message: "Missing Arguments"});
		return;
	}
	jwt.verify(req.body['jwt'], jwtSecret, (err, decoded) => {
		addSubscription(decoded['username'],JSON.parse(req.body.subscription))
		res.status(201).send({message: "created"});
	})



});

app.post(route + 'sendNotification', async (req, res) => {
	console.log(req.body);
	if (!req.body['payload'] || !req.body["lesson"]) {
		res.status(400).send('Missing Arguments');
		return
	}
	const payload = req.body.payload;
	const options = {
		TTL: TTL
	};
	let sent = false;
	let subscriptions = await getSubscriptions(req.body.lesson).catch((err) => {
		res.status(200).send({message: err});
		sent = true;
	}) || [];
	if(sent){
		return;
	}
	subscriptions.forEach((/** @type {webPush.PushSubscription} */ user) => {
		webPush
			.sendNotification(user, payload, options)
			.then((response) => {
				if (response.statusCode !== 201) {
					console.log(response.statusCode, response);
				}
			})
			.catch(function (error) {
				console.log("Error: ",error);
			});
	});
	res.status(201).send('created');
});

/**
 *
 * @param {String} username Username in Plaintext
 * @param {webPush.PushSubscription} subscription Matching Subscription
 * @returns {Promse<bool>} if Operation was successful
 */
function addSubscription(username, subscription){
	return new Promise((resolve, reject) => {
		db.query('SELECT subscription FROM user WHERE username=?',
			[hash(username)],
			(err, result) => {
				if(err) {
					console.log(err);
					reject(err);
					return;
				}
				if(result < 1){
					reject("User not in DB");
					return;
				}
				let subscriptionArr = JSON.parse(result[0]['subscription']);
				subscriptionArr.push(subscription);

				db.query(
					'UPDATE user SET subscription=?  WHERE username=?',
					[JSON.stringify(subscriptionArr), hash(username)],
					function (err, result, fields) {
						if (err) {
							console.log(err);
							reject(err);
							return;
						}
						resolve(true);
					}
				);
			})







	})
}

/**
 *
 * @param {String} lesson String describing the lesson to search for
 * @returns {Promise<webPush.PushSubscription[]>} List of all matching subscriptions
 */
function getSubscriptions(lesson){
	return new Promise((resolve, reject) => {
		db.query(
			'SELECT subscription FROM user WHERE ? in (lk, fachrichtung) UNION SELECT subscription FROM user LEFT JOIN fach on user.id = fach.user WHERE ? = fach.fach',
			[lesson, lesson],
			function (err, result, fields) {
				if (err) {
					console.log(err);
					reject(err);
					return;
				}
				if(result.length < 1){
					reject("Keine Ergebnisse");
					return;
				}
				let res = [];
				result.forEach(element => {
					JSON.parse(element['subscription']).forEach(subscription => {
						res.push(subscription);
					})
				})
				resolve(res);
			}
		);
	})
}
/**
 * Basic hashing function
 * @param str cleartext input
 * @returns {string} hash
 */
function hash(str) {
	return crypto.createHash('sha256').update(str).digest('hex');
}