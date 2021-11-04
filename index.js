const WebUntisLib = require('webuntis');
const express = require('express');
const jwt = require('jsonwebtoken');
const http = require('http');
const crypto = require('crypto');
const mysql = require('mysql2');

// Statics
const saveInterval = 10; // Interval in minutes when data is saved to database
const classIdEnum = {
    'BBVZ10-1': 2176,
    'BFS10a': 2181,
    'BFS10b': 2186,
    'BFS11a': 2191,
    'BFS11b': 2196,
    'BG11a': 2201,
    'BG11b': 2202,
    'BG11c': 2207,
    'BG11d': 2212,
    'BG11e': 2217,
    'BG11f': 2222,
    'BG11g': 2227,
    'BG12-1': 2232,
    'BG12-2': 2237,
    'BG12-3': 2242,
    'BG12-4': 2247,
    'BG12-5': 2252,
    'BG12-6': 2257,
    'BG12-7': 2262,
    'BG12a': 2267,
    'BG12b': 2272,
    'BG12c': 2277,
    'BG12d': 2282,
    'BG12e': 2287,
    'BG12f': 2292,
    'BG13-1': 2297,
    'BG13-2': 2302,
    'BG13-3': 2307,
    'BG13-4': 2311,
    'BG13-5': 2316,
    'BG13-6': 2321,
    'BG13-7': 2326,
    'BG13a': 2331,
    'BG13b': 2336,
    'BG13c': 2341,
    'BG13d': 2346,
    'BG13e': 2351,
    'BG13f': 2356,
    'BI11': 2361,
    'BI12': 2366,
    'BS10H1': 2371,
    'BS10H2': 2376,
    'BS10I1': 2381,
    'BS10I2': 2386,
    'BS10IT1A': 2391,
    'BS10IT1B': 2396,
    'BS10IT2A': 2401,
    'BS10IT2B': 2406,
    'BS10IT3A': 2411,
    'BS10IT3B': 2416,
    'BS10MTS3': 2421,
    'BS11H1': 2422,
    'BS11H2': 2427,
    'BS11I1': 2432,
    'BS11I2': 2437,
    'BS11I3': 2442,
    'BS12IDB': 2447,
    'BS11IT1A': 2452,
    'BS11IT1B': 2457,
    'BS11IT2A': 2462,
    'BS11IT2B': 2467,
    'BS11IT3A': 2472,
    'BS11IT3B': 2477,
    'BS11MTS2': 2482,
    'BS12H1': 2487,
    'BS12H2': 2492,
    'BS12I1': 2497,
    'BS12I2': 2502,
    'BS12I3': 2507,
    'BS12IT1A': 2512,
    'BS12IT1B': 2517,
    'BS12IT2A': 2522,
    'BS12IT2B': 2527,
    'BS12IT3A': 2532,
    'BS12IT3B': 2537,
    'BS12MTS2': 2542,
    'BS13H1': 2547,
    'BS13I1': 2552,
    'BS13I3': 2557,
    'FLS': 2562,
    'Fö BFS BS FOS': 2567,
    'FöDeu': 2572,
    'FöDeZ': 2577,
    'FöEng': 2582,
    'FöIT': 2587,
    'FöLRS': 2592,
    'FöMa': 2597,
    'FOS11A1': 2602,
    'FOS11A2': 2607,
    'FOS12A1': 2612,
    'FOS12A2': 2617,
    'FOS12B1': 2622,
    'FS01V': 2627,
    'FS03V': 2632,
    'FSBW': 2637,
    'SLT': 2642,
    'Lehrersport': 2647,
    'FS05T': 2652,
    'FS01T': 2657,
    'BS10I3': 2661
};
const startTimes = [
    800, 945, 1130, 1330, 1515
]

// Config
const config = require('./data/config.json');
const jwtSecret = config.secrets.JWT_SECRET;
const schoolName = config.secrets.SCHOOL_NAME;
const schoolDomain = config.secrets.SCHOOL_DOMAIN;
const port = process.env.PORT;
const db = mysql.createPool(config.mysql);
if (!jwtSecret || !schoolName || !schoolDomain || !port) {
    console.log('Missing environment or config.json Variables');
    process.exit(1);
}

const iv = new Buffer.alloc(16, config.secrets.SCHOOL_NAME);


//TODO: Port this to database

// Init stats
// Overall request counting
// User hashed list
let stats = loadData();
// initScheduler();
// createUserArray();

const path = config.constants.apiPath;

const app = express();

http.createServer(app).listen(port);

app.use(express.urlencoded({extended: true}));

app.post(path + '/getTimeTableWeek', (req, res) => {
    if (!req.body['jwt'] || !req.body['startDate'] || !req.body.endDate) {
        res.status(406).send('Missing args');
        return;
    }
    jwt.verify(req.body['jwt'], jwtSecret, (err, decoded) => {
        if (decoded.type == "secret") {
            const untis = new WebUntisLib.WebUntisSecretAuth(
                config.secrets.SCHOOL_NAME,
                decoded.username,
                decrypt(decoded.secret),
                config.secrets.SCHOOL_DOMAIN
            );
            untis.login().then(async () => {
                const startDate = new Date(req.body.startDate);
                const endDate = new Date(req.body.endDate);
                let lk = untis.getOwnClassTimetableForRange(startDate, endDate).catch(err => {
                    return []
                });
                let fachRichtung = untis.getTimetableForRange(startDate, endDate, decoded['fachrichtung'], 1).catch(err => {
                    console.log(err);
                    return []
                });
                let sonstiges = untis.getTimetableForRange(startDate, endDate, 2232, 1).catch(err => {
                    return []
                });

                let out = [];

                lk = (await lk).filter(element => {
                    return startTimes.includes(element.startTime);
                })
                fachRichtung = (await fachRichtung).filter(element => {
                    return startTimes.includes((element.startTime));
                })

                out = out.concat(lk);
                out = out.concat(fachRichtung);

                await sonstiges;
                outer: for (let i = 0; i < sonstiges.length; i++) {
                    if (!startTimes.includes(sonstiges[i].startTime)) continue;
                    if (sonstiges[i]['su'].length < 1) continue;
                    let element = sonstiges[i];
                    for (let j = 0; j < decoded['sonstiges'].length; j++) {
                        if (element['su'][0]['name'] === decoded['sonstiges'][j]) {
                            out.push(element);
                            continue outer;
                        }
                    }
                }


                let sendArr = [];
                out.forEach((element) => {
                    sendArr.push({
                        date: element.date,
                        startTime: element.startTime,
                        code: element['code'] || 'regular',
                        shortSubject: element['su'][0]
                            ? element['su'][0]['name']
                            : '🤷',
                        subject: element['su'][0]
                            ? element['su'][0]['longname']
                            : '🤷',
                        teacher: element['te'][0]
                            ? element['te'][0]['longname']
                            : '🤷',
                        room: element['ro'][0] ? element['ro'][0]['name'] : '🤷‍️'
                    });
                });

                res.send({message: "OK", data: sendArr});
            })
        }
    })
})
app.post(path + '/setup', (req, res) => {
    const date = getDate();
    /*if (!stats.requests.hasOwnProperty(date)) {
        constructDateStruct(date);
    }
    stats.requests[date]['post']['/setup'] += 1;*/
    if (!req.body['stage']) {
        res.status(400).send({error: true, message: 'Missing Arguments'});
        return;
    }
    switch (req.body['stage']) {
        case '1': {
            // Stage 1
            if (req.body['jwt'] && req.body['jwt'] !== '') {
                jwt.verify(req.body['jwt'], jwtSecret, (err, decoded) => {
                    if (err) {
                        res.status(400).send({error: true, message: 'Invalid JWT'});
                        return;
                    }
                    const untis = new WebUntisLib.WebUntisSecretAuth(
                        schoolName,
                        decoded['username'],
                        decoded['secret'],
                        schoolDomain
                    );
                    untis
                        .login()
                        .then(() => {
                            if (!isUserRegistered(decoded['username'])) {
                                res.status(418).send({error: true, message: 'how?'});
                                return;
                            }
                            getUserPreferences(decoded['username'])
                                .then((prefs) => {
                                    res.status(200).send({message: 'OK', prefs: prefs});
                                })
                                .catch((e) => {
                                    res.status(500).send({error: true, message: e});
                                });
                        })
                        .catch((err) => {
                            res
                                .status(400)
                                .send({error: true, message: 'Invalid Credentials'});
                        });
                });
                return;
            } else if (req.body['secret'] && req.body['username']) {
                const untis = new WebUntisLib.WebUntisSecretAuth(
                    schoolName,
                    req.body['username'],
                    req.body['secret'],
                    schoolDomain
                );
                untis
                    .login()
                    .then(() => {
                        isUserRegistered(req.body['username']).then((bool) => {
                            if (bool) {
                                getUserPreferences(req.body['username'])
                                    .then((prefs) => {
                                        // TODO Add username + secret to jwt
                                        getUserData(req.body['username']).then((data) => {
                                            data.username = req.body.username;
                                            data.secret = encrypt(req.body.secret);
                                            // TODO: In the future this could be password, depending on what the  user chose
                                            data.type = "secret";

                                            res.status(200).send({
                                                message: 'OK',
                                                prefs: prefs,
                                                jwt: jwt.sign(data, config.secrets.JWT_SECRET)
                                            });
                                        });
                                    })
                                    .catch((e) => {
                                        res.status(500).send({error: true, message: e});
                                    });
                                return;
                            }
                            res.status(200).send({message: 'OK'});
                        });
                    })
                    .catch((err) => {
                        res
                            .status(400)
                            .send({error: true, message: 'Invalid Credentials'});
                    });
                return;
            }
            res.status(400).send({error: true, message: 'Missing Arguments'});
            return;
        }
        case '2': {
            if (
                !req.body['lk'] ||
                !req.body['fachRichtung'] ||
                !req.body['ek'] ||
                !req.body['sp'] ||
                !req.body['naWi']
            ) {
                res.status(400).send({error: true, message: 'Missing Arguments'});
                return;
            }
            // Stage 2
            const potentialCourses = ['DS', 'sn2', 'sn1', 'Ku'];
            let selectedCourses = [];

            potentialCourses.forEach((element) => {
                if (req.body[element] == 'true') {
                    selectedCourses.push(element);
                }
            });

            if (!(req.body['naWi'] == 'false')) {
                selectedCourses.push(req.body['naWi']);
            }

            selectedCourses.push(req.body['sp'], req.body['ek']);
            let userObj = {
                username: req.body['username'],
                secret: req.body['secret'],
                lk: classIdEnum[req.body['lk']],
                fachRichtung: classIdEnum[req.body['fachRichtung']],
                sonstiges: selectedCourses,
                //TODO: could be password in the future
                type: "secret"
            };
            userObj['secureid'] = registerUser(userObj);
            res.send({message: 'OK', jwt: jwt.sign(userObj, jwtSecret)});
            return;
        }
        default: {
            res.status(400).send({error: true, message: 'Invalid Arguments'});
            return;
        }
    }
});
app.post(path + '/getStats', (req, res) => {
    if (!req.body['jwt']) {
        res.status(406).send('Missing args');
        return;
    }
    jwt.verify(req.body['jwt'], jwtSecret, (err, decoded) => {
        if (err) {
            res.status(406).send({error: true, message: 'Invalid JWT'});
            return;
        }
        res.setHeader('Content-Type', 'application/json');
        isUserAdmin(decoded['username']).then(bool => {
            if (bool) {
                let st = {};
                st['requests'] = stats.requests;
                st['users'] = stats.registeredUsers.length;
                res.status(200).send(JSON.stringify(st));
            } else {
                res.status(403).send({error: true, message: 'Keine Rechte'});
            }
        })
    });
});
app.post(path + 'updateUserPrefs', (req, res) => {
    if (!req.body['jwt'] || !req.body['prefs']) {
        res.status(400).send({error: true, message: 'Invalid JWT'});
    }
    res.status(201).send({message: "created"});
});


/**
 * Loads the statistic data
 * @returns {Object} Returns JSON Object with the statistics
 */
function loadData() {
    //TODO: Implement with Database
    return null;
}

/**
 * Saves statistic data
 */
function saveData() {
    //TODO: Implement with Database
}

function initScheduler() {
    setInterval(function () {
        saveData();
    }, saveInterval * 60 * 1000);
}

function getDate() {
    return new Date().toISOString().slice(0, 10);
}

//TODO: What need to happen with this shitshow
function constructDateStruct(s) {
    // Please dont kill me
    stats.requests[s] = {};
    stats.requests[s].get = {};
    stats.requests[s].get['/'] = 0;
    stats.requests[s].get['/setup'] = 0;
    stats.requests[s].get['*'] = 0;
    stats.requests[s].post = {};
    stats.requests[s].post['/setup'] = 0;
    stats.requests[s].post['/getTimeTable'] = 0;
}

function createUserArray() {
    if (!stats.hasOwnProperty('registeredUsers')) {
        stats.registeredUsers = [];
    }
    if (!stats.hasOwnProperty('requests')) {
        stats.requests = {};
    }
}

/**
 * Basic hashing function
 * @param str cleartext input
 * @returns {string} hash
 */
function hash(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
}

function encrypt(str) {
    const cipher = crypto.createCipheriv('aes128', config.secrets.ENCRYPT, iv);
    return cipher.update(str, 'utf8', 'hex') + cipher.final('hex');
}

function decrypt(encrypted) {
    const decipher = crypto.createDecipheriv('aes128', config.secrets.ENCRYPT, iv);
    return decipher.update(encrypted, 'hex', 'utf-8') + decipher.final('utf8');
}

/**
 * Checks if the user is admin [SYNC]
 * @param name Name of the user
 * @returns {Promise<boolean>} if the user is admin
 */
function isUserAdmin(name) {
    return new Promise((resolve, reject) => {
        db.query(
            'SELECT isadmin FROM user WHERE username = ?',
            [hash(name)],
            function (err, result, fields) {
                if (err) {
                    console.log(err);
                    reject(err);
                    return;
                }
                // @ts-ignore
                if (result.length === 1) {
                    resolve(result[0].isadmin === 1);
                    return;
                }
                resolve(false);
            }
        );
    });
}

// Database stuff

/**
 * Checks if the user is already in the database [SYNC]
 * @param username Hashed username
 * @return {Promise<boolean>} If user is registered
 */
function isUserRegistered(username) {
    return new Promise((resolve, reject) => {
        db.query(
            'SELECT id FROM user WHERE username = ?',
            [hash(username)],
            function (err, result, fields) {
                if (err) {
                    console.log(err);
                    reject(err);
                    return;
                }
                // @ts-ignore
                resolve(result.length > 0);
            }
        );
    });
}

/**
 * Adds user to database [SYNC]
 * @param userdata Data from JWT
 * @return int secureid
 */
function registerUser(userdata) {
    let others = userdata.sonstiges;
    let randomid = getRandomInt(100000);
    db.execute(
        'INSERT INTO user (username, lk, fachrichtung, secureid) VALUES (?, ?, ?, ?)',
        [hash(userdata.username), userdata.lk, userdata.fachRichtung, randomid],
        function (err, result, _) {
            if (err) {
                console.log(err);
                return;
            }
            // @ts-ignore
            const id = result.insertId;
            for (const ele of others) {
                db.execute(
                    'INSERT INTO fach (user, fach) VALUES (?,?)',
                    [id, ele],
                    function (err) {
                        if (err) {
                            console.log(err);
                        }
                    }
                );
            }
        }
    );
    return randomid;
}

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

/**
 * Get user settings [SYNC]
 * @param user hashed user
 * @return {Promise<any>}
 */
function getUserPreferences(user) {
    return new Promise((resolve, reject) => {
        db.query(
            'SELECT settings FROM user WHERE username = ?',
            [hash(user)],
            function (err, result, fields) {
                if (err) {
                    console.log(err);
                    reject(err);
                }
                // @ts-ignore
                if (result.length === 1) {
                    resolve(result[0]);
                    return;
                }
                reject('User not found in DB');
            }
        );
    });
}

/**
 * Get lk, fachrichtung, secureid [SYNC]
 * @param {String} user
 * @return {Promise<Object>}
 */
function getUserData(user) {
    return new Promise((resolve, reject) => {
        db.query(
            'SELECT id, lk, fachrichtung, secureid FROM user WHERE username = ?',
            [hash(user)],
            function (err, result, fields) {
                if (err) {
                    console.log(err);
                    reject(err);
                    return;
                }
                // @ts-ignore
                if (result.length === 1) {
                    db.query('SELECT fach FROM fach where user = ?',
                        [result[0].id],
                        (err, res2) => {
                            if (err) {
                                console.log(err);
                                reject(err);
                            }
                            result[0]["sonstiges"] = [];
                            res2.forEach(fach => {
                                result[0]["sonstiges"].push(fach["fach"])
                            })
                            console.log(result[0]);
                            resolve(result[0]);
                        })
                    return;
                }
                reject('User not found in DB');
            }
        );
    });
}
