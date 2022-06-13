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

export interface Config {
    /// The Untis name of your school
    schoolName: string,
    /// The Untis domain for your school
    schoolDomain: string,
    /// Secret used for encrypting the user passwords
    encryptSecret: string,
    /// Secret used to sign the JWTs
    jwtSecret: string,
    /// Server address for your sql server
    msqlHost: string,
    /// Username for your sql server
    msqlUser: string,
    /// Password for the user on your sql server
    msqlPass: string,
    /// Database to use for your sql server
    msqlDb: string,
    /// Port to use for your sql server
    msqlPort?: number,
    /// Server address for your Redis server
    redisHost: string,
    /// Username for your Redis server
    redisUser?: string,
    /// Password for your Redis server
    redisPass?: string,
    /// Port for your Redis Server
    redisPort?: number,

    /// List of Notification providers to send your users Notifications
    notificationProviders?: ('discord' | 'webpush' | 'mail')[],
    /// The token for your Discord bot
    discordToken?: string,

    // Should statistic collection be enabled?
    useStatistics?: boolean,
}