import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEffect } from 'react';

export default function RoleBasedRedirect() {
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      // Only navigate if we're done loading and confirmed no user
    }
  }, [loading, user]);

  if (loading) {
    return <div className="p-6 text-slate-600">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace={true} />;
  }

  if (!profile) {
    return <div className="p-6 text-slate-600">Loading profile...</div>;
  }

  // Route based on role
  const role = profile.role;

  if (role === 'super_admin') {
    return <Navigate to="/super-admin/dashboard" replace={true} />;
  }

  if (role === 'teacher') {
    return <Navigate to="/teacher/dashboard" replace={true} />;
  }

  if (role === 'school_admin') {
    return <Navigate to="/admin/dashboard" replace={true} />;
  }

  if (role === 'parent' || role === 'student') {
    return <Navigate to="/portal/home" replace={true} />;
  }

  return <Navigate to="/login" replace={true} />;
}
