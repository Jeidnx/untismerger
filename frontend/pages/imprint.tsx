import {Box} from "@mui/material";
import Head from "next/head";

export default function Imprint() {
    return (
        <Box sx={{
            height: "100%",
            width: "100%",
            padding: "20px",
        }}>
            <Head>
                <title>Impressum</title>
            </Head>
            <h3>Impressum</h3>
            <p>
                Angaben gem. § 5 TMG:<br/>
                <br/>
                Oliver Tegeler<br/>
                <br/>
                Adresse: Viktoriaplatz 4<br/>
                <br/>
                PLZ: 64293<br/>
                <br/>
                Kontaktaufnahme:<br/>
                <br/>
                Telefon: +49 151 52333399<br/>
                <br/>
                E-Mail: info@hems2.de<br/>
            </p>
            <p>
                Haftungsausschluss – Disclaimer:<br/>
                <br/>
                Haftung für Inhalte<br/>
                <br/>
                Alle Inhalte unseres Internetauftritts wurden mit größter Sorgfalt und nach bestem Gewissen
                erstellt. Für die
                Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr
                übernehmen. Als
                Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den
                allgemeinen Gesetzen
                verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet,
                übermittelte oder
                gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine
                rechtswidrige
                Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen
                nach den
                allgemeinen Gesetzen bleiben hiervon unberührt.
                <br/>
                Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntniserlangung einer
                konkreten
                Rechtsverletzung möglich. Bei Bekanntwerden von den o.g. Rechtsverletzungen werden wir diese
                Inhalte
                unverzüglich entfernen.
            </p>
        </Box>
    )
}