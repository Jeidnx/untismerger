import Head from 'next/head';
import {Box, Button} from '@mui/material';
import Router from 'next/router';
import {useCustomTheme} from '../components/CustomTheme';

//TODO: write a better index page
export default function Index() {

	const {jwt} = useCustomTheme();

	return (<>
		<Head>
			<title>Untismerger</title>
		</Head>
		<Box
			sx={{
				height: '100%',
				width: '100%',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'start',
				flexDirection: 'column',

			}}
		>
			<h1>Willkommen {jwt.get.username}</h1>
			<Button
				variant={'outlined'}
				onClick={() => {
					Router.push('/timetable');
				}}>Zum Stundenplan</Button>
		</Box>
	</>);
}