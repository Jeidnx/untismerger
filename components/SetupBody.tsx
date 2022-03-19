import {
    Autocomplete,
    Box,
    Button,
    CircularProgress,
    FormControl,
    FormControlLabel,
    FormLabel,
    InputLabel,
    MenuItem,
    Radio,
    RadioGroup,
    Select,
    Stack,
    TextField
} from '@mui/material';

import {FormEvent, useState} from 'react';
import {useCustomTheme} from "./CustomTheme";
import {setupData} from "../types";
import {useSnackbarContext} from "./layout";


const formStyle = {
    height: "30vh",
    display: "flex",
    justifyContent: "space-around",
}

const SetupBody = ({
                       step,
                       nextStep,
                       saveData,
                       data
                   }: { step: number, nextStep: Function, saveData: Function, data: setupData }) => {

    let body = <h1>Das sollte nicht Passieren.</h1>

    const handleLoginMethodChange = (event: { target: { value: string; }; }) => {
        const loginMethod = event.target.value;
        saveData({loginMethod: loginMethod, disableButton: false});
    }

    const handleTextinputChange = (event: { target: { id: any; value: any; }; }) => {
        saveData({[event.target.id]: event.target.value})
    }

    const [isLoading, setIsLoading] = useState(false);
    const [buttonColor, setButtonColor] = useState<"primary" | "success" | "error">("primary");
    const [autoValue, setAutoValue] = useState<{label: string, value: string}[]>([]);

    const {apiEndpoint} = useCustomTheme()
    const setSnackbar = useSnackbarContext();

    const checkLoginCredentials = (e: FormEvent) => {
        e.preventDefault()
        setIsLoading(true);
        saveData({disableButton: true})
        fetch((apiEndpoint + "checkCredentials"), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: data?.loginMethod,
                username: data?.username,
                [data?.loginMethod as string]: (data as any)[data.loginMethod as string],
            }),
        })
            .then(response => response.json())
            .then(data => {
                if (data.jwt) {
                    setTimeout(() => {
                        localStorage.setItem("jwt", data.jwt);
                        nextStep(3);
                        saveData({disableButton: false})
                    }, 500)
                    return;
                }

                setTimeout(() => {
                    setIsLoading(false);
                    if (data.message !== "OK") {
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

            }).catch((e) => {
            console.log(e);
            setButtonColor("error");
            setIsLoading(false);
            setSnackbar({
                text: e.message,
                type: "error",
                open: true
            })
        })
    }

    switch (step) {
        case 0:
            body = (
                <FormControl sx={formStyle}>
                    <FormLabel id={"selectLoginMethod"}>Anmeldeverfahren wählen: </FormLabel>
                    <RadioGroup
                        aria-labelledby={"selectLoginMethod"}
                        name={"loginMethodGroup"}
                        onChange={handleLoginMethodChange}
                        value={data?.loginMethod ?? ""}
                    >
                        <FormControlLabel value={"password"} control={<Radio/>} label={"Nutzername und Passwort"}/>
                        <FormControlLabel value={"secret"} control={<Radio/>} label={"Nutzername und Geheimnis"}/>
                    </RadioGroup>
                </FormControl>

            );
            break;
        case 1: {
            body = (<form onSubmit={checkLoginCredentials}>
                <FormControl sx={formStyle}>
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

                </FormControl>
            </form>)
            break;
        }

        case 2:
            body = (<>
                <h1>Fächer wählen</h1>
                <form onSubmit={(e) => {
                    e.preventDefault()
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
                        localStorage.setItem("jwt", json.jwt);
                        nextStep(3);
                        saveData({disableButton: false})

                    }).catch((e) => {
                        setSnackbar({
                            text: e.message,
                            type: "error",
                            open: true
                        })
                    });

                }}>
                    <Stack spacing={3} sx={{width: 500}}>
                        //TODO: Replace with enums.ts Enums
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
                                <MenuItem value={"2267"}>Deutsch (smt)</MenuItem>
                                <MenuItem value={"2272"}>Englisch (jae)</MenuItem>
                                <MenuItem value={"2277"}>Englisch (sob)</MenuItem>
                                <MenuItem value={"2282"}>Mathe (spi)</MenuItem>
                                <MenuItem value={"2287"}>Physik (jus)</MenuItem>
                                <MenuItem value={"2292"}>Deutsch (end)</MenuItem>
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
                                <MenuItem value={"2232"}>BG12-1</MenuItem>
                                <MenuItem value={"2237"}>BG12-2</MenuItem>
                                <MenuItem value={"2242"}>BG12-3</MenuItem>
                                <MenuItem value={"2247"}>Elektrotechnik</MenuItem>
                                <MenuItem value={"2252"}>Praktische Informatik</MenuItem>
                                <MenuItem value={"2257"}>BG12-6</MenuItem>
                                <MenuItem value={"2262"}>BG12-7</MenuItem>
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
                                <MenuItem value={"ph1"}>Physik</MenuItem>
                                <MenuItem value={"ch1"}>Chemie</MenuItem>
                                <MenuItem value={"bio1"}>Bio 1</MenuItem>
                                <MenuItem value={"bio2"}>Bio 2</MenuItem>
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
                                <MenuItem value={"ek1"}>Ethik 1</MenuItem>
                                <MenuItem value={"ek2"}>Ethik 2</MenuItem>
                                <MenuItem value={"ek3"}>Ethik 3</MenuItem>
                                <MenuItem value={"ek4"}>Ethik 4</MenuItem>
                                <MenuItem value={"rv1"}>rv 1</MenuItem>
                                <MenuItem value={"rv2"}>rv 2</MenuItem>
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
                                <MenuItem value={"sp1"}>Sport 1</MenuItem>
                                <MenuItem value={"sp2"}>Sport 2</MenuItem>
                                <MenuItem value={"sp3"}>Sport 3</MenuItem>
                                <MenuItem value={"sp4"}>Sport 4</MenuItem>
                                <MenuItem value={"sp5"}>Sport 5</MenuItem>
                                <MenuItem value={"sp6"}>Sport 6</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl>
                        <Autocomplete
                            multiple
                            disablePortal
                            disableCloseOnSelect
                            value={autoValue}
                            onChange={(e, newV: {label:string, value: string}[]) => {
                                setAutoValue(newV);
                                saveData({sonstiges: newV.map((el) => el.value)})
                            }}
                            isOptionEqualToValue={(a: {label:string, value: string}, b:{label:string, value: string}) => {
                                return a.value === b.value
                            }}
                            renderInput={(params) => <TextField {...params} label="Sonstiges" />}
                            options={[
                                { label: 'Darstellendes Spiel', value: "ds" },
                                { label: 'Kunst', value: "ku" },
                                { label: 'Spanisch 1', value: "sn1" },
                                { label: 'Spanisch 2', value: "sn2" },
                            ]}

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
    return (<>
        <Box sx={{
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
    </>)

}
export default SetupBody