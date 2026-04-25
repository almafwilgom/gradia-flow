import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { SimpleTable } from '../components/SimpleTable';
import { apiFetch } from '../lib/api';

const SCHOOL_SECTIONS = [
  { value: 'nursery', label: 'Nursery' },
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' }
];

function normalizeSection(value) {
  const level = String(value || '').trim().toLowerCase();
  if (level.includes('nursery')) return 'nursery';
  if (level.includes('primary')) return 'primary';
  if (level.includes('secondary')) return 'secondary';
  return level;
}

function groupClassesBySection(classes) {
  const groups = { nursery: [], primary: [], secondary: [], other: [] };
  classes.forEach((cls) => {
    const section = normalizeSection(cls.level);
    if (groups[section]) groups[section].push(cls);
    else groups.other.push(cls);
  });
  return groups;
}

export default function Staff() {
  const { profile, session } = useAuth();
  const [staff, setStaff] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({ full_name: '', email: '', class_id: '' });
  const [error, setError] = useState(null);
  const [inviteResult, setInviteResult] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: staffData, error: staffErr }, { data: classData, error: classErr }] = await Promise.all([
        supabase
          .from('teachers')
          .select('id, profile_id, class_id, responsibilities, school_id, created_at, profiles(full_name), classes(name, level)')
          .eq('school_id', profile?.school_id)
          .limit(50),
        supabase
          .from('classes')
          .select('id, name, level')
          .eq('school_id', profile?.school_id)
          .order('level', { ascending: true })
          .order('name', { ascending: true })
      ]);

      if (staffErr) {
        console.error('Staff loading error:', staffErr);
      } else {
        setStaff(staffData ?? []);
      }

      if (classErr) {
        console.error('Classes loading error:', classErr);
        setError(`Failed to load classes: ${classErr.message}`);
      } else {
        setClasses(classData ?? []);
      }
    } catch (e) {
      console.error('Load error:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.school_id) load();
  }, [profile?.school_id]);

  const classGroups = useMemo(() => groupClassesBySection(classes), [classes]);

  const addTeacher = async (e) => {
    e.preventDefault();
    setError(null);
    setInviteResult(null);
    try {
      if (!form.class_id) {
        throw new Error('Select the class this teacher will manage.');
      }
      const {
        data: { session: liveSession }
      } = await supabase.auth.getSession();
      if (!liveSession?.access_token) {
        throw new Error('Your session has expired. Please log in again and retry.');
      }

      const invitedEmail = form.email;
      const data = await apiFetch('/api/admin/users', {
        method: 'POST',
        token: liveSession.access_token,
        body: {
          full_name: form.full_name,
          email: form.email,
          role: 'teacher',
          school_id: profile.school_id,
          class_id: form.class_id
        }
      });
      setInviteResult({ ...data, email: invitedEmail });
      setForm({ full_name: '', email: '', class_id: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const updateStaffClass = async (staffId, newClassId) => {
    try {
      const { error: updateErr } = await supabase
        .from('teachers')
        .update({ class_id: newClassId })
        .eq('id', staffId);
      if (updateErr) throw updateErr;
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const deleteStaff = async (staffId, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This will remove their teacher record and access.`)) return;
    try {
      // First delete from teachers
      const { error: deleteErr } = await supabase
        .from('teachers')
        .delete()
        .eq('id', staffId);
      if (deleteErr) throw deleteErr;
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Staff</h1>
          <p className="text-sm text-slate-500">Teachers & non-teaching staff</p>
        </div>
      </div>

      <form onSubmit={addTeacher} className="bg-white rounded-xl p-4 shadow-card border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          placeholder="Full name"
          className="rounded-lg border border-slate-200 px-3 py-2"
          value={form.full_name}
          onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
          required
        />
        <input
          placeholder="Email"
          type="email"
          className="rounded-lg border border-slate-200 px-3 py-2"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          required
        />
        <select
          className="rounded-lg border border-slate-200 px-3 py-2 bg-white"
          value={form.class_id}
          onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value }))}
          required
          disabled={loading || classes.length === 0}
        >
          <option value="">
            {loading ? 'Loading classes...' : classes.length === 0 ? 'No classes available' : 'Assign class'}
          </option>
          {SCHOOL_SECTIONS.map((section) => {
            const sectionClasses = classGroups[section.value] ?? [];
            if (sectionClasses.length === 0) return null;
            return (
              <optgroup key={section.value} label={`── ${section.label} ──`}>
                {sectionClasses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
        <button className="rounded-lg bg-brand-600 text-white px-4 py-2 font-semibold hover:bg-brand-700">Invite</button>
        {error && <div className="text-sm text-rose-600 col-span-full">{error}</div>}
        {classes.length === 0 && !loading && (
          <div className="text-sm text-amber-600 col-span-full">
            ⚠️ No classes created yet. Create classes in the Classes section first.
          </div>
        )}
        {inviteResult?.temporary_password && (
          <div className="text-sm text-emerald-700 col-span-full">
            Temporary password for {inviteResult.email}: <span className="font-semibold">{inviteResult.temporary_password}</span>
          </div>
        )}
      </form>

      <div className="bg-white rounded-xl shadow-card border border-slate-100 overflow-hidden">
        <SimpleTable
          headers={['Name', 'Class Assignment', 'Role', 'Joined', 'Actions']}
          rows={staff.map((s) => [
            s.profiles?.full_name ?? 'N/A',
            <select
              key={`class-select-${s.id}`}
              className="text-sm border border-slate-200 rounded px-2 py-1 bg-white"
              value={s.class_id || ''}
              onChange={(e) => updateStaffClass(s.id, e.target.value)}
            >
              <option value="">Unassigned</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.level})</option>
              ))}
            </select>,
            'Teacher',
            new Date(s.created_at).toDateString(),
            <button
              key={`delete-${s.id}`}
              onClick={() => deleteStaff(s.id, s.profiles?.full_name)}
              className="text-rose-600 hover:text-rose-800 font-medium text-sm"
            >
              Delete
            </button>
          ])}
        />
      </div>
    </div>
  );
}
