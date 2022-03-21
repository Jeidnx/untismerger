import {createContext, useContext, useEffect, useState} from 'react';
import {customThemeType, designDataType} from "../types";
import {createTheme, ThemeProvider} from "@mui/material";

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
            mode: window.matchMedia('(prefers-color-scheme: dark)').matches===true?"dark":"light",
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

    return (
        <ThemeProvider theme={getTheme()}>
            <CustomThemeContext.Provider value={{apiEndpoint, setDesignData, setLessonColorEnum}}>
                {children}
            </CustomThemeContext.Provider>
        </ThemeProvider>
    )
}

// Hook
export const useCustomTheme = () => useContext(CustomThemeContext)