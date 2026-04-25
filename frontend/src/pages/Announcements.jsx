import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { SimpleTable } from '../components/SimpleTable';

export default function Announcements() {
  const { profile } = useAuth();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: '', body: '', audience: ['students', 'parents', 'teachers'] });

  const load = async () => {
    const { data } = await supabase
      .from('announcements')
      .select('id, title, body, audience, publish_at')
      .eq('school_id', profile?.school_id)
      .order('publish_at', { ascending: false });
    setItems(data ?? []);
  };

  useEffect(() => {
    if (profile?.school_id) load();
  }, [profile?.school_id]);

  const save = async (e) => {
    e.preventDefault();
    await supabase.from('announcements').insert({
      ...form,
      school_id: profile.school_id,
      created_by: profile.id
    });
    setForm({ title: '', body: '', audience: ['students', 'parents', 'teachers'] });
    load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Announcements & Notifications</h1>
        <p className="text-sm text-slate-500">Send updates to staff, parents, and students.</p>
      </div>

      <form onSubmit={save} className="bg-white rounded-xl p-4 shadow-card border border-slate-100 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <input
            className="border border-slate-200 rounded-lg px-3 py-2 md:col-span-2"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
          <select
            multiple
            className="border border-slate-200 rounded-lg px-3 py-2 bg-white"
            value={form.audience}
            onChange={(e) => setForm((f) => ({ ...f, audience: Array.from(e.target.selectedOptions).map((o) => o.value) }))}
          >
            {['students', 'parents', 'teachers', 'staff'].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <textarea
          className="border border-slate-200 rounded-lg px-3 py-2 w-full text-sm"
          rows={3}
          placeholder="Message"
          value={form.body}
          onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          required
        />
        <button className="rounded-lg bg-brand-600 text-white px-4 py-2 font-semibold hover:bg-brand-700">Publish</button>
      </form>

      <SimpleTable
        headers={['Title', 'Audience', 'Published']}
        rows={items.map((a) => [a.title, a.audience?.join(', '), new Date(a.publish_at).toLocaleString()])}
      />
    </div>
  );
}
