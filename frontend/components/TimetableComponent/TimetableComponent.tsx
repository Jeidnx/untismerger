import dayjs from 'dayjs';
import Lesson from '../Lesson';
import {alpha, Box, useTheme} from '@mui/material';
import { Lessons,HolidayData, LessonData, TimetableData} from '../../types';

import customParseFormat from 'dayjs/plugin/customParseFormat';
import de from 'dayjs/locale/de';

dayjs.extend(customParseFormat);

dayjs.locale(de);

const startTimeLookup: any = {
	'800': '08:00',
	'945': '09:45',
	'1130': '11:30',
	'1330': '13:30',
	'1515': '15:15',
};

const endTimeLookup: any = {
	'800': '09:30',
	'945': '11:15',
	'1130': '13:00',
	'1330': '15:00',
	'1515': '16:45',
};

function instanceOfHoliday(object: any): object is HolidayData {
	return object.hasOwnProperty('shortName');
}

export default function TimetableComponent({timetableData}: { timetableData: TimetableData, }) {

	console.log(timetableData);
	const {week, timetable} = timetableData;
	const firstDay = week[0];
	const lastDay = week[4];

	const theme = useTheme();

	const getWeekdaySpan = (day: string, key: number) => {
		const that = dayjs(day);
		const currDay = dayjs().isSame(that, 'day');
		return (
			<span
				key={key}
				style={{
					height: '15%',
					width: '100%',
					display: 'inline-flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontSize: '1.0em',
					fontWeight: currDay ? 'bold' : '',
					textDecoration: currDay ? 'underline' : '',
					backgroundColor: theme.palette.background.default,
					margin: 'auto',

				}}>
				{that.format('dddd')}
			</span>);
	};

	return (
		<Box sx={{
			display: 'flex',
			height: '100%',
			scrollSnapAlign: 'start',
			flexShrink: '0',
		}}>
			<Box
				id={'timeDisplay'}
				sx={{
					display: 'flex',
					alignItems: 'center',
					flexDirection: 'column',
					width: 'min-content',
					justifyContent: 'space-evenly',
					height: '100%',
				}}>
				<span style={{
					height: '15%',
					fontSize: '1.0em',
					display: 'inline-flex',
					alignItems: 'center',
					textAlign: 'center',
					padding: '1vw',
					lineHeight: '1.0em',
					backgroundColor: theme.palette.background.default,
				}}>
					{`${firstDay} - ${lastDay}`}
				</span>
				<div style={{height: '85%', display: 'flex', flexDirection: 'column', width: '100%',}}>
					{Object.keys(startTimeLookup).map((key: string, idx: number) => {
						return (<span key={idx} style={{
							height: '100%',
							width: '100%',
							fontSize: '0.7em',
							display: 'inline-flex',
							alignItems: 'center',
							justifyContent: 'center',
							textAlign: 'center',
							backgroundColor: theme.palette.background.default,
						}}>{startTimeLookup[key]} - {endTimeLookup[key]}</span>);
					})}
				</div>
			</Box>
			{
				week.map((day: string, idx: number) => {
					const dayData = timetable[day];
					return <Box
							className={'oneDay'}
							key={idx}
							sx={{
								display: 'flex',
								flexDirection: 'column',
								flex: '1',
								height: '100%',
								overflow: 'hidden',
							}}>
							{getWeekdaySpan(day, idx * 2)}

							{
								instanceOfHoliday(dayData) ? <Box
										sx={{
											flexGrow: '1',
											margin: '1px',
											backgroundColor: theme.palette.secondary.light,
											color: theme.palette.secondary.contrastText,
											display: 'flex',
											justifyContent: 'center',
											alignItems: 'center',
											fontSize: '2em',
											writingMode: {desktop: 'horizontal-tb', mobile: 'vertical-rl'},
										}}
									>
										{
											dayData.name}
									</Box> :
									dayData.map((lessons: Lessons, jdx: number) => {
										return <Lesson lessons={lessons} parentIdx={idx}
													   jdx={jdx} key={idx + '' + jdx}/>;
									})}
						</Box>
					})
			}
		</Box>
	);
}
