import {Box, useTheme} from '@mui/material'
import {MutableRefObject, useEffect, useMemo, useRef, useState} from 'react';

import {displayedLesson, LessonData} from "../../types";
import {useCustomTheme} from "../CustomTheme";
import style from './Lesson.module.css';
const randomColor = require('randomcolor');

function checkOverflow(el: HTMLDivElement | undefined) {
    if (el === undefined) return false;
    let width = 0;
    for (let i = 0; i < el.children.length; i++) {
        let crEl = el.children[i]
        //Add width of p to cumulative width
        width += crEl.children[0].scrollWidth;
    }
    //Compare parent width to child scroll, add offset to compensate for padding / border
    return el.clientWidth < (width + 12);
}

const Lesson = ({lessons, parentIdx, jdx}: { lessons: displayedLesson, parentIdx: number, jdx: number }) => {

    const rootDiv = useRef<HTMLDivElement>();
    const [nameIsOverflowing, setNameIsOverflowing] = useState(false);
    const theme = useTheme();
    const { setLessonColorEnum } = useCustomTheme()

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
        return lessons.flatMap((lesson: LessonData | undefined) => {
            if(!lesson) return [];
            if(colorEnum[lesson.subject]) return [colorEnum[lesson.subject]];

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
    return (
        <Box
            className={ style.lessonBox }
            sx={{
                borderRadius: `${theme.designData.lesson.edges}px`,
        }} ref={rootDiv as any as MutableRefObject<HTMLDivElement>}>
            {
                lessons.map((lesson: (LessonData | undefined), idx: number) => {
                    if (!lesson) return null;
                    const color = colors[idx];
                    const textColor = theme.palette.getContrastText(color);

                    if (lesson.endDate.isBefore(undefined)) {
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
                            className={ style.subject }
                        >{nameIsOverflowing ? lesson.shortSubject : lesson.subject}</p>
                        <p
                            className={ style.infos }
                        >{lesson.room + " - " + lesson.teacher}</p>
                    </Box>)
                })
            }
        </Box>
    )
}

export default Lesson;
