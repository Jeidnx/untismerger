import {alpha, Box, useTheme} from "@mui/material";
import Head from "next/head";
import {useEffect, useState} from "react";
import {useCustomTheme} from "../components/CustomTheme";
import {useSnackbarContext} from "../components/layout";
import dayjs from "dayjs";
import RefreshIcon from "@mui/icons-material/Refresh";
import FABGroup from "../components/FABGroup";
let weekday = require('dayjs/plugin/weekday')
dayjs.extend(weekday)

const StartTimeLookup: any = {
    "800": "08:00",
    "945": "09:45",
    "1130": "11:30",
    "1330": "13:30",
    "1515": "15:15",
}

interface klausurData {
    room: string,
    subject: string,
    date: number,
    startTime: string,
    endTime: string,
}

export default function Tests(){
    const theme = useTheme();

    const [klausuren, setKlausuren] = useState([]);

    const {apiEndpoint} = useCustomTheme()
    const setSnackbar = useSnackbarContext();

    const fetchExams = () => {
        const query = new URLSearchParams({
            jwt: localStorage.getItem("jwt") ?? ""
        })
        fetch(apiEndpoint + "getExams?" + query, {
            cache: "no-cache",
        }).then((res) => res.json()).then((json) => {
            if(json.error) throw new Error(json.message);
            setKlausuren(json.message);
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
            {
                klausuren.length > 0 ? klausuren.map((klausur: klausurData) => (
                    <Box
                        sx={{
                            width: "max-content",
                            height: "max-content",
                            borderRadius: theme.designData.lesson.edges,
                            borderColor: theme.designData.secondary,
                            backgroundColor: alpha(theme.palette.background.default, theme.designData.alpha),
                            borderBottomStyle: "solid",
                            padding: "10px",
                            marginTop: "10px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                        }}
                    >
                    <h3>Fach: {klausur.subject}</h3>
                    <span>Raum: {klausur.room}</span>
                        <span>Start: {dayjs(klausur.date + "" + StartTimeLookup[klausur.startTime]).format("DD.MM.YYYY HH:mm")}</span>
                    </Box>
                    )) : <h1>Keine Klausuren.</h1>
            }
            <FABGroup
                children={[
                    {icon: <RefreshIcon />, color: "primary", callback: fetchExams}
                ]}
            />
        </Box>
        </>
    )
}