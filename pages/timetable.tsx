import type {NextPage} from 'next';
import Head from 'next/head';
import TimetableComponent from '../components/TimetableComponent'
import dayjs from 'dayjs';
import {useEffect} from 'react';
import {alpha, Box, CircularProgress, Fab, useTheme} from '@mui/material'

import {displayedLesson, LessonData, lsTimetable, Timetable, TimetableData, UntisLessonData} from "../types";
import RefreshIcon from '@mui/icons-material/Refresh';
import {useCustomTheme} from "../components/CustomTheme";
import {useSnackbarContext} from "../components/layout";
import {useInfiniteQuery} from "react-query";

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

const Index: NextPage = () => {


    const theme = useTheme();
    const {apiEndpoint} = useCustomTheme()
    const setSnackbar = useSnackbarContext();

    const fetchTimeTable = ({pageParam = 0}): Promise<TimetableData & { pageParam: number }> => {

        const week = getWeekFromDay(dayjs().add(pageParam, "week").toDate())

        const fetchQuery = new URLSearchParams({
            startDate: dayjs(week[0]).format("YYYY-MM-DD"),
            endDate: dayjs(week[4]).format("YYYY-MM-DD"),
            jwt: localStorage.getItem("jwt") ?? ""
        })

        const request = new Request(apiEndpoint + "timetableWeek?" + fetchQuery);

        return caches.open(cacheName).then((cache) => {
            return cache.match(request).then((response) => {
                if (!response) throw new Error()
                return response;
            })
        }).then((res) => res.json())
            .then(async (json: Timetable) => {
                //TODO: Instead of doing this, we should really be adjusting the calls for start / end Date
                const timetable: Timetable = ({
                    type: "local"
                } as Timetable);
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
                //TODO: timestamps for invalidation, seperate refetch function for readability
                console.log("Cache hit");
                return {
                    timetable: timetable,
                    week: week,
                    pageParam: pageParam,
                }
            }).catch(() => {
                console.log("Cache miss");
                return fetch(request).then((resp) => resp.json()).then((json) => {
                    const processedData = processData(json.data, week);
                    const fullTimeTable: Timetable = ({...processedData, type: "fetched"} as Timetable);

                    caches.open(cacheName).then((cache) => {
                        cache.put(
                            request,
                            new Response(JSON.stringify(fullTimeTable)),
                        )
                    })

                    return {
                        timetable: fullTimeTable,
                        week: week,
                        pageParam: pageParam
                    };
                })
            })
    }
    //pageParam is offset from current week. Next week is 1, prev week is -1
    const query = useInfiniteQuery<TimetableData & { pageParam: number }>('timetableData', fetchTimeTable, {
        getNextPageParam: (lastPage) => {
            return lastPage.pageParam + 1
        },
        staleTime: 0,
        cacheTime: 0,
        notifyOnChangeProps: ["data", "error"],
    })

    const handleFutureScroll = (element: HTMLDivElement) => {
        if ((element.scrollHeight - element.clientHeight - element.scrollTop) < 1) {
            console.log("bottom");
            query.fetchNextPage();
        }
    }

    useEffect(() => {
        setTimeout(() => {
            query.fetchNextPage()
        }, 500)
    }, [])

    const refreshTimeTables = () => {

        caches.open(cacheName).then((cache) => {
            cache.keys().then((entries) => {
                entries.forEach((entry) => {
                    cache.delete(entry);
                })
            })
        })

        query.refetch()
    }

    if (query.isError) {
        setSnackbar({
            // @ts-ignore
            text: query.error.message,
            type: "error",
            open: true,
        })
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
                        //scrollbarWidth: "none",
                    }}>
                    {
                        query.isLoading ?
                            <Box
                                sx={{
                                    backgroundColor: alpha(theme.palette.background.default, theme.designData.alpha),
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    padding: "2%",
                                    margin: "auto",
                                }}
                            >
                                <CircularProgress/>
                                <h1>Lade Daten...</h1>
                            </Box> :
                            query?.data?.pages?.map((page, idx) => {
                                return <TimetableComponent
                                    key={idx}
                                    timetableData={page}
                                />
                            })
                    }
                </Box>
                <Box
                    id={"fabContainer"}
                    sx={{
                        position: "sticky",
                        bottom: "1vh",
                        marginLeft: "auto",
                        marginRight: "2vw",
                        height: "min-content",
                        width: "min-content"
                    }}
                >
                    <Fab
                        onClick={() => {
                            refreshTimeTables();
                        }}
                        size={"medium"}
                        color={"primary"}

                    ><RefreshIcon/></Fab>
                </Box>
            </div>
        </>

    )
}

export default Index
