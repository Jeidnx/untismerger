import '../styles/globals.css'
import type {AppProps} from 'next/app'
import Layout from '../components/layout'
import {CustomThemeProvider} from '../components/CustomTheme';
import {useEffect} from 'react';
import {designDataType} from "../types";
import {QueryClient, QueryClientProvider} from "react-query";

function MyApp({Component, pageProps}: AppProps) {

    if (typeof window === 'undefined') {
        console.log("not rendering, no window");
        return null;
    }

    useEffect(() => {
        if (process.env.NODE_ENV === "development" || window.location.hostname.includes("dev.untismerger.tk")) {
            return;
        }
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', function () {
                navigator.serviceWorker.register('/sw.js');
            });
        }
        
        //Code from https://github.com/hadialqattan/no-darkreader        
        const config = { attributes: false, childList: true, subtree: false };
        
        const callback = function(){
            for (const style of document.head.getElementsByClassName("darkreader")) {
                style.remove();
              }
              console.log("callback")
        }
        const observer = new MutationObserver(callback);
          observer.observe(document.head, config);
        callback();
    }, [])

    const queryClient = new QueryClient()


    return (
        <CustomThemeProvider>
            <QueryClientProvider client={queryClient}>
            <Layout>
                <Component {...pageProps}/>
            </Layout>
            </QueryClientProvider>
        </CustomThemeProvider>
    )
}

export default MyApp

declare module '@mui/material/styles' {
    interface BreakpointOverrides {
        xs: false;
        sm: false;
        md: false;
        lg: false;
        xl: false;
        mobile: true;
        desktop: true;
    }

    interface Theme {
        designData: designDataType,
    }

    // allow configuration using `createTheme`
    interface ThemeOptions {
        designData: designDataType,
    }
}
