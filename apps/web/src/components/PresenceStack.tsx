import { AnimatePresence, motion } from 'framer-motion';
import type { PresenceUser } from '@syncspace/shared';
import { Avatar } from './ui/Avatar';

export function PresenceStack({ users, max = 6 }: { users: PresenceUser[]; max?: number }) {
  const visible = users.slice(0, max);
  const overflow = Math.max(0, users.length - visible.length);
  return (
    <div className="flex items-center">
      <AnimatePresence initial={false}>
        {visible.map((u, i) => (
          <motion.div
            key={u.userId}
            layout
            initial={{ opacity: 0, scale: 0.6, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.6, x: -6 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            style={{ marginLeft: i === 0 ? 0 : -10, zIndex: visible.length - i }}
            className="relative"
          >
            <Avatar name={u.name} url={u.avatarUrl} color={u.color} size={30} ring />
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-ink-900"
              style={{ boxShadow: '0 0 8px rgba(52,211,153,0.7)' }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
      {overflow > 0 && (
        <div className="ml-2 text-xs text-ink-300 px-2 py-1 rounded-full bg-white/[0.06] border border-white/10">
          +{overflow}
        </div>
      )}
    </div>
  );
}
