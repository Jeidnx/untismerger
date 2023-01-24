import { Box } from '@mui/material';
import Head from 'next/head';

export default function Exams() {
		return (
		<>
			<Head>
				<title>Klausuren</title>
			</Head>
			<Box
				sx={{
					height: '100%',
					width: '100%',
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'start',
					alignItems: 'center',
					overflowY: 'scroll',
					overflowX: 'hidden',
				}}
			>
				WIP
			</Box>
		</>
	);
}