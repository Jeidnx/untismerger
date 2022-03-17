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
import {useSnackbarContext} from "../components/layout";
import dayjs from "dayjs";
import RefreshIcon from "@mui/icons-material/Refresh";
import FABGroup from "../components/FABGroup";
import {Add} from "@mui/icons-material";

interface klausurData {
    room: string,
    subject: string,
    date: number,
    startTime: string,
    endTime: string,
}

const lkEnum: any = {
    2267: "Deutsch (smt)",
    2272: "Englisch (jae)",
    2277: "Englisch (sob)",
    2282: "Mathe (spi)",
    2287: "Physik (jus)",
    2292: "Deutsch (end)",
}

const frEnum: any = {
2232:"BG12-1",
2237:"BG12-2",
2242:"BG12-3",
2247:"Elektrotechnik",
2252:"Praktische Informatik",
2257:"BG12-6",
2262:"BG12-7",
}

export default function Exams() {
    const theme = useTheme();

    const [klausuren, setKlausuren] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [jwt, setJwt] = useState<any>({});
    const [errorMessage, setErrorMessage] = useState("");
    const [isPosting, setIsPosting] = useState(false)
    const [isLoading, setIsLoading] = useState(true);

    //Form
    const [subject, setSubject] = useState("");
    const [room, setRoom] = useState("");
    const [startTime, setStartTime] = useState(dayjs().format("YYYY-MM-DDTHH:mm"));
    const [endTime, setEndTime] = useState(dayjs().format("HH:mm"));
    const [kurs, setKurs] = useState("");

    const {apiEndpoint} = useCustomTheme()
    const setSnackbar = useSnackbarContext();

    const fetchExams = () => {
        setIsLoading(true);
        const query = new URLSearchParams({
            jwt: localStorage.getItem("jwt") ?? ""
        })
        fetch(apiEndpoint + "getExams?" + query, {
            cache: "no-cache",
        }).then((res) => res.json()).then((json) => {
            if (json.error) throw new Error(json.message);
            setKlausuren(json.message);
            setIsLoading(false);
        }).catch((err) => {
            console.error(err);
            setSnackbar({
                text: err.message,
                type: "error",
                open: true,
            })
        })
    }

    useEffect(() => {
        fetchExams();
        const jwt = localStorage.getItem("jwt");
        if (!jwt) {
            return undefined;
        }
        setJwt(JSON.parse(
            Buffer.from(jwt.split('.')[1], "base64").toString("utf-8")
        ))
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
                                const data = {
                                    subject: subject,
                                    room: room,
                                    startTime: startTime,
                                    endTime: dayjs(endTime, "HH:mm").format("YYYY-MM-DDTHH:mm"),
                                    kurs: kurs,
                                }

                                fetch(apiEndpoint + "addExam", {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                        exam: data,
                                        jwt: localStorage.getItem("jwt") ?? "",
                                    }),
                                }).then((res) => res.json())
                                    .then((json) => {
                                        if (json.error) throw new Error(json.message);
                                        fetchExams();
                                        setIsPosting(false);
                                        setDialogOpen(false);
                                        setErrorMessage("");
                                        setSnackbar({
                                            text: "Erfolgreich angelegt",
                                            type: "success",
                                            open: true,
                                        })
                                    }).catch((err) => {
                                    setIsPosting(false)
                                    setErrorMessage(err.message)
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
                                <MenuItem value={jwt.lk}>{lkEnum[jwt.lk]}</MenuItem>
                                <MenuItem value={jwt.fachrichtung}>{frEnum[jwt.fachrichtung]}</MenuItem>
                                {
                                    jwt?.sonstiges?.map((elem: string) => (
                                        <MenuItem value={elem}>{elem}</MenuItem>
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
                                    Senden <CircularProgress
                                    sx={{
                                        m: "auto"
                                    }}
                                    size={24}
                                />
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
                     !isLoading ? klausuren.length > 1 ? klausuren.map((klausur: klausurData) => (
                        <Box
                            sx={{
                                flex: "1",
                                height: "max-content",
                                borderRadius: theme.designData.lesson.edges,
                                borderColor: theme.designData.secondary,
                                backgroundColor: alpha(theme.palette.background.default, theme.designData.alpha),
                                borderBottomStyle: "solid",
                                padding: (theme.designData.lesson.edges + 5) + "px",
                                marginTop: "10px",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                            }}
                        >
                            <h3>Fach: {klausur.subject}</h3>
                            <span>Raum: {klausur.room}</span>
                            <span>Datum: {dayjs(klausur.startTime).format("DD.MM.YYYY HH:mm")} - {dayjs(klausur.endTime).format("HH:mm")}</span>
                        </Box>
                    )) : <h1>Keine Klausuren</h1> : <h1>Laden...</h1>
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