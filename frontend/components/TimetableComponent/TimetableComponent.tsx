import dayjs from 'dayjs';
import Lesson from '../Lesson';
import {alpha, Box, useTheme} from '@mui/material';

import customParseFormat from 'dayjs/plugin/customParseFormat';
import de from 'dayjs/locale/de';
import {Holiday, WeekData} from "../../../globalTypes";

dayjs.extend(customParseFormat);

dayjs.locale(de);

function instanceOfHoliday(object: any): object is Holiday {
	return typeof object === 'object' && object.hasOwnProperty('shortName');
}

export default function TimetableComponent({timetableData}: { timetableData: WeekData, }) {

	//TODO: Show proper times on left hand side
	const {week, timetable, timeDisplay} = timetableData;
	const firstDay = dayjs(week[0]).format('DD.MM');
	const lastDay = dayjs(week[4]).format('DD.MM');

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
					backgroundColor: alpha(theme.palette.background.default, theme.designData.alpha),
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
					backgroundColor: alpha(theme.palette.background.default, theme.designData.alpha),

				}}>
					{`${firstDay} - ${lastDay}`}
				</span>
				<div style={{height: '85%', display: 'flex', flexDirection: 'column', width: '100%',}}>
					{timeDisplay.map((time, idx) => {
						return (<span key={idx} style={{
							height: '100%',
							width: '100%',
							fontSize: '0.7em',
							display: 'inline-flex',
							alignItems: 'center',
							justifyContent: 'center',
							textAlign: 'center',
							backgroundColor: alpha(theme.palette.background.default, theme.designData.alpha),
						}}>{time.startTime}. Stunde </span>);
					})}
				</div>
			</Box>
			{
				week.map((day: string, idx: number) => {
					const thisDay = timetable[day];
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

						{ (typeof thisDay !== 'undefined') && (instanceOfHoliday(thisDay) ? <Box
									sx={{
										flexGrow: '1',
										margin: '1px',
										backgroundColor: alpha(theme.palette.secondary.light, theme.designData.alpha),
										color: theme.palette.secondary.contrastText,
										display: 'flex',
										justifyContent: 'center',
										alignItems: 'center',
										fontSize: '2em',
										writingMode: {desktop: 'horizontal-tb', mobile: 'vertical-rl'},
									}}
								>
									{thisDay.name}
								</Box> :
								thisDay.map((lesson, jdx) => {
									return <Lesson lessons={lesson} parentIdx={idx}
												   jdx={jdx} key={idx + '' + jdx}/>;
								}))}
					</Box>
				})
			}
		</Box>
	);
}
