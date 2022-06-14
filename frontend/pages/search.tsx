import {alpha, Box, Stack, TextField, useTheme} from "@mui/material";
import {useEffect, useMemo, useState} from "react";
import dayjs from "dayjs";
import LoadingSpinner from "../components/LoadingSpinner";
import {LessonData} from "../../globalTypes";
import {useCustomTheme} from "../components/CustomTheme";
import Lesson from "../components/Lesson";

let debounceTimer: NodeJS.Timeout;

interface SearchResult extends LessonData {
    entityId: number,
}

export default function Search() {

    const [error, setError] = useState<undefined | string>(undefined);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [lastTime, setLastTime] = useState(-1);

    const [subject, setSubject] = useState('');
    const [teacher, setTeacher] = useState('');
    const [room, setRoom] = useState('');

    //TODO: make a gui switch for this
    const [showCancelled, setShowCancelled] = useState(true);
    const [startTime, setStartTime] = useState(dayjs());
    const [endTime, setEndTime] = useState(dayjs().add(1, "hour"));

    const {fetcher} = useCustomTheme();
    const theme = useTheme();

    useEffect(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (subject.length + teacher.length + room.length === 0) return;
            setError(undefined);
            setLoading(true);
            setResults([]);
            fetcher({
                method: "GET",
                endpoint: "search",
                useCache: false,
                query: {
                    startTime: startTime.toDate(),
                    endTime: endTime.toDate(),
                    subject, teacher, room, showCancelled
                }
            }).then((json) => {
                if (!((obj): obj is { result: SearchResult[], time: number } => {
                    return Array.isArray(obj.result)
                })(json)) throw new Error('Server returned invalid Data');

                const results = json.result.map((result) => {
                    result.startTime = dayjs(result.startTime);
                    result.endTime = dayjs(result.endTime);
                    return result;
                })

                setResults(results);
                setLastTime(Number(json.time));
                setLoading(false);
            }).catch((err) => {
                setError(err.message);
                setLoading(false);
            })
        }, 300);
    }, [startTime, endTime, subject, teacher, room, fetcher, showCancelled]);


    const calculatedStartTime = useMemo(() => {
        const tDate = startTime.toDate();
        tDate.setMinutes(tDate.getMinutes() - tDate.getTimezoneOffset());
        return tDate.toISOString().slice(0, 16);
    }, [startTime])

    const calculatedEndTime = useMemo(() => {
        const tDate = endTime.toDate();
        tDate.setMinutes(tDate.getMinutes() - tDate.getTimezoneOffset());
        return tDate.toISOString().slice(0, 16);
    }, [endTime])

    return (<Box
        sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            overflowY: "scroll",
            flexShrink: 0,
            flexBasis: 1,
        }}
    >
        <Stack
            spacing={3}
            sx={{
                width: "50%",
                backgroundColor: alpha(theme.palette.background.default, theme.designData.alpha),
            }}
        >
            <h1>Suche</h1>
            <TextField
                label={"Fach"}
                value={subject}
                onChange={(e) => {
                    setSubject(e.target.value);
                }}
            /><TextField
            label={"Lehrer"}
            value={teacher}
            onChange={(e) => {
                setTeacher(e.target.value);
            }}
        /><TextField
            label={"Raum"}
            value={room}
            onChange={(e) => {
                setRoom(e.target.value);
            }}
        />
            <TextField
                label={"Von"}
                type={"datetime-local"}
                value={calculatedStartTime}
                onChange={(e) => {
                    setStartTime(dayjs(e.target.value));
                }}

            />
            <TextField
                label={"Bis"}
                type={"datetime-local"}
                value={calculatedEndTime}
                onChange={(e) => {
                    setEndTime(dayjs(e.target.value));
                }}

            />
        </Stack>

        {
            (typeof error !== 'undefined') || loading ? <LoadingSpinner error={error} text={"Laden..."}/> : (
                <><h2
                    style={{
                        backgroundColor: alpha(theme.palette.background.default, theme.designData.alpha),
                        padding: "2px",
                    }}
                >
                    {results.length} Ergebnisse in {lastTime} ms</h2>
                    <Box
                        sx={{
                            width: "80%",
                            height: "max-content",
                        }}
                    >
                        {
                            results.map((result) => {
                                return <Lesson key={result.entityId} lessons={[result]} parentIdx={0} jdx={0}/>;
                            })
                        }
                    </Box>
                </>
            )
        }
    </Box>)
}