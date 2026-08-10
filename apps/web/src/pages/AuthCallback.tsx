import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/store/auth';
import { Logo } from '@/components/Logo';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { api } from '@/lib/api';
import type { User } from '@syncspace/shared';

export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setSession } = useAuth();

  useEffect(() => {
    const token = params.get('token');
    if (!token) { navigate('/login'); return; }
    (async () => {
      try {
        const res = await api.get<{ user: User | null }>('/auth/me', token);
        if (res.user) {
          setSession(token, res.user);
          navigate('/dashboard');
        } else {
          navigate('/login');
        }
      } catch {
        navigate('/login');
      }
    })();
  }, [params, navigate, setSession]);

  return (
    <>
      <AnimatedBackground />
      <div className="min-h-screen flex flex-col items-center justify-center gap-8">
        <Logo />
        <motion.div
          className="flex items-center gap-2 text-ink-300 text-sm"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
          Finishing sign-in…
        </motion.div>
      </div>
    </>
  );
}
