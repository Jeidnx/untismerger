/// Updates all untis entries for a given range
import WebUntisLib from 'webuntis';
import {Dayjs} from 'dayjs';
import Redis from './redis';
import {convertUntisTimeDateToDate} from './utils';
import {Entity, Schema, Search} from 'redis-om';
import {LessonData} from '../../globalTypes';

async function updateUntisForRange(untis: WebUntisLib, startDate: Dayjs, endDate: Dayjs) {
	//todo: make this better
	console.log('Updating untiscache');
	return untis.getClasses().then((classes) => {
		return Promise.all(classes.map((klasse) => {
			console.log(klasse.name);
			return fetchNewUntisData(untis, klasse.id, startDate.toDate(), endDate.toDate());
		}));
	});
}

async function fetchNewUntisData(untis: WebUntisLib, lessonNr: number, startDate: Date, endDate: Date) {
	console.log('Fetching untis data for: ', lessonNr);
	return untis.getTimetableForRange(startDate, endDate, lessonNr, 1).then((lessons) => {
		return Promise.all(lessons.map((element) => {
			console.log('Creating lesson: ', element.id);
			lessonRepository.then(async (repo) => {
				repo.createAndSave({
					startTime: convertUntisTimeDateToDate(element.date, element.startTime),
					endTime: convertUntisTimeDateToDate(element.date, element.endTime),
					code: element['code'] || 'regular',
					courseNr: element.id,
					updatedAt: -1,
					...(await searchCourse(element.id)),
					shortSubject: element['su'][0] ? element['su'][0]['name'] : '🤷',
					subject: element['su'][0] ? element['su'][0]['longname'] : '🤷',
					teacher: element['te'][0] ? element['te'][0]['longname'] : '🤷',
					shortTeacher: element.su[0] ? element.su[0].longname : '🤷‍',
					room: element['ro'][0] ? element['ro'][0]['name'] : '🤷‍',
					lstext: element['lstext'] || '',
					info: element['info'] || '',
					subsText: element['substText'] || '',
					sg: element['sg'] || '',
					bkRemark: element['bkRemark'] || '',
					bkText: element['bkText'] || '',
				});
			});
		}));
	});
}

class LessonClass extends Entity{
}

const lessonSchema = new Schema(
	LessonClass, {
		startTime: {type: 'date', sortable: true},
		endTime: {type: 'date'},
		updatedAt: {type: 'date'},
		code: {type: 'string'},
		courseNr: {type: 'number'},
		courseName: {type: 'text'},
		courseShortName: {type: 'text'},
		shortSubject: {type: 'text'},
		subject: {type: 'text'},
		shortTeacher: {type: 'text'},
		teacher: {type: 'text'},
		room: {type: 'text'},
		lstext: {type: 'text'},
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
		id: {type: 'number', sortable: true},
		shortName: {type: 'string'},
		name: {type: 'string'},
	}
);

const lessonRepository = Redis.registerRepository(lessonSchema);
const courseRepository = Redis.registerRepository(courseSchema);

async function createCourse(course: { id: number, shortName: string, name: string }) {
	return courseRepository.then((repo) => {
		repo.createAndSave(course);
	});
}

async function searchCourse(id: number): Promise<{ courseShortName: string | undefined, courseName: string | undefined }> {
	return courseRepository.then((repo) => {
		return repo.search().where('id').eq(id).return.first().then((course) => {
			return {
				// @ts-ignore
				courseShortName: course.shortName,
				// @ts-ignore
				courseName: course.name,
			};
		}).catch((err) => {
			console.log(err);
			return {
				courseShortName: undefined,
				courseName: undefined,
			};
		});
	});
}

async function searchLesson(startTime: Dayjs, endTime: Dayjs): Promise<Search<LessonClass>> {
	return lessonRepository.then((repo) => {
		return repo.search()
			.where('startTime').after(startTime.toDate())
			.and('endTime').before(endTime.toDate());
	});
}

const Lesson = {
	searchLesson,
};

export default Lesson;