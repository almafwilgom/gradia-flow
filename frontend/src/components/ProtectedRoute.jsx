import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSchoolAccess } from '../hooks/useSchoolAccess';

export default function ProtectedRoute({ roles }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const { error: schoolError, loading: schoolLoading, isOperational } = useSchoolAccess(profile);
  const limitedAccessPaths = ['/pending-approval', '/settings'];
  const isLimitedAccessPath = limitedAccessPaths.some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
  );

  if (loading || schoolLoading) return <div className="p-6 text-slate-600">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.email_confirmed_at) {
    return <div className="p-6 text-amber-600">Please verify your email address to continue.</div>;
  }
  if (schoolError) {
    return <div className="p-6 text-rose-600">{schoolError.message}</div>;
  }
  if (roles && roles.length > 0 && !roles.includes(profile?.role)) {
    return <div className="p-6 text-red-600">Access denied for your role.</div>;
  }
  if (profile?.role === 'school_admin' && !isOperational && !isLimitedAccessPath) {
    return <Navigate to="/pending-approval" replace />;
  }
  if (profile?.role === 'school_admin' && isOperational && location.pathname === '/pending-approval') {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet context={{ user, profile }} />;
}
