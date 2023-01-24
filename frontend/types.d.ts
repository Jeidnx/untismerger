export interface Jwt {
	/// Untis username
	username: string,
	/// Encrypted untis secret
	secret: string,
	/// Unique ID to invalidate old JWTs	
	secureid: number,
}

export interface JwtObject {
	set: (newJwt: string) => void,
	raw: string,
	get: Jwt,
}

export interface HolidayData {
	name: string,
	shortName: string,
}
export type shortUntisData = {
	id: number,
	name: string,
	longname: string,
}

export type LessonData = {
	"id": 724405,
	"code": "regular" | "cancelled" | "irregular",
	"kl": shortUntisData[],
	"te": shortUntisData[],
	"su": shortUntisData[],
	"ro": shortUntisData[],
	"lsnumber": number,
	"activityType": "Unterricht"
}

//Data for one class of one day
export type Lessons = (LessonData | undefined)[]

export type DayData = Lessons[] | HolidayData;

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
	jwt: JWT,
	fetcher({ endpoint, query, useCache, method }: FetcherParams): Promise<{ [key: string]: unknown }>,
}

export interface setupData {
	username?: string,
	secret?: string,
}