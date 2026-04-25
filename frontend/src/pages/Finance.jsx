import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { SimpleTable } from '../components/SimpleTable';

export default function Finance() {
  const { profile } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [staff, setStaff] = useState([]);
  const [expenseForm, setExpenseForm] = useState({ category: '', amount: '', incurred_on: '' });
  const [payrollForm, setPayrollForm] = useState({ staff_profile_id: '', month: 1, year: new Date().getFullYear(), gross: '', net: '' });

  const load = async () => {
    const [ex, pr, st] = await Promise.all([
      supabase.from('expenses').select('*').eq('school_id', profile?.school_id).order('incurred_on', { ascending: false }),
      supabase.from('payroll').select('*, profiles(full_name)').eq('school_id', profile?.school_id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name').eq('school_id', profile?.school_id).in('role', ['teacher', 'school_admin'])
    ]);
    setExpenses(ex.data ?? []);
    setPayroll(pr.data ?? []);
    setStaff(st.data ?? []);
  };

  useEffect(() => {
    if (profile?.school_id) load();
  }, [profile?.school_id]);

  const addExpense = async (e) => {
    e.preventDefault();
    await supabase.from('expenses').insert({
      ...expenseForm,
      amount: Number(expenseForm.amount),
      school_id: profile.school_id
    });
    setExpenseForm({ category: '', amount: '', incurred_on: '' });
    load();
  };

  const addPayroll = async (e) => {
    e.preventDefault();
    await supabase.from('payroll').insert({
      ...payrollForm,
      month: Number(payrollForm.month),
      year: Number(payrollForm.year),
      gross: Number(payrollForm.gross),
      net: Number(payrollForm.net),
      school_id: profile.school_id
    });
    setPayrollForm({ staff_profile_id: '', month: 1, year: new Date().getFullYear(), gross: '', net: '' });
    load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Finance</h1>
        <p className="text-sm text-slate-500">Expenses, payroll, and cashflow tracking.</p>
      </div>

      <form onSubmit={addExpense} className="bg-white rounded-xl p-4 shadow-card border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
        <input className="border border-slate-200 rounded-lg px-3 py-2" placeholder="Category" value={expenseForm.category} onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))} required />
        <input type="number" className="border border-slate-200 rounded-lg px-3 py-2" placeholder="Amount" value={expenseForm.amount} onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))} required />
        <input type="date" className="border border-slate-200 rounded-lg px-3 py-2" value={expenseForm.incurred_on} onChange={(e) => setExpenseForm((f) => ({ ...f, incurred_on: e.target.value }))} required />
        <button className="rounded-lg bg-slate-900 text-white px-3 py-2 font-semibold">Add Expense</button>
      </form>
      <SimpleTable headers={['Category', 'Amount', 'Date']} rows={expenses.map((e) => [e.category, `₦${Number(e.amount).toLocaleString()}`, e.incurred_on])} />

      <form onSubmit={addPayroll} className="bg-white rounded-xl p-4 shadow-card border border-slate-100 grid grid-cols-1 md:grid-cols-6 gap-3 text-sm">
        <select className="border border-slate-200 rounded-lg px-3 py-2 bg-white" value={payrollForm.staff_profile_id} onChange={(e) => setPayrollForm((f) => ({ ...f, staff_profile_id: e.target.value }))} required>
          <option value="">Staff</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>{s.full_name}</option>
          ))}
        </select>
        <input type="number" className="border border-slate-200 rounded-lg px-3 py-2" placeholder="Month" value={payrollForm.month} onChange={(e) => setPayrollForm((f) => ({ ...f, month: e.target.value }))} />
        <input type="number" className="border border-slate-200 rounded-lg px-3 py-2" placeholder="Year" value={payrollForm.year} onChange={(e) => setPayrollForm((f) => ({ ...f, year: e.target.value }))} />
        <input type="number" className="border border-slate-200 rounded-lg px-3 py-2" placeholder="Gross" value={payrollForm.gross} onChange={(e) => setPayrollForm((f) => ({ ...f, gross: e.target.value }))} />
        <input type="number" className="border border-slate-200 rounded-lg px-3 py-2" placeholder="Net" value={payrollForm.net} onChange={(e) => setPayrollForm((f) => ({ ...f, net: e.target.value }))} />
        <button className="rounded-lg bg-brand-600 text-white px-3 py-2 font-semibold">Add Payroll</button>
      </form>
      <SimpleTable headers={['Staff', 'Month', 'Gross', 'Net', 'Status']} rows={payroll.map((p) => [p.profiles?.full_name ?? '', `${p.month}/${p.year}`, `₦${Number(p.gross).toLocaleString()}`, `₦${Number(p.net).toLocaleString()}`, p.status])} />
    </div>
  );
}
