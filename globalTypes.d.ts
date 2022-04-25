export interface Jwt {
    version: number,
    username: string,
    lk: number,
    fachrichtung: number,
    sonstiges: string[],
    type: "password",
    password: string,
    secureid: number,
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

export interface ApiLessonData {
    date: number,
    startTime: number,
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