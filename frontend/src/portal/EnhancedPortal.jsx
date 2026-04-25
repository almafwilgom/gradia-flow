import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/Card';
import { generateResultPDF } from '../lib/result-generator';

export default function ParentPortal() {
  const { profile } = useAuth();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [results, setResults] = useState(null);
  const [financials, setFinancials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const terms = ['First Term', 'Second Term', 'Third Term'];

  useEffect(() => {
    if (profile?.id) {
      loadChildren();
    }
  }, [profile?.id]);

  useEffect(() => {
    if (selectedChild?.id && selectedSession && selectedTerm) {
      loadResults();
      loadFinancials();
    }
  }, [selectedChild, selectedSession, selectedTerm]);

  const loadChildren = async () => {
    setLoading(true);
    try {
      const { data: parentData } = await supabase
        .from('parents')
        .select('*')
        .eq('profile_id', profile.id)
        .single();

      if (parentData) {
        const { data: studentData } = await supabase
          .from('students')
          .select('*')
          .eq('parent_id', parentData.id);

        setChildren(studentData || []);
        if (studentData?.length > 0) {
          setSelectedChild(studentData[0]);
        }
      }

      // Load available sessions
      const { data: sessionsData } = await supabase
        .from('results')
        .select('session_year')
        .distinct()
        .order('session_year', { ascending: false });

      setSessions([...new Set(sessionsData?.map(r => r.session_year) || [])] || []);
      if (sessionsData?.length > 0) {
        setSelectedSession(sessionsData[0].session_year);
        setSelectedTerm(terms[0]);
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadResults = async () => {
    try {
      const { data: resultData } = await supabase
        .from('result_reports')
        .select(`
          *,
          results(*)
        `)
        .eq('student_id', selectedChild.id)
        .eq('session_year', selectedSession)
        .eq('term', selectedTerm)
        .single();

      setResults(resultData);
    } catch (error) {
      console.error('Results load error:', error);
    }
  };

  const loadFinancials = async () => {
    try {
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('*')
        .eq('student_id', selectedChild.id)
        .order('created_at', { ascending: false });

      const { data: paymentData } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', selectedChild.id)
        .order('created_at', { ascending: false });

      const totalInvoiced = invoiceData?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;
      const totalPaid = paymentData?.reduce((sum, pay) => sum + (pay.amount || 0), 0) || 0;

      setFinancials({
        invoices: invoiceData || [],
        payments: paymentData || [],
        totalInvoiced,
        totalPaid,
        outstanding: totalInvoiced - totalPaid
      });
    } catch (error) {
      console.error('Financials load error:', error);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-4 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Parent Portal</h1>
        <p className="text-slate-500 mt-1">Track your child's progress</p>
      </div>

      {/* Child Selection */}
      {children.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {children.map(child => (
            <button
              key={child.id}
              onClick={() => {
                setSelectedChild(child);
                setActiveTab('overview');
              }}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                selectedChild?.id === child.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
              }`}
            >
              {child.first_name}
            </button>
          ))}
        </div>
      )}

      {/* Session & Term Selection */}
      <div className="grid grid-cols-2 gap-3">
        <select
          value={selectedSession}
          onChange={e => setSelectedSession(e.target.value)}
          className="px-4 py-2 rounded-lg border border-slate-200"
        >
          {sessions.map(session => (
            <option key={session} value={session}>
              {session}
            </option>
          ))}
        </select>

        <select
          value={selectedTerm}
          onChange={e => setSelectedTerm(e.target.value)}
          className="px-4 py-2 rounded-lg border border-slate-200"
        >
          {terms.map(term => (
            <option key={term} value={term}>
              {term}
            </option>
          ))}
        </select>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'overview'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-600'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'results'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-600'
          }`}
        >
          Results
        </button>
        <button
          onClick={() => setActiveTab('finance')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'finance'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-600'
          }`}
        >
          Finances
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Performance Summary */}
          <Card>
            <h2 className="text-lg font-semibold mb-4">Performance Summary</h2>
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Average Score"
                value={results?.results?.reduce((sum, r) => sum + (r.total || 0), 0) / (results?.results?.length || 1) || 'N/A'}
                color="blue"
              />
              <StatCard
                label="Subjects Studied"
                value={results?.results?.length || 0}
                color="green"
              />
              <StatCard
                label="Amount Due"
                value={`₦${financials?.outstanding || 0}`}
                color="red"
              />
              <StatCard
                label="Amount Paid"
                value={`₦${financials?.totalPaid || 0}`}
                color="emerald"
              />
            </div>
          </Card>

          {/* Quick Actions */}
          <Card>
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button
                onClick={() => {
                  if (results?.id) {
                    generateResultPDF(selectedChild.id, selectedTerm, selectedSession, profile.school_id);
                  }
                }}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                📥 Download Result PDF
              </button>
              <button className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                💬 Message Teacher
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Results Tab */}
      {activeTab === 'results' && results && (
        <div className="space-y-4">
          <Card>
            <h2 className="text-lg font-semibold mb-4">Academic Results</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="px-4 py-2 text-left">Subject</th>
                    <th className="px-4 py-2 text-center">CA</th>
                    <th className="px-4 py-2 text-center">Exam</th>
                    <th className="px-4 py-2 text-center">Total</th>
                    <th className="px-4 py-2 text-center">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {results.results?.map(r => (
                    <tr key={r.id} className="border-b">
                      <td className="px-4 py-2">{r.subjects?.name}</td>
                      <td className="px-4 py-2 text-center">{r.ca_score || 0}</td>
                      <td className="px-4 py-2 text-center">{r.exam_score || 0}</td>
                      <td className="px-4 py-2 text-center font-bold">{r.total || 0}</td>
                      <td className="px-4 py-2 text-center">
                        <span className="px-2 py-1 rounded text-xs font-bold bg-blue-100">
                          {r.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Remarks */}
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-bold text-slate-900">Form Teacher Remarks</p>
                <p className="text-sm text-slate-700 mt-2">
                  {results.remarks || 'No remarks yet'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Finance Tab */}
      {activeTab === 'finance' && financials && (
        <div className="space-y-4">
          {/* Financial Summary */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <p className="text-xs text-slate-600 font-semibold uppercase">Total Due</p>
              <p className="text-2xl font-bold text-red-600 mt-2">
                ₦{financials.outstanding}
              </p>
            </Card>
            <Card>
              <p className="text-xs text-slate-600 font-semibold uppercase">Amount Paid</p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                ₦{financials.totalPaid}
              </p>
            </Card>
          </div>

          {/* Payment Options */}
          <Card>
            <h2 className="text-lg font-semibold mb-4">Make Payment</h2>
            <div className="space-y-3">
              <button className="w-full px-4 py-3 border-2 border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50">
                💳 Bank Transfer
              </button>
              <button className="w-full px-4 py-3 border-2 border-green-600 text-green-600 rounded-lg font-medium hover:bg-green-50">
                🏦 Online Payment
              </button>
            </div>
          </Card>

          {/* Payment History */}
          <Card>
            <h2 className="text-lg font-semibold mb-4">Recent Payments</h2>
            <div className="space-y-2">
              {financials.payments?.slice(0, 5).map(payment => (
                <div key={payment.id} className="flex justify-between items-center p-3 bg-slate-50 rounded">
                  <div>
                    <p className="font-medium text-slate-900">₦{payment.amount}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-semibold">
                    {payment.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    emerald: 'bg-emerald-50 text-emerald-600'
  };

  return (
    <div className={`p-4 rounded-lg ${colors[color]}`}>
      <p className="text-xs font-semibold uppercase">{label}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}
