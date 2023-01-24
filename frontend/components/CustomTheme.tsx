import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {customThemeType, FetcherParams, JwtObject, DesignDataType} from '../types';
import {Box, createTheme, ThemeProvider} from '@mui/material';

import dayjs from 'dayjs';
import Setup from './Setup';

dayjs.extend(require('dayjs/plugin/utc'));
dayjs.extend(require('dayjs/plugin/timezone'));
dayjs.locale(require('dayjs/locale/de'));
// @ts-ignore
dayjs.tz.setDefault('Europe/Berlin');

const CustomThemeContext = createContext(({} as customThemeType));

// Provider
export function CustomThemeProvider({children}: any) {

	const [rawJwt, setRawJwt] = useState<string>("");

	const apiEndpoint = 'http://localhost:8080/';

	useEffect(() => setRawJwt(localStorage.getItem('jwt') || ""), []);

	const getTheme = () => {
		return (createTheme({
				palette: {
					mode: 'dark',
					primary: {
						main: "#6272a4",
					},
					secondary: {
						main: "#bd93f9",
					},
				background: {
					default: "#282a36",
					paper: "#44475a"
				},
				text: {
					primary: "#f8f8f2",
					secondary: "#f1fa8c",
					disabled: "#ff5555",
				}
				},
				breakpoints: {
					values: {
						mobile: 0,
						desktop: 1200,
					},
				},
			})
		);
	};

	const parsedJwt = useMemo(() => {
		if (!rawJwt) return {};
		const split = rawJwt.split('.');
		if(split.length != 2) return {};
		const converted = Buffer.from(split[1], 'base64').toString('utf-8');
		if(!converted) return {};
		return JSON.parse(converted);
	}, [rawJwt])

	const jwt: JwtObject = useMemo(() => ({
		set: (newJwt: string) => {
			localStorage.setItem('jwt', newJwt);
			setRawJwt(newJwt);
		},
		raw: rawJwt || '',
		get: {
			iat: parsedJwt.iat,
			username: parsedJwt.username,
			secret: parsedJwt.secret,
			secureid: parsedJwt.secureid,
		}
	}), [parsedJwt, rawJwt]);

	const fetcher = useCallback(({endpoint, query, useCache, method}: FetcherParams): Promise<{[key: string]: unknown}> => {
		return new Promise((resolve, reject) => {
			console.log("query:", query);
			const mQuery = {
				jwt: rawJwt,
				...query,
			};
			console.log("mquery:", mQuery);

			fetch(apiEndpoint + endpoint + ((method === 'GET') ? `?${new URLSearchParams(mQuery)}` : ''), {
				method: method,
				cache: useCache ? 'default' : 'no-cache',
				body: method === 'POST' ? JSON.stringify(mQuery) : undefined,
				headers: method === 'POST' ? {
					'content-type': 'application/json',
				} : undefined
			}).then(async (res) => {
				if (!res.ok) {
					let json;
					try {
						json = await res.json();
					} catch (e) {
						throw new Error(res.statusText);
					}
					throw new Error(json.message || res.statusText);
				}
				return res.json();
			}).then((json) => {
				if (json.error) throw new Error(json.message);
				resolve(json);
			}).catch((err) => {
				reject('Fehler: ' + (err.message || err));
			});
		});
	}, [apiEndpoint, rawJwt, jwt])

	const theme = getTheme();

	if (!rawJwt) {
		return (
			<ThemeProvider theme={theme}>
				<CustomThemeContext.Provider
					value={{dayjs, fetcher, jwt}}>
					<Box
						component={'main'}
						sx={{
							width: '100vw',
							height: '100vh',
							backgroundColor: theme.palette.background.default,
							color: theme.palette.text.primary,
							backgroundRepeat: 'no-repeat',
							backgroundPosition: 'center',
							backgroundSize: 'cover',
							overflowY: 'auto',
							fontSize: '12px'
						}}
					>
						<Box
							sx={{
								width: '100%',
								height: '20vh',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								flexDirection: 'row',
							}}
						>
							{ /* Next/Image is not supported for static export */}
							{/* eslint-disable  @next/next/no-img-element */}
							<img alt={'Untismerger Logo'} src={'/icon.png'} height={'100%'}/>
							<h2
								style={{
									fontFamily: 'mono',
								}}
							>Untismerger</h2>
						</Box>
						<Setup/>
					</Box>
				</CustomThemeContext.Provider>
			</ThemeProvider>
		);
	}

	return (
		<ThemeProvider theme={theme}>
			<CustomThemeContext.Provider value={{dayjs, fetcher, jwt}}>
				{children}
			</CustomThemeContext.Provider>
		</ThemeProvider>
	);
}

// Hook
export const useCustomTheme = () => useContext(CustomThemeContext);