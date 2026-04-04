import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

const sparkles = ['✨', '🌿', '💧', '✓']

export function CelebrateBurst({ show }: { show: boolean }) {
  const reduce = useReducedMotion()

  return (
    <AnimatePresence>
      {show && !reduce && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="relative h-32 w-32">
            {sparkles.map((s, i) => (
              <motion.span
                key={`${s}-${i}`}
                className="absolute left-1/2 top-1/2 text-2xl"
                initial={{ opacity: 0, scale: 0.2, x: 0, y: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0.4, 1.1, 0.9],
                  x: Math.cos((i / sparkles.length) * Math.PI * 2) * 52,
                  y: Math.sin((i / sparkles.length) * Math.PI * 2) * 52,
                }}
                transition={{ duration: 0.55, ease: 'easeOut', delay: i * 0.04 }}
              >
                {s}
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}
      {show && reduce && (
        <div
          className="text-ac-leaf-dark pointer-events-none fixed inset-0 z-50 flex items-center justify-center text-2xl font-bold"
          role="status"
        >
          Done
        </div>
      )}
    </AnimatePresence>
  )
}
