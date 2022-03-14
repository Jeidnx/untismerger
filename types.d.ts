import {Dayjs} from "dayjs";


// Format for the individual lessons
export interface LessonData {
    startDate: Dayjs,
    endDate: Dayjs,
    code: "regular" | "cancelled" | "irregular",
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

// Data the untis api sends back
export interface UntisLessonData {
    date: number,
    startTime: number,
    code: string,
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

//Data for one class of one day
export type displayedLesson = (LessonData | undefined)[]

export interface Timetable {
    type: "local" | "fetched"

    [key: string]: displayedLesson[],
}

export interface lsTimetable {
    [key: string]: displayedLesson[],
}

export interface TimetableData {
    week: string[],
    timetable: Timetable
}

export interface stringToNumberEnum {
    [key: string]: number,
}

export interface designDataType {
    iat: number,
    version: number,
    mode: "dark" | "light",
    primary: string,
    secondary: string,
    backgroundUrl: string,
    lesson: {
        colorEnum: {
            [key: string]: string,
        },
        edges: number,
    },
    font: string,
    alpha: number,

}

export interface customThemeType {
    apiEndpoint: string,
    setDesignData: function,
    setLessonColorEnum: function,
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