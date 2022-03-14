import Head from "next/head";
import {Box, Button} from "@mui/material";
import Router from "next/router";
import {useEffect} from 'react';

export default function Index(){

    useEffect(()=>{
        import("darkreader").then((darkReader)=>{
            darkReader.enable({contrast:150})
            console.log(darkReader.isEnabled())
        })
    
    }
    );
    return (<>
        <Head>
            <title>Untismerger</title>
        </Head>
        <Box
            sx={{
                height: "100%",
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-around",

            }}
        >
            <h1>Untismerger</h1>
            <Button
                size={"large"}
                variant={"outlined"} onClick={() => {
                Router.push("/setup");
            }} >Login</Button>
        </Box>
    </>)
}