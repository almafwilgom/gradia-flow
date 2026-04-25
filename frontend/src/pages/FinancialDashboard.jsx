import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/Button';
import Card from '../components/Card';

export default function FinancialDashboard() {
  const { profile } = useAuth();
  const [financials, setFinancials] = useState(null);
  const [resultReadiness, setResultReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [classes, setClasses] = useState([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [workingAction, setWorkingAction] = useState('');

  useEffect(() => {
    if (profile?.school_id) {
      loadBaseData();
    }
  }, [profile?.school_id]);

  useEffect(() => {
    if (profile?.school_id && selectedClassId) {
      loadResultReadiness(selectedClassId);
    } else {
      setResultReadiness(null);
    }
  }, [profile?.school_id, selectedClassId]);

  const loadBaseData = async () => {
    setLoading(true);
    setError('');

    try {
      const [{ data: classData, error: classError }, { data: invoiceData, error: invoiceError }, { data: paymentData, error: paymentError }] =
        await Promise.all([
          supabase
            .from('classes')
            .select('id, name, level')
            .eq('school_id', profile.school_id)
            .order('name'),
          supabase
            .from('invoices')
            .select('id, amount, description, due_date, status')
            .eq('school_id', profile.school_id)
            .order('due_date', { ascending: true }),
          supabase
            .from('payments')
            .select('id, amount, status, created_at, students(first_name, last_name)')
            .eq('school_id', profile.school_id)
            .order('created_at', { ascending: false })
        ]);

      if (classError) throw classError;
      if (invoiceError) throw invoiceError;
      if (paymentError) throw paymentError;

      const classesList = classData || [];
      const invoices = invoiceData || [];
      const payments = paymentData || [];

      setClasses(classesList);
      setSelectedClassId((current) => current || classesList[0]?.id || '');

      const totalInvoiced = invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
      const totalCollected = payments.reduce(
        (sum, payment) => (payment.status === 'approved' ? sum + Number(payment.amount || 0) : sum),
        0
      );
      const pendingPayments = invoices.filter((invoice) => invoice.status === 'pending').length;

      setFinancials({
        invoicesRaised: invoices.length,
        totalInvoiced,
        totalCollected,
        collectionRate: totalInvoiced > 0 ? ((totalCollected / totalInvoiced) * 100).toFixed(2) : '0.00',
        pendingPayments,
        netProfit: totalCollected,
        invoices,
        payments
      });
    } catch (loadError) {
      console.error('Load error:', loadError);
      setError(loadError.message || 'Unable to load finance data right now.');
    } finally {
      setLoading(false);
    }
  };

  const loadResultReadiness = async (classId) => {
    try {
      setError('');
      const term = getCurrentTerm();
      const sessionYear = getCurrentYear();

      const [
        { count: totalStudents, error: studentError },
        { data: resultsData, error: resultsError },
        { data: behaviorData, error: behaviorError },
        { data: remarksData, error: remarksError },
        { data: reportsData, error: reportsError }
      ] = await Promise.all([
        supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', profile.school_id)
          .eq('class_id', classId),
        supabase
          .from('results')
          .select('student_id')
          .eq('school_id', profile.school_id)
          .eq('class_id', classId)
          .eq('term', term)
          .eq('session_year', sessionYear),
        supabase
          .from('behaviour_evaluations')
          .select('student_id')
          .eq('school_id', profile.school_id)
          .eq('class_id', classId)
          .eq('term', term)
          .eq('session_year', sessionYear),
        supabase
          .from('form_master_remarks')
          .select('student_id')
          .eq('school_id', profile.school_id)
          .eq('class_id', classId)
          .eq('term', term)
          .eq('session_year', sessionYear),
        supabase
          .from('result_reports')
          .select('id, published_at')
          .eq('school_id', profile.school_id)
          .eq('class_id', classId)
          .eq('term', term)
          .eq('session_year', sessionYear)
      ]);

      if (studentError) throw studentError;
      if (resultsError) throw resultsError;
      if (behaviorError) throw behaviorError;
      if (remarksError) throw remarksError;
      if (reportsError) throw reportsError;

      const total = totalStudents || 0;
      const marksCompleted = new Set((resultsData || []).map((row) => row.student_id)).size;
      const commentsCompleted = new Set((remarksData || []).map((row) => row.student_id)).size;
      const behaviorCompleted = new Set((behaviorData || []).map((row) => row.student_id)).size;
      const reportsGenerated = (reportsData || []).length;
      const reportsPublished = (reportsData || []).filter((row) => row.published_at).length;

      setResultReadiness({
        totalStudents: total,
        marksCompleted,
        commentsCompleted,
        behaviorCompleted,
        reportsGenerated,
        reportsPublished,
        marksPercentage: toPercent(marksCompleted, total),
        commentsPercentage: toPercent(commentsCompleted, total),
        behaviorPercentage: toPercent(behaviorCompleted, total),
        reportsPercentage: toPercent(reportsGenerated, total)
      });
    } catch (readinessError) {
      console.error('Result readiness error:', readinessError);
      setError(readinessError.message || 'Unable to load result readiness right now.');
    }
  };

  const generateResults = async () => {
    if (!selectedClassId) return;

    try {
      setWorkingAction('generate');
      setError('');
      setNotice('');

      const term = getCurrentTerm();
      const sessionYear = getCurrentYear();
      const now = new Date().toISOString();

      const [{ data: students, error: studentError }, { data: results, error: resultsError }] = await Promise.all([
        supabase
          .from('students')
          .select('id, first_name, last_name')
          .eq('school_id', profile.school_id)
          .eq('class_id', selectedClassId),
        supabase
          .from('results')
          .select('student_id, subject_id, total, grade')
          .eq('school_id', profile.school_id)
          .eq('class_id', selectedClassId)
          .eq('term', term)
          .eq('session_year', sessionYear)
      ]);

      if (studentError) throw studentError;
      if (resultsError) throw resultsError;
      if (!students?.length) {
        throw new Error('No students are assigned to this class yet.');
      }

      const byStudent = new Map();
      for (const row of results || []) {
        const existing = byStudent.get(row.student_id) || [];
        existing.push(row);
        byStudent.set(row.student_id, existing);
      }

      const reportRows = students.map((student) => {
        const subjectRows = byStudent.get(student.id) || [];
        const grandTotal = subjectRows.reduce((sum, row) => sum + Number(row.total || 0), 0);
        return {
          school_id: profile.school_id,
          student_id: student.id,
          class_id: selectedClassId,
          term,
          session_year: sessionYear,
          compiled_by: profile.id,
          compiled_at: now,
          metadata: {
            subject_count: subjectRows.length,
            grand_total: grandTotal,
            generated_from: 'financial_dashboard'
          }
        };
      });

      const { error: upsertError } = await supabase
        .from('result_reports')
        .upsert(reportRows, { onConflict: 'student_id,class_id,term,session_year' });

      if (upsertError) throw upsertError;

      setNotice(`Generated or refreshed ${reportRows.length} result report rows for this class.`);
      await loadResultReadiness(selectedClassId);
    } catch (generationError) {
      console.error('Generation error:', generationError);
      setError(generationError.message || 'Result generation failed.');
    } finally {
      setWorkingAction('');
    }
  };

  const publishResults = async () => {
    if (!selectedClassId) return;

    try {
      setWorkingAction('publish');
      setError('');
      setNotice('');

      const term = getCurrentTerm();
      const sessionYear = getCurrentYear();
      const publishedAt = new Date().toISOString();

      const { data: existingReports, error: fetchError } = await supabase
        .from('result_reports')
        .select('id')
        .eq('school_id', profile.school_id)
        .eq('class_id', selectedClassId)
        .eq('term', term)
        .eq('session_year', sessionYear);

      if (fetchError) throw fetchError;
      if (!existingReports?.length) {
        throw new Error('Generate result reports for this class before publishing.');
      }

      const { error: publishError } = await supabase
        .from('result_reports')
        .update({ published_at: publishedAt })
        .eq('school_id', profile.school_id)
        .eq('class_id', selectedClassId)
        .eq('term', term)
        .eq('session_year', sessionYear);

      if (publishError) throw publishError;

      setNotice('Results published. Parents can now view them in the portal, and SMS can be sent from the SMS page.');
      await loadResultReadiness(selectedClassId);
    } catch (publishError) {
      console.error('Publish error:', publishError);
      setError(publishError.message || 'Result publish failed.');
    } finally {
      setWorkingAction('');
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Financial & Results Dashboard</h1>
        <p className="text-slate-500 mt-1">School Admin Control Center</p>
      </div>

      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Financial Overview</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Invoices Raised" value={financials?.invoicesRaised || 0} />
          <StatCard label="Total Revenue" value={`NGN ${(financials?.totalInvoiced || 0).toLocaleString()}`} />
          <StatCard label="Amount Collected" value={`NGN ${(financials?.totalCollected || 0).toLocaleString()}`} />
          <StatCard label="Collection Rate" value={`${financials?.collectionRate || '0.00'}%`} />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
          <h2 className="text-xl font-semibold text-slate-900">Result Compilation Readiness</h2>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200"
          >
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        {resultReadiness ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <ProgressCard
                label="Marks Entered"
                percentage={resultReadiness.marksPercentage}
                completed={resultReadiness.marksCompleted}
                total={resultReadiness.totalStudents}
              />
              <ProgressCard
                label="Comments Completed"
                percentage={resultReadiness.commentsPercentage}
                completed={resultReadiness.commentsCompleted}
                total={resultReadiness.totalStudents}
              />
              <ProgressCard
                label="Behaviour Assessment"
                percentage={resultReadiness.behaviorPercentage}
                completed={resultReadiness.behaviorCompleted}
                total={resultReadiness.totalStudents}
              />
              <ProgressCard
                label="Reports Generated"
                percentage={resultReadiness.reportsPercentage}
                completed={resultReadiness.reportsGenerated}
                total={resultReadiness.totalStudents}
              />
            </div>

            <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Published reports: <span className="font-semibold">{resultReadiness.reportsPublished}</span>
            </div>
          </>
        ) : (
          <Card>
            <p className="text-slate-600">Select a class to load readiness data.</p>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button onClick={generateResults} disabled={!selectedClassId || workingAction !== ''}>
            {workingAction === 'generate' ? 'Generating...' : 'Generate Results'}
          </Button>
          <Button onClick={publishResults} variant="secondary" disabled={!selectedClassId || workingAction !== ''}>
            {workingAction === 'publish' ? 'Publishing...' : 'Publish Results'}
          </Button>
        </div>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Payments</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="px-4 py-2 text-left">Student</th>
                <th className="px-4 py-2 text-center">Amount</th>
                <th className="px-4 py-2 text-center">Date</th>
                <th className="px-4 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {financials?.payments?.slice(0, 5).map((payment) => (
                <tr key={payment.id} className="border-b hover:bg-slate-50">
                  <td className="px-4 py-2">
                    {payment.students
                      ? `${payment.students.first_name} ${payment.students.last_name}`
                      : `Payment ${payment.id.slice(0, 8)}`}
                  </td>
                  <td className="px-4 py-2 text-center font-semibold">
                    NGN {Number(payment.amount || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-center text-sm">
                    {new Date(payment.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-700">
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Pending Invoices</h2>
        <div className="space-y-2">
          {financials?.invoices
            ?.filter((invoice) => invoice.status === 'pending')
            ?.slice(0, 5)
            .map((invoice) => (
              <div key={invoice.id} className="flex justify-between items-center p-3 bg-slate-50 rounded">
                <div>
                  <p className="font-medium text-slate-900">{invoice.description || 'School invoice'}</p>
                  <p className="text-xs text-slate-500">
                    Due: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                  </p>
                </div>
                <span className="text-lg font-bold text-red-600">
                  NGN {Number(invoice.amount || 0).toLocaleString()}
                </span>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}

function toPercent(value, total) {
  if (!total) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

function getCurrentTerm() {
  const month = new Date().getMonth();
  if (month <= 3) return 'First Term';
  if (month <= 7) return 'Second Term';
  return 'Third Term';
}

function getCurrentYear() {
  const year = new Date().getFullYear();
  return `${year}/${year + 1}`;
}

function StatCard({ label, value }) {
  return (
    <Card>
      <p className="text-xs text-slate-600 font-semibold uppercase">{label}</p>
      <p className="text-2xl font-bold mt-2 text-slate-900">{value}</p>
    </Card>
  );
}

function ProgressCard({ label, percentage, completed, total }) {
  return (
    <Card>
      <p className="text-xs text-slate-600 font-semibold uppercase">{label}</p>
      <div className="mt-4">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium">{percentage}%</span>
          <span className="text-xs text-slate-500">
            {completed}/{total}
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
