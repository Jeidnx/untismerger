import {alpha, Box, MenuItem, Stack, TextField, useTheme} from '@mui/material';
import Head from 'next/head';
import {useEffect, useState} from 'react';
import {useCustomTheme} from '../components/CustomTheme';
import {useLayoutContext} from '../components/Layout';
import RefreshIcon from '@mui/icons-material/Refresh';
import {Add} from '@mui/icons-material';
import {allSonstigeKurse, fachrichtungen, leistungskurse,} from '../enums';
import LoadingSpinner from '../components/LoadingSpinner';
import AddDialog from '../components/AddDialog';
import {CustomExam} from '../types';

export default function Exams() {
	const theme = useTheme();
	const {dayjs, jwt, fetcher} = useCustomTheme();

	const [klausuren, setKlausuren] = useState<CustomExam[]>([]);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');
	const [isPosting, setIsPosting] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	//Form
	const [subject, setSubject] = useState('');
	const [room, setRoom] = useState('');
	const [startTime, setStartTime] = useState(dayjs().format('YYYY-MM-DDTHH:mm'));
	const [endTime, setEndTime] = useState(dayjs().format('HH:mm'));
	const [kurs, setKurs] = useState('');

	const {setSnackbar, setFabs} = useLayoutContext();

	const fetchExams = () => {
		setIsLoading(true);
		fetcher({
			endpoint: 'getExams',
			method: 'GET',
			query: {},
			useCache: false,
		}).then((json) => {
			setKlausuren((json as { message: CustomExam[] }).message);
			setIsLoading(false);
		}).catch((err) => {
			setSnackbar({
				text: err,
				type: 'error',
				open: true,
			});
		});
	};

	useEffect(() => {
		setFabs([
			{
				icon: <Add/>, color: 'primary', callback: () => {
					setDialogOpen(true);
				}
			},
			{icon: <RefreshIcon/>, color: 'primary', callback: fetchExams}
		]);
		fetchExams();
		return () => {
			setFabs([]);
		};
	}, []);

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
				<AddDialog
					title={'Neue Klausur hinzufügen'}
					isPosting={isPosting}
					errorMessage={errorMessage}
					open={dialogOpen}
					close={() => {
						setDialogOpen(false);
					}}
					submit={() => {
						setErrorMessage('');

						if (!subject || !room || !kurs) {
							setErrorMessage('Bitte gib alle benötigten Daten an.');
							return;
						}

						setIsPosting(true);
						const data: CustomExam = {
							subject: subject,
							room: room,
							startTime: dayjs(startTime).format('YYYY-MM-DD HH:mm:ss'),
							endTime: dayjs(startTime)
								.set('hour', endTime.substring(0, 2))
								.set('minute', endTime.substring(3, 5)).format('YYYY-MM-DD HH:mm:ss'),
							course: kurs,
						};

						fetcher({
							method: 'POST',
							useCache: false,
							query: {exam: data},
							endpoint: 'addExam',
						}).then(() => {
							fetchExams();
							setIsPosting(false);
							setDialogOpen(false);
							setSnackbar({
								text: 'Erfolgreich angelegt',
								type: 'success',
								open: true,
							});
						}).catch((err) => {
							setIsPosting(false);
							setErrorMessage(err);
						});

					}}
				>
					<Stack
						spacing={3}
					>
						<TextField
							required
							name={'subject'}
							autoFocus
							margin="dense"
							value={subject}
							onChange={(e) => {
								setSubject(e.target.value);
							}}
							id="subject"
							label="Fach"
							type="text"
							fullWidth
							variant="standard"
						/>
						<TextField
							required
							name={'room'}
							margin="dense"
							value={room}
							onChange={(e) => {
								setRoom(e.target.value);
							}}
							id="room"
							label="Raum"
							type="text"
							fullWidth
							variant="standard"
						/>
						<TextField
							required
							select
							name={'kurs'}
							id={'kurs'}
							margin={'dense'}
							value={kurs}
							onChange={(e) => {
								setKurs(e.target.value);
							}}
							label={'Kurs'}
							fullWidth
							variant={'standard'}
						>
							<MenuItem value={jwt.get.lk}>{leistungskurse[jwt.get.lk]}</MenuItem>
							<MenuItem value={jwt.get.fachrichtung}>{fachrichtungen[jwt.get.fachrichtung]}</MenuItem>
							{
								jwt.get.sonstiges.map((elem: string, idx: number) => (
									<MenuItem key={idx} value={elem}>{allSonstigeKurse[elem]}</MenuItem>
								))
							}

						</TextField>
						<TextField
							required
							margin="dense"
							value={startTime}
							onChange={(e) => {
								setStartTime(e.target.value);
							}}
							id="room"
							label="Start zeit"
							type="datetime-local"
							fullWidth
							variant="standard"
						/>
						<TextField
							margin="dense"
							value={endTime}
							onChange={(e) => {
								setEndTime(e.target.value);
							}}
							id="room"
							label="End zeit"
							type="time"
							fullWidth
							variant="standard"
						/>
					</Stack>
				</AddDialog>

				{
					!isLoading ? klausuren.length > 0 ? klausuren.map((klausur: CustomExam, idx) => (
						<Box
							key={idx}
							sx={{
								minWidth: '50vw',
								height: 'max-content',
								borderRadius: theme.designData.lesson.edges,
								borderColor: theme.designData.secondary,
								backgroundColor: alpha(theme.palette.background.default, theme.designData.alpha),
								borderBottomStyle: 'solid',
								padding: (theme.designData.lesson.edges + 5) + 'px',
								margin: '10px 0',
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
							}}
						>
							<h3>Fach: {klausur.subject}</h3>
							<span>Raum: {klausur.room}</span>
							<span>Datum: {dayjs.tz(klausur.startTime).format('DD.MM.YYYY HH:mm')} - {dayjs.tz(klausur.endTime).format('HH:mm')}</span>
						</Box>
					)) : <h1>Keine Klausuren</h1> : <LoadingSpinner/>
				}
			</Box>
		</>
	);
}