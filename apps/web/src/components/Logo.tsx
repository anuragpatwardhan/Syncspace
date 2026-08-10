import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

export function Logo({ className, animated = true }: { className?: string; animated?: boolean }) {
  return (
    <div className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      <motion.div
        className="relative w-7 h-7 rounded-lg overflow-hidden"
        whileHover={animated ? { rotate: 10, scale: 1.05 } : undefined}
        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-violet-400 via-fuchsia-500 to-cyan-400" />
        <div className="absolute inset-0 grid place-items-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
            <path d="M5 6 H17 V11 H11 V17 H5 Z" />
            <circle cx="17" cy="17" r="3" />
          </svg>
        </div>
      </motion.div>
      <span className="font-semibold tracking-tight text-[15px]">
        SyncSpace
      </span>
    </div>
  );
}
