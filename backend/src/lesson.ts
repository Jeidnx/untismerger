import WebUntisLib from 'webuntis';
import {Dayjs} from 'dayjs';
import {getRedisData} from './redis.js';
import {convertUntisTimeDateToDate} from './utils.js';
import {Entity, Schema, Search} from 'redis-om';

const {registerRepository} = getRedisData();

const knownImportTimes: {
    /// Date in YYYY-MM-DD and latest known import for that day
    [key: string]: number
} = {};

export function updateUntisForRange(untis: WebUntisLib, startDate: Dayjs, endDate: Dayjs) {
    const dates: string[] = [startDate.format('YYYY-MM-DD')];
    let curr = startDate;
    while (!curr.isSame(endDate, 'day')) {
        curr = curr.add(1, 'day');
        dates.push(curr.format('YYYY-MM-DD'));
    }
    return untis.getLatestImportTime().then((time) => {
        dates.forEach((date) => {
            if (typeof knownImportTimes[date] !== 'number') knownImportTimes[date] = -1;
        });
        const outdatedDays = dates.flatMap((key) => {
            const value = knownImportTimes[key];
            if (value < time) return [key];
            return [];
        });
        if (outdatedDays.length === 0) return;

        console.log('Updating dates: ', outdatedDays);
        return untis.getClasses().then((classes) => {
            return Promise.all(classes.map((klasse) => {
                const thisCourse = new Course(courseSchema, String(klasse.id), {
                    shortName: klasse.name,
                    name: klasse.longName,
                });
                courseRepository.save(thisCourse);
                return fetchNewUntisData(
                    untis, klasse.id,
                    new Date(outdatedDays[0]), new Date(outdatedDays[outdatedDays.length - 1]),
                    klasse.longName,
                    klasse.name
                );
            })).then((val) => {
                console.log('Finished updating.');
                outdatedDays.forEach((date) => {
                    knownImportTimes[date] = time;
                });
                return val;
            });
        });
    });
}

async function fetchNewUntisData(untis: WebUntisLib, lessonNr: number, startDate: Date, endDate: Date, courseName, courseShortName) {
    return untis.getTimetableForRange(startDate, endDate, lessonNr, 1).then((lessons) => {
        return Promise.all(lessons.map(async (element) => {
            const test = new LessonClass(lessonSchema, String(element.id), {
                startTime: convertUntisTimeDateToDate(element.date, element.startTime),
                endTime: convertUntisTimeDateToDate(element.date, element.endTime),
                code: element['code'] || 'regular',
                courseNr: lessonNr,
                courseShortName, courseName,
                shortSubject: element['su'][0] ? element['su'][0]['name'] : '🤷',
                subject: element['su'][0] ? element['su'][0]['longname'] : '🤷',
                teacher: element['te'][0] ? element['te'][0]['longname'] : '🤷',
                shortTeacher: element.te[0] ? element.te[0].name : '🤷‍',
                room: element['ro'][0] ? element['ro'][0]['name'] : '🤷‍',
                lstext: element['lstext'] || '',
                info: element['info'] || '',
                subsText: element['substText'] || '',
                sg: element['sg'] || '',
                bkRemark: element['bkRemark'] || '',
                bkText: element['bkText'] || '',
            });

            return lessonRepository.save(test);
        }));
    });
}

class LessonClass extends Entity {
}

const lessonSchema = new Schema(
    LessonClass, {
        startTime: {type: 'date', sortable: true},
        endTime: {type: 'date'},
        code: {type: 'string'},
        courseNr: {type: 'number'},
        courseName: {type: 'text'},
        courseShortName: {type: 'text'},
        shortSubject: {type: 'text'},
        subject: {type: 'text'},
        shortTeacher: {type: 'text'},
        teacher: {type: 'text'},
        room: {type: 'text'},
        shortRoom: {type: 'text'},
        lstext: {type: 'string'},
        info: {type: 'string'},
        subsText: {type: 'string'},
        sg: {type: 'string'},
        bkRemark: {type: 'string'},
        bkText: {type: 'string'},
    },
    {
        dataStructure: 'HASH',
    }
);

class Course extends Entity {
}

const courseSchema = new Schema(
    Course, {
        shortName: {type: 'string'},
        name: {type: 'string'},
    },
    {
        dataStructure: 'HASH',
    }
);

const lessonRepository = await registerRepository(lessonSchema);
const courseRepository = await registerRepository(courseSchema);

export function searchLesson(startTime: Dayjs, endTime: Dayjs): Search<LessonClass> {
    return lessonRepository.search()
        .where('startTime').between(startTime.toDate(), endTime.toDate());
}

export function getSearch(): Search<LessonClass> {
    return lessonRepository.search();
}