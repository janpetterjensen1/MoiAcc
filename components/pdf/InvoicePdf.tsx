import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import path from "path";

Font.register({
  family: "SourceSans3",
  fonts: [
    { src: path.join(process.cwd(), "public/fonts/SourceSans3-Regular.ttf"), fontWeight: 400 },
    { src: path.join(process.cwd(), "public/fonts/SourceSans3-Bold.ttf"), fontWeight: 700 },
  ],
});

const FF = "SourceSans3";
const BLACK = "#000000";
const GREY = "#555555";
const LIGHT = "#888888";
const BORDER = "#cccccc";

const s = StyleSheet.create({
  page: {
    fontFamily: FF,
    fontSize: 9,
    color: BLACK,
    paddingHorizontal: 48,
    paddingTop: 40,
    paddingBottom: 60,
  },

  /* ---- HEADER ---- */
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  sellerName: { fontSize: 12, fontWeight: 700 },
  tagline: { fontSize: 9, color: GREY, marginBottom: 6 },
  sellerDetail: { fontSize: 9, color: GREY, lineHeight: 1.5 },
  fakturaLabel: { fontSize: 22, fontWeight: 700, textAlign: "right" },
  headerMeta: { textAlign: "right", lineHeight: 1.6, marginTop: 4 },
  headerMetaKey: { color: GREY },

  /* ---- TIL ---- */
  tilRow: { flexDirection: "row", marginBottom: 20 },
  tilLabel: { fontSize: 8, fontWeight: 700, color: GREY, marginBottom: 4 },
  tilName: { fontSize: 10, fontWeight: 700 },
  tilDetail: { fontSize: 9, color: GREY, lineHeight: 1.5 },
  periodeBox: { flex: 1, paddingLeft: 24 },
  periodeLabel: { fontSize: 8, fontWeight: 700, color: GREY, marginBottom: 4 },
  periodeValue: { fontSize: 9, color: GREY },

  /* ---- TABLE ---- */
  tableHead: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
    paddingVertical: 5,
    marginBottom: 0,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
    paddingVertical: 5,
  },
  th: { fontSize: 8, fontWeight: 700, color: GREY },
  td: { fontSize: 9 },

  colDate:   { width: "12%" },
  colDesc:   { flex: 1 },
  colTimer:  { width: "10%", textAlign: "right" },
  colSats:   { width: "14%", textAlign: "right" },
  colBelop:  { width: "16%", textAlign: "right" },

  /* ---- TOTALS ---- */
  totalsSection: { marginTop: 10, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", marginBottom: 3 },
  totalKey: { width: 160, textAlign: "right", color: GREY, fontSize: 9, paddingRight: 12 },
  totalVal: { width: 80, textAlign: "right", fontSize: 9 },
  totalRowBold: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    marginTop: 4,
    paddingTop: 5,
  },
  totalKeyBold: { width: 160, textAlign: "right", fontWeight: 700, fontSize: 10, paddingRight: 12 },
  totalValBold: { width: 80, textAlign: "right", fontWeight: 700, fontSize: 10 },

  /* ---- FOOTER ---- */
  footerContact: {
    marginTop: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    color: GREY,
    fontSize: 8,
    lineHeight: 1.6,
  },
  thankYou: {
    marginTop: 20,
    textAlign: "center",
    fontWeight: 700,
    fontSize: 10,
    letterSpacing: 0.5,
  },
});

function dato(s: string) {
  const [y, m, d] = s.split("-");
  return `${d}.${m}.${y}`;
}

function valuta(v: number | string) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  const [int, dec] = n.toFixed(2).split(".");
  const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${intFmt},${dec} kr`;
}

function faktNr(invoiceNumber: number, invoiceDate: string) {
  const year = invoiceDate.slice(0, 4);
  return `${year}-${String(invoiceNumber).padStart(4, "0")}`;
}

export interface PdfInvoiceData {
  invoice_number: number;
  invoice_date: string;
  due_date: string;
  period_from: string;
  period_to: string;
  subtotal: number | string;
  vat_amount: number | string;
  total: number | string;
  vat_exempt_note: string;
  customer: {
    legal_name: string;
    org_number: string;
    invoice_address: { street: string; postal_code: string; city: string };
  };
  seller: {
    name: string;
    tagline: string;
    phone: string;
    address: string;
    org_number: string;
    bank_account: string;
    iban: string;
    email: string;
  };
  lines: Array<{
    session_date: string;
    actual_duration_h: number | string;
    hourly_rate_at_time: number | string;
    line_amount: number | string;
    note: string | null;
  }>;
}

export function InvoicePdf({ data }: { data: PdfInvoiceData }) {
  const { customer, seller, lines } = data;
  const nummerVisning = faktNr(data.invoice_number, data.invoice_date);

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ===== HEADER ===== */}
        <View style={s.header}>
          <View>
            <Text style={s.sellerName}>{seller.name} - {seller.org_number}</Text>
            <Text style={s.tagline}>{seller.tagline}</Text>
            <Text style={s.sellerDetail}>{seller.address}</Text>
            <Text style={s.sellerDetail}>Telefon: {seller.phone}</Text>
          </View>
          <View>
            <Text style={s.fakturaLabel}>FAKTURA</Text>
            <View style={s.headerMeta}>
              <Text>
                <Text style={s.headerMetaKey}>FAKTURANR.  </Text>
                <Text style={{ fontWeight: 700 }}>{nummerVisning}</Text>
              </Text>
              <Text>
                <Text style={s.headerMetaKey}>DATO:  </Text>
                {dato(data.invoice_date)}
              </Text>
              <Text>
                <Text style={s.headerMetaKey}>KONTONR:  </Text>
                {seller.bank_account}
              </Text>
              <Text>
                <Text style={s.headerMetaKey}>FORFALL:  </Text>
                {dato(data.due_date)}
              </Text>
            </View>
          </View>
        </View>

        {/* ===== TIL + PERIODE ===== */}
        <View style={s.tilRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.tilLabel}>TIL:</Text>
            <Text style={s.tilName}>
              {customer.legal_name} - {customer.org_number}
            </Text>
            <Text style={s.tilDetail}>{customer.invoice_address.street}</Text>
            <Text style={s.tilDetail}>
              {customer.invoice_address.postal_code} {customer.invoice_address.city.toUpperCase()}
            </Text>
          </View>
          <View style={s.periodeBox}>
            <Text style={s.periodeLabel}>FAKTURERINGSPERIODE:</Text>
            <Text style={s.periodeValue}>
              {dato(data.period_from)} – {dato(data.period_to)}
            </Text>
          </View>
        </View>

        {/* ===== TABLE ===== */}
        <View style={s.tableHead}>
          <Text style={[s.th, s.colDate]}>DATO</Text>
          <Text style={[s.th, s.colDesc]}>BESKRIVELSE</Text>
          <Text style={[s.th, s.colTimer]}>TIMER</Text>
          <Text style={[s.th, s.colSats]}>SATS</Text>
          <Text style={[s.th, s.colBelop]}>BELØP</Text>
        </View>

        {lines.map((l, i) => (
          <View key={i} style={s.tableRow}>
            <Text style={[s.td, s.colDate]}>{dato(l.session_date)}</Text>
            <Text style={[s.td, s.colDesc]}>
              {l.note ?? `Gruppetime ${dato(l.session_date)}`}
            </Text>
            <Text style={[s.td, s.colTimer]}>
              {Number(l.actual_duration_h).toFixed(1)}
            </Text>
            <Text style={[s.td, s.colSats]}>
              {valuta(l.hourly_rate_at_time)}
            </Text>
            <Text style={[s.td, s.colBelop]}>
              {valuta(l.line_amount)}
            </Text>
          </View>
        ))}

        {/* ===== TOTALS ===== */}
        <View style={s.totalsSection}>
          <View style={s.totalRow}>
            <Text style={s.totalKey}>DELSUM</Text>
            <Text style={s.totalVal}>{valuta(data.subtotal)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalKey}>MERVERDIAVGIFT</Text>
            <Text style={s.totalVal}>0</Text>
          </View>
          <View style={s.totalRowBold}>
            <Text style={s.totalKeyBold}>TOTALT SKYLDIG</Text>
            <Text style={s.totalValBold}>{valuta(data.total)}</Text>
          </View>
        </View>

        {/* ===== FOOTER ===== */}
        <View style={s.footerContact}>
          <Text>
            Hvis du har spørsmål om denne fakturaen, kan du kontakte {seller.name}, {seller.phone}, {seller.email}
          </Text>
          <Text>IBAN: {seller.iban}  ·  {data.vat_exempt_note}</Text>
        </View>

        <Text style={s.thankYou}>TAKK FOR SAMARBEIDET!</Text>

      </Page>
    </Document>
  );
}
