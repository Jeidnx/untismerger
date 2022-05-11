import {alpha, Box, FormControl, InputLabel, MenuItem, Select, Stack, TextField, useTheme} from "@mui/material";
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

export default function Search() {


	const [loading, setLoading] = useState(false);
	const [results, setResults] = useState<LessonData[]>([]);
	const [lastTime, setLastTime] = useState(-1);

	const [what, setWhat] = useState("");
	const [param, setParam] = useState("");
	const [date, setDate] = useState(dayjs());

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
					what, param,
					date: date.toDate(),
				}
			}).then((json) => {
				setResults((json as { result: LessonData[] }).result);
				setLastTime(Number((json as { time: string }).time));
				setLoading(false);
			}).catch((err) => {
				setLoading(false);
				//TODO
			})
		}, 300);
	}, [what, param, date, fetcher]);


	const calculatedDate = useMemo(() => {
		const tDate = date.toDate();
		tDate.setMinutes(tDate.getMinutes() - tDate.getTimezoneOffset());
		return tDate.toISOString().slice(0, 16);
	}, [date])

	console.log(calculatedDate);
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
			<FormControl
				fullWidth
			>
				<InputLabel id="what">Was</InputLabel>
				<Select
					fullWidth
					value={what}
					labelId={"what"}
					label={"Was"}
					onChange={(e) => {
						setWhat(e.target.value)
					}
					}
				>{Object.keys(searchOptions).map((key, idx) => {
					return <MenuItem value={key} key={idx}>{searchOptions[key]}</MenuItem>
				})}</Select>
			</FormControl>
			<TextField
				value={param}
				onChange={(e) => {
					setParam(e.target.value);
				}}
			/>
			<TextField
				type={"datetime-local"}
				value={calculatedDate}
				onChange={(e) => {
					setDate(dayjs(e.target.value));
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
						results.map((result, idx) => {
							return (
								<Box
									key={idx}
									sx={{
										display: "flex",
										backgroundColor: alpha(theme.palette.background.default, theme.designData.alpha),
										height: "15%",
										flexDirection: "column",
										alignItems: "flex-start",
										justifyContent: "space-around",
										marginBottom: "5%",
										padding: "2%",
										borderRadius: `${theme.designData.lesson.edges}px`,
										fontSize: "1.2em",

									}}
								>
									<span>Fach: {result.subject}</span>
									<span>Lehrer: {result.teacher}</span>
									<span>Raum: {result.room}</span>
									<span>Kurs: {result.courseShortName}</span>
								</Box>
							)
						})
					}
				</>
			)
		}
	</Box>)
}