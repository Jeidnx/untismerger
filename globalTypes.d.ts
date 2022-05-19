import { Dayjs } from "dayjs";

export interface Jwt {
    /// Version number to introduce breaking changes
    version: number,
    /// Untis username
    username: string,
    /// Encrypted untis password
    password: string,
    /// stringified JSON data for choosing right data
    data: string,
    /// Unique ID to invalidate old JWTs
    secId: number,
}

export interface DesignDataType {
    fontSize: number;
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

export interface WeekData {
    [key: string]: DayData
}

export type DayData = Holiday | LessonData[];

export interface LessonData {
    startTime: Dayjs,
    endTime: Dajys,
    updatedAt,
    code: "regular" | "cancelled" | "irregular",
    courseNr: number,
    courseName: string,
    courseShortName: string,
    shortSubject: string,
    subject: string,
    shortTeacher: string,
    teacher: string,
    room: string,
    lstext: string,
    info: string,
    subsText: string,
    sg: string,
    bkRemark: string,
    bkText: string
}

export interface Holiday {
    startDate: Date,
    endDate: Date,
    name: string,
    shortName: string,
}

export interface CustomExam {
    room: string,
    subject: string,
    startTime: string,
    endTime: string,
    course: string,
}

export interface CustomHomework {
    subject: string,
    text: string,
    dueDate: string,
    attachments: any[],
    course: string,
}

type Endpoint = string;

export interface Statistic {
        date: string,
        requests: {
            users: number | string,
            [key: Endpoint]: number | string,
        }
}