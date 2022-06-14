import {Alert, AlertTitle, alpha, Box, CircularProgress, useTheme} from '@mui/material';

export default function LoadingSpinner({
                                           text = 'Lade Daten...',
                                           error = undefined
                                       }: { text?: string, error?: string | undefined }) {

    const theme = useTheme();

    const isError = typeof error === 'string';

    return <Box
        sx={{
            backgroundColor: isError ? '' : alpha(theme.palette.background.default, theme.designData.alpha),
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '2%',
            margin: 'auto',
        }}
    >
        {
            isError ? <Alert severity={'error'}>
                    <AlertTitle>Ein Fehler ist aufgetreten:</AlertTitle>
                    {error}
                </Alert>
                :
                <>
                    <CircularProgress/>
                    <h1>{text}</h1>
                </>
        }

    </Box>;
}