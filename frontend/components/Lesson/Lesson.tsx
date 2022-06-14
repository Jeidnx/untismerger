import {
	Box,
	Button,
	ButtonGroup,
	Dialog,
	DialogContent,
	DialogTitle,
	IconButton,
	Paper,
	useMediaQuery,
	useTheme
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close';
import {MutableRefObject, useEffect, useMemo, useRef, useState} from 'react';

import {LessonData,} from "../../../globalTypes";
import {useCustomTheme} from "../CustomTheme";
import style from './Lesson.module.css';
// @ts-ignore
import randomColor from 'randomcolor'

function checkOverflow(el: HTMLDivElement | undefined) {
	if (el === undefined || el === null) return false;
	let width = 0;
	for (let i = 0; i < el.children.length; i++) {
		let crEl = el.children[i]
		//Add width of p to cumulative width
		width += crEl.children[0].scrollWidth;
	}
	//Compare parent width to child scroll, add offset to compensate for padding / border
	return el.clientWidth < (width + 12);
}

const Lesson = ({lessons, parentIdx, jdx}: { lessons: LessonData[], parentIdx: number, jdx: number }) => {

	const rootDiv = useRef<HTMLDivElement>();
	const [nameIsOverflowing, setNameIsOverflowing] = useState(false);
	const theme = useTheme();
	const {setLessonColorEnum} = useCustomTheme()
	const [modalOpen, setModalOpen] = useState(false);
	const [modalSelected, setModalSelected] = useState(0);

	const colorEnum = theme.designData.lesson.colorEnum;

	let timeOut: NodeJS.Timeout;
	const checkOverflowHandler = () => {
		clearInterval(timeOut);
		timeOut = setTimeout(() => {
			if (nameIsOverflowing) {
				setNameIsOverflowing(false);
			}

			if (checkOverflow(rootDiv.current)) {
				setNameIsOverflowing(true);
				return;
			}
		}, 300)
	}

	useEffect(() => {
		checkOverflowHandler();
		window.addEventListener('resize', checkOverflowHandler)

		return () => {
			window.removeEventListener('resize', checkOverflowHandler)
		}

	}, [])

	const colors = useMemo(() => {
		return lessons.flatMap((lesson) => {
			if (!lesson) return [];
			if (colorEnum[lesson.subject]) return [colorEnum[lesson.subject]];

			let thisColor: string;
			do {
				thisColor = randomColor({
					luminosity: "light",
					format: "hex",
				});
			} while (Object.values(colorEnum).includes(thisColor))
			setLessonColorEnum(lesson.subject, thisColor);
			return [thisColor]
		})
	}, [colorEnum])
	const isMobile = useMediaQuery(theme.breakpoints.down('desktop'));
	const selectedLesson = lessons[modalSelected];
	return (
		<>
			{lessons.length > 0 && <Dialog
                open={modalOpen}
                onClose={() => {
					setModalOpen(false);
				}}
                fullScreen={isMobile}
            >
                <DialogTitle
                    sx={{
						display: "inline-flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
                >
					{lessons[0]?.startTime.format("DD.MM HH:mm")}
                    <IconButton
                        size={"large"}
                        onClick={() => {
							setModalOpen(false)
						}}><CloseIcon/></IconButton>
                </DialogTitle>
                <DialogContent>
					{lessons.length > 1 && <ButtonGroup
                        variant={"outlined"}
                        disableElevation={true}
                        sx={{
							marginBottom: "20px",
						}}
                    >
						{lessons.map((lesson, idx) => {
							if (!lesson) return null;
							const isSelected = modalSelected === idx;
							return <Button
								key={idx}
								variant={isSelected ? "contained" : "outlined"}
								onClick={() => {
									setModalSelected(idx);
								}}
							>
								{lesson.subject}</Button>
						})}
                    </ButtonGroup>}
                    <Paper
                        variant={"outlined"}
                        sx={{
							padding: "5px",
						}}
                    >
						{
							//TODO: Show start and end Times, show not empty remarks and maybe more
						}
                        <p>Fach: {selectedLesson?.subject}</p>
                        <p>Lehrer: {selectedLesson?.teacher}</p>
                        <p>Raum: {selectedLesson?.room}</p>
                        <p>Status: {selectedLesson?.code}</p>
                    </Paper>
                </DialogContent>
            </Dialog>}
			<Box
				className={style.lessonBox}
				onClick={() => {
					if (lessons.length > 0) setModalOpen(prevState => !prevState);
				}}
				sx={{
					borderRadius: `${theme.designData.lesson.edges}px`,
				}} ref={rootDiv as any as MutableRefObject<HTMLDivElement>}>
				{
					lessons.map((lesson: (LessonData | undefined), idx: number) => {
						if (!lesson) return null;
						const color = colors[idx];
						const textColor = theme.palette.getContrastText(color);

						if (lesson.endTime.isBefore(undefined)) {
							setTimeout(() => {
								if (!rootDiv.current) return;
								rootDiv.current.style.filter = "grayscale(100%)";
							}, ((parentIdx + 1) * (jdx + 1)) * 100)

						}

						return (<Box
							key={idx}
							className={style.lesson}
							sx={{
								backgroundColor: color,
								color: textColor,
								borderColor: textColor,
								background:
									lesson.code === "cancelled" ?
										`repeating-linear-gradient( 45deg, ${color}, ${color} 10px, #e18c9c 10px, #e18c9c 20px )` :
										lesson.code === "irregular" ?
											`repeating-linear-gradient( 45deg, ${color}, ${color} 10px, #e6bc1a 10px, #e6bc1a 20px )` : color,
								borderLeftStyle: idx > 0 ? "solid" : "none",
							}}
						>
							<p
								className={style.subject}
							>{nameIsOverflowing ? lesson.shortSubject : lesson.subject}</p>
							<p
								className={style.infos}
							>{lesson.room + " - " + lesson.teacher}</p>
						</Box>)
					})
				}
			</Box>
		</>
	)
}

export default Lesson;
