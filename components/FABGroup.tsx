import {Box, Fab} from "@mui/material";

type childrenProp = {
    icon: any,
    callback: Function,
    color: "primary" | "secondary",
}[]

export default function FABGroup({children}: {children: childrenProp}){

    return (
        <Box
            sx={{
                position: "absolute",
                bottom: {mobile: "70px", desktop: "20px"},
                right: {mobile: "20px", desktop: "270px"},
                height: "min-content",
                width: "min-content"
            }}
        >
            {children.map((child, idx) => (
                <Fab
                    key={idx}
                    onClick={() => {
                        child.callback();
                    }}
                    size={"medium"}
                    color={child.color}

                >{child.icon}</Fab>
            ))}

        </Box>
    )
}