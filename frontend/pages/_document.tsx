import {Head, Html, Main, NextScript} from 'next/document';

const document = () => {
	// noinspection HtmlRequiredTitleElement Not need here
	return (
		<Html lang={'de'}>
			<Head>
				<link rel="icon" type="image/png" href="/icon.png"/>
				<link rel='manifest' href='/manifest.json'/>
				<link rel="apple-touch-icon" href="/icon_apple.png"/>
				<meta name="theme-color" content="#3266cc"/>
			</Head>
			<body>
			<noscript>Diese Seite benötigt Javascript</noscript>
			<Main/>
			<NextScript/>
			</body>
		</Html>
	);
};
export default document;
