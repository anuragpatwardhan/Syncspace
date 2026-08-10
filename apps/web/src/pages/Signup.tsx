import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User as UserIcon, ArrowRight } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { Logo } from '@/components/Logo';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GoogleButton } from '@/components/GoogleButton';
import { PageTransition } from '@/components/PageTransition';
import { ApiError } from '@/lib/api';

export default function Signup() {
  const { signup, loading, googleEnabled, checkGoogle } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { checkGoogle(); }, [checkGoogle]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    try {
      await signup(email, name, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create account');
    }
  }

  const strength = scorePassword(password);

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
                <h1 className="text-3xl font-display tracking-tight">Create your space</h1>
                <p className="mt-2 text-sm text-ink-300">Start collaborating in under a minute.</p>
              </div>

              <div className="mt-7">
                <GoogleButton label="Sign up with Google" disabled={!googleEnabled} />
              </div>

              <div className="my-6 flex items-center gap-3 text-[11px] text-ink-400">
                <span className="flex-1 h-px divider-grad" />
                <span className="uppercase tracking-wider">or with email</span>
                <span className="flex-1 h-px divider-grad" />
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <Input
                  label="Name"
                  placeholder="Ada Lovelace"
                  leftIcon={<UserIcon className="w-4 h-4" />}
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@company.com"
                  leftIcon={<Mail className="w-4 h-4" />}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div>
                  <Input
                    label="Password"
                    type="password"
                    placeholder="At least 8 characters"
                    leftIcon={<Lock className="w-4 h-4" />}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <div className="mt-2 flex items-center gap-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        className="h-1 flex-1 rounded-full bg-white/10 overflow-hidden"
                      >
                        <motion.div
                          className="h-full rounded-full"
                          initial={false}
                          animate={{
                            width: i < strength.score ? '100%' : '0%',
                            backgroundColor: strength.color,
                          }}
                          transition={{ duration: 0.3 }}
                        />
                      </motion.div>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11px] text-ink-400">{strength.label}</p>
                </div>

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
                  Create account
                  <ArrowRight className="w-4 h-4" />
                </Button>

                <p className="text-[11px] text-ink-400 text-center">
                  By continuing you agree to our terms &amp; privacy notice.
                </p>
              </form>

              <p className="mt-6 text-center text-sm text-ink-300">
                Already have an account?{' '}
                <Link to="/login" className="text-white hover:underline underline-offset-4 decoration-white/30">
                  Sign in
                </Link>
              </p>
            </div>
          </motion.div>
        </main>
      </div>
    </PageTransition>
  );
}

function scorePassword(p: string) {
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  const labels = ['Too short', 'Weak', 'Okay', 'Strong', 'Excellent'];
  const colors = ['#ef4444', '#f59e0b', '#facc15', '#22c55e', '#34d399'];
  return { score, label: labels[score] ?? '', color: colors[score] ?? '#ef4444' };
}
