import { loggInn } from "@/app/actions/auth";

interface Props {
  searchParams: Promise<{ feil?: string }>;
}

export default async function LoginSide({ searchParams }: Props) {
  const { feil } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">MoiAcc</h1>
          <p className="text-sm text-slate-500 mt-1">Logg inn for å fortsette</p>
        </div>

        <form action={loggInn} className="space-y-4">
          <div>
            <label
              htmlFor="epost"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              E-post
            </label>
            <input
              id="epost"
              name="epost"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              placeholder="deg@eksempel.no"
            />
          </div>

          <div>
            <label
              htmlFor="passord"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Passord
            </label>
            <input
              id="passord"
              name="passord"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
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
            Logg inn
          </button>
        </form>
      </div>
    </div>
  );
}
