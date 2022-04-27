//@ts-expect-error react-charts has no ts declaration
import {Chart} from 'react-charts';
import Head from 'next/head';
import {alpha, Box, Button, ButtonGroup, Checkbox, FormControlLabel, useTheme} from '@mui/material';
import React from 'react';
import {useCustomTheme} from '../components/CustomTheme';
import LoadingSpinner from '../components/LoadingSpinner';
import {Statistic} from "../../globalTypes";

interface statisticsDataType {
	[key: string]: {
		date: string, value: number | string
	}[]
}

export default function Statistics() {

	const {fetcher} = useCustomTheme();
	const theme = useTheme();

	const axes = React.useMemo(
		() => [
			{primary: true, type: 'utc', position: 'bottom'},
			{type: 'linear', position: 'left'}
		],
		[]
	);

	const [error, setError] = React.useState<undefined | string>(undefined);
	const [data, setData] = React.useState<statisticsDataType>((undefined as unknown as statisticsDataType));
	const [endPoints, setEndPoints] = React.useState<string[]>([]);
	const [indices, setIndices] = React.useState<string[]>([]);


	React.useEffect(() => {
		fetcher({
			method: 'GET',
			endpoint: 'getStats',
			query: {},
			useCache: false,
		}).then((json) => {
			const a = json as { endpoints: string[], stats: Statistic[] };
			setData(processData(a));
			//TODO: figure out why this doesn't work
			//setIndices(a.endpoints);
		}).catch((err) => {
			setError(err);
		});
	}, []);

	const processData = React.useCallback(({stats}) => {
		const dataObj: statisticsDataType = {};

		const tmpEndpoints: string[] = [];

		stats.forEach(({requests}: Statistic) => {
			Object.keys(requests).forEach((key) => {
				if (key && !tmpEndpoints.includes(key)) {
					tmpEndpoints.push(key);
				}
			})
		})
		tmpEndpoints.forEach((endpoint: string) => {
			dataObj[endpoint] = stats.map((statistic: Statistic) => {
				return {
					date: statistic.date,
					value: Number(statistic.requests[endpoint]) || 0
				}
			});
		});
		setEndPoints(tmpEndpoints);
		return dataObj;
	}, []);

	// Return mapped Data for every selected index
	const getDatums = React.useCallback((series) => {
		return data[series];

	}, [data]);

	// Get Date of Datapoint
	const getPrimary = React.useCallback((datum) => {
			return new Date(datum.date);
		},
		[getDatums]
	);

	// Get Number of requests from Datapoint
	const getSecondary = React.useCallback((datum) => {
		return datum.value;
	}, [getDatums]);

	const getLabel = React.useCallback((series) => {
			return series;
		}
		, []);

	const tooltip = React.useMemo(
		() => ({
			align: 'gridTop',
			anchor: 'gridLeft',
		}),
		[]
	);

	return (<>
		<Head>
			<title>Statistiken</title>
		</Head>

		{ error ? <h1>{error}</h1> :
			data ?
			<Box
			sx={{
				width: '100%',
				height: '100%',
				overflowY: "scroll",
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				padding: '1%',
			}}>
			<Box
				sx={{
					backgroundColor: alpha(theme.palette.background.default, theme.designData.alpha),
					display: 'flex',
					flexDirection: 'row',
					width: '100%',
				}}
			>
				<Box
					sx={{
						display: 'flex',
						flexDirection: 'column',
						width: 'min-content',
					}}
				>
					<h1>Endpunkte:</h1>
					<ButtonGroup
						sx={{
							alignSelf: 'center',
						}}
					>
						<Button
							onClick={() => {
								setIndices(endPoints)
							}}
						>Alle</Button>
						<Button
							onClick={() => {
								setIndices([]);
							}}
						>Keine</Button>
					</ButtonGroup>
					{
						endPoints.map((endpoint: string, idx: number) => (
							<FormControlLabel
								key={idx}
								control={
									<Checkbox
										checked={indices.includes(endpoint)}
										onChange={(e) => {
											e.target.checked ?
												// Use endPoints to avoid shuffling the indices
												setIndices(endPoints.filter(e => indices.includes(e) || e === endpoint))
												:
												setIndices(indices.filter(e => e !== endpoint));
										}}
									/>
								}
								label={endpoint}/>
						))
					}
				</Box>
				<div
					style={{
						backgroundColor: theme.palette.background.default,
						width: '70%',
						flexGrow: 1,
						height: '80vh',

					}}
				>
								<Chart
									axes={axes}
									data={indices}
									getDatums={getDatums}
									getPrimary={getPrimary}
									getSecondary={getSecondary}
									getLabel={getLabel}
									tooltip={tooltip}
									dark={theme.designData.mode === 'dark'}
								/>
				</div>
			</Box>
			<Box
				sx={{
					display: "flex",
					flexDirection: "column",
					backgroundColor: alpha(theme.palette.background.default, theme.designData.alpha),
					padding: '50px',
				}}
			>
				<h1>Total </h1>
				{data && endPoints.length > 1 && endPoints.map((key, idx) => {
					if (key === 'users') return <span>users: {data['users'][data.users.length - 1].value}</span>;
					let count = 0;

					data[key].forEach(({value}) => {
						count += Number(value);
					})

					return <span key={idx}>{key}: {count}</span>
				})
				}
			</Box>
		</Box> : <LoadingSpinner/> }
	</>);
}