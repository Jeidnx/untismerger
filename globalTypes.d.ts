export type Jwt = PasswordJwt | SecretJwt

interface SharedJwt {
    version: number,
    iat: number,
    username: string,
    lk: number,
    fachrichtung: number,
    sonstiges: string[],
}

interface PasswordJwt extends SharedJwt {
    type: "password",
    password: string,
}

interface SecretJwt extends SharedJwt{
    type: "secret",
    secret: string,
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