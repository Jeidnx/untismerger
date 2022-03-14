import {
    Alert,
    AlertColor,
    BottomNavigation,
    BottomNavigationAction,
    Box,
    Button,
    ButtonGroup,
    Drawer,
    Paper,
    Snackbar,
    useTheme
} from "@mui/material";
import Router from 'next/router';
import * as React from 'react'
import {createContext, useContext, useEffect} from 'react'

import SettingsIcon from '@mui/icons-material/Settings';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CreateIcon from '@mui/icons-material/Create';
import AssignmentIcon from '@mui/icons-material/Assignment';

import {stringToNumberEnum} from "../types";

const urlToValue: stringToNumberEnum = {
    "/timetable": 0,
    "/homework": 1,
    "/tests": 2,
    "/settings": 3,
}

const SnackbarContext = createContext((null as any));

export default function Layout({children}: { children: any }) {

    /// Value describing current page, use urlToValue enum
    const [value, setValue] = React.useState<Number>(urlToValue[Router.route])

    const routeChangeHandler = () => {
        setValue(urlToValue[Router.route]);
    }

    useEffect(() => {
        Router.events.on("routeChangeComplete", routeChangeHandler);
        return () => {
            Router.events.off("routeChangeComplete", routeChangeHandler);
        };
    }, [Router.events]);


    const drawerWidth = 240;
    const bottomNavigationHeight = 50;

    const theme = useTheme();

    const [snackbarOptions, setSnackbarOptions] = React.useState<{ open: boolean, type: AlertColor, text: string }>({
        open: false,
        type: "error",
        text: ""
    });

    const DrawerButton = ({text, path, Icon,}: { text: string, path: string, Icon: any }) => {
        return <Button
            onClick={() => {
                Router.push(path);
            }}
            variant={value === urlToValue[path] ? "contained" : "outlined"}
            startIcon={Icon}
        >
            <Box sx={{mx: "auto"}}/>{text}
        </Button>
    }
    return (
        <>
            <Paper sx={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                height: `${bottomNavigationHeight}px`,
                display: {mobile: 'initial', desktop: 'none'},
            }} elevation={3}>
                <BottomNavigation
                    showLabels
                    value={value}
                >
                    <BottomNavigationAction onClick={() => {
                        Router.push("/timetable")
                    }} label="Stundenplan" icon={<AccessTimeIcon/>}/>
                    <BottomNavigationAction onClick={() => {
                        Router.push("/homework")
                    }} label="Hausaufgaben" icon={<AssignmentIcon/>}/>
                    <BottomNavigationAction onClick={() => {
                        Router.push("/tests")
                    }} label="Klausuren" icon={<CreateIcon/>}/>
                    <BottomNavigationAction onClick={() => {
                        Router.push("/settings");
                    }} label="Einstellungen" icon={<SettingsIcon/>}/>
                </BottomNavigation>
            </Paper>
            <Drawer
                variant="permanent"
                anchor={"right"}
                open
                sx={{
                    display: {mobile: 'none', desktop: "block"},
                    '& .MuiDrawer-paper': {boxSizing: 'border-box', width: drawerWidth},
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        flexDirection: "column",
                        height: "100%",
                    }}
                >
                    <Box
                        sx={{
                            top: "0",
                            position: "absolute",
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            flexDirection: "column",
                        }}
                    >
                        { /* Next/Image is not supported for static export */}
                        {/* eslint-disable  @next/next/no-img-element */}
                        <img alt={"Untismerger Logo"} src={"/icon.png"} width={drawerWidth / 2}
                             height={drawerWidth / 2}/>
                        <h2
                            style={{
                                fontFamily: "mono",
                            }}
                        >Untismerger</h2>
                    </Box>

                    <ButtonGroup
                        orientation="vertical"
                        size={"large"}
                        disableElevation

                    >
                        <DrawerButton
                            text={"Stundenplan"}
                            path={"/timetable"}
                            Icon={<AccessTimeIcon/>}
                        />

                        <DrawerButton
                            text={"Hausaufgaben"}
                            path={"/homework"}
                            Icon={<AssignmentIcon/>}
                        />

                        <DrawerButton
                            text={"Klausuren"}
                            path={"/tests"}
                            Icon={<CreateIcon/>}
                        />

                        <DrawerButton
                            text={"Einstellungen"}
                            path={"/settings"}
                            Icon={<SettingsIcon/>}
                        />
                    </ButtonGroup>
                    <Box
                        sx={{
                            bottom: "20px",
                            position: "absolute",

                        }}
                    >
                        <Button variant={"contained"}
                                disableElevation
                                onClick={() => {
                                    Router.push("/imprint");
                                    setValue(-1)
                                }}>
                            Impressum
                        </Button>
                    </Box>
                </Box>
            </Drawer>
            <Snackbar
                open={snackbarOptions.open}
                autoHideDuration={6000}
                anchorOrigin={{vertical: "bottom", horizontal: "right"}}
                onClose={() => {
                    setSnackbarOptions({...snackbarOptions, open: false})
                }}>
                <Alert
                    onClose={() => {
                        setSnackbarOptions({...snackbarOptions, open: false})
                    }}
                    severity={snackbarOptions.type}
                    sx={{
                        width: {mobile: "100%", desktop: "max-content"},
                        marginRight: {desktop: `${drawerWidth}px`},
                        marginBottom: {mobile: `${bottomNavigationHeight}px`},
                    }}>
                    {snackbarOptions.text}
                </Alert>
            </Snackbar>
            <SnackbarContext.Provider value={setSnackbarOptions}>
                <Box
                    component={"main"}
                    sx={{
                        width: {desktop: `calc(100vw - ${drawerWidth}px)`, mobile: "100vw"},
                        height: {desktop: '100vh', mobile: `calc(100vh - ${bottomNavigationHeight}px)`},
                        backgroundColor: theme.palette.background.default,
                        color: theme.palette.text.primary,
                        backgroundImage: "url('" + theme.designData.backgroundUrl + "')",
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "center",
                        backgroundSize: "cover",
                        fontFamily: theme.designData.font || "",
                        fontSize: theme.designData.fontSize + "px"
                    }}
                >
                    {children}</Box>
            </SnackbarContext.Provider>
        </>);
}
// Hook
export const useSnackbarContext = () => useContext(SnackbarContext)