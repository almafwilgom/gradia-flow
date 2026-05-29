import { useEffect, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { supabase } from '../lib/supabaseClient';

const fetcher = async (key) => {
  if (key === null) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id, school_id, role, full_name, email, phone, avatar_url, student_id,
        teachers(id, class_id, classes(name)),
        students(id, class_id, classes(name))
      `)
      .eq('id', key)
      .maybeSingle();
    
    if (error) {
      console.error('Profile fetch error:', error);
      // If it's a recursion error, we want to know
      if (error.message?.includes('recursion')) {
        window.dispatchEvent(new CustomEvent('supabase-recursion-error', { detail: error }));
      }
      return null;
    }
    return data;
  } catch (err) {
    console.error('Fetcher exception:', err);
    return null;
  }
};

export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previousUserId, setPreviousUserId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setPreviousUserId(data.session?.user?.id ?? null);
      setLoading(false);
    });
    
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      const currentUserId = currentSession?.user?.id ?? null;
      const oldUserId = previousUserId;
      
      // If user changed (logged out, or different user logged in), clear profile cache
      if (oldUserId && currentUserId !== oldUserId) {
        console.log(`[AUTH] User changed from ${oldUserId} to ${currentUserId}, clearing cache...`);
        mutate(oldUserId);
        mutate(currentUserId);
      }
      
      setSession(currentSession);
      setPreviousUserId(currentUserId);
    });
    
    return () => subscription.unsubscribe();
  }, [previousUserId]);

  const userId = session?.user?.id ?? null;
  const { data: profile, error, isLoading } = useSWR(userId, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true
  });

  const resolvedProfile = profile ??
    (session?.user
      ? {
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name ?? session.user.email ?? '',
          role: session.user.user_metadata?.role ?? '',
          school_id: session.user.user_metadata?.school_id ?? null,
          student_id: session.user.user_metadata?.student_id ?? null
        }
      : null);

  useEffect(() => {
    // Sync profile role with JWT metadata role
    if (profile?.role && session?.user) {
      const jwtRole = session.user.user_metadata?.role;
      
      // If JWT doesn't have role or roles don't match, refresh session to get updated JWT
      if (!jwtRole || profile.role !== jwtRole) {
        supabase.auth.refreshSession().catch(err => {
          console.error('Failed to refresh session:', err);
        });
      }
    }
  }, [profile?.role, session?.user?.user_metadata?.role]);

  return {
    session,
    user: session?.user ?? null,
    profile: resolvedProfile,
    loading: loading || isLoading,
    error
  };
}

export const hasRole = (profile, roles = []) => {
  if (!profile) return false;
  return roles.includes(profile.role);
};
