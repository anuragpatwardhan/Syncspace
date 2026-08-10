import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Plus, StickyNote, Trash2, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { useWorkspaceSocket } from '@/lib/ws';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { PresenceStack } from '@/components/PresenceStack';
import { CursorOverlay } from '@/components/CursorOverlay';
import { PageTransition } from '@/components/PageTransition';
import { api } from '@/lib/api';
import type { Workspace } from '@syncspace/shared';

const NOTE_COLORS = ['#fde68a', '#fca5a5', '#a5f3fc', '#bbf7d0', '#ddd6fe', '#fbcfe8'];

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [meta, setMeta] = useState<Workspace | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const lastCursorEmit = useRef(0);

  const { status, state, presence, me, cursors, emitOp, emitCursor } = useWorkspaceSocket(id ?? null, token);

  useEffect(() => {
    if (!token || !id) return;
    (async () => {
      try {
        const res = await api.get<{ workspace: Workspace }>(`/workspaces/${id}`, token);
        setMeta(res.workspace);
      } catch {
        navigate('/dashboard');
      } finally {
        setMetaLoading(false);
      }
    })();
  }, [id, token, navigate]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const el = canvasRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const now = performance.now();
    if (now - lastCursorEmit.current > 35) {
      lastCursorEmit.current = now;
      emitCursor(x, y);
    }
  }, [emitCursor]);

  function addNote() {
    const el = canvasRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    emitOp({
      kind: 'note.add',
      id: `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      x: r.width / 2 - 80,
      y: r.height / 2 - 60,
      text: 'New note',
      color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)]!,
    });
  }

  const notes = useMemo(() => Object.values(state.notes).sort((a, b) => a.updatedAt - b.updatedAt), [state.notes]);

  return (
    <PageTransition>
      <AnimatedBackground />

      <header className="sticky top-0 z-40">
        <div className="mx-auto max-w-[1400px] px-6 pt-5">
          <div className="glass rounded-2xl px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="p-1.5 rounded-lg hover:bg-white/[0.05] text-ink-300 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <Logo animated={false} />
              <div className="hidden sm:flex items-center gap-2 text-ink-400">
                <span className="text-white/40">/</span>
                <span className="text-[14px] text-ink-100 tracking-tight">{meta?.name ?? '…'}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <ConnectionPill status={status} />
              <div className="hidden md:flex items-center gap-3 pl-3 border-l border-white/10">
                <PresenceStack users={presence} />
              </div>
              <Button size="sm" onClick={addNote}>
                <Plus className="w-3.5 h-3.5" /> Note
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 mt-6 pb-12">
        <div className="grid grid-cols-12 gap-4">
          <aside className="hidden lg:block col-span-3">
            <Sidebar count={notes.length} status={status} version={state.version} meta={meta} loading={metaLoading} />
          </aside>

          <div className="col-span-12 lg:col-span-9">
            <div
              ref={canvasRef}
              onMouseMove={onMouseMove}
              className="relative glass rounded-3xl overflow-hidden h-[calc(100vh-180px)] min-h-[560px]"
            >
              <div className="absolute inset-0 bg-grid-faint bg-grid-32 opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_90%)]" />

              <CursorOverlay presence={presence} cursors={cursors} selfId={me?.userId} />

              <AnimatePresence>
                {notes.map((n) => (
                  <NoteCard
                    key={n.id}
                    note={n}
                    onMove={(x, y) => emitOp({ kind: 'note.move', id: n.id, x, y })}
                    onEdit={(text) => emitOp({ kind: 'note.edit', id: n.id, text })}
                    onDelete={() => emitOp({ kind: 'note.delete', id: n.id })}
                  />
                ))}
              </AnimatePresence>

              {notes.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="absolute inset-0 grid place-items-center pointer-events-none"
                >
                  <div className="text-center">
                    <div className="inline-flex w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-400/20 items-center justify-center">
                      <StickyNote className="w-6 h-6 text-violet-300" />
                    </div>
                    <p className="mt-4 text-ink-200 font-display text-2xl tracking-tight">An empty canvas.</p>
                    <p className="mt-1 text-sm text-ink-400">Drop your first note — anyone in the room will see it instantly.</p>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>
    </PageTransition>
  );
}

function ConnectionPill({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; icon: JSX.Element }> = {
    connecting: { label: 'Connecting', color: '#f59e0b', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    connected:  { label: 'Live',       color: '#22c55e', icon: <Wifi className="w-3 h-3" /> },
    disconnected: { label: 'Offline',  color: '#9ca3af', icon: <WifiOff className="w-3 h-3" /> },
    error:      { label: 'Error',      color: '#ef4444', icon: <WifiOff className="w-3 h-3" /> },
  };
  const m = map[status] ?? map.disconnected!;
  return (
    <motion.div
      key={status}
      initial={{ opacity: 0, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11.5px] font-medium border"
      style={{ color: m.color, borderColor: `${m.color}40`, background: `${m.color}10` }}
    >
      {m.icon} {m.label}
    </motion.div>
  );
}

function Sidebar({ count, status, version, meta, loading }: { count: number; status: string; version: number; meta: Workspace | null; loading: boolean }) {
  return (
    <div className="glass rounded-3xl p-6 sticky top-28">
      <p className="text-[11px] uppercase tracking-[0.18em] text-violet-300/80 font-mono">Workspace</p>
      <h2 className="mt-2 text-[22px] font-display tracking-tight truncate">
        {loading ? '…' : meta?.name ?? 'Untitled'}
      </h2>
      <p className="mt-1 text-[12px] text-ink-400">
        {meta ? `Created ${new Date(meta.createdAt).toLocaleDateString()}` : ' '}
      </p>

      <div className="mt-6 space-y-3">
        <Stat label="Notes" value={count.toString()} />
        <Stat label="Version" value={`v${version}`} />
        <Stat label="Status" value={status} />
      </div>

      <div className="mt-6 pt-6 border-t border-white/5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-violet-300/80 font-mono">Pro tip</p>
        <p className="mt-2 text-[13px] text-ink-300 leading-relaxed">
          Drag notes anywhere. Edits stream to every connected peer with server-ordered consistency.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-400">{label}</span>
      <span className="text-white font-mono text-[12.5px]">{value}</span>
    </div>
  );
}

function NoteCard({
  note, onMove, onEdit, onDelete,
}: {
  note: { id: string; x: number; y: number; text: string; color: string };
  onMove: (x: number, y: number) => void;
  onEdit: (text: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragEnd={(_, info) => onMove(note.x + info.offset.x, note.y + info.offset.y)}
      initial={{ opacity: 0, scale: 0.85, rotate: -2 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      whileHover={{ scale: 1.02, rotate: 0.5 }}
      whileDrag={{ scale: 1.05, rotate: 2, zIndex: 50 }}
      className="absolute group cursor-grab active:cursor-grabbing select-none"
      style={{
        left: note.x, top: note.y, x: 0, y: 0,
        width: 192, minHeight: 128,
        background: `linear-gradient(135deg, ${note.color}, ${note.color}dd)`,
        borderRadius: 12,
        boxShadow: '0 14px 40px -10px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04) inset',
      }}
    >
      <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onDelete}
          className="w-6 h-6 rounded-full bg-ink-950/80 backdrop-blur grid place-items-center text-white hover:text-red-300 transition-colors"
          aria-label="Delete note"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {editing ? (
        <textarea
          autoFocus
          defaultValue={note.text}
          onBlur={(e) => { onEdit(e.target.value); setEditing(false); }}
          onKeyDown={(e) => { if (e.key === 'Escape') (e.target as HTMLTextAreaElement).blur(); }}
          className="w-full h-full bg-transparent p-3 text-[13.5px] font-medium text-ink-900 outline-none resize-none"
          style={{ minHeight: 128 }}
        />
      ) : (
        <div
          onDoubleClick={() => setEditing(true)}
          className="p-3 text-[13.5px] font-medium text-ink-900 leading-snug whitespace-pre-wrap"
          style={{ minHeight: 128 }}
        >
          {note.text || <span className="text-ink-700/60">Double-click to edit</span>}
        </div>
      )}
    </motion.div>
  );
}
