import type {NextPage} from 'next';
import {
	alpha,
	Box,
	Button, CircularProgress,
	FormControl, Stack,
	TextField,
	useTheme
} from '@mui/material';
import {FormEvent, useState} from 'react';
import { Router } from 'next';
import Head from 'next/head';
import {Jwt, setupData} from '../types';
import {useCustomTheme} from "./CustomTheme";

const Setup: NextPage = () => {

	const [setupData, setSetupData] = useState<setupData>({secret: "", username: ""});

	const saveData = (dataIn: Object) => {
		setSetupData({...setupData, ...dataIn});
	};

	const {fetcher, jwt} = useCustomTheme();

	const theme = useTheme();
	const [isLoading, setIsLoading] = useState(false);
	const [buttonColor, setButtonColor] = useState<'primary' | 'success' | 'error'>('primary');
	const handleTextinputChange = (event: { target: { id: any; value: any; }; }) => {
		saveData({[event.target.id]: event.target.value});
	};
	const checkLoginCredentials = (e: FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		saveData({disableButton: true});
		fetcher({
			endpoint: 'checkCredentials',
			method: 'POST',
			query: {
				username: setupData.username,
				secret: setupData.secret,
			},
			useCache: false,
		}).then((json) => {
			if ((json as { jwt: Jwt }).jwt) {
				setTimeout(() => {
					jwt.set((json as { jwt: Jwt }).jwt);
					//TODO: redirect here
					Router.push("/timetable");
				});
				return;
			}
			setIsLoading(false);
			if ((json as { message: string }).message !== 'OK') {
				setButtonColor('error');
				saveData({disableButton: true});
				setTimeout(() => {
					setButtonColor('primary');
				}, 3000);
			} else {
				fetcher({
					endpoint: 'register',
					query: {
						username: setupData.username,
						secret: setupData.secret,
					},
					useCache: false,
					method: 'POST',
				}).then((data) => {
					setButtonColor('success');
					jwt.set((data.jwt));
					Router.push("/timetable");
					
				}).catch((err) => {
					console.error("Failed to register: ", err);
					setButtonColor('error');
					setIsLoading(false);
				})
				//TODO: register user and then redirect
			}
		}).catch((err) => {
			console.error(err);
			setButtonColor('error');
			setIsLoading(false);
		});
	};
	return (
		<Box
			sx={{
				height: 'min-content',
				width: '100%',
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'start',
			}}
		>
			<Box sx={{
				width: '80vw',
				height: 'min-content',
				padding: '20px',
				backgroundColor: alpha(theme.palette.background.default, theme.designData?.alpha),
			}}>
				<Head>
					<title>Untismerger - Setup</title>
				</Head><form onSubmit={checkLoginCredentials}>
				<FormControl sx={{
					height: 'max-content',
					display: 'flex',
					justifyContent: 'space-around',
					alignItems: 'center',
				}}>
					<Stack spacing={3} sx={{
						width: '50vw'
					}}>
						<TextField
							onChange={handleTextinputChange} required={true} id={'username'} label={'Benutzername'}
							variant={'outlined'} autoFocus={true} value={setupData.username}
						/>
						<TextField
							onChange={handleTextinputChange} type={'password'} required={true} id={"secret"}
							label={'Secret'} variant="outlined"
							value={setupData.secret}
						/>
						<Button
							type={'submit'}
							disabled={isLoading}
							color={buttonColor}
						>Überprüfen
							<CircularProgress sx={{
								display: isLoading ? '' : 'none',
								position: 'absolute',
								zIndex: 1,
							}} variant={'indeterminate'}/>
						</Button>
					</Stack>
				</FormControl>
			</form>
			</Box>
		</Box>
	);
};
export default Setup;