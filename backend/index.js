const WebUntisLib = require('webuntis');
const express = require('express');
const jwt = require('jsonwebtoken');
const http = require('http');
const crypto = require('crypto');
const mysql = require('mysql2');
const cors = require('cors');
let dm = require('djs-messenger');

// Statics
const saveInterval = 10; // Interval in minutes when data is saved to database

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
let config = {};
try{
    config = require('./data/config.json');
}catch {
    console.log("Cannot load config");
    process.exit(1);
}
const jwtSecret = config.secrets.JWT_SECRET;
const schoolName = config.secrets.SCHOOL_NAME;
const schoolDomain = config.secrets.SCHOOL_DOMAIN;
let db;
if (typeof process.env.DEV === 'undefined' || typeof process.env.MAIN === 'undefined' || typeof process.env.PORT === 'undefined') {
    console.log("Missing env vars");
    process.exit(1);
}

if (!(process.env.DEV === 'FALSE')) {
    console.log("Running in DEV Environment");
    db = mysql.createPool(config.mysqlDev);
} else {
    console.log("Running in PROD Environment");
    db = mysql.createPool(config.mysql);
}

try{
    db.query("SELECT * FROM user", (err) => {
        if(err){
            console.error(err);
            errorHandler(new Error("Cannot connect to db"))
            process.exit(1);
        }
        console.log("Succesfully connected to " + (!(process.env.DEV === 'FALSE') ? "DEV" : "PROD") + " db")
    })
}catch(e) {
    console.error(e);
    errorHandler(new Error("Cannot connect to db"));
    process.exit(1);
}

let adminDiscordIDs = [];

/// Contains the users who requested an auth token, and the token
let discordAuthObj = {};

if (process.env.MAIN === 'TRUE') {


    if (!(process.env.DEV === 'FALSE')) {
        dm.login(config.secrets.DISCORD_TOKEN_DEV).then(client => {
            console.log("[djs-messenger] Logged in as", client.user.tag);
        })
    } else {
        dm.login(config.secrets.DISCORD_TOKEN).then(client => {
            console.log("[djs-messenger] Logged in as", client.user.tag);
        })
    }
    // Init Cancelled scheduler
    initCancelScheduler();

    function getAdminDiscordIDs() {
        return new Promise(((resolve) => {
            db.query("SELECT discordid FROM user WHERE isadmin = 1", (err, result) => {
                if (err) {
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

    getAdminDiscordIDs().then((arr) => {
        adminDiscordIDs = arr;
    });

    //region Discord stuff
    let chats = {};
    dm.onMessage = (msg, id, send) => {
        // Stop receiving notifs
        if (msg.toLowerCase() === "stop") {
            rmDiscordId(id).then((res) => {
                send(res);
            }).catch((err) => {
                errorHandler(err);
                send("Das hat leider nicht geklappt.");
            })
            return
        }
        // Help command
        if (msg.toLowerCase() === "help") {
            send("Hilfe: " +
                "\nUm Benachrichtigungen über Discord zu erhalten, gib hier deinen Untis Namen ein." +
                "\nWenn du keine Benachrichtigungen mehr erhalten möchtest, gib `stop` ein." +
                "\nUm von vorne zu Beginnen gib `reset` ein");
            return;
        }

        if (msg.toLowerCase() === "reset") {
            delete chats.id;
            send("Um Benachrichtigungen über Discord zu erhalten, gib hier deinen Untis Namen ein.");
            return;
        }
        if (chats.id) {
            if (/^\d+$/.test(msg)) {
                if (msg === discordAuthObj[chats.id]?.toString()) {
                    addDiscordId(id, chats.id).then(send).catch((err) => {
                        errorHandler(err);
                        send("Das hat leider nicht geklappt. Versuche es erneut oder Kontaktiere uns");
                    })
                } else {
                    send("Der Code ist leider ungültig.");

                }
            } else {
                send("Ungültige Eingabe");
            }
        } else {
            // Expect user Input to be untis name
            if (/\d/.test(msg)) {
                send("Die Eingabe darf keine Zahlen enthalten.");
                return;
            }
            isUserRegistered(msg.toLowerCase()).then(bool => {
                if (!bool) {
                    send("`" + msg + "`" + " ist leider nicht vorhanden.\nGib bitte deinen Untis Namen ein. Wenn du hilfe benötigst gib `help`");
                    return;
                }
                chats.id = msg.toLowerCase();
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

}

const port = process.env.PORT;

if (!jwtSecret || !schoolName || !schoolDomain || !port) {
    console.log('Missing environment or config.json Variables');
    process.exit(1);
}

/// init vector used for encryption
const iv = new Buffer.alloc(16, config.secrets.SCHOOL_NAME);

// Init schedulers for recurring tasks
initScheduler();

//region Express Server
const app = express();

// Enable CORS Pre-Flight
// noinspection JSCheckFunctionSignatures
app.options('*', cors());

http.createServer(app).listen(port);

/// Contains the endpoints to track and their respective count. To track more / less endpoints just add / remove them here.
let stats = {
    timetableWeek: 0,
    register: 0,
    getStats: 0,
    deleteUser: 0,
    getDiscordToken: 0,
    rawRequest: 0,
    checkCredentials: 0,
    getPreferences: 0,
    setPreferences: 0,
    getExams: 0,
    getHomework: 0,
    addExam: 0,
    addHomework: 0,
};

// Init middleware
app.use((req, res, next) => {
    next();
    const thisPath = req.path.replace("/", "");
    if (typeof stats[thisPath] !== "undefined") {
        stats[thisPath]++;
    }
})


app.get('/timetableWeek', (req, res) => {
    if (!req.query['jwt'] || !req.query['startDate'] || !req.query["endDate"]) {
        res.status(406).send({error: true, message: 'Missing args'});
        return;
    }
    jwt.verify(req.query['jwt'], jwtSecret, (err, decoded) => {
        if (err) {
            res.status(400).send({error: true, message: errorHandler(err)});
            return;
        }
        untisLogin(decoded).then((untis) => {

            untis.login().then(async () => {
                const startDate = new Date(req.query.startDate);
                const endDate = new Date(req.query.endDate);

                //TODO: Holidays

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
                for (let i = 0; i < lkArr.length; i++) {
                    let element = lkArr[i];
                    if (startTimes.includes(element.startTime)) {
                        out.push(element);
                        if (element.code === "cancelled") {
                            cancelHandler(element, decoded['lk']);
                        }
                    }
                }

                const frArr = await fachRichtung;
                for (let i = 0; i < frArr.length; i++) {
                    let element = frArr[i];
                    if (startTimes.includes(element.startTime)) {
                        out.push(element);
                        if (element.code === "cancelled") {
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
                    if (element.code === "cancelled") {
                        cancelHandler(element, element.su[0].name);
                    }
                    for (let j = 0; j < decoded['sonstiges'].length; j++) {
                        if (element['su'][0]['name'] === decoded['sonstiges'][j]) {
                            out.push(element);
                            continue outer;
                        }
                    }
                }


                //TODO: use map
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
                res.status(400).send({error: true, message: errorHandler(err)});
            })
        }).catch((err) => {
            res.status(500).json({error: true, message: errorHandler(err)})
        })
    })
})

app.post('/register', express.json(), (req,res) => {
    if(
        !req.body?.loginMethod ||
        !req.body?.username ||
        !req.body[req.body.loginMethod] ||
        !req.body?.lk ||
        !req.body?.fachrichtung ||
        !req.body?.nawi ||
        !req.body?.ek ||
        !req.body?.sp ||
        !req.body?.sonstiges
    ){
        res.status(400).send({
            error: true,
            message: 'Missing Arguments',
        });
        return;
    }
    let sonstiges = req.body.sonstiges;

    ["nawi", "ek", "sp"].forEach((e) => {
        sonstiges.push(req.body[e]);
    })
    let {
        nawi,ek,sp, disableButton, loginMethod, [req.body.loginMethod]: loginToken,sonstiges: asdf, ...reqData
    } = req.body

    const userObj = {
        ...reqData,
        sonstiges: sonstiges,
        version: 2,
        [loginMethod]: encrypt(loginToken),
        type: loginMethod,
    };
    signJwt({...userObj, secureid: registerUser(userObj)}).then((signed) => {
        res.status(201).json({
            message: "created",
            jwt: signed,
        })
    }).catch((err) => {
        res.status(500).json({error: true, message: errorHandler(err)})
    })
})

app.get('/getStats', (req, res) => {
    if (!req.query['jwt']) {
        res.status(406).send({error: true, message: "missing args"});
        return;
    }
    jwt.verify(req.query['jwt'], jwtSecret, (err, decoded) => {
        if (err) {
            res.status(406).send({error: true, message: errorHandler(err)});
            return;
        }
        res.setHeader('Content-Type', 'application/json');
        isUserAdmin(decoded['username']).then(async bool => {
            if (bool) {
                let st = {};

                st.requests = await getStatistics().catch(errorHandler) || {};
                st.users = await getUserCount().catch(errorHandler) || 0;
                res.send(st);

            } else {
                res.status(403).send({error: true, message: "Missing permissions"});
            }
        })
    });
});

app.post('/deleteUser', express.urlencoded({extended: true}), (req, res) => {
    if (!req.body['jwt']) {
        res.status(400).send({error: true, message: "Missing args"});
        return;
    }
    jwt.verify(req.body['jwt'], config.secrets.JWT_SECRET, (err, decoded) => {
        if (err) {
            res.status(400).send({error: true, message: errorHandler(err)});
            return;
        }
        deleteUser(decoded['username']).then(() => {
            res.send({message: "Deleted"});
        })
    })
})
app.post("/getDiscordToken", express.urlencoded({extended: true}), (req, res) => {
    if (process.env.MAIN !== "TRUE") {
        res.status(503).json({error: true, message: "This Server can't provide the requested resource. Try Again"})
        return;
    }

    if (!req.body['jwt']) {
        res.status(400).send({error: true, message: "Missing Arguments"});
        return;
    }
    jwt.verify(req.body['jwt'], jwtSecret, (err, decoded) => {
        if (err) {
            res.status(400).send({error: true, message: errorHandler(err)});
            return;
        }
        if (discordAuthObj[decoded['username']]) {
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
app.post("/rawRequest", express.urlencoded({extended: true}), (req, res) => {
    if (!req.body['jwt'] ||
        !req.body["requestType"] ||
        !req.body['requestData']
    ) {
        res.status(400).send({error: true, message: "Missing args"});
        return;
    }
    jwt.verify(req.body.jwt, config.secrets.JWT_SECRET, (err, decoded) => {
        if (err) {
            res.status(400).send({error: true, message: errorHandler(err)});
            return;
        }
        const requestData = JSON.parse(req.body['requestData']);

        switch (req.body['requestType']) {
            case "getTimeTableFor": {
                // Check if requestBody contains data for this request, if yes login and make it
                if (!requestData["date"] || !requestData["id"]) {
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
                if (!requestData["date"]) {
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
                if (!requestData["id"] || !requestData["rangeStart"] || !requestData["rangeEnd"]) {
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

app.post("/checkCredentials", express.json(), (req, res) => {
    if (!req.body?.type || !req.body?.username || !req.body[req.body.type]) {
        res.status(400).json({error: true, message: "Missing arguments"});
        return;
    }
    let untis;
    switch (req.body.type) {
        case "secret": {
            //Implement secret logic
            untis = new WebUntisLib.WebUntisSecretAuth(
                config.secrets.SCHOOL_NAME,
                req.body.username,
                req.body.secret,
                config.secrets.SCHOOL_DOMAIN
            )
            break;
        }
        case "password": {
            //Implement password logic
            untis = new WebUntisLib(
                config.secrets.SCHOOL_NAME,
                req.body.username,
                req.body.password,
                config.secrets.SCHOOL_DOMAIN
            )
            break;
        }
        default: {
            res.status(400).json({error: true, message: "Invalid type"})
            return;
        }
    }

    untis.login().then(() => {
        const username = req.body.username.toLowerCase();
        const type = req.body.type;

        isUserRegistered(username).then((isRegistered) => {
            if(!isRegistered){
                res.json({message: "OK"});
                return;
            }

            getUserData(username).then((data) => {
                signJwt({
                    ...data,
                    username: username,
                    [type]: encrypt(req.body[type]),
                    type: type,
                }).then((signed) => {
                    res.json({
                        message: "OK",
                        jwt: signed,
                    })
                })
            }).catch((err) => {
                res.status(500).send({
                    error: true,
                    message: errorHandler(err),
                })
            })
        })
        untis.logout();
    }).catch(() => {
        res.json({error: true, message: "Invalid Credentials"})
    })
})
app.post("/getPreferences", express.json(), (req, res) => {
    if(!req.body.jwt){
        res.status(400).json({error: true, message: "Missing Arguments"})
        return;
    }
    jwt.verify(req.body.jwt, jwtSecret, (err, decoded) => {
        if(err){
            res.status(400).json({error: true, message: "Invalid JWT"})
            return;
        }
        getUserPreferences(decoded.username).then((prefs) => {
            res.json({data: prefs})
        }).catch(() => {
            res.status(400).json({error: true, message: "User not in db"})
        })
    })



})
app.post("/setPreferences", express.json(), (req, res) => {
    if(!req.body.jwt || !req.body.prefs){
        res.status(400).json({error: true, message: "Missing Arguments"})
        return;
    }
    jwt.verify(req.body.jwt, jwtSecret, (err, decoded) => {
        if(err){
            res.status(400).json({error: true, message: "Invalid JWT"})
            return;
        }
        setUserPreferences(decoded.username, req.body.prefs).then(() => {
            res.status(201).send({message: "created"});
        }).catch((e) => {
            res.status(400).json({error: true, message: e})
        })
    })
})

app.get("/getExams", (req,res) => {
    if(!req.query['jwt']){
        res.status(400).json({error: true, message: "Missing Arguments"})
        return;
    }
    jwt.verify(req.query.jwt, jwtSecret, (err, decoded) => {
        if(err){
            res.status(400).json({error: true, message: "Invalid JWT"})
            return;
        }
        const untisPromise = untisLogin(decoded).then((untis) => {
            // I guess klasseId doesn't do anything
            return untis.getExamsForRange(new Date(), new Date(new Date().setFullYear(new Date().getFullYear() + 1)), 0, false).then((exams) => {
                return exams.map((exam) => {
                    return {
                        room: exam.rooms[0],
                        subject: exam.subject,
                        startTime: convertUntisTimeDatetoDate(exam.examDate, exam.startTime),
                        endTime: convertUntisTimeDatetoDate(exam.examDate, exam.endTime),
                    }
                })
            });
        })
        const dbPromise = getExamsForUser(decoded.fachrichtung, decoded.lk, decoded.sonstiges)

        Promise.all([untisPromise, dbPromise]).then((resArr) => {
            res.json({message: resArr[0].concat(resArr[1]).sort((a, b) => (a.startTime - b.startTime))})
        }).catch((err) => {
            res.status(500).json({error: true, message: errorHandler(err)})
        })
    })
})
app.get("/getHomework", (req,res) => {
    if(!req.query['jwt']){
        res.status(400).json({error: true, message: "Missing Arguments"})
        return;
    }

    jwt.verify(req.query.jwt, jwtSecret, (err, decoded) => {
        if(err){
            res.status(400).json({error: true, message: "Invalid JWT"})
            return;
        }
        const untisPromise = untisLogin(decoded).then((untis) => {
            return untis.getHomeWorksFor(new Date(), new Date(new Date().setFullYear(new Date().getFullYear() + 1))).then((resp) => {
                return resp.homeworks.flatMap((homework) => {
                    if(homework.completed) return [];
                    return [{
                        subject: resp.lessons.find((elem) => {
                            return elem.id === homework.lessonId
                        }).subject,
                        text: homework.text,
                        dueDate: convertUntisDatetoDate(homework.dueDate),
                        attachments: homework.attachments,
                    }];
                })
            });
        })

        const dbPromise = getHomeworkForUser(decoded.fachrichtung, decoded.lk, decoded.sonstiges)

        Promise.all([untisPromise, dbPromise]).then((resArr) => {
            res.json({message: resArr[0].concat(resArr[1]).sort((a, b) => (a.dueDate - b.dueDate))})
        }).catch((err) => {
            res.status(500).json({error: true, message: errorHandler(err)})
        })
    })
})

app.post("/addExam", express.json(), (req, res) =>{
    if(!req.body.jwt || !req.body.exam){
        res.status(400).json({error: true, message: "Missing Arguments"})
        return;
    }
    jwt.verify(req.body.jwt, jwtSecret, (err, decoded) => {
        if(err){
            res.status(400).json({error: true, message: "Invalid JWT"})
            return;
        }
        addExam(req.body.exam, decoded.username).then(() => {
            res.status(201).send({message: "created"});
        }).catch((e) => {
            res.status(500).json({error: true, message: e.message})
        })
    })
})
app.post("/addHomework", express.json(), (req, res) => {
    if(!req.body.jwt || !req.body.homework){
        res.status(400).json({error: true, message: "Missing Arguments"})
        return;
    }
    jwt.verify(req.body.jwt, jwtSecret, (err, decoded) => {
        if(err){
            res.status(400).json({error: true, message: "Invalid JWT"})
            return;
        }
        addHomework(req.body.homework, decoded.username).then(() => {
            res.status(201).send({message: "created"});
        }).catch((e) => {
            res.status(500).json({error: true, message: e.message})
        })
    })
})

//endregion

//region Statistic functions
/**
 * Saves statistic data
 */
function saveData() {
    const date = getDate();

    db.execute("SELECT json FROM statistics WHERE date = ?", [date], (err, res) => {
        if (err) {
            errorHandler(err);
            return;
        }

        if(res.length > 0){
            const dbStats = JSON.parse(res[0].json)
            for (const key in stats) {

                stats[key] = dbStats[key] ?
                    stats[key] + dbStats[key] :
                    stats[key];
            }
        }

        db.execute("INSERT INTO statistics(date,json) VALUES (?,?) ON DUPLICATE KEY UPDATE json = ?",
            [date, JSON.stringify(stats), JSON.stringify(stats)],
            (err) => {
                if(err){
                    errorHandler(err);
                    return;
                }
                for (const key in stats) {
                    stats[key] = 0;
                }
            })

    })
}

/**
 * Creates scheduler
 */
function initScheduler() {
    setInterval(function () {
        saveData();
    }, saveInterval * 60 * 1000);
}

function initCancelScheduler() {
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
function checkCancelled(startDate, endDate) {
    const untis = new WebUntisLib.WebUntisSecretAuth(
        config.secrets.SCHOOL_NAME,
        config.secrets.UNTIS_USERNAME,
        config.secrets.UNTIS_SECRET,
        config.secrets.SCHOOL_DOMAIN
    )
    untis.login().then(async () => {
        await untis.getTimetableForRange(startDate, endDate, 2232, 1).then(lessons => {
            lessons.forEach(lesson => {
                if (!startTimes.includes(lesson.startTime)) return;
                if (lesson.code === "cancelled") {
                    cancelHandler(lesson, lesson.su[0].name);
                }
            })
        }).catch(errorHandler);
        // General courses
        for (let i = 0; i < idsToCheck.length; i++) {
            await untis.getTimetableForRange(startDate, endDate, idsToCheck[i], 1).then(lessons => {
                lessons.forEach(lesson => {
                    if (!startTimes.includes(lesson.startTime)) return;
                    if (lesson.code === "cancelled") {
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

//region DB Stuff
/**
 * Gets all Tests for a user
 * @param fachrichtung Fachrichtung ID
 * @param lk Lk id
 * @param sonstiges sonstiges Array
 * @returns {Promise<any[]>} Exams
 */
function getExamsForUser(fachrichtung, lk, sonstiges) {
    return new Promise((resolve, reject) => {
        db.query(
            'SELECT subject, room, startTime, endTime FROM klausuren WHERE kurs in (?, ?, ?) and  endTime > now()',
            [fachrichtung, lk, sonstiges],
            function (err, result) {
                if (err) {
                    errorHandler(err);
                    reject(err);
                    return;
                }
                resolve(result);
            }
        );
    });
}

/**
 * @param exam Exam Object
 * @param username username
 * @returns {Promise<void>}
 */
function addExam(exam, username) {
    return new Promise((resolve, reject) => {
        db.query(
            'INSERT INTO klausuren (subject, room, startTime, endTime, kurs, user) VALUES (?, ?, ?, ?, ?, ?)',
            [exam.subject, exam.room, exam.startTime, exam.endTime, exam.kurs, hash(username)],
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

/**
 * Gets Homework for user from DB
 * @param fachrichtung Fachrichtung ID
 * @param lk Lk id
 * @param sonstiges sonstiges Array
 * @returns {Promise<any[]>} Exams
 */
function getHomeworkForUser(fachrichtung,lk,sonstiges) {
    return new Promise((resolve, reject) => {
        db.query(
            'SELECT subject, text, dueDate FROM hausaufgaben WHERE kurs in (?, ?, ?) and  dueDate > (CURDATE() - INTERVAL 1 DAY)',
            [fachrichtung, lk, sonstiges],
            function (err, result) {
                if (err) {
                    errorHandler(err);
                    reject(err);
                    return;
                }
                resolve(result);
            }
        );
    });
}

/**
 * @param homework Homework Object
 * @param username username
 * @returns {Promise<void>}
 */
function addHomework(homework, username) {
    return new Promise((resolve, reject) => {
        db.query(
            'INSERT INTO hausaufgaben (subject, text, dueDate, kurs, user) VALUES (?, ?, ?, ?, ?)',
            [homework.subject, homework.text, homework.dueDate, homework.kurs, hash(username)],
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
            if (err) {
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
            if (err) {
                errorHandler(err);
                reject(err.message);
            }
            resolve(res);
        });
    });
}

/**
 * Get user settings
 * @param user user
 * @return {Promise<any>}
 */
function getUserPreferences(user) {
    return new Promise((resolve, reject) => {
        db.query(
            'SELECT settings FROM user WHERE username = ?',
            [hash(user)],
            function (err, result) {
                if (err) {
                    reject(errorHandler(err));
                    return;
                }
                // @ts-ignore
                if (result.length > 0) {
                    resolve(result[0].settings);
                    return;
                }
                reject('User not found in DB');
            }
        );
    });
}

/**
 * Set user settings
 * @param user user
 * @param prefs JSON preferences object
 * @return {Promise<void>}
 */
function setUserPreferences(user, prefs) {
    return new Promise((resolve, reject) => {
        db.query('UPDATE user set settings = ? WHERE username = ?', [ prefs, hash(user) ], (err) => {
            if(err) {
                reject(errorHandler(err));
                return;
            }
            resolve();
        })
    })
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

function deleteUser(user) {
    return new Promise((resolve, reject) => {
        db.query("DELETE user, fach FROM user JOIN fach on user.id = fach.user where username = ?", [hash(user)], (err) => {
            if (err) {
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
function addDiscordId(id, username) {
    return new Promise((resolve, reject) => {
        db.query("UPDATE user SET discordid = ? WHERE username = ?",
            [id, hash(username)],
            (err, result) => {
                if (err) {
                    errorHandler(err);
                    reject(err);
                    return;
                }
                if (result.affectedRows < 1) {
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
function rmDiscordId(id) {
    return new Promise((resolve, reject) => {
        db.query("UPDATE user SET discordid = '' WHERE discordid = ?",
            [id],
            (err, result) => {
                if (err) {
                    errorHandler(err);
                    reject(err);
                    return;
                }
                if (result.affectedRows < 1) {
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
async function cancelHandler(elem, lessonNr) {
    if (!elem['su'][0] || !elem["su"][0]["name"]) {
        return;
    }
    db.query('INSERT IGNORE INTO canceled_lessons (fach, lessonid) VALUES (?, ?)',
        [elem["su"][0]["name"], elem["id"]], (err, result) => {
            if (err) {
                errorHandler(err);
                return;
            }
            if (result.affectedRows > 0) {
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
function convertUntisTimeDatetoDate(date, startTime) {

    const year = Math.floor(date / 10000)
    const month = Math.floor((date - (year * 10000)) / 100);
    const day = (date - (year * 10000) - month * 100)

    let index;
    if (startTime >= 100) {
        index = 2;
    } else {
        index = 1;
    }
    const hour = Math.floor(startTime / Math.pow(10, index))
    const minutes = Math.floor(((startTime / 100) - hour) * 100)

    return new Date(year, month - 1, day, hour, minutes)
}

/**
 * @param {int} date Untis date format
 * @return {Date} JS Date Object
 */
function convertUntisDatetoDate(date) {
    const year = Math.floor(date / 10000)
    const month = Math.floor((date - (year * 10000)) / 100);
    const day = (date - (year * 10000) - month * 100)

    return new Date(year, month - 1, day);
}

/**
 *
 * @param {String} lesson Welcher Unterricht entfällt.
 * @param {Date} date Datum, an dem die Stunde entfällt.
 * @param {String} lessonNr Welche Kurse betrroffen sind.
 */
async function sendNotification(lesson, date, lessonNr) {
    if (date < new Date()) {
        return;
    }
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
 * @return {String}
 */
function getNotificationBody(lesson, date) {
    const now = new Date();
    let help = new Date(date);
    if (now.getFullYear() !== date.getFullYear()) {
        return `${lesson} am ${String(date.getDate() + "." + (date.getMonth() + 1))} entfällt.`;
    }

    for (let i = 0; i < 3; i++) {
        if (now.getDate() === help.getDate() && now.getMonth() === help.getMonth()) {
            console.log(i)
            if (i === 0) {
                return `${lesson} entfällt heute.`;
            }
            if (i === 1) {
                return `${lesson} entfällt morgen.`;
            }
            if (i === 2) {
                return `${lesson} entfällt übermorgen.`;
            }
        }
        now.setDate(now.getDate() + 1);
    }
    return `${lesson} am ${String(date.getDate() + "." + (date.getMonth() + 1))} entfällt.`;

}

/**
 *
 * @param lesson Lesson String
 * @returns {Promise<String[]>}
 */
function getDiscordIds(lesson) {
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
                    if (element["discordid"]) {
                        res.push(element["discordid"]);
                    }
                })
                resolve(res);
            }
        );
    })
}

/**
 *
 * @param {Object} userObj User Obj with data to sign
 * @returns {Promise<String>} Signed Key, Base64URL encoded
 */
function signJwt(userObj) {
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
function errorHandler(error) {

    if (error.name === "JsonWebTokenError") {
        return "Ungültiger JWT. Versuche dich neu Anzumelden";
    }
    if (error.message === "Failed to login. {\"jsonrpc\":\"2.0\",\"id\":\"Awesome\",\"error\":{\"message\":\"bad credentials\",\"code\":-8504}}") {
        return "Ungültige Anmeldedaten";
    }
    if (error.message === "Server didn't returned any result.") {
        return error.message;
    }

    if (process.env.MAIN === "TRUE") {
        adminDiscordIDs.forEach(id => {
            dm.sendMessage(`Error Name: ${error.name}\n\n${error}`, id).catch((err) => {
                console.error("Encountered Error while trying to handle error: ");
                console.error(err);
                console.error("Original Error: ");
                console.error(error);
            })
        })
    } else {
        console.error(error);
    }


    return error.message ?? "Default error Message";
}

/**
 * Logs in depending on settings specified in JWT and returns untis object
 * @param jwt Decoded JSON Web Token
 * @return {Promise<module:webuntis.WebUntisSecretAuth>}
 */
function untisLogin(jwt) {
    return new Promise((resolve, reject) => {

        if (!jwt.type || !jwt.version || jwt.version < config.constants.jwtVersion) {
            reject({name: "Login exception", message: "Login function got passed an invalid JWT"});

        }
        if (jwt.type === 'secret') {
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
        if (jwt.type === 'password') {
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
        reject({name: "Login Exception", message: "Couldn't Login with provided JWT\n\n" + JSON.stringify(jwt)});
    })
}