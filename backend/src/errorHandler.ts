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

export {errorHandler};