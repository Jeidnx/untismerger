import http from 'http';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2';
import cors from 'cors';
import express from 'express';
import WebUntisLib from 'webuntis';
import crypto from 'crypto';
import dayjs from 'dayjs';
import {config} from '../../config.js';

import {convertUntisDateToDate, convertUntisTimeDateToDate, errorHandler, hash} from './utils.js';
import * as Notify from './notifyHandler.js';
import * as statistics from './statistics.js';

import {CustomExam, CustomHomework, Jwt} from '../../globalTypes';

// Notification Providers
import {sendNotification as sendNotificationMail} from './notificationProviders/mail.js';
import {sendNotification as sendNotificationWebpush} from './notificationProviders/webpush.js';
import {NotificationProps} from './types';
import Discord from './notificationProviders/discord.js';
import {getSearch, searchLesson, updateUntisForRange} from './lesson.js';

// Constants
const INVALID_ARGS = 418;
const SERVER_ERROR = 500;
const JWT_VERSION = 3;

const notificationProviders: ((props: NotificationProps) => void)[] = [];

const jwtSecret = config.jwtSecret;
const schoolName = config.schoolName;
const schoolDomain = config.schoolDomain;

const db = mysql.createPool({
    host: config.msqlHost,
    port: config.msqlPort || 3306,
    user: config.msqlUser,
    password: config.msqlPass,
    database: config.msqlDb
});
try {
    db.query('SELECT * FROM user LIMIT 1', (err) => {
        if (err) {
            console.error(err);
            errorHandler(new Error('Cannot connect to db'));
            process.exit(1);
        }
        console.log('[db] Successfully connected');
    });
} catch (e) {
    console.log('[db] Error while initializing: ');
    console.error(e);
    process.exit(1);
}

/// init vector used for encryption
const iv = Buffer.alloc(16, schoolName);

const app = express();

// Enable CORS
app.use(cors());

app.use((req, res, next) => {
    next();
    statistics.addRequest(req.path);
});

http.createServer(app).listen(8080);

const np = config.notificationProviders;

// Notification Provider specific settings
const providers = np ? np.flatMap((provider) => {
    switch (provider) {
        case 'discord': {
            if (
                !config.discordToken
            ) {
                console.log('Missing discord token in config');
                process.exit(1);
            }

            notificationProviders.push(Discord.sendNotification);

            app.get('/discordToken', (req, res) => {

                if (!req.query.jwt) {
                    res.status(INVALID_ARGS).json({error: true, message: 'Invalid Args'});
                }

                decodeJwt(req.query.jwt as unknown as string).then((decoded) => {
                    Discord.getAuthToken(decoded.username).then((token) => {
                        res.json({token});
                    }).catch((err) => {
                        res.status(INVALID_ARGS).json({error: true, message: err});
                    });
                });
            });

            Discord.initDiscord(config.discordToken, isUserRegistered);
            return ['Discord'];
        }
        case 'mail': {
            //TODO
            if (
                !process.env.SMTP_HOST ||
                !process.env.SMTP_PORT ||
                !process.env.SMTP_USER ||
                !process.env.SMTP_PASS
            ) {
                console.log('Missing env vars for Mail');
                process.exit(1);
            }

            notificationProviders.push(sendNotificationMail);
            //TODO: Add mail endpoints
            return ['Mail'];
        }
        case 'webpush': {
            if (
                //TODO
                !process.env.VAPID_PUBLIC_KEY ||
                !process.env.VAPID_PRIVATE_KEY
            ) {
                console.log('Missing env vars for webpush');
                process.exit(1);
            }
            notificationProviders.push(sendNotificationWebpush);

            app.get('/vapidPublicKey', (req, res) => {
                res.send(process.env.vapidPublicKey);
            });

            app.post('/registerWebpush', express.json(), (req, res) => {
                if (!req.body['subscription'] || !req.body['jwt']) {
                    res.status(INVALID_ARGS).send({error: true, message: 'Missing Arguments'});
                    return;
                }

                decodeJwt(req.body.jwt).then((decoded) => {
                    //TODO: Add subscription

                    res.sendStatus(201);
                }).catch((err) => {
                    res.status(INVALID_ARGS).json({error: true, message: errorHandler(err)});
                });
            });

            app.post('/unregisterWebpush', express.json(), (req, res) => {
                if (!req.body.jwt) {
                    res.status(INVALID_ARGS).send({error: true, message: 'Missing Arguments'});
                }

                //TODO: Implement

                res.status(200).json({message: 'OK'});
            });
            return ['Webpush'];
        }
        default: {
            return [];
        }
    }
}) : [];

if (providers.length > 0) {
    Notify.initNotifications(1, notificationProviders, getTargets);
    console.log('Using notification providers: ');
    providers.forEach((provider) => {
        console.log(' - ' + provider);
    });
}

app.get('/info', (req, res) => {
    db.query('SELECT * FROM user LIMIT 1', (err) => {
        if (err) {
            errorHandler(new Error('Cannot connect to db'));
            res.status(500).json({
                api: 'ok',
                db: 'not ok',
                providers,
            });
            return;
        }
        res.json({
            api: 'ok',
            db: 'ok',
            providers,
        });
    });
});
app.get('/timetable', (req, res) => {
    if (!req.query['jwt'] || !req.query['startDate'] || !req.query['endDate']) {
        res.status(INVALID_ARGS).send({error: true, message: 'Missing args'});
        return;
    }

    if (typeof req.query.jwt !== 'string') {
        res.status(INVALID_ARGS).json({error: true, message: 'Invalid Args'});
        return;
    }

    decodeJwt(req.query.jwt)
        .then((decoded) => {
            getUntisSession(decoded)

                .then(async (untis) => {
                    const startDate = dayjs(req.query.startDate as string);
                    const endDate = dayjs(req.query.endDate as string);

                    await updateUntisForRange(untis, startDate, endDate);

                    await getSearch().where('startTime').between(startDate.toDate(), endDate.toDate())

                        .and(search => search
                            .where('courseNr').eq(decoded.lk)
                            .or('courseNr').eq(decoded.fachrichtung)
                            .or('shortSubject').match(decoded.sonstiges.join(' | '))
                        ).returnAll()
                        .then((lessons) => {
                            throw new Error('//TODO: implement');


                            //TODO: Sort lessons and stuff

                            const timetable = {};
                            res.json({timetable});
                        }).catch((err) => {
                            res.status(SERVER_ERROR).json({error: true, message: errorHandler(err)});
                        });
                    return untis.logout();
                }).catch((err) => {
                res.status(500).json({error: true, message: errorHandler(err)});
            });
        });
});
app.get('/nextLesson', (req, res) => {
    if (!req.query['jwt'] || !req.query['startTime']) {
        res.status(INVALID_ARGS).send({error: true, message: 'Missing args'});
        return;
    }

    if (typeof req.query.jwt !== 'string') {
        res.status(INVALID_ARGS).json({error: true, message: 'Invalid Args'});
        return;
    }
    const startTime = dayjs(req.query.startTime as string);
    if (!startTime.isValid()) {
        res.status(INVALID_ARGS).json({error: true, message: 'Invalid date'});
        return;
    }

    decodeJwt(req.query.jwt).then((jwt) => {
        getSearch()
            .where('startTime').after(startTime.toDate())

            .and(search => search
                .where('courseNr').eq(jwt.lk)
                .or('courseNr').eq(jwt.fachrichtung)
                //                        TODO: Fix this
                .or('shortSubject').match(jwt.sonstiges.join(' ')))

            .and('code').not.eq('cancelled')
            .returnFirst().then((lesson) => {
            res.json({lesson});
        }).catch((err) => {
            res.status(SERVER_ERROR).json({error: true, message: errorHandler(err)});
        });
    });
});
app.get('/search', (req, res) => {
    if (!req.query['jwt'] || !req.query['startTime'] || !req.query['endTime'] || typeof req.query['query'] !== 'string') {
        res.status(INVALID_ARGS).send({error: true, message: 'Missing args'});
        return;
    }

    if (typeof req.query.jwt !== 'string') {
        res.status(INVALID_ARGS).json({error: true, message: 'Invalid Args'});
        return;
    }
    const startTime = dayjs(req.query.startTime as string);
    const endTime = dayjs(req.query.endTime as string);

    const showCancelled = typeof req.query.showCancelled !== 'undefined' ? req.query.showCancelled === 'true' : true;

    const sortBy = req.query.sortBy === 'dateDesc' ? 'DESC' : 'ASC';
    if (!startTime.isValid() || !endTime.isValid()) {
        res.status(INVALID_ARGS).json({error: true, message: 'Invalid Date'});
        return;
    }

    decodeJwt(req.query.jwt as string).then(getUntisSession).then(async (untis) => {
        await updateUntisForRange(untis, startTime, endTime);
        const start = performance.now();
        const q = req.query.query as string;
        searchLesson(startTime, endTime)
            .and('subject').match(q)
            .or('shortSubject').match(q)
            .or('courseName').match(q)
            .or('courseShortName').match(q)

            .or('teacher').match(q)
            .or('shortTeacher').match(q)

            .or('room').match(q)
            .or('shortRoom').match(q)

            .and('code').not.eq(showCancelled ? 'a' : 'cancelled')
            .return.sortBy('startTime', sortBy)
            .all().then((searchRes) => {
            res.json({time: Number(performance.now() - start).toFixed(2), result: searchRes});
        }).catch((err) => {
            res.status(INVALID_ARGS).json({error: true, message: errorHandler(err)});
        });
    }).catch((err) => {
        res.status(INVALID_ARGS).json({error: true, message: errorHandler(err)});
    });
});
app.post('/register', express.json(), (req, res) => {
    if (
        !req.body?.loginMethod ||
        !req.body?.username ||
        !req.body[req.body.loginMethod] ||
        !req.body?.lk ||
        !req.body?.fachrichtung ||
        !req.body?.nawi ||
        !req.body?.ek ||
        !req.body?.sp ||
        !req.body?.sonstiges
    ) {
        res.status(400).send({
            error: true,
            message: 'Missing Arguments',
        });
        return;
    }
    const sonstiges = req.body.sonstiges;

    ['nawi', 'ek', 'sp'].forEach((e) => {
        sonstiges.push(req.body[e]);
    });

    const userObj = {
        username: req.body.username,
        lk: req.body.lk,
        fachrichtung: req.body.fachrichtung,
        sonstiges: sonstiges,
        version: JWT_VERSION,
        type: 'password' as const,
        password: encrypt(req.body.password)
    };
    signJwt({...userObj, secureid: registerUser(userObj)}).then((signed) => {
        res.status(201).json({
            message: 'created',
            jwt: signed,
        });
    }).catch((err) => {
        res.status(500).json({error: true, message: errorHandler(err)});
    });
});
app.post('/deleteUser', express.urlencoded({extended: true}), (req, res) => {
    if (!req.body['jwt']) {
        res.status(400).json({error: true, message: 'Missing args'});
        return;
    }

    decodeJwt(req.body.jwt).then((decoded) => {
        dbQuery('DELETE user, fach FROM user JOIN fach on user.id = fach.user where username = ?', [hash(decoded.username)]).then((result) => {
            res.json({message: result});
        }).catch((err) => {
            res.status(SERVER_ERROR).json({error: true, message: errorHandler(err)});
        });
    }).catch((err) => {
        res.status(INVALID_ARGS).json({error: true, message: errorHandler(err)});
    });
});
app.post('/checkCredentials', express.json(), (req, res) => {
    if (!req.body?.username || !req.body?.password) {
        res.status(400).json({error: true, message: 'Missing arguments'});
        return;
    }

    getUntisSession({
        password: req.body.password,
        username: req.body.username,
    }, false)
        .then((untis) => {
            const username: string = req.body.username.toLowerCase();

            isUserRegistered(username).then((isRegistered) => {
                if (!isRegistered) {
                    res.json({message: 'OK'});
                    return;
                }

                getUserData(username).then((data) => {
                    signJwt({
                        ...data,
                        username: username,
                        password: encrypt(req.body.password),
                        version: JWT_VERSION,
                        type: 'password',
                    }).then((signed) => {
                        res.json({
                            message: 'OK',
                            jwt: signed,
                        });
                    });
                }).catch((err) => {
                    res.status(500).send({
                        error: true,
                        message: errorHandler(err),
                    });
                });
            });
            untis.logout();
        }).catch((err) => {
        res.status(INVALID_ARGS).json({error: true, message: errorHandler(err)});
    });
});
app.post('/getPreferences', express.json(), (req, res) => {
    if (!req.body.jwt) {
        res.status(400).json({error: true, message: 'Missing Arguments'});
        return;
    }

    decodeJwt(req.body.jwt).then((decoded) => {
        return dbQuery('SELECT settings FROM user WHERE username = ?', [hash(decoded.username)]).then((result: { settings: string }[]) => {
            return result[0].settings;
        }).catch((err) => {
            errorHandler(err);
            return undefined;
        });
    }).then((result) => {
        res.json({data: result});
    }).catch((err) => {
        res.status(INVALID_ARGS).json({error: true, message: errorHandler(err)});
    });
});
app.post('/setPreferences', express.json(), (req, res) => {
    if (!req.body.jwt || !req.body.prefs || typeof req.body.jwt !== 'string') {
        res.status(400).json({error: true, message: 'Missing Arguments'});
        return;
    }

    decodeJwt(req.body.jwt).then((decoded) => {
        dbQuery('UPDATE user set settings = ? WHERE username = ?', [req.body.prefs, hash(decoded.username)]).then(() => {
            res.status(201).send({message: 'created'});
        }).catch((err) => {
            res.status(SERVER_ERROR).json({error: true, message: errorHandler(err)});
        });
    });
});
app.get('/getExams', (req, res) => {
    if (!req.query['jwt'] || typeof req.query.jwt !== 'string') {
        res.status(400).json({error: true, message: 'Missing Arguments'});
        return;
    }

    decodeJwt(req.query.jwt)
        .then((decoded) => {
            getUntisSession(decoded).then((untis) => {
                const untisPromise = untis.getExamsForRange(new Date(), new Date(new Date().setFullYear(new Date().getFullYear() + 1)), 0, false).then((exams) => {
                    return exams.map((exam): CustomExam => {
                        return {
                            room: exam.rooms[0],
                            subject: exam.subject,
                            startTime: convertUntisTimeDateToDate(exam.examDate, exam.startTime).toDateString(),
                            endTime: convertUntisTimeDateToDate(exam.examDate, exam.endTime).toDateString(),
                            course: '',
                        };
                    });
                });

                const dbPromise = dbQuery(
                    'SELECT subject, room, startTime, endTime FROM klausuren WHERE kurs in (?, ?, ?) and  endTime > now()',
                    [decoded.fachrichtung, decoded.lk, decoded.sonstiges]) as Promise<CustomExam[]>;

                Promise.all([untisPromise, dbPromise]).then((resArr) => {
                    res.json({message: resArr[0].concat(resArr[1]).sort((a, b) => (new Date(a.startTime).getTime() - new Date(b.startTime).getTime()))});
                }).catch((err) => {
                    res.status(500).json({error: true, message: errorHandler(err)});
                });

            }).catch((err) => {
                res.status(INVALID_ARGS).json({error: true, message: errorHandler(err)});
            });
        });
});
app.get('/getHomework', (req, res) => {
    if (!req.query['jwt'] || typeof req.query.jwt !== 'string') {
        res.status(400).json({error: true, message: 'Missing Arguments'});
        return;
    }

    decodeJwt(req.query.jwt)
        .then((decoded) => {
            getUntisSession(decoded)
                .then((untis) => {
                    const untisPromise: Promise<CustomHomework[]> = untis.getHomeWorksFor(new Date(), new Date(new Date().setFullYear(new Date().getFullYear() + 1))).then((resp) => {
                        //@ts-expect-error WebuntisLib has outdated types
                        return resp.homeworks.map((homework) => {
                            if (homework.completed) return;
                            return {
                                //@ts-expect-error WebuntisLib has outdated types
                                subject: resp.lessons.find((elem) => {
                                    return elem.id === homework.lessonId;
                                }).subject,
                                text: homework.text,
                                dueDate: convertUntisDateToDate(homework.dueDate).toDateString(),
                                attachments: homework.attachments,
                            };
                        });
                    });

                    const dbPromise = dbQuery(
                        'SELECT subject, text, dueDate FROM hausaufgaben WHERE kurs in (?, ?, ?) and  dueDate > (CURDATE() - INTERVAL 1 DAY)',
                        [decoded.fachrichtung, decoded.lk, decoded.sonstiges]).catch((err) => {
                        errorHandler(err);
                        return [];
                    }) as Promise<CustomHomework[]>;

                    Promise.all([untisPromise, dbPromise]).then((resArr) => {
                        res.json({message: resArr[0].concat(resArr[1]).sort((a, b) => (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()))});
                    }).catch((err) => {
                        res.status(500).json({error: true, message: errorHandler(err)});
                    });
                }).catch((err) => {
                res.status(INVALID_ARGS).json({error: true, message: errorHandler(err)});
            });
        });
});
app.post('/addExam', express.json(), (req, res) => {
    if (!req.body.jwt || !req.body.exam) {
        res.status(400).json({error: true, message: 'Missing Arguments'});
        return;
    }

    decodeJwt(req.body.jwt).then((decoded) => {
        addExam(req.body.exam, decoded.username).then(() => {
            res.status(201).send({message: 'created'});
        }).catch((e) => {
            res.status(500).json({error: true, message: e.message});
        });
    }).catch((err) => {
        res.status(INVALID_ARGS).json({error: true, message: errorHandler(err)});
    });
});
app.post('/addHomework', express.json(), (req, res) => {
    if (!req.body.jwt || !req.body.homework) {
        res.status(400).json({error: true, message: 'Missing Arguments'});
        return;
    }

    decodeJwt(req.body.jwt).then((decoded) => {

        addHomework(req.body.homework, decoded.username).then(() => {
            res.status(201).send({message: 'created'});
        }).catch((e) => {
            res.status(500).json({error: true, message: e.message});
        });
    }).catch((err) => {
        res.status(INVALID_ARGS).json({error: true, message: errorHandler(err)});
    });
});

if (config.useStatistics) {
    app.get('/getStats', (req, res) => {
        if (!req.query['jwt'] || typeof req.query.jwt !== 'string') {
            res.status(406).send({error: true, message: 'missing args'});
            return;
        }

        decodeJwt(req.query.jwt).then((decoded) => {
            isUserAdmin(decoded['username']).then(async bool => {
                if (bool) {
                    res.json({
                        stats: await statistics.getStats(),
                        endpoints: ['users', ...routes],
                    });

                } else {
                    res.status(403).send({error: true, message: 'Missing permissions'});
                }
            });
        });
    });
    //TODO: why does stack.map return undefined four times??
    const routes = [];
    app._router.stack.forEach((middleware) => {
        if (middleware.route) {
            routes.push(middleware.route.path);
        }
    });

    const countUsers = () => dbQuery('SELECT COUNT(id) as c FROM user;', []).then((result: { c: number }[]) => {
        return result[0].c;
    }).catch((err) => {
        errorHandler(err);
        return -1;
    });

    statistics.initStatistics(routes, countUsers);
}

function encrypt(str: string): string {
    const cipher = crypto.createCipheriv('aes128', config.encryptSecret, iv);
    return cipher.update(str, 'utf8', 'hex') + cipher.final('hex');
}

function decrypt(encrypted: string): string {
    const decipher = crypto.createDecipheriv('aes128', config.encryptSecret, iv);
    return decipher.update(encrypted, 'hex', 'utf-8') + decipher.final('utf8');
}

function isUserAdmin(name: string): Promise<boolean> {
    return dbQuery('SELECT isadmin FROM user WHERE username = ?', [hash(name)])
        .then((res: { isadmin: 0 | 1 }[]) => {
            return res[0].isadmin === 1;
        });
}

function addExam(exam: CustomExam, username: string): Promise<void> {
    //TODO: use Redis
    return dbQuery(
        'INSERT INTO klausuren (subject, room, startTime, endTime, kurs, user) VALUES (?, ?, ?, ?, ?, ?)',
        [exam.subject, exam.room, exam.startTime, exam.endTime, exam.course, hash(username)])
        .then(() => {
            return;
        });
}

function addHomework(homework: CustomHomework, username: string): Promise<void> {
    //TODO: use Redis
    return new Promise((resolve, reject) => {
        db.query(
            'INSERT INTO hausaufgaben (subject, text, dueDate, kurs, user) VALUES (?, ?, ?, ?, ?)',
            [homework.subject, homework.text, homework.dueDate, homework.course, hash(username)],
            function (err) {
                if (err) {
                    errorHandler(err);
                    reject(err);
                    return;
                }
                resolve();
            }
        );
    });
}

function isUserRegistered(username: string): Promise<boolean> {
    return dbQuery('SELECT id FROM user WHERE username = ?', [hash(username)]).then((res: []) => {
        return res.length > 0;
    });
}

function registerUser(userdata: {
    username: string,
    lk: number,
    fachrichtung: number,
    sonstiges: string[],
}): number {
    const others = userdata.sonstiges;
    const randomid = getRandomInt(100000);
//TODO: use Redis
    dbQuery('INSERT INTO user (username, lk, fachrichtung, secureid) VALUES (?, ?, ?, ?,)',
        [hash(userdata.username), userdata.lk, userdata.fachrichtung, randomid]).then((result: { insertId: number }) => {
        const id = result.insertId;
        for (const ele of others) {
            dbQuery('INSERT INTO fach (user, fach) VALUES (?, ?)', [id, ele]);
        }
    });

    return randomid;
}

function getRandomInt(max: number): number {
    return Math.floor(Math.random() * max);
}

function getUserData(username: string): Promise<{
    lk: number,
    fachrichtung: number,
    secureid: number,
    sonstiges: string[],
}> {
    //TODO: use Redis
    return new Promise((resolve) => {
        dbQuery('SELECT id, lk, fachrichtung, secureid FROM user WHERE username = ?', [hash(username)])
            .then(async (res1: {
                lk: number,
                fachrichtung: number,
                secureid: number,
                id: number,
            }[]) => {
                if (!(res1.length > 0)) throw new Error('user not in db');
                const thisUser = res1[0];
                resolve({
                    lk: thisUser.lk,
                    fachrichtung: thisUser.fachrichtung,
                    secureid: thisUser.secureid,
                    sonstiges: await dbQuery('SELECT fach FROM fach WHERE user = ?', [res1[0].id]).then((res2: []) => res2.map((elem: { fach: string }) => (elem.fach))),
                });
            });
    });
}

async function getTargets(lessonNr: string | number) {
    //TODO: use Redis
    return dbQuery('SELECT username from user LEFT JOIN fach on user.id = fach.user WHERE ? in (lk, fachrichtung, fach.fach) GROUP BY username;', [lessonNr]).then((res) => {
        return (res as { username: string }[]).map((e) => e.username);
    });
}

function dbQuery(query: string, queryArgs: unknown[]): Promise<unknown> {
    //TODO: use Redis
    return new Promise((resolve, reject) => {
        db.query(query, queryArgs, (err, result) => {
            if (err) {
                reject(errorHandler(err));
                return;
            }
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            resolve(result);
        });
    });
}

function signJwt(userObj: Jwt): Promise<string> {
    return new Promise((resolve) => {
        resolve(jwt.sign(userObj, config.jwtSecret));
    });
}

function getUntisSession(loginData: {
    username: string,
    password: string
}, decryptPassword = true): Promise<WebUntisLib> {
    return new Promise((resolve, reject) => {
        const untis = new WebUntisLib(
            schoolName,
            loginData.username,
            decryptPassword ? decrypt(loginData.password) : loginData.password,
            schoolDomain,
        );
        untis.login().then(() => {
            resolve(untis);
        }).catch(reject);
    });
}

function decodeJwt(jwtString: string): Promise<Jwt> {
    return new Promise((resolve, reject) => {
        jwt.verify(jwtString, jwtSecret, (err, decoded) => {
            if (err) {
                reject();
                return;
            }
            resolve((decoded as Jwt));
        });
    });
}