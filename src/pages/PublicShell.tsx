import { motion, useReducedMotion } from 'framer-motion'
import { Leaf } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'
import { AmbientBackground } from '@/components/ambient/AmbientBackground'
import { ConfigBanner } from '@/components/ConfigBanner'

export function PublicShell() {
  const reduce = useReducedMotion()
  return (
    <div className="relative min-h-dvh">
      <AmbientBackground />
      <div className="relative z-10 mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10 sm:px-6">
        <motion.header
          initial={reduce ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-center"
        >
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="rounded-ac-xl border-ac-leaf-dark/25 inline-flex h-12 w-12 items-center justify-center border-2 bg-white/70 text-ac-leaf-dark shadow-ac-soft">
              <Leaf className="h-7 w-7" />
            </span>
            <span className="text-ac-ink text-xl font-bold">Bloom Kind</span>
          </Link>
          <p className="text-ac-muted mt-2 text-sm">Welcome back to your island garden.</p>
        </motion.header>
        <ConfigBanner />
        <Outlet />
      </div>
    </div>
  )
}
