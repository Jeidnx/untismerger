import crypto from 'crypto';

function isObject(obj: unknown): obj is object {
	return typeof obj === 'object' && obj !== null;
}

function hasMessage(obj: unknown): obj is {message: unknown} {
	return isObject(obj) ? 'message' in obj : false;
}

function hasToString(obj: unknown): obj is {toString: () => string} {
	return isObject(obj) ? 'toString' in obj && typeof obj.toString === 'function' : false;
}

function errorHandler(error: unknown): string {
	switch (typeof error) {
		case 'undefined': {
			return 'An unknown error occurred';
		}
		case 'string': {
			return 'An error occured: ' + error;
		}
		case 'number': {
			return 'An error occurred. Error code: ' + error;
		}
		case 'bigint': {
			return 'An error occurred. Error code: ' + error;
		}
		case 'object': {
			if(hasMessage(error)){
				if(typeof error.message === 'string'){
					return error.message;
				}
			}

			if(hasToString(error)){
				return error.toString();
			}
		}
		// We want cases to fall through here, so that we always return something
		// eslint-disable-next-line no-fallthrough
		default: {
			return 'An error occurred: ' + error;
		}
	}
}

function convertUntisDateToDate(date: number): Date {
	const year = Math.floor(date / 10000);
	const month = Math.floor((date - (year * 10000)) / 100);
	const day = (date - (year * 10000) - month * 100);

	return new Date(year, month - 1, day);
}

function convertUntisTimeDateToDate(date: number, startTime: number): Date {

	const year = Math.round(date / 10000);
	const month = Math.round((date - (year * 10000)) / 100);
	const day = (date - (year * 10000) - month * 100);

	let index;
	if (startTime >= 100) {
		index = 2;
	} else {
		index = 1;
	}
	const hour = Math.round(startTime / Math.pow(10, index));
	const minutes = Math.round(((startTime / 100) - hour) * 100);

	//TODO: find a better solution for timezone issues
	return new Date(year, month - 1, day, hour + 2, minutes);
}

function hash(str: string): string {
	return crypto.createHash('sha256').update(str).digest('hex');
}

async function wait(ms: number): Promise<void>{
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve();
		}, ms);
	});
}

export {errorHandler, convertUntisTimeDateToDate, convertUntisDateToDate, hash, wait};