import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Card({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const reduce = useReducedMotion()
  if (reduce) {
    return (
      <div
        className={cn(
          'rounded-ac-2xl border-ac-leaf-dark/20 bg-ac-panel/90 border-2 p-4 shadow-ac-soft backdrop-blur-sm',
          className,
        )}
      >
        {children}
      </div>
    )
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26, delay }}
      className={cn(
        'rounded-ac-2xl border-ac-leaf-dark/20 bg-ac-panel/90 border-2 p-4 shadow-ac-soft backdrop-blur-sm',
        className,
      )}
    >
      {children}
    </motion.div>
  )
}
