import {
  Html, Head, Body, Container, Heading, Text, Hr, Section, Row, Column, Preview,
} from "@react-email/components";

interface Props {
  selgerNavn: string;
  selgerOrgNr: string;
  selgerBankKonto: string;
  kundeNavn: string;
  fakturaNummerVisning: string;
  fakturadato: string;
  forfallsdato: string;
  total: string;
  dagerSiden: number;
}

function dato(s: string) {
  const [y, m, d] = s.split("-");
  return `${d}.${m}.${y}`;
}

export function ReminderEmail({
  selgerNavn, selgerOrgNr, selgerBankKonto,
  kundeNavn, fakturaNummerVisning, fakturadato,
  forfallsdato, total, dagerSiden,
}: Props) {
  return (
    <Html lang="no">
      <Head />
      <Preview>Purring: Faktura {fakturaNummerVisning} er {dagerSiden} dager forfalt</Preview>
      <Body style={{ backgroundColor: "#f8fafc", fontFamily: "sans-serif", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 560, margin: "32px auto", backgroundColor: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <Section style={{ backgroundColor: "#7f1d1d", padding: "20px 32px" }}>
            <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "bold", margin: 0 }}>{selgerNavn}</Text>
            <Text style={{ color: "#fca5a5", fontSize: 12, margin: "4px 0 0" }}>Purring — forfalt faktura</Text>
          </Section>

          <Section style={{ padding: "28px 32px 0" }}>
            <Heading as="h1" style={{ fontSize: 20, fontWeight: "bold", color: "#7f1d1d", margin: "0 0 8px" }}>
              Purring: Faktura {fakturaNummerVisning}
            </Heading>
            <Text style={{ color: "#64748b", margin: "0 0 20px", fontSize: 14 }}>
              Hei {kundeNavn},<br /><br />
              Vi viser til faktura <strong>{fakturaNummerVisning}</strong> med forfall <strong>{dato(forfallsdato)}</strong>
              {" "}som er {dagerSiden} {dagerSiden === 1 ? "dag" : "dager"} forfalt.
              Vennligst betal det utestående beløpet snarest.
            </Text>

            <Hr style={{ borderColor: "#e2e8f0", margin: "0 0 20px" }} />

            <Row style={{ marginBottom: 20 }}>
              <Column style={{ width: "33%" }}>
                <Text style={{ fontSize: 11, color: "#94a3b8", margin: "0 0 2px", textTransform: "uppercase" }}>Fakturanr.</Text>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: "#0f172a", margin: 0 }}>{fakturaNummerVisning}</Text>
              </Column>
              <Column style={{ width: "33%" }}>
                <Text style={{ fontSize: 11, color: "#94a3b8", margin: "0 0 2px", textTransform: "uppercase" }}>Forfalt</Text>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: "#e11d48", margin: 0 }}>{dato(forfallsdato)}</Text>
              </Column>
              <Column style={{ width: "33%" }}>
                <Text style={{ fontSize: 11, color: "#94a3b8", margin: "0 0 2px", textTransform: "uppercase" }}>Fakturadato</Text>
                <Text style={{ fontSize: 14, color: "#0f172a", margin: 0 }}>{dato(fakturadato)}</Text>
              </Column>
            </Row>

            <Section style={{ backgroundColor: "#fef2f2", borderRadius: 8, padding: "16px 20px", marginBottom: 20, border: "1px solid #fecaca" }}>
              <Row>
                <Column>
                  <Text style={{ fontSize: 13, color: "#991b1b", margin: 0, fontWeight: "bold" }}>Utestående beløp</Text>
                  <Text style={{ fontSize: 12, color: "#b91c1c", margin: "4px 0 0" }}>Kontonummer: {selgerBankKonto}</Text>
                </Column>
                <Column style={{ textAlign: "right" }}>
                  <Text style={{ fontSize: 22, fontWeight: "bold", color: "#7f1d1d", margin: 0 }}>{total}</Text>
                </Column>
              </Row>
            </Section>

            <Text style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
              Dersom betalingen allerede er sendt, ber vi om at du ser bort fra denne meldingen.
              Ta kontakt om du har spørsmål.
            </Text>
          </Section>

          <Section style={{ padding: "20px 32px", borderTop: "1px solid #e2e8f0", marginTop: 8 }}>
            <Text style={{ fontSize: 11, color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>
              {selgerNavn} · Org.nr: {selgerOrgNr}<br />
              Denne e-posten er generert automatisk av MoiAcc.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
