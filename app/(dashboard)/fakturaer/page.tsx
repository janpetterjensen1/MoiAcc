import Link from "next/link";
import { hentAlleFakturaer, markerForfalteFakturaer } from "@/lib/db/invoices";
import { hentAlleKunder } from "@/lib/db/customers";
import { formatNorskDato, formatNorskValuta } from "@/lib/utils";
import { OpprettFakturaKnapp } from "./opprett-knapp";
import { GenererAlleUtkastKnapp } from "@/components/GenererAlleUtkastKnapp";
import { FileText, ChevronRight, Download } from "lucide-react";

const STATUS_ETIKETT: Record<string, { tekst: string; badgeClass: string; stripeColor: string }> = {
  draft:             { tekst: "Utkast",          badgeClass: "badge-muted",   stripeColor: "rgba(120,180,120,0.3)" },
  awaiting_approval: { tekst: "Til godkjenning", badgeClass: "badge-gold",    stripeColor: "#c9a84c" },
  sent:              { tekst: "Sendt",            badgeClass: "badge-gold",    stripeColor: "rgba(201,168,76,0.6)" },
  paid:              { tekst: "Betalt",           badgeClass: "badge-emerald", stripeColor: "#4ade80" },
  overdue:           { tekst: "Forfalt",          badgeClass: "badge-red",     stripeColor: "#f87171" },
  credited:          { tekst: "Kreditert",        badgeClass: "badge-purple",  stripeColor: "#c084fc" },
};

export default async function FakturaerSide() {
  await markerForfalteFakturaer();
  const [{ data: fakturaer }, { data: kunder }] = await Promise.all([
    hentAlleFakturaer(),
    hentAlleKunder(),
  ]);

  const aktiveKunder = (kunder ?? []).filter(
    (k) => !k.active_to || new Date(k.active_to) >= new Date()
  );

  const ventende = (fakturaer ?? []).filter(
    (f) => f.status === "awaiting_approval"
  );

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="glass-card">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(45,122,45,.12)" }}>
          <div>
            <h1
              className="text-xl"
              style={{ fontFamily: "var(--font-cinzel)", color: "rgba(232,213,160,0.92)", letterSpacing: "0.5px" }}
            >
              Fakturaer
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {fakturaer?.length ?? 0} totalt
              {ventende.length > 0 && (
                <span className="ml-1.5" style={{ color: "#c9a84c" }}>
                  · {ventende.length} venter godkjenning
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/api/fakturaer/eksport"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs transition-colors"
              style={{ color: "rgba(168,216,168,0.6)", border: "1px solid rgba(45,122,45,0.3)" }}
            >
              <Download size={13} />
              CSV
            </Link>
            <GenererAlleUtkastKnapp />
            <OpprettFakturaKnapp kunder={aktiveKunder} />
          </div>
        </div>
      </div>

      {/* Venter godkjenning */}
      {ventende.length > 0 && (
        <section>
          <div className="section-label mb-2">Krever handling</div>
          <div className="glass-group flex flex-col">
            {ventende.map((f) => {
              const kunde = f.customers;
              const status = STATUS_ETIKETT[f.status];
              return (
                <Link
                  key={f.id}
                  href={`/fakturaer/${f.id}`}
                  className="flex items-center justify-between px-4 py-3.5 transition-all"
                  style={{
                    borderBottom: "1px solid rgba(20,50,20,.4)",
                    background: "rgba(201,168,76,0.04)",
                  }}
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {f.invoice_number ?? "Utkast"} — {kunde?.short_name}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.badgeClass}`}>
                        {status.tekst}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {formatNorskDato(f.period_from)} – {formatNorskDato(f.period_to)} ·{" "}
                      <span style={{ color: "#c9a84c", fontWeight: 500 }}>
                        {formatNorskValuta(Number(f.total))}
                      </span>
                    </p>
                  </div>
                  <ChevronRight size={15} style={{ stroke: "var(--text-dim)", fill: "none", flexShrink: 0 }} />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Alle fakturaer */}
      <section>
        <div className="section-label mb-2">Alle fakturaer</div>

        {(fakturaer ?? []).length === 0 && (
          <div
            className="rounded-2xl p-10 text-center"
            style={{ background: "rgba(8,22,8,0.4)", border: "1px dashed rgba(45,122,45,0.25)" }}
          >
            <FileText size={28} style={{ stroke: "rgba(45,122,45,0.35)", fill: "none", margin: "0 auto 8px" }} />
            <p className="text-sm" style={{ color: "var(--text-dim)" }}>Ingen fakturaer ennå.</p>
          </div>
        )}

        <div className="glass-group flex flex-col">
          {(fakturaer ?? []).map((f) => {
            const kunde = f.customers;
            const status = STATUS_ETIKETT[f.status] ?? { tekst: f.status, badgeClass: "badge-muted", stripeColor: "rgba(120,180,120,0.3)" };
            return (
              <Link
                key={f.id}
                href={`/fakturaer/${f.id}`}
                className="flex items-center overflow-hidden transition-all"
                style={{ borderBottom: "1px solid rgba(20,50,20,.4)" }}
              >
                {/* Status stripe */}
                <div className="w-1 self-stretch shrink-0" style={{ background: status.stripeColor }} />
                <div className="flex items-center justify-between flex-1 px-4 py-3.5">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {f.invoice_number ? `#${f.invoice_number}` : "Utkast"} — {kunde?.short_name}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${status.badgeClass}`}>
                        {status.tekst}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {formatNorskDato(f.invoice_date)} · Forfall {formatNorskDato(f.due_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 ml-3 shrink-0">
                    <p className="text-sm font-semibold tabular-nums" style={{ color: "#c9a84c" }}>
                      {formatNorskValuta(Number(f.total))}
                    </p>
                    <ChevronRight size={14} style={{ stroke: "var(--text-dim)", fill: "none" }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
