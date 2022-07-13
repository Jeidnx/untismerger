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
import utc from 'dayjs/plugin/utc';
import {DayData, Holiday, LessonData, LessonSlot, Timegrid, WeekData} from "../../globalTypes";

dayjs.extend(weekday);
dayjs.extend(isBetween);
dayjs.extend(utc);

function getWeekFromDay(date: Date) {

	const week = [];
	for (let i = 1; i <= 5; i++) {
		const first = date.getDate() - date.getDay() + i;
		const day = dayjs(date.setDate(first)).format('YYYYMMDD');
		week.push(day);
	}
	return week;
}

const createTimeTableObject = (week: string[], lessonsPerDay: number) => {
	if(lessonsPerDay < 1) throw new Error('Failed to get start times');
	const out: {[key: string]: any} = {};
	week.forEach((day: string) => {
		out[day] = [...Array(lessonsPerDay)].map(() => []);
	});

	return out;
};

const processData = (data: LessonData[], holidays: Holiday[], week: string[], timegrid: Timegrid, endTimegrid: Timegrid): [{[key: string]: DayData}, {startTime: number, endTime: number}[]] => {
	//TODO: this could be better

	if(data.length < 1) return [{}, []];

	let earliest: number  = 2400
	let latest: number = 0

	const parsedData = data.map((lesson) => {
		const startTime = dayjs.utc(lesson.startTime);
		const endTime = dayjs.utc(lesson.endTime);

		const formattedStart = Number(startTime.format('Hmm'));
		const formattedEnd = Number(endTime.format('Hmm'));

		if(formattedStart < earliest) earliest = formattedStart;
		if(formattedEnd > latest) latest = formattedEnd;

		return {...lesson, startTime, endTime}

	})


	const startIndex = timegrid[earliest];
	const endIndex = endTimegrid[latest];
	const lessonsPerDay = endIndex + 1 - startIndex;

	const returnObj: {[key: string]: DayData} = createTimeTableObject(week, lessonsPerDay);

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

	parsedData.forEach((lesson) => {
		const day = lesson.startTime.format('YYYYMMDD');
		const begin: number | undefined = timegrid[Number(lesson.startTime.format('HHmm'))] - startIndex;
		if(typeof begin !== 'undefined' && begin >= 0) {
			if(typeof (returnObj[day] as LessonSlot[])[begin] === 'undefined') (returnObj[day] as LessonSlot[])[begin] = [];
			(returnObj[day] as LessonSlot[])[begin].push(lesson);
		}

	})
	const timeDisplay = [];
	let i = startIndex;
	while(i <= endIndex) {
		timeDisplay.push({
			startTime: i,
			endTime: 1,
		});
		i++;
	}
	return [returnObj, timeDisplay];
};


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
			if(!((obj): obj is {
				holidays: Holiday[];
				timetable: LessonData[],
				timegrid: {name: string, startTime: number, endTime: number}[]} => {

				return (
					obj !== null &&
					Array.isArray(obj.timetable) &&
						Array.isArray(obj.holidays) &&
						Array.isArray(obj.timegrid)
				);

			})(json)) throw new Error('Server returned invalid Data');

			const timegrid: Timegrid = {};
			const endTimegrid: Timegrid = {};
			json.timegrid.forEach((obj) => {
				timegrid[obj.startTime] = Number(obj.name);
			})
			json.timegrid.forEach((obj) => {
				endTimegrid[obj.endTime] = Number(obj.name);
			})
			const [timetable, timeDisplay] = processData(json.timetable, json.holidays, week, timegrid, endTimegrid)
			setTimetables((prev) => {
				prev[weekOffset] = {
					timetable, week, timeDisplay
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
								if(typeof page === 'undefined') return null;
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
