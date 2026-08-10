import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import type { ReactNode } from 'react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const loc = useLocation();
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  }
  return <>{children}</>;
}
