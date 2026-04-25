import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';

function formatStatus(school) {
  if (!school) return 'Unknown';
  if (school.status === 'disabled' || school.disabled_at) return 'Disabled';
  if (school.status !== 'approved') return 'Pending approval';
  return 'Approved';
}


export default function Settings() {
  const { profile, loading: authLoading } = useAuth();
  const [school, setSchool] = useState(null);
  const [schools, setSchools] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState('');

  const load = async () => {
    setError('');
    setLoading(true);
    setDebugInfo(`Profile role: ${profile?.role}, school_id: ${profile?.school_id}`);

    try {
      if (profile?.role === 'super_admin') {
        try {
          const { data: schoolsData, error: schoolsError } = await supabase
            .from('schools')
            .select('id, name, school_code, status, created_at, demo_expires_at, disabled_reason')
            .order('created_at', { ascending: false });

          if (schoolsError) {
            console.error('Schools query error:', schoolsError);
            setError(`Schools load failed: ${schoolsError.message}`);
          } else {
            setSchools(schoolsData ?? []);
            setDebugInfo(prev => `${prev} | Schools loaded: ${schoolsData?.length ?? 0}`);
          }
        } catch (e) {
          console.error('Exception loading schools:', e);
          setError(`Failed to load schools: ${e.message}`);
        }
      }

      if (!profile?.school_id) {
        setLoading(false);
        setDebugInfo(prev => `${prev} | No school_id found`);
        return;
      }

      try {
        const { data, error: schoolError } = await supabase
          .from('schools')
          .select('*')
          .eq('id', profile.school_id)
          .single();

        if (schoolError) {
          console.error('School fetch error:', schoolError);
          setError(`School load failed: ${schoolError.message}`);
        } else {
          setSchool(data);
          setDebugInfo(prev => `${prev} | School loaded: ${data?.name}`);
        }
      } catch (e) {
        console.error('Exception loading school:', e);
        setError(`Failed to load school: ${e.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && profile) {
      load();
    }
  }, [profile?.school_id, profile?.role, authLoading]);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const payload = {
      name: school.name,
      logo_url: school.logo_url,
      bank_name: school.bank_name,
      bank_account_name: school.bank_account_name,
      bank_account_number: school.bank_account_number,
      paystack_enabled: school.paystack_enabled,
      paystack_public_key: school.paystack_public_key
    };

    const { error: saveError } = await supabase.from('schools').update(payload).eq('id', school.id);
    if (saveError) {
      setError(saveError.message);
      return;
    }

    setMessage('Saved.');
    await load();
  };
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-slate-500">School configuration, approvals, login codes, and payments</p>
      </div>

      {error && <div className="text-sm text-rose-600">{error}</div>}
      {message && <div className="text-sm text-emerald-700">{message}</div>}
      {debugInfo && <div className="text-xs text-slate-500 bg-slate-100 p-2 rounded mb-4">{debugInfo}</div>}

      {school?.school_code && (
        <div className="bg-white rounded-xl p-4 shadow-card border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-slate-500">School login code</div>
              <div className="mt-1 text-2xl font-semibold tracking-wide text-slate-900">{school.school_code}</div>
              <p className="mt-2 text-sm text-slate-500">
                Share this code with students, parents, and teachers so they can find your school during registration.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50 text-sm text-slate-700">
              <div>Status: <span className="font-semibold">{formatStatus(school)}</span></div>
              <div>Demo ends: <span className="font-semibold">{school.demo_expires_at ? dayjs(school.demo_expires_at).format('DD MMM YYYY') : 'Not set'}</span></div>
              {school.disabled_reason && (
                <div>Disable note: <span className="font-semibold">{school.disabled_reason}</span></div>
              )}
            </div>
          </div>
        </div>
      )}

      {profile?.role === 'super_admin' && (
        <div className="bg-white rounded-xl p-4 shadow-card border border-slate-100 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">School Management</h2>
            <p className="text-sm text-slate-500">
              Confirm schools before they gain privileges, disable them when needed, or remove them entirely.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-3 pr-4 font-medium">School</th>
                  <th className="py-3 pr-4 font-medium">Code</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Demo Ends</th>
                                  </tr>
              </thead>
              <tbody>
                {schools.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100 align-top">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-slate-900">{entry.name}</div>
                      <div className="text-xs text-slate-500">{dayjs(entry.created_at).format('DD MMM YYYY')}</div>
                    </td>
                    <td className="py-3 pr-4">{entry.school_code ?? 'Pending'}</td>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-slate-900">{formatStatus(entry)}</div>
                      {entry.disabled_reason && (
                        <div className="text-xs text-slate-500">{entry.disabled_reason}</div>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {entry.demo_expires_at ? dayjs(entry.demo_expires_at).format('DD MMM YYYY') : 'Not set'}
                    </td>
                  </tr>
                ))}
                {schools.length === 0 && (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-slate-500">
                      No schools found yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading && authLoading && <div>Loading settings...</div>}
      {loading && !authLoading && profile?.role !== 'super_admin' && !profile?.school_id && (
        <div className="text-sm text-slate-600">No school assigned to your account.</div>
      )}

      {school && (
        <form
          onSubmit={save}
          className="bg-white rounded-xl p-4 shadow-card border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm"
        >
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={school.name ?? ''}
            onChange={(e) => setSchool((current) => ({ ...current, name: e.target.value }))}
            placeholder="School name"
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={school.logo_url ?? ''}
            onChange={(e) => setSchool((current) => ({ ...current, logo_url: e.target.value }))}
            placeholder="Logo URL"
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={school.bank_name ?? ''}
            onChange={(e) => setSchool((current) => ({ ...current, bank_name: e.target.value }))}
            placeholder="Bank name"
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={school.bank_account_name ?? ''}
            onChange={(e) => setSchool((current) => ({ ...current, bank_account_name: e.target.value }))}
            placeholder="Account name"
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={school.bank_account_number ?? ''}
            onChange={(e) => setSchool((current) => ({ ...current, bank_account_number: e.target.value }))}
            placeholder="Account number"
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!school.paystack_enabled}
              onChange={(e) => setSchool((current) => ({ ...current, paystack_enabled: e.target.checked }))}
            />
            <span className="text-slate-700">Enable Paystack</span>
          </div>
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 md:col-span-2"
            value={school.paystack_public_key ?? ''}
            onChange={(e) => setSchool((current) => ({ ...current, paystack_public_key: e.target.value }))}
            placeholder="Paystack Public Key"
          />
          <button className="rounded-lg bg-brand-600 text-white px-4 py-2 font-semibold hover:bg-brand-700 md:col-span-2">
            Save
          </button>
        </form>
      )}
    </div>
  );
}

