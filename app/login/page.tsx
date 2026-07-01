import { login } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f2f0ea' }}>
      <style>{`
        .login-input { width:100%; border-radius:8px; border:1px solid #d9d6cd; padding:8px 12px; font-size:13.5px; color:#191d1c; outline:none; transition:border-color .15s, box-shadow .15s; }
        .login-input:focus { border-color:#1f4b4a; box-shadow:0 0 0 3px rgba(31,75,74,.10); }
      `}</style>

      <div className="w-full max-w-sm rounded-2xl border p-8" style={{ background: '#fff', borderColor: '#d9d6cd', boxShadow: '0 1px 2px rgba(20,25,24,.06), 0 8px 24px rgba(20,25,24,.06)' }}>
        <div className="flex items-center gap-3 mb-7">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg shrink-0" style={{ background: '#1f4b4a', color: '#f2f0ea' }}>
            RS
          </div>
          <div>
            <h1 className="font-semibold text-lg leading-tight" style={{ color: '#191d1c' }}>Prosjektoversikt</h1>
            <p className="text-xs" style={{ color: '#4a534f' }}>R. Samdal Snekkeri</p>
          </div>
        </div>

        {params?.error && (
          <div className="mb-4 px-3 py-2.5 rounded-lg text-sm border" style={{ background: '#fff0f0', borderColor: '#f5c4b3', color: '#8a1a00' }}>
            {params.error}
          </div>
        )}

        <form action={login} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: '#4a534f', letterSpacing: '.06em' }}>
              E-post
            </label>
            <input name="email" type="email" required autoFocus autoComplete="email" className="login-input" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: '#4a534f', letterSpacing: '.06em' }}>
              Passord
            </label>
            <input name="password" type="password" required autoComplete="current-password" className="login-input" />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg py-2.5 text-sm font-semibold transition-colors"
            style={{ background: '#1f4b4a', color: '#fff' }}
          >
            Logg inn
          </button>
        </form>
      </div>
    </div>
  )
}
