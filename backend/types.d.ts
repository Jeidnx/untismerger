import mysql from 'mysql2';

export interface configInterface {
    secrets: {
        JWT_SECRET: string,
        SCHOOL_NAME: string,
        SCHOOL_DOMAIN: string,
        ENCRYPT: string,
        UNTIS_SECRET: string,
        UNTIS_USERNAME: string,
    },
    mysqlDev: mysql.ConnectionOptions,
    mysql: mysql.ConnectionOptions,
    constants: {
        jwtVersion: number
    }
}