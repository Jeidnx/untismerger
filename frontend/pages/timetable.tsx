import Head from 'next/head';
import TimetableComponent from '../components/TimetableComponent';
import dayjs from 'dayjs';
import {useEffect, useState} from 'react';
import {Box} from '@mui/material';

import RefreshIcon from '@mui/icons-material/Refresh';
import {useCustomTheme} from '../components/CustomTheme';
import {useLayoutContext} from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';

import weekday from 'dayjs/plugin/weekday';
import isBetween from 'dayjs/plugin/isBetween';
import {DayData, WeekData} from "../../globalTypes";

dayjs.extend(weekday);
dayjs.extend(isBetween);

function getWeekFromDay(date: Date) {

	const week = [];
	for (let i = 1; i <= 5; i++) {
		const first = date.getDate() - date.getDay() + i;
		const day = dayjs(date.setDate(first)).format('YYYYMMDD');
		week.push(day);
	}
	return week;
}

export default function Timetable() {

	const {fetcher} = useCustomTheme();
	const {setFabs, showError} = useLayoutContext();

	const [timetables, setTimetables] = useState<WeekData[]>([]);
	const [fullError, setFullError] = useState<undefined | string>(undefined);

	const fetchNextPage = () => {
		fetchTimetable({weekOffset: timetables.length});
	};

	const fetchTimetable = ({
								useCache = true,
								weekOffset = 0
							}: { useCache?: boolean, weekOffset?: number }): Promise<void> => {
		setFullError(undefined);
		const week = getWeekFromDay(dayjs().add(weekOffset, 'week').toDate());

		return fetcher({
			method: "GET",
			endpoint: 'timetable',
			query: {
				startDate: dayjs(week[0]).format('YYYY-MM-DD'),
				endDate: dayjs(week[4]).format('YYYY-MM-DD'),
			}, useCache
		}).then((json) => {
			if(!((obj): obj is {timetable: {[key: string]: DayData}} => {
				return (
					obj !== null &&
						typeof obj === 'object' &&
						Object.keys(obj).some((element) => {
							const thisElement = obj[element];
							return (
								thisElement === null ||
								typeof thisElement !== 'object' ||
								!(
									thisElement.hasOwnProperty('shortName') ||
									Array.isArray(thisElement)
								)
							)
						})
				);
			})(json)) throw new Error('Server returned invalid Data');
			setTimetables((prev) => {
				prev[weekOffset] = {
					timetable: json.timetable,
					week
				}
				return [...prev];
			})
		}).catch((err) => {
			if(typeof err.message === 'string'){
				err = err.message;
			}
			timetables.length === 0 ?
				setFullError(err) : showError(err);
		})
	};

	const handleFutureScroll = (element: HTMLDivElement) => {
		if ((element.scrollHeight - element.clientHeight - element.scrollTop) < 1) {
			fetchNextPage();
		}
	};

	useEffect(() => {
		setFabs([
			{icon: <RefreshIcon/>, color: 'primary', callback: refreshTimeTables}
		]);
		fetchTimetable({useCache: true, weekOffset: 0}).then(() => {
			fetchTimetable({weekOffset: 1});
		});
		return () => {
			setFabs([]);
		};
	}, []);

	const refreshTimeTables = () => {
		setTimetables([]);
		fetchTimetable({weekOffset: 0}).then(() => {
			fetchTimetable({weekOffset: 1});
		});
	};

	return (
		<>
			<Head>
				<title>Stundenplan</title>
			</Head>
			<div
				style={{
					width: '100%',
					height: '100%',
					overflow: 'hidden',
					overscrollBehavior: 'contain',
				}}
			>
				<Box
					onScroll={(e) => {
						handleFutureScroll((e.target as HTMLDivElement));
					}}
					sx={{
						width: '100%',
						height: '100%',
						display: 'flex',
						flexDirection: 'column',
						overflowX: 'hidden',
						overflowY: 'scroll',
						scrollSnapType: 'y mandatory',
					}}>
					{
						timetables.length > 0 && typeof fullError === 'undefined' ?
							timetables.map((page, idx) => {
								return <TimetableComponent
									key={idx}
									timetableData={page}
								/>;
							}) : <LoadingSpinner error={fullError}/>
					}
				</Box>
			</div>
		</>

	);
}
