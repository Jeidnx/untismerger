import crypto from 'crypto';

function errorHandler(error: unknown): string {
	switch (typeof error) {
		case 'undefined': {
			return 'Undefined Error';
		}
		case 'string': {
			return error;
		}
		case 'number': {
			return 'Error code: ' + error;
		}
		case 'bigint': {
			return 'Error code: ' + error;
		}
		case 'object': {
			//TODO: improve
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			const msg = error.message;
			if(typeof msg === 'string'){
				return msg;
			}
		}
		// We want cases to fall through here, so that we always return something
		// eslint-disable-next-line no-fallthrough
		default: {
			return 'An error occurred. Additionally, while trying to handle the error, another error occurred: ' + error;
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

	const year = Math.floor(date / 10000);
	const month = Math.floor((date - (year * 10000)) / 100);
	const day = (date - (year * 10000) - month * 100);

	let index;
	if (startTime >= 100) {
		index = 2;
	} else {
		index = 1;
	}
	const hour = Math.floor(startTime / Math.pow(10, index));
	const minutes = Math.floor(((startTime / 100) - hour) * 100);

	return new Date(year, month - 1, day, hour, minutes);
}

function hash(str: string): string {
	return crypto.createHash('sha256').update(str).digest('hex');
}

async function wait(ms: number){
	return new Promise<void>((resolve) => {
		setTimeout(() => {
			resolve();
		}, ms);
	});
}

export {errorHandler, convertUntisTimeDateToDate, convertUntisDateToDate, hash, wait};