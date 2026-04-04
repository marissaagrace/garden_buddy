import { useReducedMotion } from 'framer-motion'
import { motion } from 'framer-motion'

const leaves = [
  { left: '8%', top: '12%', rotate: -12, delay: 0, scale: 1 },
  { left: '78%', top: '18%', rotate: 18, delay: 1.2, scale: 0.85 },
  { left: '22%', top: '72%', rotate: 8, delay: 2.1, scale: 0.9 },
  { left: '88%', top: '68%', rotate: -22, delay: 0.6, scale: 0.75 },
  { left: '48%', top: '8%', rotate: 4, delay: 3, scale: 0.7 },
]

export function AmbientBackground() {
  const reduce = useReducedMotion()

  if (reduce) {
    return (
      <div
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        aria-hidden
      >
        <div className="from-ac-sky via-ac-mint/40 to-ac-cream absolute inset-0 bg-gradient-to-br" />
      </div>
    )
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      <motion.div
        className="from-ac-sky via-ac-mint/50 to-ac-cream absolute inset-0 bg-gradient-to-br"
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
        }}
        transition={{ duration: 48, repeat: Infinity, ease: 'linear' }}
        style={{ backgroundSize: '200% 200%' }}
      />
      {leaves.map((l, i) => (
        <motion.span
          key={i}
          className="text-ac-leaf-dark/15 absolute text-5xl sm:text-6xl"
          style={{ left: l.left, top: l.top, rotate: l.rotate, scale: l.scale }}
          initial={{ opacity: 0.12, y: 0 }}
          animate={{ opacity: [0.1, 0.18, 0.1], y: [0, -14, 0] }}
          transition={{
            duration: 14 + i * 2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: l.delay,
          }}
          aria-hidden
        >
          🌿
        </motion.span>
      ))}
    </div>
  )
}
