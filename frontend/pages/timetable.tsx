import Head from 'next/head';
import TimetableComponent from '../components/TimetableComponent';
import dayjs from 'dayjs';
import {useEffect, useState} from 'react';
import {Box} from '@mui/material';

import {TimetableData, LessonData, Holiday, DayData} from '../types';
import RefreshIcon from '@mui/icons-material/Refresh';
import {useCustomTheme} from '../components/CustomTheme';
import {useLayoutContext} from '../components/Layout';
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

const createTimeTableObject = (week: string[]) => {
	const out: {[key: string]: any} = {};
	week.forEach((day: string) => {
		out[day] = [
			[],
			[],
			[],
			[],
			[]
		];
	});

	return out;
};

const processData = (data: LessonData[], holidays: Holiday[], week: string[]): {[key: string]: DayData} => {
	//TODO: this could be better

	const returnObj: {[key: string]: DayData} = createTimeTableObject(week);

	for (let i = 0; i < holidays.length; i++) {
		const holiday = holidays[i];
		const start = dayjs(holiday.startDate + '00:00');
		const end = dayjs(holiday.endDate + '24:00');

		const arr: string[] = [];

		for (let dt = start; end.isAfter(dt, 'day'); dt = dt.add(1, 'day')) {
			if (dt.isBetween(start, end, 'day', '[)')) arr.push(dt.format('YYYYMMDD'));
		}
		arr.forEach((day) => {
			returnObj[day] = holiday;
		});

	}

	for (let i = 0; i < data.length; i++) {
		const {endTime, startTime, ...newLesson} = data[i];
		(newLesson as LessonData).startTime = dayjs(startTime);
		(newLesson as LessonData).endTime = dayjs(endTime);
		// @ts-ignore
		returnObj[date + ''][startTimeEnum[startTime]].push((newLesson as LessonData));
	}
	return returnObj;
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

	const {setFabs} = useLayoutContext();
	const {fetcher} = useCustomTheme();

	const [timetables, setTimetables] = useState<TimetableData[]>([]);

	const fetchNextPage = () => {
		fetchTimetable({weekOffset: timetables.length});
	};

	const fetchTimetable = ({
								useCache = true,
								weekOffset = 0
							}: { useCache?: boolean, weekOffset?: number }): Promise<void> => {
		const week = getWeekFromDay(dayjs().add(weekOffset, 'week').toDate());
		const query = new URLSearchParams({
			startDate: dayjs(week[0]).format('YYYY-MM-DD'),
			endDate: dayjs(week[4]).format('YYYY-MM-DD'),
			jwt: localStorage.getItem('jwt') ?? ''
		});

		return fetcher({
			endpoint: 'timetableWeek',
			method: 'GET',
			query, useCache,
		}).then((json) => {
			const processedData = processData((json.lessons as LessonData[]), (json.holidays as Holiday[]), week);
			setTimetables((prev) => {
				prev[weekOffset] = {
					timetable: processedData,
					week
				}
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
		fetchTimetable({weekOffset: 0});
		fetchTimetable({weekOffset: 1})
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
								return <TimetableComponent
									key={idx}
									timetableData={page}
								/>;
							}) : <LoadingSpinner/>
					}
				</Box>
			</div>
		</>

	);
}
