const WebUntisLib = require('webuntis');
const express = require('express');
const jwt = require('jsonwebtoken');
const http = require('http');
const crypto = require('crypto');
const mysql = require('mysql2');
let dm = require('djs-messenger');

// Statics
const saveInterval = 10; // Interval in minutes when data is saved to database

// Enums
const classIdEnum = {
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

};
const startTimes = [
    800, 945, 1130, 1330, 1515
]
const idsToCheck = [
    2267,
    2272,
    2277,
    2282,
    2287,
    2292,
    2232,
    2237,
    2242,
    2247,
    2252,
    2257,
    2262,
];


// Config
const config = require('./data/config.json');
const jwtSecret = config.secrets.JWT_SECRET;
const schoolName = config.secrets.SCHOOL_NAME;
const schoolDomain = config.secrets.SCHOOL_DOMAIN;
const port = process.env.PORT;
const path = config.constants.apiPath;
let db;



if(typeof process.env.DEV == 'undefined'){
    console.log("Missing env vars");
    process.exit(1);
}

if(!(process.env.DEV === 'FALSE')){
    console.log("Running in DEV Environment");
    db = mysql.createPool(config.mysqlDev);
    dm.login(config.secrets.DISCORD_TOKEN_DEV).then(client => {
        console.log("[djs-messenger] Logged in as", client.user.tag);
    })
}else{
    console.log("Running in PROD Environment");
    db = mysql.createPool(config.mysql);
    dm.login(config.secrets.DISCORD_TOKEN).then(client => {
        console.log("[djs-messenger] Logged in as", client.user.tag);
    })
}
if (!jwtSecret || !schoolName || !schoolDomain || !port) {
    console.log('Missing environment or config.json Variables');
    process.exit(1);
}

/// init vector used for encryption
const iv = new Buffer.alloc(16, config.secrets.SCHOOL_NAME);

/// Contains the users who requested an auth token, and the token
let discordAuthObj = {};

/// Contains the endpoints to track and their respective count. To track more / less endpoints just add / remove them here.
let stats = {
    getTimeTableWeek: 0,
    setup: 0,
    getDiscordToken: 0,
};

// Init schedulers for recurring tasks
initScheduler();
initCancelScheduler();

//region Express Server
const app = express();


function getAdminDiscordIDs(){
    return new Promise(((resolve) => {
        db.query("SELECT discordid FROM user WHERE isadmin = 1", (err, result) => {
            if(err){
                console.error(err);
                return;
            }
            let out = [];
            result.forEach(res => {
                out.push(res["discordid"]);
            })
            resolve(out);
        })
    }))
}
let adminDiscordIDs = [];
getAdminDiscordIDs().then((arr) => {
    adminDiscordIDs = arr;
});



http.createServer(app).listen(port);

if(process.env.DEBUG){
    const debug = require("./testServer.js");
    app.get("*", debug);
}



// Init middleware
app.use(express.urlencoded({extended: true}));
app.use((req, res, next) => {
    next();
    const thisPath = req.path.replace(path + "/", "");
    if(typeof stats[thisPath] !== "undefined"){
        stats[thisPath]++;
    }
})

app.post(path + '/getTimeTableWeek', (req, res) => {
    if (!req.body['jwt'] || !req.body['startDate'] || !req.body.endDate) {
        res.status(406).send('Missing args');
        return;
    }
    jwt.verify(req.body['jwt'], jwtSecret, (err, decoded) => {
        if(err){
            res.status(400).send({error: true, message: errorHandler(err)});
            return;
        }
        let untis;
        if(!decoded.type || !decoded.version || decoded.version < config.constants.jwtVersion){
            res.status(400).send({error: true, message: "Outdated JWT"});
            return;
        }
        if(decoded.type === 'secret'){
            untis = new WebUntisLib.WebUntisSecretAuth(
                config.secrets.SCHOOL_NAME,
                decoded.username,
                decrypt(decoded.secret),
                config.secrets.SCHOOL_DOMAIN
            )}
        else if(decoded.type === 'password'){
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
                let fachRichtung = untis.getTimetableForRange(startDate, endDate, decoded['fachrichtung'], 1).catch(() => {
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
                untis.logout().catch(errorHandler);

                const stArr = await sonstiges;
                outer: for (let i = 0; i < stArr.length; i++) {
                    if (!startTimes.includes(stArr[i].startTime)) continue;
                    if (stArr[i]['su'].length < 1) continue;
                    let element = stArr[i];
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
                            ? element['su'][0]['name'] : '🤷',
                        subject: element['su'][0]
                            ? element['su'][0]['longname'] : '🤷',
                        teacher: element['te'][0]
                            ? element['te'][0]['longname'] : '🤷',
                        room: element['ro'][0] ? element['ro'][0]['name'] : '🤷‍',

                        //Text stuff
                        lstext: element["lstext"] || "",
                        info: element['info'] || "",
                        subsText: element["substText"] || "",
                        sg: element["sg"] || "",
                        bkRemark: element["bkRemark"] || "",
                        bkText: element["bkText"] || "",




                    });
                });

                res.send({message: "OK", data: sendArr});
            }).catch((err) => {
                errorHandler(err);
                res.status(400).send({error: true, message: "Invalid credentials"});
            })
    })
})
app.post(path + '/setup', (req, res) => {
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
                    req.body['username'].toLowerCase(),
                    req.body['secret'],
                    schoolDomain
                );
                untis
                    .login()
                    .then(() => {
                        isUserRegistered(req.body['username'].toLowerCase()).then((bool) => {
                            if (bool) {
                                getUserPreferences(req.body['username'].toLowerCase())
                                    .then((prefs) => {
                                        getUserData(req.body['username'].toLowerCase()).then((data) => {
                                            data.username = req.body.username.toLowerCase();
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
                                    .catch((err) => {
                                        errorHandler(err);
                                        res.status(500).send({error: true, message: err});
                                    });
                                return;
                            }
                            res.status(200).send({message: 'OK'});
                        });
                    })
                    .catch((err) => {
                        errorHandler(err);
                        res
                            .status(400)
                            .send({error: true, message: 'Invalid Credentials'});
                    });
                return;
            }
            else if ((req.body["usernamePw"] !== '') && (req.body["password"] !== '')){
                const untis = new WebUntisLib(config.secrets.SCHOOL_NAME, req.body["usernamePw"].toLowerCase(), req.body['password'], config.secrets.SCHOOL_DOMAIN);
                untis
                    .login()
                    .then(() => {
                        isUserRegistered(req.body['usernamePw'].toLowerCase()).then((bool) => {
                            if (bool) {
                                getUserPreferences(req.body['usernamePw'].toLowerCase())
                                    .then((prefs) => {
                                        getUserData(req.body['usernamePw'].toLowerCase()).then((data) => {
                                            data.username = req.body.usernamePw.toLowerCase();
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
                                    .catch((err) => {
                                        errorHandler(err);
                                        res.status(500).send({error: true, message: err});
                                    });
                                return;
                            }
                            res.status(200).send({message: 'OK'});
                        });
                    })
                    .catch((err) => {
                        errorHandler(err);
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
                res.status(400).send({error: true, message: 'Missing Arguments'});
                return;
            }
            // Stage 2
            const potentialCourses = ['DS', 'sn2', 'sn1', 'Ku'];
            let selectedCourses = [];

            potentialCourses.forEach((element) => {
                if (req.body[element] === 'true') {
                    selectedCourses.push(element);
                }
            });

            if (!(req.body['naWi'] === 'false')) {
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
                userObj.username = req.body['username'].toLowerCase();
                userObj.type= "secret";
            }
            else if(req.body['password'] !== "") {
                userObj.password = encrypt(req.body["password"]);
                userObj.username = req.body["usernamePw"].toLowerCase();
                userObj.type = "password";
            }
            else {
                throw new Error("Invalid");
            }
            userObj['secureid'] = registerUser(userObj);
            signJwt(userObj).then(signed => res.send({message: "OK", jwt: signed})).catch(err => {
                errorHandler(err);
                res.status(500).send({error: true, message: err});
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
    if (!req.body['jwt']) {
        res.status(406).send('Missing args');
        return;
    }
    jwt.verify(req.body['jwt'], jwtSecret, (err, decoded) => {
        if (err) {
            res.status(406).send({error: true, message: errorHandler(err)});
            return;
        }
        res.setHeader('Content-Type', 'application/json');
        isUserAdmin(decoded['username']).then(async  bool => {
            if (bool) {
                let st = {};

                st.requests = await getStatistics().catch(errorHandler) || {};
                st.users = await getUserCount().catch(errorHandler) || 0;
                res.send(st);

            } else {
                res.status(403).send({error: true, message: 'Keine Rechte'});
            }
        })
    });
});

app.post(path + '/deleteUser', (req, res) => {
    if(!req.body['jwt']){
        res.status(400).send({error: true, message: "Missing args"});
        return;
    }
    jwt.verify(req.body['jwt'], config.secrets.JWT_SECRET, (err, decoded) => {
        if(err){
            res.status(400).send({error: true, message: errorHandler(err)});
            return;
        }
        deleteUser(decoded['username']).then(() => {
            res.send({message: "Deleted"});
        })
    })
})
app.post(path + "/getDiscordToken", (req, res) => {
    if(!req.body['jwt']){
        res.status(400).send({error: true, message: "Missing Arguments"});
        return;
    }
    jwt.verify(req.body['jwt'], jwtSecret, (err, decoded) => {
        if (err) {
            res.status(400).send({error: true, message: errorHandler(err)});
            return;
        }
        if(discordAuthObj[decoded['username']]){
            res.status(200).send({secret: discordAuthObj[decoded['username']]});
            return;
        }
        const secretToken = getRandomInt(1000000);
        discordAuthObj[decoded['username']] = secretToken;
        setTimeout(() => {
            delete discordAuthObj[decoded['username']];
        }, 60000);
        res.status(200).send({secret: secretToken});

    })

})
app.post(path + "/rawRequest", (req, res) => {
    if(!req.body['jwt'] ||
        !req.body["requestType"] ||
        !req.body['requestData']
    ){
        res.status(400).send( {error: true, message: "Missing args"});
        return;
    }
    jwt.verify(req.body.jwt, config.secrets.JWT_SECRET, (err, decoded) => {
        if(err){
            res.status(400).send({error: true, message: errorHandler(err)});
            return;
        }
        const requestData = JSON.parse(req.body['requestData']);

            switch (req.body['requestType']){
                case "getTimeTableFor": {
                    // Check if requestBody contains data for this request, if yes login and make it
                    if(!requestData["date"] || !requestData["id"]) {
                        res.status(400).send({error: true, message: "Invalid parameters"})
                        return;
                    }
                    untisLogin(decoded).then(untis => {
                        untis.getTimetableFor(new Date(requestData["date"]), requestData["id"], 1).then((value) => {
                            res.send(value);
                            untis.logout().then()
                        }).catch((err) => {
                            res.status(400).send({error: true, message: errorHandler(err)});
                        })
                    }).catch((err) => {
                        res.status(400).send({error: true, message: errorHandler(err)});
                    });
                    return;
                }
                case "getOwnTimeTableFor": {
                    if(!requestData["date"]) {
                        res.status(400).send({error: true, message: "Invalid parameters"})
                        return;
                    }
                    untisLogin(decoded).then(untis => {
                        untis.getOwnTimetableFor(new Date(requestData["date"])).then((value) => {
                            res.send(value);
                            untis.logout().then()
                        }).catch((err) => {
                            res.status(400).send({error: true, message: errorHandler(err)});
                        })
                    }).catch((err) => {
                        res.status(400).send({error: true, message: errorHandler(err)});
                    });
                    return;
                }
                case "getTimeTableForRange": {
                    // Check if requestBody contains data for this request, if yes login and make it
                    if(!requestData["id"] || !requestData["rangeStart"] || !requestData["rangeEnd"]) {
                        res.status(400).send({error: true, message: "Invalid parameters"});
                        return;
                    }
                    untisLogin(decoded).then(untis => {
                        untis.getTimetableForRange(new Date(requestData["rangeStart"]), new Date(requestData["rangeEnd"]), requestData["id"], 1).then(value => {
                            res.send(value);
                            untis.logout().then();
                        });
                    }).catch(err => {
                        res.status(400).send({error: true, message: errorHandler(err)});
                    });
                    return;
                }
                case "getRooms": {
                    untisLogin(decoded).then(untis => {
                        untis.getRooms().then(value => {
                            res.status(200).send(value);
                            untis.logout().then();
                        });
                    }).catch((err) => {
                        res.status(400).send({error: true, message: errorHandler(err)});
                    });
                    return;
                }
                case "getSubjects": {
                    untisLogin(decoded).then(untis => {
                        untis.getSubjects().then(value => {
                            res.status(200).send(value);
                            untis.logout().then();
                        });
                    }).catch((err) => {
                        res.status(400).send({error: true, message: errorHandler(err)});
                    });
                    return;
                }
                case "getClasses": {
                    untisLogin(decoded).then(untis => {
                        untis.getClasses().then(value => {
                            res.status(200).send(value);
                            untis.logout().then();
                        });
                    }).catch((err) => {
                        res.status(400).send({error: true, message: errorHandler(err)});
                    });
                    return;
                }
                case "getHolidays": {
                    untisLogin(decoded).then(untis => {
                        untis.getHolidays().then(value => {
                            res.status(200).send(value);
                            untis.logout().then();
                        });
                    }).catch((err) => {
                        res.status(400).send({error: true, message: errorHandler(err)});
                    });
                    return;
                }
                // Write cases for applicable requests.
                default: {
                    res.status(400).send({error: true, message: "Invalid requestType"});
                }
            }
    })

    })
//endregion

//region Statistic functions
/**
 * Saves statistic data
 */
function saveData() {
    let date = getDate();

    db.execute("INSERT INTO statistics(date, getTimeTableWeek, setup, getDiscordToken) VALUES (?,?,?,?)" +
        "ON DUPLICATE KEY UPDATE getTimeTableWeek = getTimeTableWeek + ?, setup = setup + ?," +
        "getDiscordToken = getDiscordToken + ?",
        [date, stats.getTimeTableWeek, stats.setup, stats.getDiscordToken,
        stats.getTimeTableWeek, stats.setup, stats.getDiscordToken],
        function (err) {
            if(err) {
                errorHandler(err);
            }
            for(let k in stats) {
                stats[k] = 0;
            }
        });
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
    const untis = new WebUntisLib.WebUntisSecretAuth(
        config.secrets.SCHOOL_NAME,
        config.secrets.UNTIS_USERNAME,
        config.secrets.UNTIS_SECRET,
        config.secrets.SCHOOL_DOMAIN
    )
    untis.login().then(async () => {
        await untis.getTimetableForRange(startDate, endDate, 2232, 1).then(lessons => {
            lessons.forEach(lesson => {
                if(!startTimes.includes(lesson.startTime)) return;
                if (lesson.code === "cancelled") {
                    cancelHandler(lesson, lesson.su[0].name);
                }
            })
        }).catch(errorHandler);
        // General courses
        for(let i = 0; i < idsToCheck.length; i++){
            await untis.getTimetableForRange(startDate, endDate, idsToCheck[i], 1).then(lessons => {
                lessons.forEach(lesson => {
                    if(!startTimes.includes(lesson.startTime)) return;
                    if(lesson.code === "cancelled"){
                        cancelHandler(lesson, idsToCheck[i].toString());
                    }
                })
            }).catch(errorHandler);
        }
        untis.logout().catch(errorHandler);


    }).catch(errorHandler);
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
            function (err, result) {
                if (err) {
                    errorHandler(err);
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
            function (err, result) {
                if (err) {
                    errorHandler(err);
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
                errorHandler(err);
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
                            errorHandler(err);
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
                errorHandler(err);
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
                errorHandler(err);
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
            function (err, result) {
                if (err) {
                    errorHandler(err);
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
            function (err, result) {
                if (err) {
                    errorHandler(err);
                    reject(err);
                    return;
                }
                // @ts-ignore
                if (result.length === 1) {
                    db.query('SELECT fach FROM fach where user = ?',
                        [result[0].id],
                        (err, res2) => {
                            if (err) {
                                errorHandler(err);
                                reject(err);
                                return;
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
        db.query("DELETE user, fach FROM user JOIN fach on user.id = fach.user where username = ?", [hash(user)], (err) => {
            if(err){
                errorHandler(err);
                reject(err);
                return;
            }
            resolve();
        })
    })
}

/**
 *
 * @param id Discord ID
 * @param username Untis username
 * @returns {Promise<String>}
 */
function addDiscordId(id, username){
    return new Promise((resolve, reject) => {
        db.query("UPDATE user SET discordid = ? WHERE username = ?",
            [id, hash(username)],
            (err, result) => {
                if(err){
                    errorHandler(err);
                    reject(err);
                    return;
                }
                if(result.affectedRows < 1){
                    reject("ID nicht gefunden");
                }
                resolve("Erfolgreich Eingetragen");
            })
    })
}

/**
 * Removes a discord ID From DB
 * @param id the Id to remove
 * @returns {Promise<String>}
 */
function rmDiscordId(id){
    return new Promise((resolve, reject) => {
        db.query("UPDATE user SET discordid = '' WHERE discordid = ?",
            [id],
            (err, result) => {
                if(err){
                    errorHandler(err);
                    reject(err);
                    return;
                }
                if(result.affectedRows < 1){
                    resolve("Deine ID wurde nicht in der Datenbank gefunden.");
                    return;
                }
                resolve("Erfolgreich Entfernt");
            })
    })
}

//endregion

/**
 * Handling cancelled classes for Notifications etc.
 * @param {module:webuntis.Lesson}elem The WebuntisLib Element which is getting cancelled
 * @param {String} lessonNr The courses to search
 * @returns void
 */
async function cancelHandler(elem, lessonNr){
    if(!elem['su'][0] || !elem["su"][0]["name"]){
        return;
    }
    db.query('INSERT IGNORE INTO canceled_lessons (fach, lessonid) VALUES (?, ?)',
        [elem["su"][0]["name"], elem["id"]], (err, result) => {
            if(err){
                errorHandler(err);
                return;
            }
            if(result.affectedRows > 0){
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
    if(startTime >= 100){
        index = 2;
    }else{
        index = 1;
    }
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
    const notificationBody = getNotificationBody(lesson, date);

    getDiscordIds(lessonNr).then(ids => {
        ids.forEach((id) => {
            dm.sendMessage(notificationBody, id).catch(errorHandler);
        })
    }).catch(errorHandler);

}

/**
 *
 * @param {String} lesson
 * @param {Date} date
 * @return {string}
 */
function getNotificationBody(lesson ,date){
    return `${lesson} am ${String(date.getDate() + "."+ (date.getMonth() + 1))} entfällt.`;
}

/**
 *
 * @param lesson Lesson String
 * @returns {Promise<String[]>}
 */
function getDiscordIds(lesson){
    return new Promise((resolve, reject) => {
        db.query(
            'SELECT discordid FROM user WHERE ? in (lk, fachrichtung) UNION SELECT discordid FROM user LEFT JOIN fach on user.id = fach.user WHERE ? = fach.fach',
            [lesson, lesson],
            function (err, result) {
                if (err) {
                    errorHandler(err);
                    reject(err);
                    return;
                }
                let res = [];
                result.forEach(element => {
                    if(element["discordid"]){
                        res.push(element["discordid"]);
                    }
                })
                resolve(res);
            }
        );
    })
}

//region Discord stuff
let chats = {};
dm.onMessage = (msg, id, send) => {
    // Stop receiving notifs
    if(msg.toLowerCase() === "stop"){
        rmDiscordId(id).then((res) => {
            send(res);
        }).catch((err) => {
            errorHandler(err);
            send("Das hat leider nicht geklappt.");
        })
        return
    }
    // Help command
    if(msg.toLowerCase() === "help"){
        send("Hilfe: " +
            "\nUm Benachrichtigungen über Discord zu erhalten, gib hier deinen Untis Namen ein." +
            "\nWenn du keine Benachrichtigungen mehr erhalten möchtest, gib `stop` ein." +
            "\nUm von vorne zu Beginnen gib `reset` ein");
        return;
    }

    if(msg.toLowerCase() === "reset"){
        delete chats.id;
        send("Um Benachrichtigungen über Discord zu erhalten, gib hier deinen Untis Namen ein.");
        return;
    }
    if(chats.id){
        if(/^\d+$/.test(msg)){
            if(msg === discordAuthObj[chats.id]?.toString()){
                addDiscordId(id, chats.id).then(send).catch((err) => {
                    errorHandler(err);
                    send("Das hat leider nicht geklappt. Versuche es erneut oder Kontaktiere uns");
                })
            }else{
                send("Der Code ist leider ungültig.");

            }
        }else{
            send("Ungültige Eingabe");
        }
    }else{
        // Expect user Input to be untis name
        if(/\d/.test(msg)){
            send("Die Eingabe darf keine Zahlen enthalten.");
            return;
        }
        isUserRegistered(msg.toLowerCase()).then(bool => {
            if(!bool){
                send("`" + msg + "`" + " ist leider nicht vorhanden.\nGib bitte deinen Untis Namen ein. Wenn du hilfe benötigst gib `help`");
                return;
            }
            chats.id = msg;
            setTimeout(() => {
                delete chats.id;
            }, 300000);
            send("Du musst als nächstes einen Token von der Website anfordern." +
                "Gehe dazu auf https://untismerger.tk/settings" +
                "\nAnschließend kannst du den Token einfach hier einfügen.");
        })
    }



}

dm.onUserAdd = (name, id) => {
    dm.sendMessage(
        `Hallo ${name}\num über deinen Discord Account benachrichtigungen zu erhalten, antworte bitte mit deinem Untis Namen.\nWenn du keine Benachrichtigungen mehr erhalten möchtest, gib \`stop\` ein`,
        id)
        .catch(errorHandler);
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
        resolve(jwt.sign(userObj, config.secrets.JWT_SECRET));
    })
}

/**
 * Handles the Occured Error and if necessary sends a DM to all Admins that have registered with Discord
 * @param {Error|mysql.QueryError} error Error
 * @return {String} Message to send depending on error
 */
function errorHandler(error){

    if(error.name === "JsonWebTokenError"){
        return "Ungültiger JWT. Versuche dich neu Anzumelden";
    }
    if(error.message === "Failed to login. {\"jsonrpc\":\"2.0\",\"id\":\"Awesome\",\"error\":{\"message\":\"bad credentials\",\"code\":-8504}}"){
        return "Ungültige Anmeldedaten";
    }
    if(error.message === "Server didn't returned any result."){
        return error.message;
    }

    adminDiscordIDs.forEach(id => {
        dm.sendMessage(`Error Name: ${error.name}\n\n${error}`, id).catch((err) => {
            console.error("Encountered Error while trying to handle error: ");
            console.error(err);
            console.error("Original Error: ");
            console.error(error);
        })
    })
    return "Default error Message";
}

/**
 * Logs in depending on settings specified in JWT and returns untis object
 * @param jwt Decoded JSON Web Token
 * @return {Promise<module:webuntis.WebUntisSecretAuth>}
 */
function untisLogin(jwt){
    return new Promise((resolve, reject) => {

    if(!jwt.type || !jwt.version || jwt.version < config.constants.jwtVersion){
        reject({name: "Login exception", message: "Login function got passed an invalid JWT"});

    }
    if(jwt.type === 'secret'){
         const untis = new WebUntisLib.WebUntisSecretAuth(
            config.secrets.SCHOOL_NAME,
            jwt.username,
            decrypt(jwt.secret),
            config.secrets.SCHOOL_DOMAIN
        );
         untis.login().then(() => {
             resolve(untis);
         }).catch(reject);
         return;
    }
    if(jwt.type === 'password'){
        const untis = new WebUntisLib(
            config.secrets.SCHOOL_NAME,
            jwt.username,
            decrypt(jwt.password),
            config.secrets.SCHOOL_DOMAIN
        )
        untis.login().then(() => {
            resolve(untis);
        }).catch(reject);
        return;
    }
    reject({name: "Login Exception", message:"Couldn't Login with provided JWT\n\n" + JSON.stringify(jwt)});
    })
}