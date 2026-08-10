import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/Button';
import { PageTransition } from '@/components/PageTransition';
import {
  ArrowRight, Zap, Users, Shield, Network, Sparkles, GitMerge, Activity,
} from 'lucide-react';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 16, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

const FEATURES = [
  { icon: Zap, title: 'Sub-100ms updates', body: 'A WebSocket-first pipeline keeps every keystroke and cursor move feeling local.' },
  { icon: GitMerge, title: 'Deterministic merges', body: 'Server-ordered ops with versioned state. No lost writes, no split-brain, no surprises.' },
  { icon: Users, title: 'Live presence & cursors', body: 'See who is editing, where their pointer is, and what they are typing — in real time.' },
  { icon: Shield, title: 'Workspace-scoped auth', body: 'JWT sessions, Google OAuth, and role-based access on every connection.' },
  { icon: Network, title: 'Horizontally scalable', body: 'Redis pub/sub fans out updates across API nodes when load grows.' },
  { icon: Activity, title: 'Reconnect-aware', body: 'Snapshot-based persistence rehydrates state on every reconnect — flawlessly.' },
];

export default function Landing() {
  const reduce = useReducedMotion();

  return (
    <PageTransition>
      <AnimatedBackground />
      <Navbar />

      <main className="relative mx-auto max-w-7xl px-6 pt-20 pb-32">
        {/* Hero */}
        <motion.section
          variants={stagger}
          initial="hidden"
          animate="show"
          className="relative text-center flex flex-col items-center"
        >
          <motion.div variants={item}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-[12px] tracking-wide text-ink-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
              <span>Real-time collaboration, refined.</span>
              <Sparkles className="w-3.5 h-3.5 text-violet-300" />
            </div>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-7 text-5xl md:text-7xl font-display leading-[1.04] tracking-tight max-w-4xl"
          >
            <span className="text-gradient">Edit together.</span>
            <br />
            <span className="italic text-white/90">Stay in sync.</span>
          </motion.h1>

          <motion.p variants={item} className="mt-6 max-w-xl text-[15px] text-ink-300 leading-relaxed">
            SyncSpace is a real-time collaboration platform engineered around concurrent edits,
            deterministic state, and a UI that never flinches under pressure.
          </motion.p>

          <motion.div variants={item} className="mt-9 flex items-center gap-3">
            <Link to="/signup">
              <Button size="lg" className="group">
                Start collaborating
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="secondary">Sign in</Button>
            </Link>
          </motion.div>

          {/* Floating preview card */}
          <motion.div
            variants={item}
            className="relative mt-20 w-full max-w-5xl"
          >
            <div className="absolute -inset-x-10 -top-10 -bottom-16 -z-10 bg-mesh-1 opacity-50 blur-2xl" />
            <motion.div
              animate={reduce ? undefined : { y: [0, -8, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              className="glass-strong rounded-3xl overflow-hidden shadow-glow"
            >
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-300/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
                <span className="ml-3 text-[11px] text-ink-400 font-mono">syncspace.app / workspace / launch-plan</span>
                <div className="ml-auto flex items-center gap-1.5 text-[11px] text-ink-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  4 online
                </div>
              </div>
              <PreviewCanvas />
            </motion.div>
          </motion.div>
        </motion.section>

        {/* Features */}
        <section id="features" className="mt-40 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto"
          >
            <p className="text-[12px] uppercase tracking-[0.18em] text-violet-300/80 font-mono">The fabric</p>
            <h2 className="mt-3 text-4xl md:text-5xl font-display tracking-tight">
              Built for the parts <span className="italic text-ink-300">that usually break.</span>
            </h2>
          </motion.div>

          <div className="mt-16 grid md:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.55, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4 }}
                className="group relative glass rounded-2xl p-6 overflow-hidden"
              >
                <div className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: 'radial-gradient(400px circle at var(--mx,50%) var(--my,50%), rgba(139,92,246,0.18), transparent 40%)' }}
                />
                <f.icon className="w-5 h-5 text-violet-300" />
                <h3 className="mt-4 text-[15px] font-medium tracking-tight text-white">{f.title}</h3>
                <p className="mt-2 text-[13.5px] text-ink-300 leading-relaxed">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Architecture */}
        <section id="architecture" className="mt-40">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="grid md:grid-cols-2 gap-12 items-center"
          >
            <div>
              <p className="text-[12px] uppercase tracking-[0.18em] text-violet-300/80 font-mono">Under the hood</p>
              <h2 className="mt-3 text-4xl font-display tracking-tight">
                An event-driven engine, <span className="italic text-ink-300">not a polling toy.</span>
              </h2>
              <p className="mt-5 text-[14.5px] text-ink-300 leading-relaxed max-w-md">
                Clients stream operations over WebSockets. A centralized state engine assigns
                sequence IDs, resolves conflicts deterministically, debounces snapshots to Postgres,
                and broadcasts updates to every connected peer.
              </p>
              <ul className="mt-6 space-y-2.5 text-[13.5px] text-ink-200">
                {[
                  'Client → WebSocket gateway',
                  'Gateway → State engine (server-ordered ops)',
                  'Engine → Broadcaster (ordered fan-out)',
                  'Engine → Snapshot store (debounced persistence)',
                ].map((t) => (
                  <li key={t} className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-300" />
                    <span className="font-mono text-[12.5px]">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <ArchitectureDiagram />
          </motion.div>
        </section>

        {/* CTA */}
        <section id="pricing" className="mt-40">
          <div className="relative glass-strong rounded-3xl p-12 text-center overflow-hidden">
            <div className="absolute -inset-32 bg-mesh-1 opacity-50 -z-10" />
            <h3 className="text-3xl md:text-4xl font-display tracking-tight">
              Open-source. <span className="italic text-ink-300">Self-hosted.</span> Yours.
            </h3>
            <p className="mt-4 text-ink-300 max-w-md mx-auto text-[14.5px]">
              SyncSpace is free to run. Bring your own Postgres + Redis and you have a production-grade
              real-time collaboration server in one command.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link to="/signup"><Button size="lg">Create an account</Button></Link>
              <Link to="/login"><Button size="lg" variant="outline">I already have one</Button></Link>
            </div>
          </div>
        </section>

        <footer className="mt-20 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-ink-400">
          <p>© SyncSpace — handcrafted for systems that don't drop frames.</p>
          <p className="font-mono">v0.1.0 · made with WebSockets &amp; care</p>
        </footer>
      </main>
    </PageTransition>
  );
}

function PreviewCanvas() {
  return (
    <div className="relative h-72 md:h-80 bg-[radial-gradient(ellipse_at_top_left,rgba(139,92,246,0.18),transparent_60%)]">
      <div className="absolute inset-0 bg-grid-faint bg-grid-32 opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_85%)]" />
      {[
        { x: '12%', y: '22%', color: '#f59e0b', text: 'launch • Friday' },
        { x: '52%', y: '18%', color: '#8b5cf6', text: 'design review' },
        { x: '30%', y: '54%', color: '#22c55e', text: 'shipping prod' },
        { x: '64%', y: '60%', color: '#ec4899', text: 'tweet thread' },
      ].map((n, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 + i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: n.x, top: n.y }}
        >
          <div
            className="w-44 h-24 rounded-xl px-3 py-2 text-[13px] text-ink-900 font-medium shadow-2xl"
            style={{ background: `linear-gradient(135deg, ${n.color}, ${n.color}cc)` }}
          >
            {n.text}
          </div>
        </motion.div>
      ))}
      {/* Floating cursors */}
      {[
        { x: '20%', y: '70%', color: '#06b6d4', name: 'maya' },
        { x: '70%', y: '32%', color: '#a855f7', name: 'ana' },
      ].map((c, i) => (
        <motion.div
          key={i}
          className="absolute"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 + i * 0.2 }}
          style={{ left: c.x, top: c.y }}
        >
          <svg width="20" height="20" viewBox="0 0 22 22"><path d="M2 2 L20 10 L11 12 L9 20 Z" fill={c.color} stroke="white" strokeWidth="1.2" /></svg>
          <div className="ml-3 -mt-1 inline-block px-2 py-0.5 text-[10.5px] font-medium text-white rounded-md" style={{ background: c.color }}>{c.name}</div>
        </motion.div>
      ))}
    </div>
  );
}

function ArchitectureDiagram() {
  const nodes = [
    { label: 'Client A', x: 10, y: 25, color: '#06b6d4' },
    { label: 'Client B', x: 10, y: 75, color: '#ec4899' },
    { label: 'Gateway', x: 40, y: 50, color: '#8b5cf6' },
    { label: 'State Engine', x: 70, y: 50, color: '#a78bfa' },
    { label: 'Postgres', x: 92, y: 25, color: '#22c55e' },
    { label: 'Redis', x: 92, y: 75, color: '#f59e0b' },
  ];
  const links: [number, number][] = [[0, 2], [1, 2], [2, 3], [3, 4], [3, 5]];

  return (
    <div className="relative glass rounded-3xl p-6 aspect-[5/4]">
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        {links.map(([a, b], i) => {
          const A = nodes[a]!; const B = nodes[b]!;
          return (
            <motion.line
              key={i}
              x1={A.x} y1={A.y} x2={B.x} y2={B.y}
              stroke="rgba(255,255,255,0.18)" strokeWidth="0.4"
              strokeDasharray="1 1.5"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
              viewport={{ once: true }}
            />
          );
        })}
      </svg>
      {nodes.map((n, i) => (
        <motion.div
          key={i}
          className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
          style={{ left: `${n.x}%`, top: `${n.y}%` }}
          initial={{ opacity: 0, scale: 0.6 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 + i * 0.08, type: 'spring', stiffness: 240, damping: 18 }}
          viewport={{ once: true }}
        >
          <div
            className="w-12 h-12 rounded-full mx-auto"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${n.color}, ${n.color}55)`,
              boxShadow: `0 0 24px ${n.color}55`,
            }}
          />
          <div className="mt-1.5 text-[10.5px] font-mono text-ink-200">{n.label}</div>
        </motion.div>
      ))}
    </div>
  );
}
