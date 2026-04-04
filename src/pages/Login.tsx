import { type FormEvent, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'

export function Login() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'
  const reduce = useReducedMotion()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!loading && session && isSupabaseConfigured) {
    return <Navigate to={from} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isSupabaseConfigured) {
      setError('Add Supabase credentials to your .env file first.')
      return
    }
    setBusy(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (err) setError(err.message)
    else navigate(from, { replace: true })
  }

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 360, damping: 28 }}
    >
      <Card>
        <h1 className="text-ac-ink mb-1 text-xl font-bold">Sign in</h1>
        <p className="text-ac-muted mb-4 text-sm">Use the email and password you registered with.</p>
        <form onSubmit={onSubmit} className="flex flex-col gap-3 text-left">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Email
            <input
              className="rounded-ac-xl border-ac-leaf-dark/25 text-ac-ink border-2 bg-white/80 px-3 py-2 outline-none focus:ring-2 focus:ring-ac-leaf/50"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Password
            <input
              className="rounded-ac-xl border-ac-leaf-dark/25 text-ac-ink border-2 bg-white/80 px-3 py-2 outline-none focus:ring-2 focus:ring-ac-leaf/50"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && (
            <p className="text-sm font-medium text-red-700" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy} className="mt-1 w-full">
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="text-ac-muted mt-4 text-center text-sm">
          New here?{' '}
          <Link to="/signup" className="text-ac-leaf-dark font-semibold underline">
            Create an account
          </Link>
        </p>
      </Card>
    </motion.div>
  )
}
