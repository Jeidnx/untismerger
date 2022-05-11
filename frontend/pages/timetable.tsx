import Head from 'next/head';
import TimetableComponent from '../components/TimetableComponent';
import dayjs from 'dayjs';
import {useEffect, useState} from 'react';
import {Box} from '@mui/material';

import { lsTimetable, TimetableData, WeekData} from '../types';
import {LessonData, Holiday} from '../../globalTypes';
import RefreshIcon from '@mui/icons-material/Refresh';
import {useCustomTheme} from '../components/CustomTheme';
import {useLayoutContext} from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';

import weekday from 'dayjs/plugin/weekday';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(weekday);
dayjs.extend(isBetween);

const cacheName = 'timetableDataCache';

const startTimeEnum: any = {
	'800': 0,
	'945': 1,
	'1130': 2,
	'1330': 3,
	'1515': 4,
};

const createTimeTableObject = (week: string[]): lsTimetable => {
	const out: lsTimetable = {};
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

const processData = (data: LessonData[], holidays: Holiday[], week: string[]): lsTimetable => {
	//TODO: this could be better

	const returnObj: lsTimetable = createTimeTableObject(week);

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

	const {apiEndpoint} = useCustomTheme();
	const {setFabs} = useLayoutContext();

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
		const request = new Request(apiEndpoint + 'timetableWeek?' + query);

		// No caching for now
		return fetch(request).then((resp) => resp.json()).then((json) => {
			if(json.error) return Promise.reject('error');
			const processedData = processData(json.lessons, json.holidays, week);
			const fullTimeTable: WeekData = ({...processedData, type: 'fetched'} as WeekData);

			setTimetables((prev) => {
				prev[weekOffset] = {
					timetable: fullTimeTable,
					week: week
				};
				return [...prev];
			});
			return Promise.resolve();
		});
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
		caches.open(cacheName).then((cache) => {
			cache.keys().then((entries) => {
				entries.forEach((entry) => {
					cache.delete(entry);
				});
			});
		});

		fetchTimetable({weekOffset: 0});
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
