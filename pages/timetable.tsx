import Head from 'next/head';
import TimetableComponent from '../components/TimetableComponent'
import dayjs from 'dayjs';
import {useEffect, useState} from 'react';
import { Box } from '@mui/material'

import {displayedLesson, LessonData, lsTimetable, TimetableData, UntisLessonData, WeekData} from "../types";
import RefreshIcon from '@mui/icons-material/Refresh';
import {useCustomTheme} from "../components/CustomTheme";
import {useLayoutContext} from "../components/Layout";
import LoadingSpinner from "../components/LoadingSpinner";

let weekday = require('dayjs/plugin/weekday')
dayjs.extend(weekday)

const cacheName = "timetableDataCache";

const startTimeEnum: any = {
    "800": 0,
    "945": 1,
    "1130": 2,
    "1330": 3,
    "1515": 4,
}

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

const createTimeTableObject = (week: string[]): lsTimetable => {
    let out: lsTimetable = {};
    week.forEach((day: string) => {
        out[day] = [
            [],
            [],
            [],
            [],
            []
        ]
    })

    return out;
}

const processData = (data: UntisLessonData[], week: string[]): lsTimetable => {
    let returnObj: lsTimetable = createTimeTableObject(week);
    for (let i: number = 0; i < data.length; i++) {
        let {date, startTime, ...newLesson} = data[i];
        (newLesson as LessonData).startDate = dayjs(date + "" + startTimeLookup[startTime]);
        (newLesson as LessonData).endDate = dayjs(date + "" + endTimeLookup[startTime]);
        returnObj[date + ""][startTimeEnum[startTime]].push((newLesson as LessonData));
    }
    return returnObj;
}

function getWeekFromDay(date: Date) {

    let week = [];
    for (let i = 1; i <= 5; i++) {
        let first = date.getDate() - date.getDay() + i;
        let day = dayjs(date.setDate(first)).format("YYYYMMDD");
        week.push(day);
    }
    return week;
}

export default function Timetable() {

    const { apiEndpoint } = useCustomTheme()
    const {setSnackbar, setFabs} = useLayoutContext();

    const [timetables, setTimetables] = useState<TimetableData[]>([]);

    const fetchNextPage = () => {
        fetchTimeTableNew({weekOffset: timetables.length})
    }

    const fetchTimeTableNew = ({useCache = true, weekOffset = 0}: {useCache?: boolean, weekOffset?: number}): Promise<void> => {
        const week = getWeekFromDay(dayjs().add(weekOffset, "week").toDate())
        console.log("Fetching: ", dayjs(week[0]).format("DD.MM"))
        const query = new URLSearchParams({
            startDate: dayjs(week[0]).format("YYYY-MM-DD"),
            endDate: dayjs(week[4]).format("YYYY-MM-DD"),
            jwt: localStorage.getItem("jwt") ?? ""
        })
        const request = new Request(apiEndpoint + "timetableWeek?" + query);

        if(useCache){
            return caches.open(cacheName).then((cache) => {
                return cache.match(request).then((response) => {
                    if (!response) throw new Error();
                    return response;
                })
            }).then((res) => res.json()).then((async (json: WeekData) => {
                const timetable: WeekData = ({
                    type: "local"
                } as WeekData);

                week.forEach((date) => {
                    const day: displayedLesson[] = json[date];
                    timetable[date + ""] = day.map((slot) => {
                        return slot.map((lesson) => {
                            return lesson ? {
                                ...lesson,
                                startDate: dayjs(lesson.startDate),
                                endDate: dayjs(lesson.endDate),
                            } : undefined
                        })
                    })
                })

                setTimetables((prev) => {
                    prev[weekOffset] = {
                        timetable: timetable,
                        week: week,
                    }
                    return [...prev];
                })
                return Promise.resolve();

            })).catch(() => {
                //Fallback to network
                return fetch(request).then((resp) => resp.json()).then((json) => {
                    const processedData = processData(json.data, week);
                    const fullTimeTable: WeekData = ({...processedData, type: "fetched"} as WeekData);

                    caches.open(cacheName).then((cache) => {
                        cache.put(
                            request,
                            new Response(JSON.stringify(fullTimeTable)),
                        )
                    }).catch((e) => {
                        setSnackbar({
                            text: e.message,
                            type: "error",
                            open: true,
                        })
                    })

                    setTimetables((prev) => {
                        prev[weekOffset] = {
                            timetable: fullTimeTable,
                            week: week
                        }
                        return [...prev];
                    })
                    return Promise.resolve();
                })
            })
        }
        return Promise.reject("not implemented");
    }

    const handleFutureScroll = (element: HTMLDivElement) => {
        if ((element.scrollHeight - element.clientHeight - element.scrollTop) < 1) {
            fetchNextPage()
        }
    }

    useEffect(() => {
        setFabs([
            {icon: <RefreshIcon />, color: "primary", callback: refreshTimeTables}
        ])
        fetchTimeTableNew({useCache: true, weekOffset: 0}).then(() => {
            fetchTimeTableNew({weekOffset: 1});
        })
        return () => {
            setFabs([]);
        }
    }, [])

    const refreshTimeTables = () => {

        setTimetables([]);
        caches.open(cacheName).then((cache) => {
            cache.keys().then((entries) => {
                entries.forEach((entry) => {
                    cache.delete(entry);
                })
            })
        })

        fetchTimeTableNew({weekOffset: 0});
    }

    return (
        <>
            <Head>
                <title>Stundenplan</title>
            </Head>
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    overflow: "hidden",
                    overscrollBehavior: "contain",
                }}
            >
                <Box
                    onScroll={(e) => {
                        handleFutureScroll((e.target as HTMLDivElement))
                    }}
                    sx={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        overflowX: "hidden",
                        overflowY: "scroll",
                        scrollSnapType: "y mandatory",
                    }}>
                    {
                        timetables.length > 0 ?
                            timetables.map((page, idx) => {
                                return <TimetableComponent
                                    key={idx}
                                    timetableData={page}
                                />
                            }) : <LoadingSpinner />
                    }
                </Box>
            </div>
        </>

    )
}
