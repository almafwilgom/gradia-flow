import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { SimpleTable } from '../components/SimpleTable';

export default function Subscriptions() {
  const { profile } = useAuth();
  const [subs, setSubs] = useState([]);
  const [form, setForm] = useState({ plan: 'pro', amount: 0, period_months: 1 });

  const load = async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('school_id', profile?.school_id)
      .order('created_at', { ascending: false });
    setSubs(data ?? []);
  };

  useEffect(() => {
    if (profile?.school_id) load();
  }, [profile?.school_id]);

  const createSub = async (e) => {
    e.preventDefault();
    await supabase.from('subscriptions').insert({
      ...form,
      amount: Number(form.amount),
      school_id: profile.school_id,
      status: 'active',
      starts_at: new Date().toISOString(),
      next_billing_at: new Date(new Date().setMonth(new Date().getMonth() + Number(form.period_months)))
    });
    setForm({ plan: 'pro', amount: 0, period_months: 1 });
    load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Subscriptions</h1>
        <p className="text-sm text-slate-500">Manage GradiaFlow billing per school.</p>
      </div>

      <form onSubmit={createSub} className="bg-white rounded-xl p-4 shadow-card border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
        <select className="border border-slate-200 rounded-lg px-3 py-2 bg-white" value={form.plan} onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <input type="number" className="border border-slate-200 rounded-lg px-3 py-2" placeholder="Amount" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
        <input type="number" className="border border-slate-200 rounded-lg px-3 py-2" placeholder="Months" value={form.period_months} onChange={(e) => setForm((f) => ({ ...f, period_months: e.target.value }))} />
        <button className="rounded-lg bg-brand-600 text-white px-3 py-2 font-semibold">Start/Renew</button>
      </form>

      <SimpleTable
        headers={['Plan', 'Amount', 'Status', 'Start', 'Next Billing']}
        rows={subs.map((s) => [
          s.plan,
          `â‚¦${Number(s.amount).toLocaleString()}`,
          s.status,
          new Date(s.starts_at).toDateString(),
          s.next_billing_at ? new Date(s.next_billing_at).toDateString() : '-'
        ])}
      />
    </div>
  );
}

