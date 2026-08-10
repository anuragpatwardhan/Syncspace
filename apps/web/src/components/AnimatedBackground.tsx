import { motion } from 'framer-motion';

export function AnimatedBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-mesh-1 opacity-60" />
      <div className="absolute inset-0 bg-grid-faint bg-grid-32 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)] opacity-[0.35]" />
      <motion.div
        className="absolute top-[-20%] left-[-10%] w-[55vw] h-[55vw] rounded-full"
        style={{ background: 'radial-gradient(closest-side, rgba(139,92,246,0.30), transparent 70%)' }}
        animate={{ x: [0, 60, -30, 0], y: [0, 40, -20, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-25%] right-[-10%] w-[55vw] h-[55vw] rounded-full"
        style={{ background: 'radial-gradient(closest-side, rgba(236,72,153,0.22), transparent 70%)' }}
        animate={{ x: [0, -40, 30, 0], y: [0, -40, 30, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[30%] right-[20%] w-[40vw] h-[40vw] rounded-full"
        style={{ background: 'radial-gradient(closest-side, rgba(6,182,212,0.16), transparent 70%)' }}
        animate={{ x: [0, 30, -20, 0], y: [0, -30, 20, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-0 noise opacity-[0.35] mix-blend-overlay" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink-950" />
    </div>
  );
}
