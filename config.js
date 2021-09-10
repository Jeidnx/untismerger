module.exports = {
	httpsPort: 443,
	httpPort: 80,
	useHttps: false,
	useHttp: true,
	jwtSecret: 'test',
	sslCert: {
		key: '(...)/privkey.pem',
		cert: '(...)/fullchain.pem'
	},
	schoolName: 'test',
	schoolDomain: 'test.webuntis.com'
};
