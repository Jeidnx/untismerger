import Head from 'next/head';
import TimetableComponent from '../components/TimetableComponent';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Box } from '@mui/material';

import { TimetableData, LessonData, Holiday, DayData } from '../types';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useCustomTheme } from '../components/CustomTheme';
import { useLayoutContext } from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';

import weekday from 'dayjs/plugin/weekday';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(weekday);
dayjs.extend(isBetween);

const startTimeEnum: any = {
	'800': 0,
	'945': 1,
	'1130': 2,
	'1330': 3,
	'1515': 4,
};

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

	const { setFabs } = useLayoutContext();
	const { fetcher } = useCustomTheme();

	const [timetables, setTimetables] = useState<TimetableData[]>([]);

	const fetchNextPage = () => {
		fetchTimetable({ weekOffset: timetables.length });
	};

	const fetchTimetable = ({
		useCache = true,
		weekOffset = 0
	}: { useCache?: boolean, weekOffset?: number }): Promise<void> => {
		const week = getWeekFromDay(dayjs().add(weekOffset, 'week').toDate());
		const query = {
			startDate: dayjs(week[0]).format('YYYY-MM-DD'),
			endDate: dayjs(week[4]).format('YYYY-MM-DD'),
		};

		return fetcher({
			endpoint: 'timetableWeek',
			method: 'GET',
			query, useCache,
		}).then((json) => {
			setTimetables((prev) => {
				//@ts-ignore
				prev[weekOffset] = json.lessons;
				return [...prev];
			})
		})
	};

	const handleFutureScroll = (element: HTMLDivElement) => {
		if ((element.scrollHeight - element.clientHeight - element.scrollTop) < 1) {
			fetchNextPage();
		}
	};

	useEffect(() => {
		setFabs([
			{ icon: <RefreshIcon />, color: 'primary', callback: refreshTimeTables }
		]);
		fetchTimetable({ useCache: true, weekOffset: 0 }).then(() => {
			fetchTimetable({ weekOffset: 1 });
		});
		return () => {
			setFabs([]);
		};
	}, []);

	const refreshTimeTables = () => {
		setTimetables([]);
		fetchTimetable({ weekOffset: 0 });
		fetchTimetable({ weekOffset: 1 })
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
						timetables.length > 0 ?
							timetables.map((page, idx) => {
								if(typeof page == 'undefined') return;
								return <TimetableComponent
									key={idx}
									timetableData={page}
								/>;
							}) : <LoadingSpinner />
					}
				</Box>
			</div>
		</>

	);
}
