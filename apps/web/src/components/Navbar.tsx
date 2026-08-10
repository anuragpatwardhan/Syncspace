import { Link, useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { useAuth } from '@/store/auth';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';
import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-40"
    >
      <div className="mx-auto max-w-7xl px-6 pt-5">
        <div className="glass rounded-2xl px-4 py-2.5 flex items-center justify-between">
          <Link to={user ? '/dashboard' : '/'} className="flex items-center">
            <Logo />
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm text-ink-300">
            <a href="#features" className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-white/[0.04] transition-colors">Features</a>
            <a href="#architecture" className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-white/[0.04] transition-colors">Architecture</a>
            <a href="#pricing" className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-white/[0.04] transition-colors">Pricing</a>
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link to="/dashboard" className="text-sm text-ink-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors hidden sm:inline-block">
                  Dashboard
                </Link>
                <div className="flex items-center gap-2 pl-1">
                  <Avatar name={user.name} url={user.avatarUrl} size={32} ring />
                  <button
                    onClick={() => { logout(); navigate('/'); }}
                    className="p-2 rounded-lg text-ink-300 hover:text-white hover:bg-white/[0.05] transition-colors"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">Sign in</Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm">Get started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
