import crypto from 'crypto';

function errorHandler(error: any): string {

	// Catch and handle non-critical Errors
	if (error?.name === 'JsonWebTokenError') {
		return 'Ungültiger JWT. Versuche dich neu Anzumelden';
	}
	if (error?.message === 'Failed to login. {"jsonrpc":"2.0","id":"Awesome","error":{"message":"bad credentials","code":-8504}}') {
		return 'Ungültige Anmeldedaten';
	}
	if (error?.message === 'Server didn\'t return any result.') {
		return error?.message;
	}

	// Everything else gets logged

	console.error('Error: ' + error);
	if(typeof error === 'string') return error;
	return error?.message ?? 'Default error Message';
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

export {errorHandler, convertUntisTimeDateToDate, hash};