import type {NextPage} from 'next';
import {alpha, Box, Button, Step, StepLabel, Stepper, useTheme} from '@mui/material';
import {useState} from 'react';
import SetupBody from '../components/SetupBody'
import Head from "next/head";
import Router from "next/router";
import {setupData} from "../types";

const steps = ['Anmeldeverfahren auswählen', 'Anmelden', 'Gewünschte Fächer auswählen', 'Fertig'];

const Setup: NextPage = () => {

    const [activeStep, setActiveStep] = useState(0);
    const [setupData, setSetupData] = useState<setupData>({disableButton: true, sonstiges: []});

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    }
    const handleNext = (step?: number) => {
        if(step){
            setActiveStep(step);
            return;
        }
        if (activeStep === steps.length - 1) {
            Router.push("/timetable");
            return;
        }
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
        setSetupData({...setupData, disableButton: true})
    }
    const saveData = (dataIn: Object) => {
        setSetupData({...setupData, ...dataIn});
    }

    const theme = useTheme()

    return (
        <Box
            sx={{
                height: "100%",
                width: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
            }}
        >
        <Box sx={{
            width: "70%",
            height: "50%",
            padding: "20px",
            backgroundColor: alpha(theme.palette.background.default, theme.designData.alpha),
            position: "relative"
        }}>
            <Head>
                <title>Untismerger - Setup</title>
            </Head>
            <Stepper
                orientation={"horizontal"}
                activeStep={activeStep}>
                {steps.map((label) => {
                    const stepProps = {};
                    const labelProps = {};
                    return (
                        <Step key={label} {...stepProps}>
                            <StepLabel {...labelProps}>{label}</StepLabel>
                        </Step>
                    );
                })}
            </Stepper>
            <SetupBody step={activeStep} nextStep={handleNext} saveData={saveData}
                       data={setupData}/>
            <Box sx={{display: 'flex', flexDirection: 'row', pt: 2, position: "absolute", bottom: "2px"}}>
                <Button
                    disabled={activeStep === 0 || activeStep === 3}
                    onClick={() => handleBack()}
                >Zurück</Button>
                <Box sx={{flex: '1 1 auto'}}/>
                <Button onClick={() => handleNext()}
                        disabled={setupData.disableButton}>
                    {activeStep === 3 ? 'Weiter zum Stundenplan' : 'Weiter'}
                </Button>
            </Box>
        </Box>
        </Box>
    )
}
export default Setup