import { Dayjs } from "dayjs";

export {Data} from "data/payload";

export interface Jwt {
    /// Version number to introduce breaking changes
    version: number,
    /// Untis username
    username: string,
    /// Encrypted untis password
    password: string,
    /// User-defined Data to serve user only needed lessons
    data: Data,
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
    endTime: Dayjs,
    updatedAt: Dayjs,
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

export interface Statistic {
    date: string,
    requests: {
        [key: string]: number | string,
    }
}