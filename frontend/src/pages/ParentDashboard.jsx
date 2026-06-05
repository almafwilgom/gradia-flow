import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { API_URL } from '../lib/api';
import { SimpleTable } from '../components/SimpleTable';

export default function ParentDashboard() {
  const { profile, session } = useAuth();
  const [parentRecord, setParentRecord] = useState(null);
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [results, setResults] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [message, setMessage] = useState('');
  const [aiInsight, setAiInsight] = useState('');
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState('');

  useEffect(() => {
    const loadParent = async () => {
      const { data } = await supabase.from('parents').select('id').eq('profile_id', profile?.id).single();
      setParentRecord(data);
    };
    if (profile?.id) loadParent();
  }, [profile?.id]);

  useEffect(() => {
    const loadChildren = async () => {
      if (!parentRecord) return;
      const { data } = await supabase
        .from('students')
        .select('id, first_name, last_name, class_id, status')
        .eq('parent_id', parentRecord.id);
      setChildren(data ?? []);
      setSelectedChild(data?.[0] ?? null);
    };
    loadChildren();
  }, [parentRecord]);

  useEffect(() => {
    const loadDetails = async () => {
      if (!selectedChild) return;
      const [res, att] = await Promise.all([
        supabase
          .from('results')
          .select('term, session_year, total, grade, subjects(name)')
          .eq('student_id', selectedChild.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('attendance_students')
          .select('status, attended_on')
          .eq('student_id', selectedChild.id)
          .order('attended_on', { ascending: false })
          .limit(10)
      ]);
      setResults(res.data ?? []);
      setAttendance(att.data ?? []);
    };
    loadDetails();
  }, [selectedChild]);

  useEffect(() => {
    const loadTeachers = async () => {
      const { data } = await supabase
        .from('teachers')
        .select('profile_id, profiles(full_name)')
        .eq('school_id', profile?.school_id)
        .limit(20);
      setTeachers(data ?? []);
    };
    if (profile?.school_id) loadTeachers();
  }, [profile?.school_id]);

  const sendMessage = async (receiverId) => {
    if (!message) return;
    await supabase.from('messages').insert({
      school_id: profile.school_id,
      sender_profile_id: profile.id,
      receiver_profile_id: receiverId,
      body: message
    });
    setMessage('');
    // In a real app you'd load conversation thread
  };

  const downloadReportCard = async () => {
    if (!selectedChild) return;
    setDownloadMsg('');
    try {
      const token = session?.access_token;
      const url = `${API_URL}/api/report-card/${selectedChild.id}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      window.open(url, '_blank');
    } catch (err) {
      setDownloadMsg(err.message || 'Failed to download report card');
    }
  };

  const fetchInsight = async () => {
    if (!selectedChild) return;
    setLoadingInsight(true);
    const { data, error } = await supabase.functions.invoke('ai-insights', {
      body: { student_id: selectedChild.id, school_id: profile.school_id }
    });
    if (!error) setAiInsight(data?.insights ?? '');
    setLoadingInsight(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Parent Dashboard</h1>
          <p className="text-sm text-slate-500">Monitor all children from one place</p>
        </div>
        <div className="flex gap-2">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedChild(c)}
              className={`px-3 py-2 rounded-lg text-sm ${selectedChild?.id === c.id ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200'}`}
            >
              {c.first_name}
            </button>
          ))}
        </div>
      </div>

      {selectedChild && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-card border border-slate-100">
            <h3 className="font-semibold mb-3">Academic Performance</h3>
            <SimpleTable
              headers={['Subject', 'Term', 'Total', 'Grade']}
              rows={results.map((r) => [r.subjects?.name ?? '', `${r.term} ${r.session_year}`, r.total, r.grade])}
            />
          </div>
          <div className="bg-white rounded-xl p-4 shadow-card border border-slate-100">
            <h3 className="font-semibold mb-3">Attendance (last 10)</h3>
            <SimpleTable
              headers={['Date', 'Status']}
              rows={attendance.map((a) => [a.attended_on, a.status])}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-card border border-slate-100">
          <h3 className="font-semibold mb-2">Fee Payments</h3>
          <p className="text-sm text-slate-500 mb-3">Pay by bank transfer and upload proof.</p>
          <a
            href="/payments"
            className="inline-flex items-center px-3 py-2 rounded-lg bg-brand-600 text-white text-sm"
          >
            Go to Payments
          </a>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-card border border-slate-100">
          <h3 className="font-semibold mb-2">Report Cards</h3>
          <p className="text-sm text-slate-500 mb-2">Download signed PDF (requires reports bucket).</p>
          <button
            onClick={downloadReportCard}
            className="rounded-lg bg-slate-900 text-white px-3 py-2 text-sm"
          >
            Download
          </button>
          {downloadMsg && <div className="text-xs text-rose-600 mt-2">{downloadMsg}</div>}
        </div>
        <div className="bg-white rounded-xl p-4 shadow-card border border-slate-100 lg:col-span-2">
          <h3 className="font-semibold mb-3">Message Teachers</h3>
          <div className="flex gap-2 mb-3">
            <input
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Type a message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 bg-white"
              onChange={(e) => sendMessage(e.target.value)}
              defaultValue=""
            >
              <option value="">Send to teacher</option>
              {teachers.map((t) => (
                <option key={t.profile_id} value={t.profile_id}>{t.profiles?.full_name}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slate-500">Messages are stored in the "messages" table.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-card border border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">AI Insights</h3>
          <button
            onClick={fetchInsight}
            className="rounded-lg bg-brand-600 text-white px-3 py-2 text-sm"
            disabled={loadingInsight}
          >
            {loadingInsight ? 'Analysing...' : 'Generate'}
          </button>
        </div>
        <div className="text-sm text-slate-700 min-h-[80px]">
          {aiInsight || 'Click generate to view personalised study recommendations.'}
        </div>
      </div>
    </div>
  );
}
