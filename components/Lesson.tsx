import {Box, useTheme} from '@mui/material'
import {MutableRefObject, useEffect, useRef, useState} from 'react';

import {displayedLesson, LessonData} from "../types";
import dayjs from "dayjs";
import {useCustomTheme} from "./CustomTheme";


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

const colorPalette = [
    '#FF7878',
    '#F3F0D7',
    '#D5BFBF',
    '#8CA1A5',
    '#F6C6EA',
    '#BEAEE2',
    '#CDF0EA',
    '#79B4B7',
    '#DE8971',
    '#F3E6E3',
    '#E1F2FB',
    '#745C97',
]

const Lesson = ({lessons, parentIdx, jdx}: { lessons: displayedLesson, parentIdx: number, jdx: number }) => {

    const rootDiv = useRef<HTMLDivElement>();
    const [nameIsOverflowing, setNameIsOverflowing] = useState(false);
    const theme = useTheme();
    const {setLessonColorEnum} = useCustomTheme()

    let colorEnum = theme.designData.lesson.colorEnum;

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

    return (
        <Box sx={{
            flex: "1",
            flexWrap: "nowrap",
            overflow: "hidden",
            padding: "1px",
            borderRadius: `${theme.designData.lesson.edges}px`,
            display: "flex",
            transition: "ease-in 800ms",
            justifyContent: "center",
        }} ref={rootDiv as any as MutableRefObject<HTMLDivElement>}>
            {
                lessons.map((lesson: (LessonData | undefined), idx: number) => {
                    if (!lesson) return null;

                    if (!colorEnum[lesson.subject]) {
                        //TODO: this is probably not a good idea, but we should be fine as long as colorPalette is big enough
                        let thisColor;
                        do {
                            thisColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
                        } while (Object.values(colorEnum).includes(thisColor))

                        colorEnum[lesson.subject] = thisColor;
                        //TODO: dont use setState in render method
                        setLessonColorEnum(colorEnum);
                    }
                    const color = theme.palette.getContrastText(colorEnum[lesson.subject]);
                    const lessonBgColor = colorEnum[lesson.subject];

                    if (lesson.endDate.isBefore(dayjs())) {
                        setTimeout(() => {
                            if (!rootDiv.current) return;
                            rootDiv.current.style.filter = "grayscale(100%)";
                        }, (parentIdx * 200) + (jdx * 300))

                    }
                    return (<Box
                        key={idx}
                        sx={{
                            backgroundColor: lessonBgColor,
                            color: color,
                            background:
                                lesson.code === "cancelled" ?
                                    `repeating-linear-gradient( 45deg, ${lessonBgColor}, ${lessonBgColor} 10px, #e18c9c 10px, #e18c9c 20px )` :
                                    lesson.code === "irregular" ?
                                        `repeating-linear-gradient( 45deg, ${lessonBgColor}, ${lessonBgColor} 10px, #e6bc1a 10px, #e6bc1a 20px )` : lessonBgColor,
                            flex: "1",
                            padding: "5px",
                            borderLeftStyle: idx > 0 ? "solid" : "none",
                            borderColor: color,
                            borderWidth: "0.2em",
                        }}
                    >
                        <p
                            style={{
                                fontSize: "0.7em",
                                fontWeight: "bold",
                                borderBottomStyle: "dashed",
                                borderWidth: "2px",
                                overflow: "hidden",
                                whiteSpace: "nowrap",
                            }}
                        >{nameIsOverflowing ? lesson?.shortSubject : lesson?.subject}</p>
                        <p style={{
                            fontSize: "0.5em",
                        }}>{lesson.room + " - " + lesson.teacher}</p>
                    </Box>)
                })
            }
        </Box>
    )
}

export default Lesson;
