import {
    Autocomplete,
    Box,
    Button,
    CircularProgress,
    FormControl,
    FormLabel,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField
} from '@mui/material';

import {FormEvent, useState} from 'react';
import {useCustomTheme} from "./CustomTheme";
import {setupData} from "../types";
import {ethikKurse, fachrichtungen, leistungskurse, naturwissenschaften, sonstigesKurse, sportKurse} from "../enums";


const formStyle = {
    height: "max-content",
    display: "flex",
    justifyContent: "space-around",
}

const stackProps = {
    spacing: 3,
    sx: {width: "50vw"}
}

const SetupBody = ({
                       step,
                       nextStep,
                       saveData,
                       data
                   }: { step: number, nextStep: Function, saveData: Function, data: setupData }) => {

    let body = <h1>Das sollte nicht Passieren.</h1>

    const handleTextinputChange = (event: { target: { id: any; value: any; }; }) => {
        saveData({[event.target.id]: event.target.value})
    }

    const [isLoading, setIsLoading] = useState(false);
    const [buttonColor, setButtonColor] = useState<"primary" | "success" | "error">("primary");
    const [autoValue, setAutoValue] = useState<{ label: string, value: string }[]>([]);

    const {apiEndpoint, fetcher, jwt} = useCustomTheme()

    const checkLoginCredentials = (e: FormEvent) => {
        e.preventDefault()
        setIsLoading(true);
        saveData({disableButton: true})
        fetcher({
            endpoint: "checkCredentials",
            method: "POST",
            query: {
                type: data?.loginMethod,
                username: data?.username,
                [data?.loginMethod as string]: (data as any)[data.loginMethod as string],
            },
            useCache: false,
        }).then((json) => {
            if (json.jwt) {
                setTimeout(() => {
                    jwt.set(json.jwt);
                    nextStep(3);
                    saveData({disableButton: false})
                })
                return;
            }
            setTimeout(() => {
                setIsLoading(false);
                if (json.message !== "OK") {
                    setButtonColor("error");
                    saveData({disableButton: true});
                    setTimeout(() => {
                        setButtonColor("primary");
                    }, 3000)
                } else {
                    setButtonColor("success");
                    saveData({disableButton: false})
                    setTimeout(() => {
                        setButtonColor("primary");
                    }, 3000)
                }
            }, 1000);
        }).catch((err) => {
            console.error(err);
            setButtonColor("error");
            setIsLoading(false);
        })
    }

    //TODO: pretty sure there is a memory leak somewhere here, but i can't find it.

    switch (step) {
        case 0:
            body = (<>
                    <FormControl sx={formStyle}>
                        <Stack {...stackProps}>
                        <Button
                            variant={"contained"}
                            onClick={() => {
                                saveData({loginMethod: "password", disableButton: false});
                                nextStep();
                            }}
                        >Mit Nutzername und Passwort anmelden</Button>
                        <Button
                            variant={"contained"}
                            onClick={() => {
                                saveData({loginMethod: "secret", disableButton: false});
                                nextStep();
                            }}
                        >Mit Nutzername und Geheimnis anmelden</Button>
                        </Stack>
                        </FormControl>
                </>
            );
            break;
        case 1: {
            body = (<form onSubmit={checkLoginCredentials}>
                <FormControl sx={formStyle}>
                    <Stack {...stackProps}>
                    <FormLabel
                        id={"secretLogin"}>Mit {data.loginMethod === 'password' ? "Passwort" : "Geheimnis"} Anmelden:</FormLabel>
                    <TextField
                        onChange={(ev) => {
                            handleTextinputChange(ev)
                        }} required={true} id={"username"} label={"Benutzername"}
                        variant={"outlined"} value={data?.username ?? ""}
                    />
                    <TextField
                        onChange={(ev) => {
                            handleTextinputChange(ev)
                        }} type={"password"} required={true} id={data.loginMethod}
                        label={data.loginMethod === 'password' ? "Passwort" : "Geheimnis"} variant="outlined"
                        value={(data as any)[data.loginMethod as string] ?? ""}
                    />
                    <Button
                        type={"submit"}
                        disabled={isLoading}
                        color={buttonColor}
                    >Überprüfen
                        <CircularProgress sx={{
                            display: isLoading ? "" : "none",
                            position: 'absolute',
                            zIndex: 1,
                        }} variant={"indeterminate"}/>
                    </Button>
                    </Stack>
                </FormControl>
            </form>)
            break;
        }

        case 2:
            body = (<>
                <h1>Fächer wählen</h1>
                <form onSubmit={(e) => {
                    e.preventDefault()
                    //TODO: use new fetcher
                    fetch(apiEndpoint + "register", {
                        method: "post",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(data)
                    }).then(async (response) => {
                        let json;

                        try {
                            json = await response.json();
                        } catch (e) {
                            throw new Error(response.statusText)
                        }

                        if (!response.ok) {
                            if (json?.error) {
                                throw new Error(json?.message)
                            }
                            throw new Error("Server konnte nicht erreicht werden.");
                        }
                        jwt.set(json.jwt);
                    }).catch((e) => {
                        console.error(e);
                    });

                }}>
                    <Stack {...stackProps}>
                        <FormControl
                            required={true}
                        >
                            <InputLabel id="lk">Leistungskurs</InputLabel>
                            <Select
                                labelId="lk"
                                id="lk"
                                value={data.lk || ""}
                                label="Leistungskurs"
                                onChange={(e) => {
                                    saveData({
                                        lk: e.target.value,
                                    })
                                }}
                            >
                                {
                                    Object.keys(leistungskurse).map((key, idx) => (
                                        <MenuItem key={idx} value={key}>{leistungskurse[key]}</MenuItem>
                                    ))
                                }
                            </Select>
                        </FormControl>

                        <FormControl
                            required={true}
                        >
                            <InputLabel id="fachrichtung">Fach Richtung</InputLabel>
                            <Select
                                labelId="fachrichtung"
                                id="fachrichtung"
                                value={data.fachrichtung || ""}
                                label="Fach Richtung"
                                onChange={(e) => {
                                    saveData({
                                        fachrichtung: e.target.value,
                                    })
                                }}
                            >
                                {
                                    Object.keys(fachrichtungen).map((key, idx) => (
                                        <MenuItem key={idx} value={key}>{fachrichtungen[key]}</MenuItem>
                                    ))
                                }
                            </Select>
                        </FormControl>

                        <FormControl
                            required={true}
                        >
                            <InputLabel id="nawi">Naturwissenschaft</InputLabel>
                            <Select
                                labelId="nawi"
                                id="nawi"
                                value={data.nawi || ""}
                                required={true}
                                label="Naturwissenschaft"
                                onChange={(e) => {
                                    saveData({
                                        nawi: e.target.value,
                                    })
                                }}
                            >
                                {
                                    Object.keys(naturwissenschaften).map((key, idx) => (
                                        <MenuItem key={idx} value={key}>{naturwissenschaften[key]}</MenuItem>
                                    ))
                                }
                            </Select>
                        </FormControl>

                        <FormControl
                            required={true}
                        >
                            <InputLabel id="ek">Ethik Kurs</InputLabel>
                            <Select
                                labelId="ek"
                                id="ek"
                                value={data.ek || ""}
                                required={true}
                                label="Ethik Kurs"
                                onChange={(e) => {
                                    saveData({
                                        ek: e.target.value,
                                    })
                                }}
                            >
                                {
                                    Object.keys(ethikKurse).map((key, idx) => (
                                        <MenuItem key={idx} value={key}>{ethikKurse[key]}</MenuItem>
                                    ))
                                }
                            </Select>
                        </FormControl>

                        <FormControl
                            required={true}
                        >
                            <InputLabel id="sp">Sport Kurs</InputLabel>
                            <Select
                                labelId="sp"
                                id="sp"
                                value={data.sp || ""}
                                required={true}
                                label="Sport Kurs"
                                onChange={(e) => {
                                    saveData({
                                        sp: e.target.value,
                                    })
                                }}
                            >
                                {
                                    Object.keys(sportKurse).map((key, idx) => (
                                        <MenuItem key={idx} value={key}>{sportKurse[key]}</MenuItem>
                                    ))
                                }
                            </Select>
                        </FormControl>
                        <FormControl>
                            <Autocomplete
                                multiple
                                disablePortal
                                disableCloseOnSelect
                                value={autoValue}
                                onChange={(e, newV: { label: string, value: string }[]) => {
                                    setAutoValue(newV);
                                    saveData({sonstiges: newV.map((el) => el.value)})
                                }}
                                isOptionEqualToValue={(a: { label: string, value: string }, b: { label: string, value: string }) => {
                                    return a.value === b.value
                                }}
                                renderInput={(params) => <TextField {...params} label="Sonstiges"/>}
                                options={
                                    Object.keys(sonstigesKurse).map((key) => ({
                                        label: sonstigesKurse[key], value: key,
                                    }))
                                }

                            />
                        </FormControl>
                        <Button
                            type={"submit"}
                            variant={"contained"}
                        >Abschicken</Button>
                    </Stack>
                </form>
            </>);
            break;
        case 3:
            body = (
                <h1>Fertig!</h1>
            );
            break;
    }
    return <Box sx={{
        height: "max-content",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        alignItems: "center",
        overflowY: "auto",
        overflowX: "show",
        padding: "20px",
    }}>
        {body}
    </Box>
}
export default SetupBody