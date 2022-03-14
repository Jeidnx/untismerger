import {Box, useTheme} from "@mui/material";
import Head from "next/head";

export default function Homework(){
    const theme = useTheme();

    return (
        <>
            <Head>
                <title>Hausaufgaben</title>
            </Head>
        <Box
            sx={{
                height: "100%",
                width: "100%",
                display: "flex",
                justifyContent: "space-around",
                alignItems: "center",
            }}
        >
        <h1
            style={{
                backgroundColor: theme.palette.background.default,
                padding: "10px",
            }}
        >Work in Progress</h1>
        </Box>
        </>
    )
}