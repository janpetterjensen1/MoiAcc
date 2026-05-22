import { loggInn } from "@/app/actions/auth";

interface Props {
  searchParams: Promise<{ feil?: string }>;
}

export default async function LoginSide({ searchParams }: Props) {
  const { feil } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {/* Ambient glows */}
      <div className="ambient ambient-1" />
      <div className="ambient ambient-2" />
      <div className="ambient ambient-3" />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: "rgba(201,168,76,0.12)",
              border: "1px solid rgba(201,168,76,0.25)",
              boxShadow: "0 0 28px rgba(201,168,76,0.10)",
            }}
          >
            <span style={{ fontFamily: "var(--font-cinzel)", fontSize: "22px", color: "#c9a84c" }}>M</span>
          </div>
          <h1
            className="text-2xl"
            style={{ fontFamily: "var(--font-cinzel)", color: "rgba(232,213,160,0.92)", letterSpacing: "2px" }}
          >
            MoiAcc
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Logg inn for å fortsette</p>
        </div>

        {/* Form card */}
        <div className="glass-card p-6">
          <form action={loggInn} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="epost"
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.8px" }}
              >
                E-post
              </label>
              <input
                id="epost"
                name="epost"
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
                style={{
                  background: "rgba(8,22,8,0.6)",
                  border: "1px solid rgba(45,122,45,0.3)",
                  color: "var(--text-primary)",
                }}
                placeholder="deg@eksempel.no"
              />
            </div>

            <div>
              <label
                htmlFor="passord"
                className="block text-xs font-medium mb-1.5"
                style={{ color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.8px" }}
              >
                Passord
              </label>
              <input
                id="passord"
                name="passord"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
                style={{
                  background: "rgba(8,22,8,0.6)",
                  border: "1px solid rgba(45,122,45,0.3)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {feil && (
              <div
                className="rounded-xl px-3 py-2.5 text-sm"
                style={{
                  background: "rgba(239,68,68,0.10)",
                  border: "1px solid rgba(239,68,68,0.20)",
                  color: "#f87171",
                }}
              >
                {decodeURIComponent(feil)}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-xl py-2.5 text-sm font-medium transition-all mt-1"
              style={{
                background: "rgba(201,168,76,0.14)",
                border: "1px solid rgba(201,168,76,0.30)",
                color: "#c9a84c",
              }}
            >
              Logg inn
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
