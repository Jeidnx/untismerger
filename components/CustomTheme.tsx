import {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {customThemeType, designDataType, fetcherParams} from "../types";
import {createTheme, ThemeProvider} from "@mui/material";

import dayjs from "dayjs";

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
            mode: "light",
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

    const apiEndpoint = useDevApi ? "http://localhost:8080/" : "https://api.untismerger.tk/";

    useEffect(() => {
        clearTimeout(debounceSave);
        debounceSave = setTimeout(() => {
            console.log("saving data");
            const data = {...designData, iat: new Date().getTime()}
            localStorage.setItem("designData", JSON.stringify(data));
        }, 2000)
    }, [designData])

    const setLessonColorEnum = (newEnum: { [key: string]: string }) => {
        setDesignData({
            ...designData,
            lesson: {
                colorEnum: newEnum,
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

    const ls = localStorage.getItem("jwt");
    if (!ls) {
        return <h1>Anmelden</h1>
    }
    const parsedJwt = JSON.parse(
        Buffer.from(ls.split('.')[1], "base64").toString("utf-8")
    )

    const fetcher = useCallback(({endpoint,query,useCache, method}: fetcherParams): Promise<any> => {
        return new Promise((resolve, reject) => {

            const mQuery = {
                jwt: ls,
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
    }, [apiEndpoint])

    const jwt = {
        set: (newJwt: string) => {
            localStorage.setItem("jwt", newJwt);
        },
        validate: (): Promise<any> => (fetcher({
            endpoint: "validateJwt",
            query: new URLSearchParams(),
            method: "GET",
            useCache: false,
        })),
        raw: ls,
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
    }

    return (
        <ThemeProvider theme={getTheme()}>
            <CustomThemeContext.Provider value={{apiEndpoint, dayjs,fetcher, jwt, setDesignData, setLessonColorEnum}}>
                {children}
            </CustomThemeContext.Provider>
        </ThemeProvider>
    )
}

// Hook
export const useCustomTheme = () => useContext(CustomThemeContext)