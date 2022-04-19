import type {NextPage} from 'next';
import {alpha, Box, Button, Step, StepContent, StepLabel, Stepper, useMediaQuery, useTheme} from '@mui/material';
import {useState} from 'react';
import SetupBody from './SetupBody';
import Head from 'next/head';
import Router from 'next/router';
import {setupData} from '../types';

const steps = ['Anmelden', 'Gewünschte Fächer auswählen', 'Fertig'];


const Setup: NextPage = () => {

	const [activeStep, setActiveStep] = useState(0);
	const [setupData, setSetupData] = useState<setupData>({disableButton: true, sonstiges: []});

	const handleBack = () => {
		setActiveStep((prevActiveStep) => prevActiveStep - 1);
	};
	const handleNext = (step?: number) => {
		if (step) {
			setActiveStep(step);
			return;
		}
		if (activeStep === steps.length - 1) {
			Router.push('/timetable');
			return;
		}
		setActiveStep((prevActiveStep) => prevActiveStep + 1);
		setSetupData(prevState => (
			{...prevState, disableButton: true}
		));
	};
	const saveData = (dataIn: Object) => {
		setSetupData({...setupData, ...dataIn});
	};

	const theme = useTheme();
	const isDesktop = useMediaQuery(theme.breakpoints.up('desktop'));

	return (
		<Box
			sx={{
				height: 'min-content',
				width: '100%',
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'start',
			}}
		>
			<Box sx={{
				width: '80vw',
				height: 'min-content',
				padding: '20px',
				backgroundColor: alpha(theme.palette.background.default, theme.designData.alpha),
			}}>
				<Head>
					<title>Untismerger - Setup</title>
				</Head>
				<Stepper
					orientation={isDesktop ? 'horizontal' : 'vertical'}

					activeStep={activeStep}>
					{steps.map((label, idx) => {
						return isDesktop ? (<Step key={label}>
							<StepLabel>{label}</StepLabel>
						</Step>) : (
							<Step key={label}>
								<StepLabel>{label}</StepLabel>

								<StepContent>
									<SetupBody step={idx} nextStep={handleNext} saveData={saveData}
											   data={setupData}/>
									<Box sx={{mb: 2}}>
										<div>
											<Button
												variant="contained"
												disabled={setupData.disableButton}
												onClick={() => {
													handleNext();
												}}
												sx={{mt: 1, mr: 1}}
											>
												{idx === steps.length - 1 ? 'Weiter zum Stundenplan' : 'Weiter'}
											</Button>
											<Button
												disabled={idx === 0 || idx === 3}
												onClick={handleBack}
												sx={{mt: 1, mr: 1}}
											>
												Zurück
											</Button>
										</div>
									</Box>
								</StepContent>

							</Step>
						);
					})}
				</Stepper>
				{isDesktop && (<><SetupBody step={activeStep} nextStep={handleNext} saveData={saveData}
											data={setupData}/>
					<Box sx={{display: 'flex', flexDirection: 'row', pt: 2,}}>
						<Button
							disabled={activeStep === 0 || activeStep === 3}
							onClick={() => handleBack()}
						>Zurück</Button>
						<Box sx={{flex: '1 1 auto'}}/>
						<Button onClick={() => handleNext()}
								disabled={setupData.disableButton}>
							{activeStep === 3 ? 'Weiter zum Stundenplan' : 'Weiter'}
						</Button>
					</Box></>)}

			</Box>
		</Box>
	);
};
export default Setup;