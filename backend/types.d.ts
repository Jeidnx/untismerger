import {ConnectionOptions} from 'mysql2';

export interface configInterface {
	secrets: {
		JWT_SECRET: string,
		SCHOOL_NAME: string,
		SCHOOL_DOMAIN: string,
		ENCRYPT: string,
		UNTIS_SECRET: string,
		UNTIS_USERNAME: string,
	},
	mysqlDev: ConnectionOptions,
	mysql: ConnectionOptions,
	constants: {
		jwtVersion: number
	}
}

export type NotificationProviders = 'Discord' | 'Webpush' | 'Mail'

export interface NotificationProps {
	title: string,
	payload: string,
	targets: string[],
}