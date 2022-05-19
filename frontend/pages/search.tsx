import {alpha, Box, FormControl, InputLabel, MenuItem, Paper, Select, Stack, TextField, useTheme} from "@mui/material";
import {useEffect, useMemo, useState} from "react";
import dayjs from "dayjs";
import LoadingSpinner from "../components/LoadingSpinner";
import {LessonData} from "../../globalTypes";
import {useCustomTheme} from "../components/CustomTheme";

const searchOptions: { [key: string]: string } = {
	teacher: "Lehrer",
	subject: "Fach",
	courseNr: "Kurs Nr.",
	room: "Raum",
};

let debounceTimer: NodeJS.Timeout;

interface SearchResult extends LessonData{
	entityId: number,
}

export default function Search() {


	const [loading, setLoading] = useState(false);
	const [results, setResults] = useState<SearchResult[]>([]);
	const [lastTime, setLastTime] = useState(-1);

	const [query, setQuery] = useState("");
	const [startTime, setStartTime] = useState(dayjs());
	const [endTime, setEndTime] = useState(dayjs().add(1, "hour"));

	const {fetcher} = useCustomTheme();
	const theme = useTheme();

	useEffect(() => {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			console.log("Effect");
			setLoading(true);
			fetcher({
				method: "POST",
				endpoint: "search",
				useCache: false,
				query: {
					startTime: startTime.toDate(),
					endTime: endTime.toDate(),
					query,
				}
			}).then((json) => {
				setResults((json as { result: SearchResult[] }).result);
				setLastTime(Number((json as { time: string }).time));
				setLoading(false);
			}).catch((err) => {
				setLoading(false);
				//TODO
			})
		}, 300);
	}, [startTime, endTime, query, fetcher]);


	const calculatedStartTime = useMemo(() => {
		const tDate = startTime.toDate();
		tDate.setMinutes(tDate.getMinutes() - tDate.getTimezoneOffset());
		return tDate.toISOString().slice(0, 16);
	}, [startTime])

	const calculatedEndTime = useMemo(() => {
		const tDate = endTime.toDate();
		tDate.setMinutes(tDate.getMinutes() - tDate.getTimezoneOffset());
		return tDate.toISOString().slice(0, 16);
	}, [endTime])

	return (<Box
		sx={{
			width: "100%",
			height: "100%",
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			overflowY: "scroll",
		}}
	>
		<Stack
			spacing={3}
			sx={{
				width: "50%",
				backgroundColor: alpha(theme.palette.background.default, theme.designData.alpha),
			}}
		>
			<h1>Suche</h1>
			<TextField
				label={"Suche"}
				value={query}
				onChange={(e) => {
					setQuery(e.target.value);
				}}
			/>
			<TextField
				label={"Von"}
				type={"datetime-local"}
				value={calculatedStartTime}
				onChange={(e) => {
					setStartTime(dayjs(e.target.value));
				}}

			/>
			<TextField
				label={"Bis"}
				type={"datetime-local"}
				value={calculatedEndTime}
				onChange={(e) => {
					setEndTime(dayjs(e.target.value));
				}}

			/>
		</Stack>

		{
			loading ? <LoadingSpinner text={"Laden..."}/> : (
				<><h2
					style={{
						backgroundColor: alpha(theme.palette.background.default, theme.designData.alpha),
					}}
				>{results.length} Ergebnisse in {lastTime} ms</h2>
					{
						results.map((result) => {
							return (
								<Paper
									key={result.entityId}
									sx={{
										backgroundColor: alpha(theme.palette.background.default, theme.designData.alpha),
										marginBottom: "5%",
										borderRadius: `${theme.designData.lesson.edges}px`,
										fontSize: "1.2em",

									}}
								>
									{
										//TODO: Make this less shit
										Object.keys(result).map((key, idx) => (
										<p key={result.entityId + "" + idx}>{key}: {result[key]}</p>
									))}
								</Paper>
							)
						})
					}
				</>
			)
		}
	</Box>)
}