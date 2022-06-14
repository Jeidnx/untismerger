import Head from 'next/head';
import {alpha, Box, Button, useTheme} from '@mui/material';
import Router from 'next/router';
import {useCustomTheme} from '../components/CustomTheme';
import LoadingSpinner from "../components/LoadingSpinner";
import React from "react";
import Lesson from "../components/Lesson";
import {LessonData} from "../../globalTypes";

//TODO: Add which homework is due next, which exam is due next and maybe something else
export default function Index() {

    const theme = useTheme();
    const {jwt, fetcher, dayjs} = useCustomTheme();

    const [nextLesson, setNextLesson] = React.useState<undefined | LessonData>(undefined);
    const [nextLessonError, setNextLessonError] = React.useState<undefined | string>(undefined);

    React.useEffect(() => {
        fetcher({
            method: "GET",
            endpoint: "nextLesson",
            useCache: false,
            query: {
                startTime: dayjs().format("YYYY-MM-DD"),
            }
        }).then((json) => {
            if (!((obj): obj is { lesson: LessonData } => {
                const test = obj.lesson;
                return (
                    test !== null &&
                    typeof test === 'object' &&
                    test.hasOwnProperty('courseNr')
                )
            })(json)) throw new Error('Server returned invalid Data');
            const newLesson = json.lesson;
            newLesson.startTime = dayjs(newLesson.startTime)
            newLesson.endTime = dayjs(newLesson.endTime);
            setNextLesson(newLesson);
        }).catch((err) => {
            setNextLessonError(err.message || err);
        });
    }, [])

    return (<>
        <Head>
            <title>Untismerger</title>
        </Head>
        <Box
            sx={{
                height: '100%',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'start',
                flexDirection: 'column',

            }}
        >
            <h1>Willkommen {jwt.get.username}</h1>
            <Button
                variant={'outlined'}
                onClick={() => {
                    Router.push('/timetable');
                }}>Zum Stundenplan</Button>
            <Box
                sx={{
                    backgroundColor: alpha(theme.palette.background.default, theme.designData.alpha),
                    padding: "2px",
                }}
            >
                <h3>Nächste Stunde:</h3>
                {(typeof nextLesson === 'undefined') ?
                    <LoadingSpinner error={nextLessonError} text={"Lade nächste Stunde.."}/>
                    :
                    <Lesson lessons={[nextLesson]} parentIdx={0} jdx={0}/>
                }
            </Box>
        </Box>
    </>);
}