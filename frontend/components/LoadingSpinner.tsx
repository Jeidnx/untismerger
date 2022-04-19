import {alpha, Box, CircularProgress, useTheme} from '@mui/material';

export default function LoadingSpinner({text = 'Lade Daten...'}: { text?: string }) {

	const theme = useTheme();

	return (<Box
		sx={{
			backgroundColor: alpha(theme.palette.background.default, theme.designData.alpha),
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'center',
			alignItems: 'center',
			padding: '2%',
			margin: 'auto',
		}}
	>
		<CircularProgress/>
		<h1>{text}</h1>
	</Box>);
}