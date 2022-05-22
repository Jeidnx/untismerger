import {Jwt, LessonData} from '../globalTypes';

export * from '../globalTypes';

export interface JwtObject {
	set: (newJwt: string) => void,
	raw: string,
	get: Jwt,
}

export interface HolidayData {
	name: string,
	shortName: string,
}

//Data for one class of one day
export type displayedLesson = (LessonData | undefined)[]

export type DayData = displayedLesson[] | HolidayData;

export interface TimetableData {
	week: string[],
	timetable: {
		[key: string]: DayData,
	}
}

export interface stringToNumberEnum {
	[key: string]: number,
}

export interface FetcherParams {
	endpoint: string,
	query: any,
	useCache: boolean,
	method: 'POST' | 'GET',
}

export interface customThemeType {
	dayjs: typeof dayjs,
	setDesignData: Function,
	setLessonColorEnum: Function,
	jwt: JWT,
	fetcher({endpoint, query, useCache, method}: FetcherParams): Promise<{[key: string]: unknown}>,
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