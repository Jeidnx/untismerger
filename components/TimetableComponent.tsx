import dayjs from 'dayjs';
import Lesson from './Lesson'
import {alpha, Box, useTheme} from "@mui/material";
import {displayedLesson, TimetableData} from "../types";

import customParseFormat from 'dayjs/plugin/customParseFormat';
import de from 'dayjs/locale/de'

dayjs.extend(customParseFormat);

dayjs.locale(de)

const startTimeLookup: any = {
    "800": "08:00",
    "945": "09:45",
    "1130": "11:30",
    "1330": "13:30",
    "1515": "15:15",
}

const endTimeLookup: any = {
    "800": "09:30",
    "945": "11:15",
    "1130": "13:00",
    "1330": "15:00",
    "1515": "16:45",
}

export default function TimetableComponent ({
                       timetableData,
                   }: { timetableData: TimetableData, }) {

    const { week, timetable } = timetableData;
    const firstDay = dayjs(week[0]).format('DD.MM');
    const lastDay = dayjs(week[4]).format('DD.MM');

    const theme = useTheme();

    const getWeekdaySpan = (day: string, key: number) => {
        const that = dayjs(day);
        const currDay = dayjs().isSame(that, "day")
        return (
            <span
                key={key}
                style={{
                    height: "15%",
                    width: "100%",
                    display: "inline-flex",
                    alignItems:"center",
                    justifyContent: "center",
                    fontSize: "1.7em",
                    fontWeight: currDay ? "bold": "",
                    textDecoration: currDay ? "underline" : "",
                    backgroundColor: alpha(theme.palette.background.default, theme.designData.alpha),
                    margin: "auto",
                }}>
            {that.format("dddd")}
        </span>)
    }

    return (
        <Box sx={{
            display: "flex",
            height: "100%",
            scrollSnapAlign: "start",
            flexShrink: "0",
        }}>
            <Box
                id={"timeDisplay"}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    flexDirection: "column",
                    width: "min-content",
                    justifyContent: "space-evenly",
                    height: "100%",
                }}>
                <span style={{
                    height: "15%",
                    fontSize: "1.1em",
                    display: "inline-flex",
                    alignItems: "center",
                    textAlign: "center",
                    padding: "1vw",
                    lineHeight: "2vw",
                    backgroundColor: alpha(theme.palette.background.default, theme.designData.alpha),

                }}>
                    {`${firstDay} - ${lastDay}`}
                </span>
                <div style={{height: "85%", display: "flex", flexDirection: "column", width: "100%",}}>
                    {Object.keys(startTimeLookup).map((key: string, idx: number) => {
                        return (<span key={idx} style={{
                            height: "100%",
                            width: "100%",
                            fontSize: "1.0em",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            textAlign: "center",
                            backgroundColor: alpha(theme.palette.background.default, theme.designData.alpha),
                        }}>{startTimeLookup[key]} - {endTimeLookup[key]}</span>)
                    })}
                </div>
            </Box>
            {
                week.map((day: string, idx: number) =>
                    <Box
                        className={"oneDay"}
                        key={idx}
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            flex: "1",
                            height: "100%",
                            overflow: "hidden",
                        }}>
                        {getWeekdaySpan(day, idx * 2)}

                        {
                            timetable[day]?.map((lesson: displayedLesson, jdx: number) =>

                                <Lesson lessons={lesson} parentIdx={idx} jdx={jdx} key={idx + "" + jdx}/>
                            )}
                    </Box>
                )
            }
        </Box>
    )
}
