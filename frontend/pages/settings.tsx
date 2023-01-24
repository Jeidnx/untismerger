import {
	Box,
	Button,
	ButtonGroup,
	useTheme
} from '@mui/material';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useCustomTheme } from '../components/CustomTheme';

import packageJson from '../package.json';

const Settings = () => {

	const theme = useTheme();

	const [appVersion, setAppVersion] = useState<string>('wird geladen');

	const { jwt } = useCustomTheme();

	const swChannel = new MessageChannel();

	useEffect(() => {

		if (process.env.NODE_ENV === 'development' || window.location.hostname.includes('dev.untismerger.tk')) {
			setAppVersion(packageJson.version + '-dev');
			return;
		}

		swChannel.port1.onmessage = (event) => {
			if (event.data.type === 'VERSION') {
				setAppVersion(event.data.body);
			}
		};


		navigator?.serviceWorker?.ready?.then((swRegistration) => {
			swRegistration?.active?.postMessage(
				{
					type: 'INIT_PORT'
				},
				[swChannel.port2]
			);
			swChannel?.port1?.postMessage({
				type: 'GET',
				body: 'VERSION'
			});
		});

	}, []);
	return (
		<>
			<Head>
				<title>Einstellungen</title>
			</Head>
			<Box
				sx={{
					height: '100%',
					width: '100%',
					display: 'flex',
					justifyContent: { mobile: 'space-between', desktop: 'space-around' },
					alignItems: 'center',
					flexDirection: { mobile: 'column', desktop: 'row' },
					overflowY: 'scroll',
					overscrollBehavior: 'none',
				}}
			>
				<Box
					sx={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'space-between  ',
						backgroundColor: theme.palette.background.default,
						padding: '20px',
					}}
				>
					<h2>App</h2>
					<span>Version: {appVersion}</span>

					<ButtonGroup
						style={{
							margin: '10px'
						}}
						color={'secondary'}
						variant={'outlined'}
					>
						<Button

							onClick={() => {
								swChannel.port1.postMessage({
									type: 'POST',
									body: 'CLEARCACHE'
								});
							}}
						>Cache Leeren</Button>
						<Button
							onClick={() => {
								navigator?.serviceWorker?.getRegistration()?.then((registration) => {
									if (typeof registration == 'undefined') {
										navigator.serviceWorker.register('/sw.js');
										setTimeout(() => {
											window.location.reload();
										}, 2000);
										return;
									}
									registration.unregister().then(() => {
										window.location.reload();
									});
								});
							}}
						>
							Aktualisieren
						</Button>
					</ButtonGroup>
					<span
						style={{
							marginBottom: '15px',
						}}
					>Accountname: {jwt.get.username}</span>
					<Button
						variant={'contained'}
						color={'secondary'}
						onClick={() => {
							jwt.set('');
						}}
					>
						Abmelden
					</Button>
				</Box>
				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						flexDirection: 'column',
						backgroundColor: theme.palette.background.default,
						padding: '20px',
					}}
				><Box
					sx={{
						display: 'flex',
						width: '100%',
						flexDirection: { mobile: 'column', desktop: 'row' },
						alignItems: 'center',
						justifyContent: 'space-around',
					}}
				>
					</Box>
				</Box>


			</Box>
		</>
	);
};
export default Settings;