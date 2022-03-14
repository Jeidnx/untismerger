import {
    alpha,
    Box,
    Button,
    ButtonGroup,
    createTheme,
    FormControlLabel,
    IconButton,
    Switch,
    useTheme
} from "@mui/material";
import Head from "next/head";
import {useEffect, useState} from 'react';
import Router from "next/router";
import DeleteIcon from '@mui/icons-material/Delete';
import {useCustomTheme} from "../components/CustomTheme";
import {designDataType} from "../types";
import {useSnackbarContext} from "../components/layout";

import packageJson from '../package.json';

let debounceSet: NodeJS.Timeout

const Settings = () => {

    const initialTheme = useTheme();
    const renderTheme = (designData: designDataType) => {
        return createTheme({
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
    }

    const [appVersion, setAppVersion] = useState<string>("wird geladen");
    const [discordAuthCode, setDiscordAuthCode] = useState<string>("noch nicht angefordert.");
    const [theme, setTheme] = useState(renderTheme(initialTheme.designData));

    const {setDesignData, apiEndpoint} = useCustomTheme();
    const setSnackbar = useSnackbarContext();

    const fetcher = (url: string, body : any = {}): Promise<any> => {
        return fetch(apiEndpoint + url, {
            method: "post",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                jwt: localStorage.getItem("jwt"),
                ...body
            })
        }).then(async (response) => {
                const json = await response.json()
                if (!response.ok) {
                    if (json.error) {
                        if(json.message === "Missing Arguments"){
                            throw new Error("Dafür musst du angemeldet sein.")
                        }
                        throw new Error(json.message);
                    }
                    throw new Error("Server konnte nicht erreicht werden.");
                }
                return json
            }
        )
    }

    useEffect(() => {
        clearTimeout(debounceSet);
        debounceSet = setTimeout(() => {
            setDesignData(theme.designData);
        }, 200)
    }, [theme])

    useEffect(() => {
        // Compatability
        if (localStorage.getItem("colorEnum")) {
            console.log("converting colorEnum to designData")
            setTheme(renderTheme({
                ...theme.designData,
                lesson: {
                    ...theme.designData.lesson,
                    colorEnum: JSON.parse(localStorage.getItem("colorEnum") || "{}"),
                }
            }))
            localStorage.removeItem("colorEnum")
        }
    }, [])

    const handleColorInputDelete = (name: string) => {
        const {[name]: deletedKey, ...newCe} = theme.designData.lesson.colorEnum;
        setTheme(renderTheme({
            ...theme.designData,
            lesson: {
                ...theme.designData.lesson,
                colorEnum: newCe,
            }
        }))
    }

    const getDiscordAuthCode = () => {
        fetch(apiEndpoint + "getDiscordToken", {
            method: 'POST',
            body: new URLSearchParams({
                'jwt': localStorage.getItem("jwt") || "",
            })
        }).then(response => response.json())
            .then(data => {
                if (data.error) {
                    setSnackbar({
                        text: data.message,
                        type: "error",
                        open: true,
                    });
                    return;
                }
                setDiscordAuthCode(data.secret)
            }).catch(() => {
            setSnackbar({
                text: "Server kann nicht erreicht werden.",
                type: "error",
                open: true,
            });
        })
    }

    const getAccountName = (): (string | undefined) => {
        const jwt = localStorage.getItem("jwt");
        if (!jwt) {
            return undefined;
        }
        return JSON.parse(
            Buffer.from(jwt.split('.')[1], "base64").toString("utf-8")
        ).username

    }

    const accountName = getAccountName();

    let swChannel = new MessageChannel();

    useEffect(() => {

        if (process.env.NODE_ENV === "development" || window.location.hostname.includes("dev.untismerger.tk")) {
            setAppVersion(packageJson.version + "-dev");
            return;
        }

        swChannel.port1.onmessage = (event) => {
            if (event.data.type === 'VERSION') {
                setAppVersion(event.data.body);
            }
        };


        navigator?.serviceWorker?.ready?.then((swRegistration) => {
            swRegistration?.active?.postMessage(
                {
                    type: 'INIT_PORT'
                },
                [swChannel.port2]
            );
            swChannel?.port1?.postMessage({
                type: 'GET',
                body: 'VERSION'
            });
        });

    }, [])
    return (
        <>
            <Head>
                <title>Einstellungen</title>
            </Head>
            <Box
                sx={{
                    height: "100%",
                    width: "100%",
                    display: "flex",
                    justifyContent: {mobile: "space-between", desktop: "space-around"},
                    alignItems: "center",
                    flexDirection: {mobile: "column", desktop: "row"},
                    overflowY: "scroll",
                    overscrollBehavior: "none",
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "space-between  ",
                        backgroundColor: alpha(theme.palette.background.default, theme.designData.alpha),
                        padding: "20px",
                    }}
                >
                    <h2>App</h2>
                    <span>Version: {appVersion}</span>

                    <ButtonGroup
                        style={{
                            margin: "10px"
                        }}
                        color={"secondary"}
                        variant={"outlined"}
                    >
                        <Button

                            onClick={() => {
                                swChannel.port1.postMessage({
                                    type: 'POST',
                                    body: 'CLEARCACHE'
                                });
                            }}
                        >Cache Leeren</Button>
                        <Button
                            onClick={() => {
                                navigator?.serviceWorker?.getRegistration()?.then((registration) => {
                                    if (typeof registration == 'undefined') {
                                        navigator.serviceWorker.register('/sw.js');
                                        setTimeout(() => {
                                            window.location.reload();
                                        }, 2000);
                                        return;
                                    }
                                    registration.unregister().then(() => {
                                        window.location.reload();
                                    });
                                });
                            }}
                        >
                            Aktualisieren
                        </Button>
                    </ButtonGroup>

                    {accountName ? (
                            <>
                        <span
                            style={{
                                marginBottom: "15px",
                            }}
                        >Accountname: {accountName}</span>
                                <Button
                                    variant={"contained"}
                                    color={"secondary"}
                                    onClick={() => {
                                        localStorage.removeItem("jwt");
                                        Router.push("/setup");
                                    }}
                                >
                                    Abmelden
                                </Button>
                                <h3>Benachrichtigungen</h3>
                                <span
                                    style={{
                                        marginBottom: "20px",
                                    }}
                                >Code: {discordAuthCode}</span>
                                <ButtonGroup
                                    variant={"outlined"}
                                    color={"secondary"}
                                    orientation={"vertical"}
                                >
                                    <Button
                                        onClick={() => {
                                            window.open("https://discord.gg/P8adQc8N63", '_blank')?.focus();
                                        }}
                                    >
                                        Benachrichtigungen einrichten
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            getDiscordAuthCode()
                                        }}
                                    >
                                        Code Erhalten
                                    </Button>
                                </ButtonGroup>
                            </>
                        )

                        : <Button
                            color={"secondary"}
                            variant={"contained"}
                            onClick={() => {
                                Router.push("/setup")
                            }}
                        >Anmelden</Button>}


                </Box>
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        flexDirection: "column",
                        backgroundColor: alpha(theme.palette.background.default, theme.designData.alpha),
                        padding: "20px",
                    }}
                >
                    <Box
                        sx={{
                            display: {desktop: "inline-flex"},
                            width: "100%",
                        }}
                    >
                        <h2>Design:</h2>
                        <ButtonGroup
                            variant={"contained"}
                            size={"small"}
                            sx={{
                                marginLeft: {desktop: "auto"},
                            }}
                        >
                            <Button
                                onClick={() => {
                                    fetcher("getPreferences", ).then((json) => {
                                        console.log(json);
                                        theme.designData.mode=window.matchMedia('(prefers-color-scheme: dark)').matches===true?"dark":theme.designData.mode;
                                        setDesignData({
                                            ...theme.designData,
                                            ...JSON.parse(json.data)
                                        });
                                        setSnackbar({
                                            text: "Erfolgreich geladen",
                                            type: "success",
                                            open: true,
                                        })
                                    }).catch((e) => {
                                        setSnackbar({
                                            text: "Fehler: " + e.message,
                                            type: "error",
                                            open: true,
                                        });
                                    })
                                }}
                            >Vom server laden</Button>
                            <Button
                                onClick={() => {
                                    fetcher(
                                        "setPreferences", {
                                        prefs: JSON.stringify({
                                            ...theme.designData,
                                            iat: new Date().getTime()
                                        })
                                    })
                                        .then(() => {
                                            setSnackbar({
                                                text: "Erfolgreich hochgeladen",
                                                type: "success",
                                                open: true,
                                            })
                                        })
                                        .catch((e) => {
                                            setSnackbar({
                                                text: "Fehler: " + e.message,
                                                type: "error",
                                                open: true,
                                            });
                                        })
                                }}
                            >Änderungen hochladen</Button>
                        </ButtonGroup>
                    </Box>
                    <Box
                        sx={{
                            display: "flex",
                            width: "100%",
                            flexDirection: {mobile: "column", desktop: "row"},
                            alignItems: "center",
                            justifyContent: "space-around",
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",

                            }}
                        >
                            <h3>Theme</h3>
                            <FormControlLabel
                                labelPlacement={"start"}
                                control={<Switch
                                    color={"secondary"}
                                    checked={theme.designData.mode === "dark"}
                                    onChange={(event, checked) => {
                                        setTheme(renderTheme({
                                            ...theme.designData,
                                            mode: checked ? "dark" : "light",
                                        }))
                                    }}
                                />} label="Dark mode"/>
                        </Box>
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                flexWrap: "nowrap",
                            }}
                        >
                            <h3>Design</h3>
                            <label htmlFor={"primaryColor"}>Primärfarbe</label>
                            <input
                                type={"color"}
                                id={"primaryColor"}
                                defaultValue={theme.designData.primary}
                                onChange={(e) => {
                                    setTheme(renderTheme({
                                        ...theme.designData,
                                        primary: e.target.value,
                                    }))
                                }}
                            />
                            <label htmlFor={"secondaryColor"}>Sekundärfarbe</label>
                            <input
                                type={"color"}
                                id={"secondaryColor"}
                                defaultValue={theme.designData.secondary}
                                onChange={(e) => {
                                    setTheme(renderTheme({
                                        ...theme.designData,
                                        secondary: e.target.value,
                                    }))
                                }}
                            />
                            <label htmlFor={"fontInput"}>Schriftart</label>
                            <input
                                type={"text"}
                                id={"fontInput"}
                                defaultValue={theme.designData.font}
                                onChange={(e) => {
                                    setTheme(renderTheme({
                                        ...theme.designData,
                                        font: e.target.value,
                                    }))
                                }}
                            />
                            <label htmlFor={"edgeInput"}>Ecken Rundung</label>
                            <input
                                type={"number"}
                                id={"edgeInput"}
                                min={"0"}
                                step={"5"}
                                defaultValue={theme.designData.lesson.edges}
                                onChange={(e) => {
                                    setTheme(renderTheme({
                                        ...theme.designData,
                                        lesson: {
                                            ...theme.designData.lesson,
                                            edges: Number(e.target.value),
                                        }
                                    }))
                                }}
                            />
                            <label htmlFor={"bgInput"}>Hintergrundbild</label>
                            <input
                                type="text"
                                id={"bgInput"}
                                defaultValue={theme.designData.backgroundUrl}
                                onChange={(e) => {
                                    setTheme(renderTheme({
                                        ...theme.designData,
                                        backgroundUrl: e.target.value,
                                    }))
                                }}
                            />
                            <label htmlFor={"alphaInput"}>Transparenz</label>
                            <input
                                type="number"
                                step={"0.1"}
                                min={"0"}
                                max={"1"}
                                id={"alphaInput"}
                                defaultValue={theme.designData.alpha}
                                onChange={(e) => {
                                    setTheme(renderTheme({
                                        ...theme.designData,
                                        alpha: Number(e.target.value),
                                    }))
                                }}
                            />
                            <label htmlFor={"fontSizeInput"}>Schriftgröße</label>
                            <input
                                type="number"
                                step={"0.1"}
                                min={"0"}
                                max={"150"}
                                id={"fontSizeInput"}
                                defaultValue={theme.designData.fontSize}
                                onChange={(e) => {
                                    setTheme(renderTheme({
                                        ...theme.designData,
                                        fontSize: Number(e.target.value),
                                    }))
                                }}
                            />
                        </Box>

                        {
                            Object.keys(theme.designData.lesson.colorEnum).length > 0 ?
                                <Box>
                                    <h3>Stundenplan Farben:</h3>
                                    <table>
                                        <thead>
                                        <tr>
                                            <th>Fach</th>
                                            <th>Farbe</th>
                                            <th>Löschen</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {
                                            Object.entries(theme.designData.lesson.colorEnum).map((entry: [string, string], idx: number) => {
                                                const [name, value] = entry;
                                                return (<tr key={idx}>
                                                    <td>{name}</td>
                                                    <td><input
                                                        style={{
                                                            width: "40px",
                                                            height: "20px",
                                                        }}
                                                        onChange={(event) => {
                                                            const {id, value} = event.target;

                                                            setTheme(renderTheme({
                                                                ...theme.designData,
                                                                lesson: {
                                                                    ...theme.designData.lesson,
                                                                    colorEnum: {
                                                                        ...theme.designData.lesson.colorEnum,
                                                                        [id]: value,
                                                                    },
                                                                }
                                                            }))
                                                        }}
                                                        type="color"
                                                        id={name}
                                                        value={value}/></td>
                                                    <td><IconButton
                                                        onClick={() => {
                                                            handleColorInputDelete(name)
                                                        }}
                                                    ><DeleteIcon/></IconButton></td>
                                                </tr>)
                                            })
                                        }
                                        </tbody>
                                    </table>
                                </Box> : null}
                    </Box>
                </Box>


            </Box>
        </>
    )
}
export default Settings