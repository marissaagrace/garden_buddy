import { motion, useReducedMotion } from 'framer-motion'
import { Leaf, LogOut, LayoutDashboard, Sprout } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { AmbientBackground } from '@/components/ambient/AmbientBackground'
import { ConfigBanner } from '@/components/ConfigBanner'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { useAuth } from '@/providers/AuthProvider'

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-ac-xl flex items-center gap-2 border-2 px-3 py-2 text-sm font-semibold transition-colors',
    isActive
      ? 'border-ac-leaf-dark/35 bg-ac-mint/80 text-ac-ink shadow-ac-soft'
      : 'border-transparent bg-white/40 text-ac-muted hover:bg-white/70 hover:text-ac-ink',
  )

export function AppShell() {
  const { signOut } = useAuth()
  const reduce = useReducedMotion()

  return (
    <div className="relative min-h-dvh">
      <AmbientBackground />
      <div className="relative z-10 mx-auto flex min-h-dvh max-w-3xl flex-col px-4 pb-10 pt-6 sm:px-6">
        <motion.header
          initial={reduce ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="mb-6 flex flex-col gap-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="rounded-ac-xl border-ac-leaf-dark/25 flex h-11 w-11 items-center justify-center border-2 bg-white/70 text-ac-leaf-dark shadow-ac-soft">
                <Leaf className="h-6 w-6" aria-hidden />
              </span>
              <div className="text-left">
                <p className="text-ac-ink text-lg font-bold leading-tight">Bloom Kind</p>
                <p className="text-ac-muted text-xs">Your cozy garden journal</p>
              </div>
            </div>
            <Button type="button" variant="ghost" className="gap-2 text-sm" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
          <ConfigBanner />
          <nav className="flex flex-wrap gap-2" aria-label="Main">
            <NavLink to="/" end className={navClass}>
              <LayoutDashboard className="h-4 w-4" />
              Home
            </NavLink>
            <NavLink to="/plants" className={navClass}>
              <Sprout className="h-4 w-4" />
              Plants
            </NavLink>
          </nav>
        </motion.header>
        <motion.main
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28, delay: 0.05 }}
          className="flex-1"
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  )
}
