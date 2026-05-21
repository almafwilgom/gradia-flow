import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { SimpleTable } from '../components/SimpleTable';
import { FileUpload } from '../components/FileUpload';
import { apiFetch } from '../lib/api';
import { useActionModal } from '../hooks/useActionModal';
import { ActionModalRenderer } from '../components/ActionModals';

export default function Payments() {
  const { profile, session } = useAuth();
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState({ student_id: '', amount: '', method: 'manual', reference: '' });
  const [students, setStudents] = useState([]);
  const [proofFile, setProofFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const modals = useActionModal();

  const load = async () => {
    const { data } = await supabase
      .from('payments')
      .select('id, amount, status, method, reference, proof_url, students(first_name,last_name)')
      .eq('school_id', profile?.school_id)
      .order('created_at', { ascending: false })
      .limit(50);
    setPayments(data ?? []);
  };

  const loadStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select('id, first_name, last_name')
      .eq('school_id', profile?.school_id);
    setStudents(data ?? []);
  };

  useEffect(() => {
    if (profile?.school_id) {
      load();
      loadStudents();
    }
  }, [profile?.school_id]);

  const submitPayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    let proofUrl = null;

    try {
      if (proofFile) {
        const { data, error } = await supabase.storage
          .from('proofs')
          .upload(`proof-${Date.now()}-${proofFile.name}`, proofFile, { cacheControl: '3600', upsert: false });
        if (error) throw error;
        const { data: publicUrl } = supabase.storage.from('proofs').getPublicUrl(data.path);
        proofUrl = publicUrl.publicUrl;
      }

      const payload = {
        school_id: profile.school_id,
        student_id: form.student_id,
        amount: Number(form.amount),
        method: form.method,
        reference: form.reference || crypto.randomUUID(),
        status: 'pending',
        proof_url: proofUrl
      };

      if (form.method === 'paystack') {
        // call backend to initialize Paystack
        const data = await apiFetch('/api/paystack/initiate', {
          method: 'POST',
          token: session?.access_token,
          body: { student_id: form.student_id, amount: Number(form.amount), email: profile?.email, school_id: profile.school_id }
        });
        payload.reference = data.reference;
        // open authorization URL for payment
        window.open(data.authorization_url, '_blank');
        await supabase.from('payments').insert(payload);
      } else {
        await supabase.from('payments').insert(payload);
      }
      setForm({ student_id: '', amount: '', method: 'manual', reference: '' });
      setProofFile(null);
      modals.success.show('Payment submitted successfully.');
      load();
    } catch (err) {
      modals.error.show('Payment failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const approve = async (id) => {
    modals.confirm.show(
      'Approve payment?',
      'This will mark the selected payment as approved.',
      'Approved payments may unlock related student records or results.',
      async () => {
        modals.confirm.setLoading(true);
        try {
          const { error } = await supabase
            .from('payments')
            .update({ status: 'approved', approved_by: profile.id })
            .eq('id', id);
          if (error) throw error;
          modals.confirm.close();
          modals.success.show('Payment approved successfully.');
          load();
        } catch (err) {
          modals.error.show('Approval failed', err.message);
        } finally {
          modals.confirm.setLoading(false);
        }
      },
      { confirmText: 'Approve' }
    );
  };

  return (
    <div className="space-y-4">
      <ActionModalRenderer modals={modals} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Payments</h1>
          <p className="text-sm text-slate-500">Manual + Paystack</p>
        </div>
      </div>

      <form onSubmit={submitPayment} className="bg-white rounded-xl p-4 shadow-card border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-3">
        <select
          className="rounded-lg border border-slate-200 px-3 py-2 bg-white"
          value={form.student_id}
          onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))}
          required
        >
          <option value="">Student</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{`${s.first_name} ${s.last_name}`}</option>
          ))}
        </select>
        <input
          type="number"
          className="rounded-lg border border-slate-200 px-3 py-2"
          placeholder="Amount (NGN)"
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          required
        />
        <select
          className="rounded-lg border border-slate-200 px-3 py-2 bg-white"
          value={form.method}
          onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
        >
          <option value="manual">Manual</option>
          <option value="paystack">Paystack</option>
        </select>
        <input
          className="rounded-lg border border-slate-200 px-3 py-2"
          placeholder="Paystack reference (if online)"
          value={form.reference}
          onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
        />
        <FileUpload onFile={setProofFile} />
        <button className="md:col-span-4 rounded-lg bg-brand-600 text-white px-4 py-2 font-semibold hover:bg-brand-700" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Payment'}
        </button>
      </form>

      <SimpleTable
        headers={['Student', 'Amount', 'Method', 'Status', 'Action']}
        rows={payments.map((p) => [
          `${p.students?.first_name ?? ''} ${p.students?.last_name ?? ''}`,
          `₦${Number(p.amount).toLocaleString()}`,
          p.method,
          p.status,
          profile?.role === 'school_admin' && p.status === 'pending' ? (
            <button className="text-brand-600" onClick={() => approve(p.id)}>
              Approve
            </button>
          ) : (
            ''
          )
        ])}
      />
    </div>
  );
}
