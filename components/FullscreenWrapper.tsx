import { Box } from '@mui/material';

const FullscreenWrapper = ({component}: { component: any }) => {
    return(<Box sx={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
    }}
    >{component}
    </Box>)
}

export default FullscreenWrapper