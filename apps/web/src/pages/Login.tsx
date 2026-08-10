import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { Logo } from '@/components/Logo';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GoogleButton } from '@/components/GoogleButton';
import { PageTransition } from '@/components/PageTransition';
import { ApiError } from '@/lib/api';

export default function Login() {
  const { login, loading, googleEnabled, checkGoogle } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { checkGoogle(); }, [checkGoogle]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate(loc.state?.from ?? '/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sign in');
    }
  }

  return (
    <PageTransition>
      <AnimatedBackground />
      <div className="min-h-screen flex flex-col">
        <div className="mx-auto max-w-7xl w-full px-6 pt-8">
          <Link to="/" className="inline-flex"><Logo /></Link>
        </div>

        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md"
          >
            <div className="absolute -inset-10 bg-mesh-1 opacity-50 blur-2xl -z-10" />
            <div className="glass-strong rounded-3xl p-8 shadow-glow">
              <div className="text-center">
                <h1 className="text-3xl font-display tracking-tight">Welcome back</h1>
                <p className="mt-2 text-sm text-ink-300">Sign in to your SyncSpace workspace.</p>
              </div>

              <div className="mt-7 space-y-3">
                <GoogleButton disabled={!googleEnabled} />
                {!googleEnabled && (
                  <p className="text-[11px] text-ink-400 text-center -mt-1">
                    Set <span className="font-mono">GOOGLE_CLIENT_ID</span> &amp; <span className="font-mono">GOOGLE_CLIENT_SECRET</span> to enable.
                  </p>
                )}
              </div>

              <div className="my-6 flex items-center gap-3 text-[11px] text-ink-400">
                <span className="flex-1 h-px divider-grad" />
                <span className="uppercase tracking-wider">or with email</span>
                <span className="flex-1 h-px divider-grad" />
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@company.com"
                  leftIcon={<Mail className="w-4 h-4" />}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  leftIcon={<Lock className="w-4 h-4" />}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[12.5px] text-red-300 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2"
                  >
                    {error}
                  </motion.p>
                )}

                <Button type="submit" size="lg" fullWidth loading={loading}>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-ink-300">
                New to SyncSpace?{' '}
                <Link to="/signup" className="text-white hover:underline underline-offset-4 decoration-white/30">
                  Create an account
                </Link>
              </p>
            </div>
          </motion.div>
        </main>
      </div>
    </PageTransition>
  );
}
