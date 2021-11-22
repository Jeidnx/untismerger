const WebUntisLib = require('webuntis');
const express = require('express');
const jwt = require('jsonwebtoken');
const http = require('http');
const crypto = require('crypto');
const mysql = require('mysql2');
const webPush = require('web-push');
let dm = require('djs-messenger');

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
const TTL = config.constants.ttl;
const path = config.constants.apiPath;
let db;

dm.login(config.secrets.DISCORD_TOKEN).then(client => {
    console.log("[djs-messenger] Logged in as", client.user.tag);
})

if(typeof process.env.DEV == 'undefined'){
    console.log("Missing env vars");
    process.exit(1);
}

if(!(process.env.DEV === 'FALSE')){
    console.log("Running in DEV Environment");
    db = mysql.createPool(config.mysqlDev);
}else{
    console.log("Running in PROD Environment");
    db = mysql.createPool(config.mysql);
}
webPush.setVapidDetails(
    'https://github.com/Jeidnx',
    config.secrets.VAPID_PUBLIC,
    config.secrets.VAPID_PRIVATE
);
if (!jwtSecret || !schoolName || !schoolDomain || !port) {
    console.log('Missing environment or config.json Variables');
    process.exit(1);
}

const iv = new Buffer.alloc(16, config.secrets.SCHOOL_NAME);


// SQL Statistics
let stats = {
    "getTimeTableWeek": 0,
    "setup": 0,
    "getStats": 0,
    "updateUserPrefs": 0,
    "register": 0,
    "vapidPublicKey": 0,
};
initScheduler();
initCancelScheduler();

//region Express Server
const app = express();

http.createServer(app).listen(port);

app.use(express.urlencoded({extended: true}));

app.post(path + '/getTimeTableWeek', (req, res) => {
    newRequest("getTimeTableWeek");
    if (!req.body['jwt'] || !req.body['startDate'] || !req.body.endDate) {
        res.status(406).send('Missing args');
        return;
    }
    jwt.verify(req.body['jwt'], jwtSecret, (err, decoded) => {
        if(err){
            res.status(400).send({error: true, message: "Invalid JWT"});
            return;
        }
        if(!decoded.type){
            res.status(400).send({error: true, message: "Outdated JWT"})
            return
        }
        let untis;
        if(!decoded.type || !decoded.version){
            res.status(400).send({error: true, message: "Outdated JWT"});
            return;
        }
        if(decoded.type == 'secret'){
            untis = new WebUntisLib.WebUntisSecretAuth(
                config.secrets.SCHOOL_NAME,
                decoded.username,
                decrypt(decoded.secret),
                config.secrets.SCHOOL_DOMAIN
            )}
        else if(decoded.type == 'password'){
            untis = new WebUntisLib(
                config.secrets.SCHOOL_NAME,
                decoded.username,
                decrypt(decoded.password),
                config.secrets.SCHOOL_DOMAIN
            )
        }
            untis.login().then(async () => {
                const startDate = new Date(req.body.startDate);
                const endDate = new Date(req.body.endDate);
                let lk = untis.getTimetableForRange(startDate, endDate, decoded['lk'], 1).catch(() => {
                    return []
                });
                let fachRichtung = untis.getTimetableForRange(startDate, endDate, decoded['fachrichtung'], 1).catch(err => {
                    return []
                });
                let sonstiges = untis.getTimetableForRange(startDate, endDate, 2232, 1).catch(() => {
                    return []
                });

                let out = [];

                const lkArr = await lk;
                for(let i = 0; i < lkArr.length; i++){
                    let element = lkArr[i];
                    if(startTimes.includes(element.startTime)){
                        out.push(element);
                        if(element.code === "cancelled"){
                            cancelHandler(element, decoded['lk']);
                        }
                    }
                }

                const frArr = await fachRichtung;
                for(let i = 0; i < frArr.length; i++){
                    let element = frArr[i];
                    if(startTimes.includes(element.startTime)){
                        out.push(element);
                        if(element.code === "cancelled"){
                            cancelHandler(element, decoded['fachrichtung']);
                        }
                    }


                }
                untis.logout().catch(console.log);

                sonstiges = (await sonstiges).filter((element) => {
                    return startTimes.includes(element.startTime);
                })
                outer: for (let i = 0; i < sonstiges.length; i++) {
                    if (sonstiges[i]['su'].length < 1) continue;
                    let element = sonstiges[i];
                    if(element.code === "cancelled"){
                        cancelHandler(element, element.su[0].name);
                    }
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
            }).catch((err) => {
                console.log(err);
                res.status(400).send({error: true, message: "Invalid credentials"});
            })
    })
})
app.post(path + '/setup', (req, res) => {
    newRequest("setup");
    if (!req.body['stage']) {
        res.status(400).send({error: true, message: 'Missing Arguments'});
        return;
    }
    switch (req.body['stage']) {
        case '1': {
            // Stage 1
            if ((req.body['secret'] !== "") && (req.body['username'] !== '')) {
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
                                        getUserData(req.body['username']).then((data) => {
                                            data.username = req.body.username;
                                            data.secret = encrypt(req.body.secret);
                                            data.type = "secret";
                                            signJwt(data).then(signed => {
                                                res.send({
                                                    message: 'OK',
                                                    prefs: prefs,
                                                    jwt: signed,
                                                })
                                            })
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
                    .catch(() => {
                        res
                            .status(400)
                            .send({error: true, message: 'Invalid Credentials'});
                    });
                return;
            }
            else if ((req.body["usernamePw"] !== '') && (req.body["password"] !== '')){
                const untis = new WebUntisLib(config.secrets.SCHOOL_NAME, req.body["usernamePw"], req.body['password'], config.secrets.SCHOOL_DOMAIN);
                untis
                    .login()
                    .then(() => {
                        isUserRegistered(req.body['usernamePw']).then((bool) => {
                            if (bool) {
                                getUserPreferences(req.body['usernamePw'])
                                    .then((prefs) => {
                                        getUserData(req.body['usernamePw']).then((data) => {
                                            data.username = req.body.usernamePw;
                                            data.password = encrypt(req.body.password);
                                            data.type = "password";
                                            signJwt(data).then(signed => {
                                                res.send({
                                                    message: "OK",
                                                    prefs: prefs,
                                                    jwt: signed
                                                })
                                            })
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
                    .catch(() => {
                        res
                            .status(400)
                            .send({error: true, message: 'Invalid Credentials'});
                    });
                break;
            }
            else{
                res.status(400).send({error: true, message: 'Missing Arguments'});
            break;
            }
        }
        case '2': {
            if (
                !req.body['lk'] ||
                !req.body['fachRichtung'] ||
                !req.body['ek'] ||
                !req.body['sp'] ||
                !req.body['naWi']
            ) {
                console.log("here")
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
                lk: classIdEnum[req.body['lk']],
                fachrichtung: classIdEnum[req.body['fachRichtung']],
                sonstiges: selectedCourses,
            };

            if(req.body["secret"] !== ""){
                userObj.secret = encrypt(req.body['secret']);
                userObj.username = req.body['username'];
                userObj.type= "secret";
            }
            else if(req.body['password'] !== "") {
                userObj.password = encrypt(req.body["password"]);
                userObj.username = req.body["usernamePw"];
                userObj.type = "password";
            }
            else {
                throw new Error("Invalid");
            }
            userObj['secureid'] = registerUser(userObj);
            signJwt(userObj).then(signed => res.send({message: "OK", jwt: signed})).catch(msg => {
                res.status(500).send({error: true, message: msg});
            })
            return;
        }
        default: {
            res.status(400).send({error: true, message: 'Invalid Arguments'});
            return;
        }
    }
});
app.post(path + '/getStats', (req, res) => {
    newRequest("getStats");
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
        isUserAdmin(decoded['username']).then(async  bool => {
            if (bool) {
                let st = {};

                st.requests = await getStatistics().catch(console.log) || {};
                st.users = await getUserCount().catch(console.log) || 0;
                res.send(st);

            } else {
                res.status(403).send({error: true, message: 'Keine Rechte'});
            }
        })
    });
});
app.post(path + 'updateUserPrefs', (req, res) => {
    newRequest("updateUserPrefs");
    if (!req.body['jwt'] || !req.body['prefs']) {
        res.status(400).send({error: true, message: 'Invalid JWT'});
    }
    res.status(201).send({message: "created"});
});
app.get(path + '/vapidPublicKey', (req, res) => {
    newRequest("vapidPublicKey")
    res.status(200).send(config.secrets.VAPID_PUBLIC);
})
app.post(path + '/register', (req, res) => {
    newRequest("register");
    if(!req.body["subscription"] || !req.body['jwt']) {
        res.status(400).send({error: true, message: "Missing Arguments"});
        return;
    }
    jwt.verify(req.body['jwt'], jwtSecret, (err, decoded) => {
        addSubscription(decoded['username'],JSON.parse(req.body.subscription));
        res.status(201).send({message: "created"});
    })



});
app.post(path + '/deleteUser', (req, res) => {
    if(!req.body['jwt']){
        res.status(400).send({error: true, message: "Missing args"});
        return;
    }
    jwt.verify(req.body['jwt'], config.secrets.JWT_SECRET, (err, decoded) => {
        if(err){
            res.status(400).send({error: true, message: "Invalid JWT"});
            return;
        }
        deleteUser(decoded['username']).then(() => {
            res.send({message: "Deleted"});
        })
    })
})
app.post(path + '/sendNotification', (req, res) =>  {
    if(!req.body['text'] || !req.body['jwt']){
        res.status(400).send({error:true, message: "Missing args"})
    }
    sendCustomNotification(req.body['text']).then((result) => {
        console.log(result);
        res.send(result);
    }).catch(err => {
        console.log(err);
        res.send(err);
    });

})
//endregion

//region Statistic functions
/**
 * Saves statistic data
 */
function saveData() {
    let date = getDate();
    db.execute("INSERT INTO statistics(date, getTimeTableWeek, setup, getStats, updateUserPrefs, vapidPublicKey, register) VALUES (?, ?,?,?,?,?,?)" +
        " ON DUPLICATE KEY UPDATE getTimeTableWeek = getTimeTableWeek + ?, setup = setup + ?, getStats = getStats + ?," +
        " updateUserPrefs = updateUserPrefs + ?, vapidPublicKey = vapidPublicKey + ?, register = register + ?",
        [date, stats.getTimeTableWeek, stats.setup, stats.getStats, stats.updateUserPrefs, stats.vapidPublicKey, stats.register,
        stats.getTimeTableWeek, stats.setup, stats.getStats, stats.updateUserPrefs, stats.vapidPublicKey, stats.register],
        function (err) {
            if(err) {
                console.log("[STATISTICS] " + err.message);
            }
            for(let k in stats) {
                stats[k] = 0;
            }
        });
}

function newRequest(endpoint) {
    stats[endpoint] = stats[endpoint] + 1;
}

/**
 * Creates scheduler
 */
function initScheduler() {
    setInterval(function () {
        saveData();
    }, saveInterval * 60 * 1000);
}

function initCancelScheduler(){
    setInterval(function () {
        let date = new Date();
        date.setDate(date.getDate() + 7);
        checkCancelled(new Date(), date);
    }, saveInterval * 60 * 1000);
}

/**
 *
 * @param {Date} startDate
 * @param {Date} endDate
 */
function checkCancelled(startDate, endDate){
    //TODO: make this work;
}

function getDate() {
    return new Date().toISOString().slice(0, 10);
}
//endregion


//region Cryptography functions
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
//endregion

//region DB Stuff
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
        [hash(userdata.username), userdata.lk, userdata.fachrichtung, randomid],
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
 * Count of registered users
 * @returns {Promise<int>}
 */
async function getUserCount() {
    return new Promise((resolve, reject) => {
        db.query("SELECT COUNT(id) as c FROM user;", function (err, res) {
            if(err) {
                reject(err.message);
            }
            resolve(res[0].c);
        });
    });
}

/**
 * Returns statistics
 * @returns {Promise<Object>}
 */
async function getStatistics() {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM statistics;", function (err, res) {
            if(err) {
                reject(err.message);
            }
            resolve(res);
        });
    });
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
                    return;
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
        //TODO: This really should be one query to reduce overhead
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
                            resolve(result[0]);
                        })
                    return;
                }
                reject('User not found in DB');
            }
        );
    });
}

function deleteUser(user){
    return new Promise((resolve, reject) => {
        db.query("DELETE user, fach FROM user JOIN fach on user.id = fach.user where username = ?", [hash(user)], (err, result) => {
            if(err){
                console.log(err);
                reject(err);
                return;
            }
            resolve();
        })
    })
}

function addDiscordId(id, username){
    return new Promise((resolve, reject) => {
        db.query("UPDATE user SET discordid = ? WHERE username = ?",
            [id, hash(username)],
            (err, result) => {
                if(err){
                    reject(err);
                    return;
                }
                resolve("Erfolgreich Eingetragen");
            })
    })
}

//endregion

/**
 * Handling cancelled classes for Notifications etc.
 * @param {Lesson}elem The WebuntisLib Element which is getting cancelled
 * @param {String} lessonNr The courses to search
 * @returns void
 */
async function cancelHandler(elem, lessonNr){
    db.query('INSERT IGNORE INTO canceled_lessons (fach, lessonid) VALUES (?, ?)',
        [elem["su"][0]["name"], elem["id"]], (err, result) => {
            if(err){
                console.log(err);
                return;
            }
            if(result.affectedRows > 0){
                console.log("Sending: ", lessonNr);
                sendNotification(elem.su[0].longname, convertUntisTimeDatetoDate(elem.date, elem.startTime), lessonNr)
            }
        })
}

/**
 *
 * @param {int} date Untis date format
 * @param {int} startTime Untis Time format
 * @return {Date} JS Date Object
 */
function convertUntisTimeDatetoDate(date, startTime){

    const year = Math.floor(date / 10000)
    const month = Math.floor((date - (year * 10000)) / 100);
    const day = (date - (year * 10000) - month * 100)

    let index;
    startTime >= 100 ? index = 2 : index = 1;
    const hour = Math.floor(startTime / Math.pow(10, index))
    const minutes = Math.floor(((startTime / 100) - hour) *100)

    return new Date(year, month - 1, day, hour, minutes)
}

/**
 *
 * @param {String} lesson Welcher Unterricht entfällt.
 * @param {Date} date Datum, an dem die Stunde entfällt.
 * @param {String} lessonNr Welche Kurse betrroffen sind.
 */
async function sendNotification(lesson, date, lessonNr){
    if(date < new Date()){
        return;
    }

    console.log("Sendet Benachrichtigung für: ", lesson, date.toISOString().slice(0, 10));
    const notificationBody = `${lesson} am ${String(date.getDay() + "."+ (date.getMonth() + 1))} entfällt.`;

    const payload = {
        type: "notification",
        body: notificationBody
    };
    const options = {
        TTL: TTL
    };
    getSubscriptions(lessonNr).then(subscriptions => {
        subscriptions.forEach((/** @type {webPush.PushSubscription} */ user) => {
            webPush
                .sendNotification(user, JSON.stringify(payload), options)
                .then((response) => {
                    if (response.statusCode !== 201) {
                        console.log(response.statusCode, response);
                    }else{
                        console.log("Sent Notificatin");
                    }
                })
                .catch(() => {
                    console.log("Invalid  subscription Object");
                });
        });
    }).catch((msg) => {
        console.log(msg);
    })
    getDiscordIds(lessonNr).then(ids => {
        ids.forEach((id) => {
            dm.sendMessage(notificationBody, id).catch(console.error);
        })
    }).catch(console.error);

}


/**
 *
 * @param lesson Lesson String
 * @returns {Promise<String>}
 */
function getDiscordIds(lesson){
    return new Promise((resolve, reject) => {
        db.query(
            'SELECT discordid FROM user WHERE ? in (lk, fachrichtung) UNION SELECT subscription FROM user LEFT JOIN fach on user.id = fach.user WHERE ? = fach.fach',
            [lesson, lesson],
            function (err, result) {
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
                    res.push(element["discordid"]);
                })
                resolve(res);
            }
        );
    })
}

function sendCustomNotification(text){
    return new Promise((resolve, reject) => {
        const options = {
            TTL: TTL
        };
        getAllSubscriptions().then(subscriptions => {
            subscriptions.forEach((/** @type {webPush.PushSubscription} */ user) => {
                console.log(user);
                webPush
                    .sendNotification(user, JSON.stringify({type: "notification", body: text}), options)
                    .then((response) => {
                        if (response.statusCode !== 201) {
                            console.log(response.statusCode, response);
                        }else{
                            console.log("Sent Notificatin");
                        }
                    })
                    .catch(error => {
                        console.log(error);
                        console.log("Invalid  subscription Object");
                    });
            }).then(() => {
                resolve({message: "created"});
            });
        }).catch(reject);
    })
}

/**
 *
 * @param {String} username Username in Plaintext
 * @param {webPush.PushSubscription} subscription Matching Subscription
 * @returns {Promse<boolean>} if Operation was successful
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
                    function (err) {
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
function getAllSubscriptions(){
    return new Promise((resolve, reject) => {
        db.query('SELECT subscription FROM user', (err, result) => {
            if(err){
                console.log(err);
                reject(err);
                return;
            }

            let res = [];
            result.forEach(element => {
                JSON.parse(element['subscription']).forEach(subscription => {
                    res.push(subscription);
                })
            })
            resolve(res);
        })
    })
}


//region Discord stuff
dm.onMessage = (msg, id, reply) => {
    // Expect user Input to be untis name
    if(/\d/.test(msg)){
        reply("Die Eingabe darf keine Zahlen enthalten.");
        return;
    }
    isUserRegistered(msg).then(bool => {
        if(!bool){
            reply("`" + msg + "`" + " ist leider nicht vorhanden.");
            return;
        }
        addDiscordId(id, msg).then(reply).catch((err) => {
            console.error(err);
            reply("Das hat leider nicht geklappt. Versuche es erneut oder Kontaktiere uns");
        })
    })
}

dm.onUserAdd = (name, id) => {
    dm.sendMessage(`Hallo ${name}, um über deinen Discord Account benachrichtigungen zu erhalten, antworte bitte mit deinem Untis Namen.`, id).catch(console.log);
}
//endregion


/**
 *
 * @param {Object} userObj User Obj with data to sign
 * @returns {Promise<String>} Signed Key, Base64URL encoded
 */
function signJwt(userObj){
    return new Promise((resolve) => {
    userObj.version = config.constants.jwtVersion;
    console.log(userObj);
    resolve(jwt.sign(userObj, config.secrets.JWT_SECRET));
    })
}

