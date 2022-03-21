interface stringToStringEnum {
    [key: string]: any,
}

export const leistungskurse: stringToStringEnum = {
    "2267": "Deutsch (smt)",
    "2272": "Englisch (jae)",
    "2277": "Englisch (sob)",
    "2282": "Mathe (spi)",
    "2287": "Physik (jus)",
    "2292": "Deutsch (end)",
}

export const fachrichtungen: stringToStringEnum =  {
    //TODO: find names
    "2232": "BG12-1",
    "2237": "BG12-2",
    "2242": "BG12-3",
    "2247": "Elektrotechnik",
    "2252": "Praktische Informatik",
    "2257": "BG12-6",
    "2262": "BG12-7",
}

export const naturwissenschaften: stringToStringEnum = {
    ph1: "Physik",
    ch1: "Chemie",
    bio1: "Bio 1",
    bio2: "Bio 2",
}

export const ethikKurse: stringToStringEnum = {
    ek1: "Ethik 1",
    ek2: "Ethik 2",
    ek3: "Ethik 3",
    ek4: "Ethik 4",
    //TODO: find names
    rv1: "rv 1",
    rv2: "rv 2",
}

export const sportKurse: stringToStringEnum = {
    sp1: "Sport 1",
    sp2: "Sport 2",
    sp3: "Sport 3",
    sp4: "Sport 4",
    sp5: "Sport 5",
    sp6: "Sport 6",
}

export const sonstigesKurse: stringToStringEnum = {
    ds: "Darstellendes Spiel",
    ku: "Kunst",
    sn1: "Spanisch 1",
    sn2: "Spanisch 2",
}

export const allSonstigeKurse: stringToStringEnum = {
    ...naturwissenschaften,
    ...ethikKurse,
    ...sportKurse,
    ...sonstigesKurse,
}