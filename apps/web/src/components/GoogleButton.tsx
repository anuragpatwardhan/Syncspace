import { motion } from 'framer-motion';
import { api } from '@/lib/api';

export function GoogleButton({ label = 'Continue with Google', disabled }: { label?: string; disabled?: boolean }) {
  return (
    <motion.a
      href={disabled ? undefined : `${api.base}/auth/google`}
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      aria-disabled={disabled}
      className={
        'group relative w-full h-11 rounded-xl flex items-center justify-center gap-3 ' +
        'bg-white text-ink-900 font-medium text-[14px] tracking-tight ' +
        'shadow-[0_6px_24px_-8px_rgba(255,255,255,0.25)] ' +
        'transition-colors hover:bg-ink-50 ' +
        (disabled ? 'opacity-50 pointer-events-none' : '')
      }
    >
      <svg viewBox="0 0 48 48" className="w-[18px] h-[18px]" aria-hidden>
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.4-.4-3.5z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 5.1 29.3 3 24 3 16.3 3 9.6 7.5 6.3 14.7z"/>
        <path fill="#4CAF50" d="M24 45c5.2 0 10-2 13.6-5.2l-6.3-5.3c-2 1.4-4.6 2.3-7.3 2.3-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 40.4 16.2 45 24 45z"/>
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.3 5.3C41.7 36.4 45 30.7 45 24c0-1.2-.1-2.4-.4-3.5z"/>
      </svg>
      <span>{label}</span>
    </motion.a>
  );
}
