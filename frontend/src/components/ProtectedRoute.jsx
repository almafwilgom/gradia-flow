import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSchoolAccess } from '../hooks/useSchoolAccess';
import { useState } from 'react';
import { apiFetch } from '../lib/api';

export default function ProtectedRoute({ roles }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const { error: schoolError, loading: schoolLoading, isOperational } = useSchoolAccess(profile);
  const limitedAccessPaths = ['/pending-approval', '/settings'];
  const isLimitedAccessPath = limitedAccessPaths.some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
  );
  const [fixing, setFixing] = useState(false);
  const [fixError, setFixError] = useState(null);

  const handleFixRole = async () => {
    setFixing(true);
    setFixError(null);
    try {
      const data = await apiFetch('/api/verify-super-admin-role', { method: 'POST' });
      if (data.fixed) {
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to fix role:', err);
      setFixError(err.message);
    } finally {
      setFixing(false);
    }
  };

  if (loading || schoolLoading) return <div className="p-6 text-slate-600">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.email_confirmed_at) {
    return <div className="p-6 text-amber-600">Please verify your email address to continue.</div>;
  }
  if (schoolError) {
    return <div className="p-6 text-rose-600">{schoolError.message}</div>;
  }
  
  if (roles && roles.length > 0) {
    const userRole = profile?.role || '';
    const hasAccess = roles.includes(userRole);
    
    if (!hasAccess) {
      return (
        <div className="p-6">
          <div className="text-red-600 mb-4">
            <p>Access denied. Your role: <strong>{userRole || 'unknown'}</strong></p>
            <p className="text-sm mt-2">Required roles: {roles.join(', ')}</p>
          </div>
          <button 
            onClick={handleFixRole}
            disabled={fixing}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {fixing ? 'Fixing...' : 'Fix Role Issue'}
          </button>
          {fixError && <div className="text-red-600 text-sm mt-2">{fixError}</div>}
        </div>
      );
    }
  }
  
  if (profile?.role === 'school_admin' && !isOperational && !isLimitedAccessPath) {
    return <Navigate to="/pending-approval" replace />;
  }
  if (profile?.role === 'school_admin' && isOperational && location.pathname === '/pending-approval') {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet context={{ user, profile }} />;
}
