import {Dayjs} from 'dayjs';
import {Jwt} from '../globalTypes';


// Format for the individual lessons
export interface LessonData {
	startDate: Dayjs,
	endDate: Dayjs,
	code: 'regular' | 'cancelled' | 'irregular',
	shortSubject: string,
	subject: string,
	teacher: string,
	room: string,
	lstext: string,
	info: string,
	subsText: string,
	sg: string,
	bkRemark: string,
	bkText: string
}

export interface JwtObject {
	set: (newJwt: string) => void,
	validate: () => Promise<void>,
	raw: string,
	get: Jwt,
}

export interface HolidayData {
	name: string,
	shortName: string,
}

//Data for one class of one day
export type displayedLesson = (LessonData | undefined)[]

export interface WeekData extends lsTimetable {
	type: 'local' | 'fetched'
}

export interface lsTimetable {
	[key: string]: displayedLesson[] | HolidayData,
}

export interface TimetableData {
	week: string[],
	timetable: WeekData
}

export interface stringToNumberEnum {
	[key: string]: number,
}

export interface fetcherParams {
	endpoint: string,
	query: any,
	useCache: boolean,
	method: 'POST' | 'GET',
}

export interface customThemeType {
	apiEndpoint: string,
	dayjs: typeof dayjs,
	setDesignData: Function,
	setLessonColorEnum: Function,
	jwt: JWT,

	fetcher({endpoint, query, useCache, method}: fetcherParams): Promise<unknown>,
}

export interface setupData {
	loginMethod?: string,
	username?: string,
	password?: string,
	secret?: string,
	disableButton: boolean,
	lk?: string,
	fachrichtung?: string,
	nawi?: string,
	ek?: string,
	sp?: string,
	sonstiges: string[],
}