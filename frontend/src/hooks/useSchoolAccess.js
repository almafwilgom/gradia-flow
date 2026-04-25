import useSWR from 'swr';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabaseClient';

const fetchSchoolAccess = async ([, schoolId]) => {
  if (!schoolId) return null;

  const { data, error } = await supabase
    .from('schools')
    .select(
      'id, name, school_code, status, disabled_at, disabled_reason, demo_started_at, demo_expires_at, subscription_status, created_at'
    )
    .eq('id', schoolId)
    .single();

  if (error) throw error;
  return data;
};

export function useSchoolAccess(profile) {
  const shouldCheck = profile?.role === 'school_admin' && !!profile?.school_id;
  const { data: school, error, isLoading } = useSWR(
    shouldCheck ? ['school-access', profile.school_id] : null,
    fetchSchoolAccess
  );

  const isOperational = !shouldCheck || (!!school && (school.status === 'approved' || (school.subscription_status === 'demo' && dayjs().isBefore(dayjs(school.demo_expires_at)))) && school.status !== 'disabled' && !school.disabled_at);

  return {
    school,
    error,
    loading: shouldCheck && isLoading,
    isOperational,
    isPending: shouldCheck && !!school && school.status !== 'approved' && school.status !== 'disabled' && !school.disabled_at,
    isDisabled: shouldCheck && !!school && (school.status === 'disabled' || school.disabled_at)
  };
}
