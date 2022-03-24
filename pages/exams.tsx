import {
    Alert,
    AlertTitle,
    alpha,
    Box,
    Button, CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    MenuItem,
    TextField,
    useMediaQuery,
    useTheme
} from "@mui/material";
import Head from "next/head";
import {useEffect, useState} from "react";
import {useCustomTheme} from "../components/CustomTheme";
import {useSnackbarContext} from "../components/Layout";
import RefreshIcon from "@mui/icons-material/Refresh";
import FABGroup from "../components/FABGroup";
import {Add} from "@mui/icons-material";
import {
    allSonstigeKurse,
    fachrichtungen,
    leistungskurse,
} from "../enums";
import LoadingSpinner from "../components/LoadingSpinner";

interface klausurData {
    room: string,
    subject: string,
    date: number,
    startTime: string,
    endTime: string,
}

export default function Exams() {
    const theme = useTheme();
    const { dayjs, jwt, fetcher} = useCustomTheme()

    const [klausuren, setKlausuren] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [isPosting, setIsPosting] = useState(false)
    const [isLoading, setIsLoading] = useState(true);

    //Form
    const [subject, setSubject] = useState("");
    const [room, setRoom] = useState("");
    const [startTime, setStartTime] = useState(dayjs().format("YYYY-MM-DDTHH:mm"));
    const [endTime, setEndTime] = useState(dayjs().format("HH:mm"));
    const [kurs, setKurs] = useState("");

    const setSnackbar = useSnackbarContext();

    const fetchExams = () => {
        setIsLoading(true);
        fetcher({
            endpoint: "getExams",
            method: "GET",
            query: {},
            useCache: false,
        }).then((json) => {
            setKlausuren(json.message);
            setIsLoading(false);
        }).catch((err) => {
            setSnackbar({
                text: err,
                type: "error",
                open: true,
            })
        })
    }

    useEffect(() => {
        fetchExams();
    }, [])

    return (
        <>
            <Head>
                <title>Klausuren</title>
            </Head>
            <Box
                sx={{
                    height: "100%",
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "start",
                    alignItems: "center",
                    overflowY: "scroll",
                    overflowX: "hidden",
                }}
            >
                <Dialog
                    open={dialogOpen}
                    onClose={() => {
                        setDialogOpen(false)
                    }}
                    fullScreen={useMediaQuery(theme.breakpoints.down('desktop'))}
                > <DialogTitle>Neue Klausur hinzufügen</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Bitte gib hier die Daten zur Klausur ein. Zur nachverfolgung wird eine Referenz zu deinem
                            Nutzernamen bei uns gespeichert.
                        </DialogContentText>
                    <Box
                        sx={{
                            display: errorMessage === "" ? "none" : "",
                        }}
                    >
                        <Alert
                            severity="error">
                            <AlertTitle>Fehler</AlertTitle>
                            {errorMessage}
                        </Alert>
                    </Box>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                setIsPosting(true);
                                setErrorMessage("");
                                const data = {
                                    subject: subject,
                                    room: room,
                                    startTime: dayjs(startTime).format("YYYY-MM-DD HH:mm:ss"),
                                    endTime: dayjs(startTime)
                                        .set("hour", endTime.substring(0, 2))
                                        .set("minute", endTime.substring(3,5)).format("YYYY-MM-DD HH:mm:ss"),
                                    kurs: kurs,
                                }

                                fetcher({
                                    method: "POST",
                                    useCache: false,
                                    query: {exam: data},
                                    endpoint: "addExam",
                                }).then(() => {
                                    fetchExams();
                                    setIsPosting(false);
                                    setDialogOpen(false);
                                    setSnackbar({
                                        text: "Erfolgreich angelegt",
                                        type: "success",
                                        open: true,
                                    })
                                }).catch((err) => {
                                    setIsPosting(false)
                                    setErrorMessage(err)
                                })
                            }}
                        >
                            <TextField
                                required
                                name={"subject"}
                                autoFocus
                                margin="dense"
                                value={subject}
                                onChange={(e) => {
                                    setSubject(e.target.value)
                                }}
                                id="subject"
                                label="Fach"
                                type="text"
                                fullWidth
                                variant="standard"
                            />
                            <TextField
                                required
                                name={"room"}
                                autoFocus
                                margin="dense"
                                value={room}
                                onChange={(e) => {
                                    setRoom(e.target.value)
                                }}
                                id="room"
                                label="Raum"
                                type="text"
                                fullWidth
                                variant="standard"
                            />
                            <TextField
                                required
                                select
                                name={"kurs"}
                                id={"kurs"}
                                margin={"dense"}
                                value={kurs}
                                onChange={(e) => {
                                    setKurs(e.target.value)
                                }}
                                label={"Kurs"}
                                fullWidth
                                variant={"standard"}
                            >
                                <MenuItem value={jwt.get.lk}>{leistungskurse[jwt.get.lk]}</MenuItem>
                                <MenuItem value={jwt.get.fachrichtung}>{fachrichtungen[jwt.get.fachrichtung]}</MenuItem>
                                {
                                    jwt.get.sonstiges.map((elem: string, idx) => (
                                        <MenuItem key={idx} value={elem}>{allSonstigeKurse[elem]}</MenuItem>
                                    ))
                                }

                            </TextField>
                            <TextField
                                required
                                margin="dense"
                                value={startTime}
                                onChange={(e) => {
                                    setStartTime(e.target.value)
                                }}
                                id="room"
                                label="Start zeit"
                                type="datetime-local"
                                fullWidth
                                variant="standard"
                            />
                            <TextField
                                margin="dense"
                                value={endTime}
                                onChange={(e) => {
                                    setEndTime(e.target.value)
                                }}
                                id="room"
                                label="End zeit"
                                type="time"
                                fullWidth
                                variant="standard"
                            />
                                <Button
                                    variant="contained"
                                    disabled={isPosting}
                                    type={"submit"}
                                    fullWidth
                                >
                                    Senden <CircularProgress sx={{
                                    display: isPosting ? "" : "none",
                                    position: 'absolute',
                                    zIndex: 1,
                                }} variant={"indeterminate"}/>
                                </Button>
                        </form>
                    </DialogContent>
                    <DialogActions>
                        <Button
                            disabled={isPosting}
                            onClick={() => {
                            setDialogOpen(false)
                        }}>Abbrechen</Button>
                    </DialogActions>
                </Dialog>
                {
                     !isLoading ? klausuren.length > 0 ? klausuren.map((klausur: klausurData, idx) => (
                        <Box
                            key={idx}
                            sx={{
                                minWidth: "50vw",
                                height: "max-content",
                                borderRadius: theme.designData.lesson.edges,
                                borderColor: theme.designData.secondary,
                                backgroundColor: alpha(theme.palette.background.default, theme.designData.alpha),
                                borderBottomStyle: "solid",
                                padding: (theme.designData.lesson.edges + 5) + "px",
                                margin: "10px 0",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                            }}
                        >
                            <h3>Fach: {klausur.subject}</h3>
                            <span>Raum: {klausur.room}</span>
                            <span>Datum: {dayjs.tz(klausur.startTime).format("DD.MM.YYYY HH:mm")} - {dayjs.tz(klausur.endTime).format("HH:mm")}</span>
                        </Box>
                    )) : <h1>Keine Klausuren</h1> : <LoadingSpinner hidden={false} />
                }
                <FABGroup
                    children={[
                        {
                            icon: <Add/>, color: "primary", callback: () => {
                                setDialogOpen(true)
                            }
                        },
                        {icon: <RefreshIcon/>, color: "primary", callback: fetchExams}
                    ]}
                />
            </Box>
        </>
    )
}