import {
    Alert,
    AlertTitle,
    Box,
    Button,
    Dialog, DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle, useMediaQuery, useTheme
} from "@mui/material";
import LoadingSpinner from "../LoadingSpinner";

interface propType {
    children: any,
    title: string,
    isPosting: boolean,
    errorMessage: string,
    open: boolean,
    close: () => void,
    submit: () => void,
}

export default function AddDialog(props: propType) {
    const {children, title, isPosting, errorMessage, open, close, submit} = props;
    const theme = useTheme();
    return <Dialog
        open={open}
        onClose={() => {
            if(!isPosting) close();
        }}
        fullScreen={useMediaQuery(theme.breakpoints.down('desktop'))}
        >
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
            <DialogContentText>Bitte gib hier die benötigten Daten ein. Zur nachverfolgung wird eine Referenz zu deinem Nutzernamen bei uns gespeichert.</DialogContentText>
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
            {isPosting ? <LoadingSpinner hidden={false}/> : children}
        </DialogContent>
        <DialogActions>
            <Button
                variant="contained"
                disabled={isPosting}
                fullWidth
                onClick={() => {
                    submit();
                }}
            >
                Senden
            </Button>
            <Button
                disabled={isPosting}
                onClick={() => close()}
            >Abbrechen</Button>
        </DialogActions>
    </Dialog>
}