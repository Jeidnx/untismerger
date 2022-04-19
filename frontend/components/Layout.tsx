import {
	Alert,
	AlertColor,
	BottomNavigation,
	BottomNavigationAction,
	Box,
	Button,
	ButtonGroup,
	Drawer,
	Fab,
	Paper,
	Snackbar,
	useTheme
} from '@mui/material';
import Router from 'next/router';
import * as React from 'react';
import {createContext, useContext, useEffect} from 'react';

import SettingsIcon from '@mui/icons-material/Settings';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CreateIcon from '@mui/icons-material/Create';
import AssignmentIcon from '@mui/icons-material/Assignment';

import {stringToNumberEnum} from '../types';

const urlToValue: stringToNumberEnum = {
	'/timetable': 0,
	'/homework': 1,
	'/exams': 2,
	'/settings': 3,
};

interface SnackbarOptions {
	open: boolean,
	type: AlertColor,
	text: string
}

interface fabProps {
	icon: any,
	callback: Function,
	color: 'primary' | 'secondary',
}

interface navigationProps {
	text: string,
	path: string,
	icon: any
}

const LayoutContext = createContext(({} as { setFabs: (fabs: fabProps[]) => void, setSnackbar: (options: SnackbarOptions) => void }));

const pages: navigationProps[] = [
	{
		text: 'Stundenplan',
		path: '/timetable',
		icon: <AccessTimeIcon/>,
	},
	{
		text: 'Hausaufgaben',
		path: '/homework',
		icon: <AssignmentIcon/>,
	},
	{
		text: 'Klausuren',
		path: '/exams',
		icon: <CreateIcon/>,
	},
	{
		text: 'Einstellungen',
		path: '/settings',
		icon: <SettingsIcon/>,
	}
];

export default function Layout({children}: { children: any }) {

	/// Value describing current page, use urlToValue enum
	const [value, setValue] = React.useState<number>(urlToValue[Router.route]);

	const routeChangeHandler = () => {
		setValue(urlToValue[Router.route]);
	};

	useEffect(() => {
		Router.events.on('routeChangeComplete', routeChangeHandler);
		return () => {
			Router.events.off('routeChangeComplete', routeChangeHandler);
		};
	}, []);


	const drawerWidth = 240;
	const bottomNavigationHeight = 50;

	const theme = useTheme();

	const [snackbarOptions, setSnackbarOptions] = React.useState<{ open: boolean, type: AlertColor, text: string }>({
		open: false,
		type: 'error',
		text: ''
	});

	const [fabs, setFabs] = React.useState<fabProps[]>([]);

	return (
		<>
			<Paper sx={{
				position: 'fixed',
				bottom: 0,
				left: 0,
				right: 0,
				height: `${bottomNavigationHeight}px`,
				display: {mobile: 'initial', desktop: 'none'},
			}} elevation={3}>
				<BottomNavigation
					showLabels
					value={value}
				>
					{pages.map((page, idx) => (
						<BottomNavigationAction
							key={idx}
							onClick={() => {
								setValue(urlToValue[page.path]);
								Router.push(page.path);
							}}
							label={page.text}
							icon={page.icon}
						/>
					))}
				</BottomNavigation>
			</Paper>
			<Drawer
				variant="permanent"
				anchor={'right'}
				open
				sx={{
					display: {mobile: 'none', desktop: 'block'},
					'& .MuiDrawer-paper': {boxSizing: 'border-box', width: drawerWidth},
				}}
			>
				<Box
					sx={{
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						flexDirection: 'column',
						height: '100%',
					}}
				>
					<Box
						sx={{
							top: '0',
							position: 'absolute',
							width: '100%',
							display: 'flex',
							alignItems: 'center',
							flexDirection: 'column',
						}}
					>
						{ /* Next/Image is not supported for static export */}
						{/* eslint-disable  @next/next/no-img-element */}
						<img alt={'Untismerger Logo'} src={'/icon.png'} width={drawerWidth / 2}
							 height={drawerWidth / 2}/>
						<h2
							style={{
								fontFamily: 'mono',
							}}
						>Untismerger</h2>
					</Box>

					<ButtonGroup
						orientation="vertical"
						size={'large'}
						disableElevation

					>
						{pages.map((page, idx) => (
							<Button
								key={idx}
								onClick={() => {
									setValue(urlToValue[page.path]);
									Router.push(page.path);
								}}
								variant={value === urlToValue[page.path] ? 'contained' : 'outlined'}
								startIcon={page.icon}
							>
								<Box sx={{mx: 'auto'}}/>{page.text}
							</Button>
						))}
					</ButtonGroup>
					<Box
						sx={{
							bottom: '20px',
							position: 'absolute',

						}}
					>
						<Button variant={'contained'}
								disableElevation
								onClick={() => {
									Router.push('/imprint');
									setValue(-1);
								}}>
							Impressum
						</Button>
					</Box>
				</Box>
			</Drawer>

			<Snackbar
				open={snackbarOptions.open}
				autoHideDuration={6000}
				anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
				onClose={() => {
					setSnackbarOptions({...snackbarOptions, open: false});
				}}>
				<Alert
					onClose={() => {
						setSnackbarOptions({...snackbarOptions, open: false});
					}}
					severity={snackbarOptions.type}
					sx={{
						width: {mobile: '100%', desktop: 'max-content'},
						marginRight: {desktop: 'auto'},
					}}>
					{snackbarOptions.text}
				</Alert>
			</Snackbar>
			<LayoutContext.Provider value={{setFabs: setFabs, setSnackbar: setSnackbarOptions}}>
				<Box
					component={'main'}
					sx={{
						width: {desktop: `calc(100vw - ${drawerWidth}px)`, mobile: '100vw'},
						height: {desktop: '100vh', mobile: `calc(100vh - ${bottomNavigationHeight}px)`},
						backgroundColor: theme.palette.background.default,
						color: theme.palette.text.primary,
						backgroundImage: 'url(\'' + theme.designData.backgroundUrl + '\')',
						backgroundRepeat: 'no-repeat',
						backgroundPosition: 'center',
						backgroundSize: 'cover',
						fontFamily: theme.designData.font || '',
						fontSize: theme.designData.fontSize + 'px'
					}}
				>
					{children}
					<Box
						sx={{
							position: 'absolute',
							bottom: {mobile: '70px', desktop: '20px'},
							right: {mobile: '20px', desktop: '270px'},
							height: 'min-content',
							width: 'min-content'
						}}
					>
						{fabs.map((fab: fabProps, idx: number) => (
							<Fab
								key={idx}
								onClick={() => {
									fab.callback();
								}}
								size={'medium'}
								color={fab.color}
							>{fab.icon}</Fab>
						))}

					</Box>
				</Box>
			</LayoutContext.Provider>
		</>);
}
// Hook
export const useLayoutContext = () => useContext(LayoutContext);