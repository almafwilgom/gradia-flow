import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { SimpleTable } from '../components/SimpleTable';

export default function SMS() {
  const { profile } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [logs, setLogs] = useState([]);
  const [phone, setPhone] = useState('');
  const [text, setText] = useState('');
  const [topup, setTopup] = useState(0);

  const load = async () => {
    const { data: walletRow } = await supabase
      .from('sms_wallets')
      .select('*')
      .eq('school_id', profile?.school_id)
      .single();
    setWallet(walletRow);

    const { data: logRows } = await supabase
      .from('sms_logs')
      .select('*')
      .eq('school_id', profile?.school_id)
      .order('created_at', { ascending: false })
      .limit(50);
    setLogs(logRows ?? []);
  };

  useEffect(() => {
    if (profile?.school_id) load();
  }, [profile?.school_id]);

  const ensureWallet = async () => {
    if (wallet) return wallet.id;
    const { data, error } = await supabase
      .from('sms_wallets')
      .insert({ school_id: profile.school_id, balance: 0 })
      .select('id')
      .single();
    if (error) throw error;
    setWallet({ id: data.id, balance: 0 });
    return data.id;
  };

  const sendSMS = async (e) => {
    e.preventDefault();
    await ensureWallet();
    await supabase.functions.invoke('send-sms', {
      body: { phone, message: text, school_id: profile.school_id }
    });
    setPhone('');
    setText('');
    load();
  };

  const addBalance = async (e) => {
    e.preventDefault();
    const id = await ensureWallet();
    const newBalance = Number(wallet?.balance ?? 0) + Number(topup);
    await supabase.from('sms_wallets').update({ balance: newBalance }).eq('id', id);
    setTopup(0);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">SMS Gateway</h1>
          <p className="text-sm text-slate-500">Send SMS, track wallet & delivery logs.</p>
        </div>
        <div className="bg-white rounded-lg px-4 py-2 shadow-card border border-slate-100 text-sm">
          Balance: ₦{Number(wallet?.balance ?? 0).toLocaleString()}
        </div>
      </div>

      <form onSubmit={sendSMS} className="bg-white rounded-xl p-4 shadow-card border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <input className="border border-slate-200 rounded-lg px-3 py-2" placeholder="Phone (e.g., 234...)" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        <textarea className="border border-slate-200 rounded-lg px-3 py-2 md:col-span-2" rows={2} placeholder="Message" value={text} onChange={(e) => setText(e.target.value)} required />
        <button className="md:col-span-3 rounded-lg bg-brand-600 text-white px-3 py-2 font-semibold">Queue SMS</button>
      </form>

      <form onSubmit={addBalance} className="flex gap-3 items-center text-sm">
        <input type="number" className="border border-slate-200 rounded-lg px-3 py-2" placeholder="Top-up amount" value={topup} onChange={(e) => setTopup(e.target.value)} />
        <button className="rounded-lg bg-slate-900 text-white px-3 py-2 font-semibold">Add Balance</button>
      </form>

      <SimpleTable
        headers={['To', 'Message', 'Status', 'Cost', 'Time']}
        rows={logs.map((l) => [l.phone, l.message.slice(0, 60), l.status, `₦${Number(l.cost).toLocaleString()}`, new Date(l.created_at).toLocaleTimeString()])}
      />
    </div>
  );
}
