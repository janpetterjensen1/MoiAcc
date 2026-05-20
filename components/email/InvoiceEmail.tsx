import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Hr,
  Section,
  Row,
  Column,
  Preview,
} from "@react-email/components";

interface Props {
  selgerNavn: string;
  selgerOrgNr: string;
  kundeNavn: string;
  fakturaNummerVisning: string;
  fakturadato: string;
  forfallsdato: string;
  periodeFrom: string;
  periodeTo: string;
  total: string;
  vatNote: string;
}

function dato(s: string) {
  const [y, m, d] = s.split("-");
  return `${d}.${m}.${y}`;
}

export function InvoiceEmail({
  selgerNavn,
  selgerOrgNr,
  kundeNavn,
  fakturaNummerVisning,
  fakturadato,
  forfallsdato,
  periodeFrom,
  periodeTo,
  total,
  vatNote,
}: Props) {
  return (
    <Html lang="no">
      <Head />
      <Preview>Faktura {fakturaNummerVisning} fra {selgerNavn} — forfall {dato(forfallsdato)}</Preview>
      <Body style={{ backgroundColor: "#f8fafc", fontFamily: "sans-serif", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 560, margin: "32px auto", backgroundColor: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0", padding: 0, overflow: "hidden" }}>
          {/* Top bar */}
          <Section style={{ backgroundColor: "#0f172a", padding: "20px 32px" }}>
            <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "bold", margin: 0 }}>
              {selgerNavn}
            </Text>
            <Text style={{ color: "#94a3b8", fontSize: 12, margin: "4px 0 0" }}>
              Org.nr: {selgerOrgNr}
            </Text>
          </Section>

          <Section style={{ padding: "28px 32px 0" }}>
            <Heading as="h1" style={{ fontSize: 22, fontWeight: "bold", color: "#0f172a", margin: "0 0 4px" }}>
              Faktura {fakturaNummerVisning}
            </Heading>
            <Text style={{ color: "#64748b", margin: "0 0 20px", fontSize: 14 }}>
              Til: {kundeNavn}
            </Text>

            <Hr style={{ borderColor: "#e2e8f0", margin: "0 0 20px" }} />

            {/* Meta grid */}
            <Row style={{ marginBottom: 20 }}>
              <Column style={{ width: "33%" }}>
                <Text style={{ fontSize: 11, color: "#94a3b8", margin: "0 0 2px", textTransform: "uppercase" }}>Fakturadato</Text>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: "#0f172a", margin: 0 }}>{dato(fakturadato)}</Text>
              </Column>
              <Column style={{ width: "33%" }}>
                <Text style={{ fontSize: 11, color: "#94a3b8", margin: "0 0 2px", textTransform: "uppercase" }}>Forfallsdato</Text>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: "#e11d48", margin: 0 }}>{dato(forfallsdato)}</Text>
              </Column>
              <Column style={{ width: "33%" }}>
                <Text style={{ fontSize: 11, color: "#94a3b8", margin: "0 0 2px", textTransform: "uppercase" }}>Periode</Text>
                <Text style={{ fontSize: 13, fontWeight: "bold", color: "#0f172a", margin: 0 }}>
                  {dato(periodeFrom)} – {dato(periodeTo)}
                </Text>
              </Column>
            </Row>

            <Hr style={{ borderColor: "#e2e8f0", margin: "0 0 20px" }} />

            {/* Total */}
            <Section style={{ backgroundColor: "#f8fafc", borderRadius: 8, padding: "16px 20px", marginBottom: 20 }}>
              <Row>
                <Column>
                  <Text style={{ fontSize: 13, color: "#475569", margin: 0 }}>Totalt å betale</Text>
                  <Text style={{ fontSize: 11, color: "#94a3b8", margin: "4px 0 0", fontStyle: "italic" }}>{vatNote}</Text>
                </Column>
                <Column style={{ textAlign: "right" }}>
                  <Text style={{ fontSize: 20, fontWeight: "bold", color: "#0f172a", margin: 0 }}>{total}</Text>
                </Column>
              </Row>
            </Section>

            <Text style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
              Faktura er vedlagt som PDF. Vennligst betal innen forfallsdato.
            </Text>
          </Section>

          {/* Footer */}
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
