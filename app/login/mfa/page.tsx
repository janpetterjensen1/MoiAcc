import { verifiserMfa } from "@/app/actions/auth";

interface Props {
  searchParams: Promise<{ feil?: string }>;
}

export default async function MfaSide({ searchParams }: Props) {
  const { feil } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">MoiAcc</h1>
          <p className="text-sm text-slate-500 mt-1">Tofaktorautentisering</p>
        </div>

        <form action={verifiserMfa} className="space-y-4">
          <div>
            <label
              htmlFor="kode"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Kode fra autentiseringsapp
            </label>
            <input
              id="kode"
              name="kode"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="one-time-code"
              required
              autoFocus
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm text-center tracking-widest text-lg font-mono focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              placeholder="000000"
            />
          </div>

          {feil && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {decodeURIComponent(feil)}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors"
          >
            Bekreft
          </button>
        </form>
      </div>
    </div>
  );
}
