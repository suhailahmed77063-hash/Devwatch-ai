import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, UserRound, ShieldCheck, Users, User, ShieldCheck as ShieldIcon, Activity, FileText, Shield, Loader2, AlertCircle } from 'lucide-react'
import Logo from '../components/Logo'
import { useAuth } from '../lib/auth'

// Role → seeded demo account (SIH26047 §50). "Staff" maps to the seeded nurse.
const roles = [
  { key: 'Doctor', icon: UserRound, email: 'doctor@casecare.demo', password: 'Doctor@123' },
  { key: 'Admin', icon: ShieldCheck, email: 'admin@casecare.demo', password: 'Admin@123' },
  { key: 'Staff', icon: Users, email: 'nurse@casecare.demo', password: 'Nurse@123' },
  { key: 'Patient', icon: User, email: 'patient@casecare.demo', password: 'Patient@123' },
]

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.5 29.3 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.5 29.3 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 43.5c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.6 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39 16.3 43.5 24 43.5z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  )
}

export default function Login() {
  const [role, setRole] = useState('Doctor')
  const [showPw, setShowPw] = useState(false)
  const [email, setEmail] = useState(roles[0].email)
  const [password, setPassword] = useState(roles[0].password)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const from = location.state?.from?.pathname || '/dashboard'

  // Prefill the matching demo credentials when the role tab changes (§50, §58).
  function pickRole(key) {
    setRole(key)
    const r = roles.find((x) => x.key === key)
    if (r) {
      setEmail(r.email)
      setPassword(r.password)
      setError(null)
    }
  }

  async function submit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err?.message || 'Login failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-100 via-slate-100 to-primary-50 p-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-pop lg:grid-cols-2">
        {/* Left brand / illustration panel */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-sky-50 to-primary-50/60 p-10 lg:flex">
          <span className="absolute right-10 top-24 text-primary-200/70">
            <Plus />
          </span>
          <span className="absolute bottom-40 right-16 text-primary-200/60">
            <Plus small />
          </span>

          <div>
            <Logo size="lg" subtitle="Patient Case-Taking Software" />
            <h1 className="mt-10 text-3xl font-bold leading-tight text-navy-900">
              Smarter Case Taking,
              <br />
              <span className="text-primary-600">Better Care</span>
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-500">
              AI-assisted case-taking, intelligent summaries and complete patient management in one
              secure platform.
            </p>
          </div>

          {/* Illustration */}
          <div className="relative my-8 flex items-center justify-center">
            <div className="absolute h-56 w-56 rounded-full bg-primary-100/40 blur-2xl" />
            <div className="relative w-56 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-card">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary-100" />
                <span className="text-sm font-semibold text-navy-700">Patient Case</span>
              </div>
              {[70, 90, 60, 80].map((w, i) => (
                <div key={i} className="mb-2.5 flex items-center gap-2">
                  <div className="h-4 w-4 rounded bg-slate-100" />
                  <div className="h-2 rounded-full bg-slate-100" style={{ width: `${w}%` }} />
                </div>
              ))}
            </div>
            <FloatTile className="-right-2 top-2 bg-blue-500" icon={Activity} />
            <FloatTile className="-right-4 top-1/2 bg-emerald-500" icon={FileText} />
            <FloatTile className="bottom-2 right-6 bg-violet-500" icon={Shield} />
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white/70 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <ShieldIcon size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-navy-800">Secure. Private. Compliant.</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                Your data is protected with enterprise-grade security and privacy standards.
              </p>
            </div>
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex items-center justify-center p-8 sm:p-12">
          <form onSubmit={submit} className="w-full max-w-sm">
            <div className="mb-6 text-center lg:hidden">
              <Logo size="md" subtitle="Patient Case-Taking Software" />
            </div>
            <h2 className="text-center text-2xl font-bold text-navy-900">Welcome Back!</h2>
            <p className="mt-1 text-center text-sm text-slate-500">Login to your account to continue</p>

            {/* Role selector */}
            <div className="mt-6 grid grid-cols-4 gap-2">
              {roles.map((r) => {
                const active = r.key === role
                return (
                  <button
                    type="button"
                    key={r.key}
                    onClick={() => pickRole(r.key)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-medium transition-colors ${
                      active
                        ? 'border-primary-300 bg-primary-50 text-primary-700'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <r.icon size={20} className={active ? 'text-primary-600' : 'text-slate-400'} />
                    {r.key}
                  </button>
                )
              })}
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-navy-700">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    autoComplete="username"
                    className="input-base pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-navy-700">Password</label>
                <div className="relative">
                  <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="input-base pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-2 text-right">
              <button type="button" className="text-xs font-medium text-primary-600 hover:text-primary-700">
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              {submitting ? 'Signing in…' : 'Login'}
            </button>

            <p className="mt-3 text-center text-2xs text-slate-400">
              Demo credentials are prefilled for the selected role.
            </p>

            <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" /> or <span className="h-px flex-1 bg-slate-200" />
            </div>

            <button
              type="button"
              className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-slate-300 py-3 text-sm font-medium text-navy-700 transition-colors hover:bg-slate-50"
            >
              <GoogleIcon /> Login with Google
            </button>

            <p className="mt-5 text-center text-sm text-slate-500">
              Don't have an account?{' '}
              <button type="button" className="font-semibold text-primary-600 hover:text-primary-700">
                Sign up
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

function Plus({ small }) {
  const s = small ? 20 : 34
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function FloatTile({ className = '', icon: Icon }) {
  return (
    <div className={`absolute flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-lg ${className}`}>
      <Icon size={20} />
    </div>
  )
}
