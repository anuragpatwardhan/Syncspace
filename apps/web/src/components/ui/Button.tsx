import { forwardRef, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

// HTMLMotionProps widens children to include MotionValue, which cannot be rendered
// inside the plain span this button wraps its content in.
type Props = Omit<HTMLMotionProps<'button'>, 'children'> & {
  children?: ReactNode;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
};

const variants: Record<Variant, string> = {
  primary:
    'text-white bg-gradient-to-b from-violet-500 to-violet-700 hover:from-violet-400 hover:to-violet-600 shadow-[0_8px_30px_-8px_rgba(139,92,246,0.6)] border border-violet-400/30',
  secondary:
    'text-white bg-white/[0.06] hover:bg-white/[0.10] border border-white/10 backdrop-blur-md',
  ghost:
    'text-ink-200 hover:text-white hover:bg-white/[0.05]',
  outline:
    'text-white border border-white/15 hover:border-white/30 bg-transparent',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px] rounded-lg',
  md: 'h-11 px-5 text-[14px] rounded-xl',
  lg: 'h-12 px-6 text-[15px] rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = 'primary', size = 'md', loading, fullWidth, children, disabled, ...rest },
  ref
) {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 font-medium tracking-tight',
        'transition-colors duration-200 ring-focus',
        'disabled:opacity-60 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-[inherit] overflow-hidden"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer bg-[length:200%_100%]" />
        </span>
      )}
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </motion.button>
  );
});
