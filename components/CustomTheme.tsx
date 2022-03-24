import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {customThemeType, designDataType, fetcherParams, JWT} from "../types";
import {Box, createTheme, ThemeProvider} from "@mui/material";

import dayjs from "dayjs";
import Setup from "./Setup";

dayjs.extend(require('dayjs/plugin/utc'))
dayjs.extend(require('dayjs/plugin/timezone'))
dayjs.locale(require('dayjs/locale/de'))
// @ts-ignore
dayjs.tz.setDefault("Europe/Berlin")

const CustomThemeContext = createContext(({} as customThemeType));

const useDevApi = false;
let debounceSave: NodeJS.Timeout;

// Provider
export function CustomThemeProvider({children}: any) {

    const getDesignData = (): designDataType => {
        const ls = localStorage.getItem('designData');
        if (ls) return JSON.parse(ls);

        //Default design
        return {
            iat: new Date().getTime(),
            version: 0,
            mode: window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light",
            primary: "#3266cc",
            secondary: "#e91e63",
            backgroundUrl: "",
            lesson: {
                colorEnum: {},
                edges: 0
            },
            font: "",
            alpha: 1,
            fontSize: 16
        };
    }

    const [designData, setDesignData] = useState<designDataType>(getDesignData());
    const [rawJwt, setRawJwt]  = useState(localStorage.getItem("jwt"));

    const apiEndpoint = useDevApi ? "http://localhost:8080/" : "https://api.untismerger.tk/";

    useEffect(() => {
        clearTimeout(debounceSave);
        debounceSave = setTimeout(() => {
            console.log("saving data");
            const data = {...designData, iat: new Date().getTime()}
            localStorage.setItem("designData", JSON.stringify(data));
        }, 2000)
    }, [designData])

    const setLessonColorEnum = (key: string, value: string) => {
        setDesignData({
            ...designData,
            lesson: {
                colorEnum: {...designData.lesson.colorEnum, [key]: value},
                edges: designData.lesson.edges,
            }
        })
    }

    const getTheme = () => {
        return (createTheme({
                palette: {
                    mode: designData.mode,
                    primary: {
                        main: designData.primary,
                    },
                    secondary: {
                        main: designData.secondary,
                    },
                },
                breakpoints: {
                    values: {
                        mobile: 0,
                        desktop: 1200,
                    },
                },
                designData: designData,
            })
        )
    }

    const parsedJwt: any = rawJwt ? JSON.parse(
        Buffer.from(rawJwt.split('.')[1], "base64").toString("utf-8")
    ) : {};

    const fetcher = useCallback(({endpoint,query,useCache, method}: fetcherParams): Promise<any> => {
        return new Promise((resolve, reject) => {

            const mQuery = {
                jwt: rawJwt,
                ...query,
            }

            fetch( apiEndpoint + endpoint + ((method === "GET") ? `?${new URLSearchParams(mQuery)}` : ""), {
                method: method,
                cache: useCache ? "default" : "no-cache",
                body: method === "POST" ? JSON.stringify(mQuery) : undefined,
                headers: method === "POST" ? {
                    "content-type": "application/json",
                } : undefined
            }).then(async (res) => {
                if(!res.ok){
                    let json;
                    try{
                        json = await res.json()
                    }catch(e){
                        throw new Error(res.statusText);
                    }
                    throw new Error(json.message || res.statusText);
                }
                return res.json()
            }).then((json) => {
                if(json.error) throw new Error(json.message);
                resolve(json);
            }).catch((err) => {
                reject("Fehler: " + (err.message || err));
            })
        })
    }, [apiEndpoint, rawJwt])

    const jwt: JWT = useMemo(() => ({
        set: (newJwt: string) => {
            localStorage.setItem("jwt", newJwt);
            setRawJwt(newJwt);
        },
        validate: (): Promise<any> => (fetcher({
            endpoint: "validateJwt",
            query: {},
            method: "GET",
            useCache: false,
        })),
        raw: rawJwt || "",
        get: {
            version: parsedJwt.version,
            iat: parsedJwt.iat,
            username: parsedJwt.username,
            type: parsedJwt.type,
            [parsedJwt.type]: parsedJwt[parsedJwt.type],
            lk: parsedJwt.lk,
            fachrichtung: parsedJwt.fachrichtung,
            sonstiges: parsedJwt.sonstiges,
        }
    }), [rawJwt])

    const theme = getTheme();

    if (!rawJwt) {
        return (
            <ThemeProvider theme={theme}>
                <CustomThemeContext.Provider value={{apiEndpoint, dayjs,fetcher, jwt, setDesignData, setLessonColorEnum}}>
                    <Box
                        component={"main"}
                        sx={{
                            width: "100vw",
                            height: "100vh",
                            backgroundColor: theme.palette.background.default,
                            color: theme.palette.text.primary,
                            backgroundImage: "url('" + theme.designData.backgroundUrl + "')",
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "center",
                            backgroundSize: "cover",
                            overflowY: "auto",
                            fontFamily: theme.designData.font || "",
                            fontSize: theme.designData.fontSize + "px"
                        }}
                    >
                        <Box
                            sx={{
                                width: "100%",
                                height: "20vh",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexDirection: "row",
                            }}
                        >
                            { /* Next/Image is not supported for static export */}
                            {/* eslint-disable  @next/next/no-img-element */}
                            <img alt={"Untismerger Logo"} src={"/icon.png"} height={"100%"}/>
                            <h2
                                style={{
                                    fontFamily: "mono",
                                }}
                            >Untismerger</h2>
                        </Box>
                    <Setup />
                    </Box>
                </CustomThemeContext.Provider>
            </ThemeProvider>
        )
    }

    return (
        <ThemeProvider theme={theme}>
            <CustomThemeContext.Provider value={{apiEndpoint, dayjs,fetcher, jwt, setDesignData, setLessonColorEnum}}>
                {children}
            </CustomThemeContext.Provider>
        </ThemeProvider>
    )
}

// Hook
export const useCustomTheme = () => useContext(CustomThemeContext)