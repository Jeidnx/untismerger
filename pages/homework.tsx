import {
    alpha,
    Box,
    MenuItem, Stack,
    TextField,
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
import AddDialog from "../components/AddDialog";

interface homeworkData {
    subject: string,
    text: string,
    dueDate: string,
    attachments: any[],
}

export default function Exams() {
    const theme = useTheme();
    const { dayjs, jwt, fetcher} = useCustomTheme()

    const [homework, setHomework] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [isPosting, setIsPosting] = useState(false)
    const [isLoading, setIsLoading] = useState(true);

    //Form
    const [subject, setSubject] = useState("");
    const [text, setText] = useState("");
    const [dueDate, setDueDate] = useState(dayjs().format("YYYY-MM-DD"));
    const [kurs, setKurs] = useState("");

    const setSnackbar = useSnackbarContext();

    const fetchHomework = () => {
        setIsLoading(true);
        fetcher({
            endpoint: "getHomework",
            method: "GET",
            query: {},
            useCache: false,
        }).then((json) => {
            setHomework(json.message);
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
        fetchHomework();
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
                <AddDialog
                    title={"Neue Hausaufgaben hinzufügen"}
                    isPosting={isPosting}
                    errorMessage={errorMessage}
                    open={dialogOpen}
                    close={() => {
                        setDialogOpen(false);
                    }}
                    submit={() => {
                        setErrorMessage("");

                        if(!subject || !text || !kurs){
                            setErrorMessage("Bitte gib alle benötigten Daten an.")
                            return;
                        }

                        setIsPosting(true);
                        const data = {
                            subject: subject,
                            text: text,
                            dueDate: dueDate,
                            kurs: kurs,
                        }
                        fetcher({
                            method: "POST",
                            useCache: false,
                            query: {homework: data},
                            endpoint: "addHomework",
                        }).then(() => {
                            fetchHomework();
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
                <Stack
                    spacing={3}
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
                        name={"text"}
                        margin="dense"
                        value={text}
                        onChange={(e) => {
                            setText(e.target.value)
                        }}
                        id="text"
                        label="Text"
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
                        value={dueDate}
                        onChange={(e) => {
                            setDueDate(e.target.value)
                        }}
                        id="dueDate"
                        label="Abgabe"
                        type="date"
                        fullWidth
                        variant="standard"
                    />
                </Stack>
                </AddDialog>
                {
                    !isLoading ? homework.length > 0 ? homework.map((homework: homeworkData, idx) => (
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
                            <h3>Fach: {homework.subject}</h3>
                            <span>Text: {homework.text}</span>
                            <span>Abgabe: {dayjs(homework.dueDate).format("DD.MM.YYYY")}</span>
                        </Box>
                    )) : <h1>Keine Hausaufgaben</h1> : <LoadingSpinner hidden={false} />
                }
                <FABGroup
                    children={[
                        {
                            icon: <Add/>, color: "primary", callback: () => {
                                setDialogOpen(true)
                            }
                        },
                        {icon: <RefreshIcon/>, color: "primary", callback: fetchHomework}
                    ]}
                />
            </Box>
        </>
    )
}