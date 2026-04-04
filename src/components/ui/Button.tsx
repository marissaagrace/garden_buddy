import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', type = 'button', children, ...props }, ref) => {
    const reduce = useReducedMotion()
    return (
      <motion.span
        className="inline-flex max-w-full"
        whileTap={reduce ? undefined : { scale: 0.97 }}
        whileHover={reduce ? undefined : { scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      >
        <button
          ref={ref}
          type={type}
          className={cn(
            'rounded-ac-xl inline-flex cursor-pointer items-center justify-center border-2 px-4 py-2.5 font-semibold shadow-ac-soft transition-colors disabled:cursor-not-allowed disabled:opacity-50',
            variant === 'primary' &&
              'border-ac-leaf-dark/25 bg-ac-mint text-ac-ink hover:bg-ac-leaf-light',
            variant === 'ghost' &&
              'border-transparent bg-white/50 text-ac-ink hover:bg-white/80',
            variant === 'danger' &&
              'border-red-300/80 bg-red-50 text-red-800 hover:bg-red-100',
            className,
          )}
          {...props}
        >
          {children}
        </button>
      </motion.span>
    )
  },
)
Button.displayName = 'Button'
