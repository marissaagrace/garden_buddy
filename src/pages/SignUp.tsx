import { type FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/AuthProvider'

export function SignUp() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const reduce = useReducedMotion()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!loading && session && isSupabaseConfigured) {
    return <Navigate to="/" replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isSupabaseConfigured) {
      setError('Add Supabase credentials to your .env file first.')
      return
    }
    if (password.length < 6) {
      setError('Password should be at least 6 characters.')
      return
    }
    setBusy(true)
    const { error: err } = await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (err) setError(err.message)
    else navigate('/', { replace: true })
  }

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 360, damping: 28 }}
    >
      <Card>
        <h1 className="text-ac-ink mb-1 text-xl font-bold">Create account</h1>
        <p className="text-ac-muted mb-4 text-sm">Start logging plants and cozy watering days.</p>
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
          {error && (
            <p className="text-sm font-medium text-red-700" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy} className="mt-1 w-full">
            {busy ? 'Creating…' : 'Sign up'}
          </Button>
        </form>
        <p className="text-ac-muted mt-4 text-center text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-ac-leaf-dark font-semibold underline">
            Sign in
          </Link>
        </p>
      </Card>
    </motion.div>
  )
}
