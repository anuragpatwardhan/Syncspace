import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, ArrowRight, Sparkles, Search } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { api } from '@/lib/api';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageTransition } from '@/components/PageTransition';
import type { Workspace } from '@syncspace/shared';

type Row = Workspace & { role?: string };

export default function Dashboard() {
  const { token, user, fetchMe } = useAuth();
  const [workspaces, setWorkspaces] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => { fetchMe(); }, [fetchMe]);
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await api.get<{ workspaces: Row[] }>('/workspaces', token);
        setWorkspaces(res.workspaces);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const filtered = workspaces.filter((w) => w.name.toLowerCase().includes(filter.toLowerCase()));

  async function createWorkspace(name: string) {
    const res = await api.post<{ workspace: Workspace }>('/workspaces', { name }, token);
    setOpen(false);
    navigate(`/w/${res.workspace.id}`);
  }

  return (
    <PageTransition>
      <AnimatedBackground />
      <Navbar />

      <main className="mx-auto max-w-7xl px-6 pt-14 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-6"
        >
          <div>
            <p className="text-[12px] uppercase tracking-[0.18em] text-violet-300/80 font-mono">
              Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </p>
            <h1 className="mt-2 text-4xl md:text-5xl font-display tracking-tight">
              Your <span className="italic text-ink-300">spaces.</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex-1 md:w-72">
              <Input
                placeholder="Search workspaces"
                leftIcon={<Search className="w-4 h-4" />}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            <Button onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4" /> New
            </Button>
          </div>
        </motion.div>

        <div className="mt-10">
          {loading ? (
            <SkeletonGrid />
          ) : filtered.length === 0 ? (
            <EmptyState onCreate={() => setOpen(true)} hasAny={workspaces.length > 0} />
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <AnimatePresence>
                {filtered.map((w, i) => (
                  <WorkspaceCard key={w.id} ws={w} index={i} />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </main>

      <CreateWorkspaceModal open={open} onClose={() => setOpen(false)} onCreate={createWorkspace} />
    </PageTransition>
  );
}

function WorkspaceCard({ ws, index }: { ws: Row; index: number }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
    >
      <Link
        to={`/w/${ws.id}`}
        className="group relative block glass rounded-2xl p-5 h-44 overflow-hidden hover:border-white/20 transition-colors"
      >
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-30 group-hover:opacity-60 transition-opacity"
          style={{ background: `radial-gradient(closest-side, ${colorFromId(ws.id)}, transparent 70%)` }} />
        <div className="flex items-start justify-between">
          <div
            className="w-9 h-9 rounded-lg grid place-items-center text-white font-medium"
            style={{
              background: `linear-gradient(135deg, ${colorFromId(ws.id)}, ${colorFromId(ws.id)}99)`,
              boxShadow: `0 8px 24px -8px ${colorFromId(ws.id)}88`,
            }}
          >
            {ws.name[0]?.toUpperCase() ?? '·'}
          </div>
          {ws.role === 'owner' && (
            <span className="text-[10.5px] uppercase tracking-wider text-violet-300/80 font-mono">Owner</span>
          )}
        </div>
        <h3 className="mt-4 text-[15px] font-medium tracking-tight text-white truncate">{ws.name}</h3>
        <p className="text-[12px] text-ink-400 mt-1">
          Updated {new Date(ws.updatedAt).toLocaleDateString()}
        </p>
        <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between text-ink-300">
          <span className="inline-flex items-center gap-1.5 text-[12px]">
            <Users className="w-3.5 h-3.5" /> {ws.memberCount ?? 1} {ws.memberCount === 1 ? 'member' : 'members'}
          </span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </div>
      </Link>
    </motion.div>
  );
}

function EmptyState({ onCreate, hasAny }: { onCreate: () => void; hasAny: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass rounded-3xl p-12 text-center"
    >
      <div className="inline-flex w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-400/20 items-center justify-center">
        <Sparkles className="w-6 h-6 text-violet-300" />
      </div>
      <h3 className="mt-4 text-2xl font-display tracking-tight">
        {hasAny ? 'No matches' : 'Your first space awaits'}
      </h3>
      <p className="mt-2 text-ink-300 text-sm max-w-md mx-auto">
        {hasAny
          ? 'Try a different search, or create a new workspace.'
          : 'Workspaces are where your team edits, plans, and ships together — in real time.'}
      </p>
      <div className="mt-6">
        <Button onClick={onCreate}>
          <Plus className="w-4 h-4" /> Create workspace
        </Button>
      </div>
    </motion.div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="glass rounded-2xl p-5 h-44 relative overflow-hidden">
          <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/[0.04] to-transparent bg-[length:200%_100%]" />
          <div className="w-9 h-9 rounded-lg bg-white/[0.06]" />
          <div className="mt-5 h-3.5 w-3/5 rounded bg-white/[0.06]" />
          <div className="mt-2 h-3 w-2/5 rounded bg-white/[0.04]" />
        </div>
      ))}
    </div>
  );
}

function CreateWorkspaceModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (name: string) => Promise<void> }) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try { await onCreate(name.trim()); setName(''); }
    finally { setSubmitting(false); }
  }
  return (
    <Modal open={open} onClose={onClose} title="Create a new workspace">
      <form onSubmit={go} className="space-y-4">
        <Input
          label="Workspace name"
          placeholder="Product launch"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={submitting}>Create</Button>
        </div>
      </form>
    </Modal>
  );
}

function colorFromId(id: string) {
  const palette = ['#8b5cf6', '#ec4899', '#06b6d4', '#22c55e', '#f59e0b', '#a855f7', '#14b8a6'];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return palette[h % palette.length]!;
}
