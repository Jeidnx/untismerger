import '../styles/globals.css';
import type {AppProps} from 'next/app';
import Layout from '../components/Layout';
import {CustomThemeProvider} from '../components/CustomTheme';
import {useEffect} from 'react';

function MyApp({Component, pageProps}: AppProps) {

	useEffect(() => {
		if (process.env.NODE_ENV === 'development') {
			return;
		}
		if ('serviceWorker' in navigator) {
			window.addEventListener('load', function () {
				navigator.serviceWorker.register('/sw.js');
			});
		}
	}, []);


	return (
		<CustomThemeProvider>
			<Layout>
				<Component {...pageProps}/>
			</Layout>
		</CustomThemeProvider>
	);
}

export default MyApp;

declare module '@mui/material/styles' {
	interface BreakpointOverrides {
		xs: false;
		sm: false;
		md: false;
		lg: false;
		xl: false;
		mobile: true;
		desktop: true;
	}
}
