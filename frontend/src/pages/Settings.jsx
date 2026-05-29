import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const [school, setSchool] = useState(null);
  const [schools, setSchools] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

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
      paystack_public_key: school.paystack_public_key,
      current_term_fees: school.current_term_fees,
      next_resumption_date: school.next_resumption_date,
      current_session_year: school.current_session_year,
      current_term: school.current_term
    };

    const { error: saveError } = await supabase.from('schools').update(payload).eq('id', school.id);
    if (saveError) {
      setError(saveError.message);
      return;
    }

    setMessage('Saved.');
    await load();
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !school) return;

    setUploadingLogo(true);
    setError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${school.id}/logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('school-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('school-logos')
        .getPublicUrl(fileName);

      setSchool(current => ({ ...current, logo_url: publicUrl }));
      
      // Auto-save the logo URL to the school record
      const { error: updateError } = await supabase
        .from('schools')
        .update({ logo_url: publicUrl })
        .eq('id', school.id);

      if (updateError) throw updateError;
      
      setMessage('Logo uploaded and saved.');
    } catch (err) {
      setError('Logo upload failed: ' + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploadingAvatar(true);
    setError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;
      
      setMessage('Profile picture updated!');
      window.location.reload(); // Refresh to update all header/sidebar instances
    } catch (err) {
      setError('Avatar upload failed: ' + err.message);
    } finally {
      setUploadingAvatar(false);
    }
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
      
      {/* My Profile Section */}
      <div className="bg-white rounded-xl p-6 shadow-soft border border-slate-100">
        <h2 className="text-lg font-bold text-slate-800 mb-4">My Profile</h2>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-white shadow-md overflow-hidden flex items-center justify-center shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-slate-400">{profile?.full_name?.[0]?.toUpperCase()}</span>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-900">{profile?.full_name}</h3>
            <p className="text-sm text-slate-500 uppercase tracking-widest font-bold text-[10px]">{profile?.role}</p>
            <div className="flex gap-2">
              <label className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                uploadingAvatar ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
              }`}>
                {uploadingAvatar ? 'Uploading...' : 'Change Photo'}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Security & Password Section */}
      <div className="bg-white rounded-xl p-6 shadow-soft border border-slate-100">
        <h2 className="text-lg font-bold text-slate-800 mb-2">Security</h2>
        <p className="text-sm text-slate-500 mb-4">Manage your account security and password</p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <button
            onClick={() => navigate('/auth/forgot-password')}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors"
          >
            Change Password
          </button>
          <p className="text-xs text-slate-400 max-w-xs">
            For security, you'll be sent an email with a link to securely change your password.
          </p>
        </div>
      </div>

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
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-medium text-slate-500 uppercase">School Logo</label>
            <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div className="w-20 h-20 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center">
                {school.logo_url ? (
                  <img src={school.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="text-[10px] text-slate-400">No Logo</span>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                    uploadingLogo ? 'bg-slate-100 text-slate-400' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {uploadingLogo ? 'Uploading...' : 'Change Logo'}
                </label>
                <p className="text-[10px] text-slate-500">Recommended: Square PNG/JPG, max 2MB</p>
              </div>
            </div>
          </div>
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
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-slate-100">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 uppercase">Academic Session</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                value={school.current_session_year ?? ''}
                onChange={(e) => setSchool((current) => ({ ...current, current_session_year: e.target.value }))}
                placeholder="e.g. 2025/2026"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 uppercase">Current Term</label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white"
                value={school.current_term ?? 'Term 1'}
                onChange={(e) => setSchool((current) => ({ ...current, current_term: e.target.value }))}
              >
                <option>Term 1</option>
                <option>Term 2</option>
                <option>Term 3</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 uppercase">Term School Fees (₦)</label>
              <input
                type="number"
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                value={school.current_term_fees ?? 0}
                onChange={(e) => setSchool((current) => ({ ...current, current_term_fees: e.target.value }))}
                placeholder="e.g. 50000"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 uppercase">Resumption Date</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                value={school.next_resumption_date ?? ''}
                onChange={(e) => setSchool((current) => ({ ...current, next_resumption_date: e.target.value }))}
              />
            </div>
          </div>
          <button className="rounded-lg bg-brand-600 text-white px-4 py-2 font-semibold hover:bg-brand-700 md:col-span-2">
            Save
          </button>
        </form>
      )}
    </div>
  );
}
