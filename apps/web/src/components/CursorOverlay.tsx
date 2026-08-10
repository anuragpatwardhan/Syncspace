import { motion } from 'framer-motion';
import type { PresenceUser } from '@syncspace/shared';

type Props = {
  presence: PresenceUser[];
  cursors: Record<string, { x: number; y: number }>;
  selfId?: string;
};

export function CursorOverlay({ presence, cursors, selfId }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {presence
        .filter((p) => p.userId !== selfId)
        .map((p) => {
          const c = cursors[p.userId];
          if (!c) return null;
          return (
            <motion.div
              key={p.userId}
              className="absolute"
              animate={{ x: c.x, y: c.y }}
              transition={{ type: 'spring', stiffness: 220, damping: 30, mass: 0.5 }}
              style={{ left: 0, top: 0 }}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" className="drop-shadow-md">
                <path d="M2 2 L20 10 L11 12 L9 20 Z" fill={p.color} stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
              <div
                className="ml-3 -mt-1 px-2 py-0.5 text-[11px] font-medium text-white rounded-md shadow-lg whitespace-nowrap inline-block"
                style={{ background: p.color }}
              >
                {p.name}
              </div>
            </motion.div>
          );
        })}
    </div>
  );
}
