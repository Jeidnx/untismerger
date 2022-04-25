//@ts-expect-error react-charts has no ts declaration
import {Chart} from 'react-charts';
import Head from 'next/head';
import {alpha, Box, Checkbox, FormControlLabel, FormGroup, useTheme} from '@mui/material';
import React from 'react';
import {useCustomTheme} from '../components/CustomTheme';
import LoadingSpinner from '../components/LoadingSpinner';
import {Statistic} from "../../globalTypes";

interface statisticsDataType {
	[key: string]: {
		date: string, value: number
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

	const [error, setError] = React.useState(undefined);
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
			setEndPoints(a.endpoints);
			setIndices(a.endpoints);
			setData(processData(a));
		}).catch((err) => {
			setError(err);
		});
	}, []);


	const processData = React.useCallback(({endpoints, stats}) => {
		const dataObj: statisticsDataType = {};
		endpoints.forEach((endpoint: string) => {
			dataObj[endpoint] = stats.map((statistic: Statistic) => {
				return {
					date: statistic.date,
					value: statistic.requests[endpoint] || 0
				}
			});
		});
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

		<Box
			sx={{
				width: '100%',
				height: '100%',
				display: 'flex',
				flexDirection: 'row',
				justifyContent: 'center',
				alignItems: 'center',
			}}>
			<Box
				sx={{
					backgroundColor: alpha(theme.palette.background.default, theme.designData.alpha),
					flexGrow: '0',
					flexShrink: '0',
					height: 'min-content',
					width: 'min-content',
				}}
			>
				<h1>Endpunkte:</h1>
				<FormGroup>
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
				</FormGroup>
			</Box>
			<div
				style={{
					backgroundColor: theme.palette.background.default,
					flexShrink: '0',
					flexGrow: '1',
					height: '50%',
					width: 'max-content',
				}}
			>
				{
					error ? <h1>{error}</h1>
						:
						data ?
							<Chart
								axes={axes}
								data={indices}
								getDatums={getDatums}
								getPrimary={getPrimary}
								getSecondary={getSecondary}
								getLabel={getLabel}
								tooltip={tooltip}
								dark={theme.designData.mode === 'dark'}
							/> : <LoadingSpinner/>
				}
			</div>
		</Box>
	</>);
}