import {Jwt} from '../globalTypes';

export interface JwtObject {
	set: (newJwt: string) => void,
	validate: () => Promise<void>,
	raw: string,
	get: Jwt,
}

export interface stringToNumberEnum {
	[key: string]: number,
}

export interface FetcherParams  {
	endpoint: string,
	query: {[key: string]: unknown},
	useCache: boolean,
	method: 'POST' | 'GET',
}
export type Fetcher = ({endpoint, query, useCache, method}: FetcherParams) => Promise<{[key: string]: unknown}>

export interface customThemeType {
	apiEndpoint: string,
	dayjs: typeof dayjs,
	setDesignData: Function,
	setLessonColorEnum: Function,
	jwt: JWT,
	fetcher: Fetcher
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