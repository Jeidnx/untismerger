import {alpha, Box, CircularProgress, useTheme} from "@mui/material";

export default function LoadingSpinner({hidden}: {hidden: boolean}){

    const theme = useTheme();

    return (<Box
        sx={{
            backgroundColor: alpha(theme.palette.background.default, theme.designData.alpha),
            display: hidden ? "none" : "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: "2%",
            margin: "auto",
        }}
    >
        <CircularProgress/>
        <h1>Lade Daten...</h1>
    </Box>)
}