export * from '../../globalTypes';

export type NotificationProviders = 'Discord' | 'Webpush' | 'Mail'

export interface NotificationProps {
	/// The title of the notification
	title: string,
	/// The payload to be displayed
	payload: string,
	/// Array of hashed untis names
	targets: string[],
}

export interface HolidayData {
	name: string,
	shortName: string,
}

export type LessonData = {
	startTime: Dayjs,
	endTime: Dayjs,
	//updatedAt: Dayjs,
	code: "regular" | "cancelled" | "irregular",
	//courseNr: number,
	//courseName: string,
	//courseShortName: string,
	subject: string,
	longSubject: string,
	teacher: string,
	longTeacher: string,
	room: string,
	lstext: string,
	info: string,
	subsText: string,
	sg: string,
	bkRemark: string,
	bkText: string
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