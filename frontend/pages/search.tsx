import {
    alpha,
    Box,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    Link,
    Stack,
    TextField,
    useMediaQuery,
    useTheme
} from "@mui/material";
import {useEffect, useMemo, useState} from "react";
import dayjs from "dayjs";
import LoadingSpinner from "../components/LoadingSpinner";
import {LessonData} from "../../globalTypes";
import {useCustomTheme} from "../components/CustomTheme";
import Lesson from "../components/Lesson";
import Head from "next/head";
import CloseIcon from "@mui/icons-material/Close";
import HelpIcon from '@mui/icons-material/Help';

let debounceTimer: NodeJS.Timeout;

interface SearchResult extends LessonData {
    entityId: number,
}

export default function Search() {

    const [error, setError] = useState<undefined | string>(undefined);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [lastTime, setLastTime] = useState(-1);
    const [modalOpen, setModalOpen] = useState(false);

    const [query, setQuery] = useState('');

    const [startTime, setStartTime] = useState(dayjs());
    const [endTime, setEndTime] = useState(dayjs().add(1, "hour"));

    const {fetcher} = useCustomTheme();
    const theme = useTheme();

    useEffect(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (query.length < 3) return;
            setError(undefined);
            setLoading(true);
            setResults([]);
            fetcher({
                method: "GET",
                endpoint: "search",
                useCache: false,
                query: {
                    startTime, endTime, query
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
    }, [startTime, endTime, query, fetcher]);


    const calculatedStartTime = useMemo(() => {
        const tDate = startTime.toDate();
        return tDate.toISOString().slice(0, 16);
    }, [startTime])

    const calculatedEndTime = useMemo(() => {
        const tDate = endTime.toDate();
        return tDate.toISOString().slice(0, 16);
    }, [endTime])

    const isMobile = useMediaQuery(theme.breakpoints.down('desktop'));

    return (<>
        <Head>
            <title>Suche</title>
        </Head>
        <Dialog
            open={modalOpen}
            onClose={() => {
                setModalOpen(false);
            }}
            fullScreen={isMobile}
        >
            <DialogTitle
                sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >Anleitung
                <IconButton
                    size={"large"}
                    onClick={() => {
                        setModalOpen(false)
                    }}><CloseIcon/></IconButton>
            </DialogTitle>
            <DialogContent>
                <Link href={"https://redis.io/docs/stack/search/reference/query_syntax/"} target={"_blank"}
                      rel="noopener noreferrer">Syntax</Link>
                <p>Felder:</p>
                {
                    //TODO add  Fields and description
                }
            </DialogContent>
        </Dialog>
        <Box
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
                    width: {mobile: "95%", desktop: "80%"},
                    backgroundColor: alpha(theme.palette.background.default, theme.designData.alpha),
                }}
            >
                <h1>Suche</h1>
                <TextField
                    label={"Anfrage"}
                    value={query}
                    multiline
                    InputProps={{
                        endAdornment: <InputAdornment position={"end"}>
                            <IconButton
                                size={"small"}
                                onClick={() => {
                                    setModalOpen(true)
                                }}><HelpIcon/></IconButton>
                        </InputAdornment>
                    }}
                    onChange={(e) => {
                        setQuery(e.target.value);
                    }}
                />
                <TextField
                    label={"Von"}
                    type={"datetime-local"}
                    value={calculatedStartTime}
                    onChange={(e) => {
                        const start = dayjs(e.target.value);
                        if (start.isValid()) setStartTime(start);
                    }}

                />
                <TextField
                    label={"Bis"}
                    type={"datetime-local"}
                    value={calculatedEndTime}
                    onChange={(e) => {
                        const end = dayjs(e.target.value);
                        if (end.isValid()) setEndTime(end);
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
        </Box>
    </>)
}