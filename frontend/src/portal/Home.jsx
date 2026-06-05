import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { mutate } from 'swr';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { API_URL } from '../lib/api';
import {
  ChevronDownIcon,
  BellIcon,
  DocumentChartBarIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  AcademicCapIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';


export default function PortalHome() {
  const { profile, session } = useAuth();
  const isParent = profile?.role === 'parent';
  const [children, setChildren] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [results, setResults] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payments, setPayments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);


  const selectedStudent = useMemo(
    () => children.find((child) => child.id === selectedStudentId) ?? null,
    [children, selectedStudentId]
  );

  useEffect(() => {
    if (!profile?.id) return;
    loadPortalData();
  }, [profile?.id]);

  useEffect(() => {
    if (!selectedStudentId) return;
    loadStudentSnapshot(selectedStudentId);
  }, [selectedStudentId]);

  async function loadPortalData() {
    setLoading(true);
    try {
      let studentRows = [];

      if (isParent) {
        const { data: parentRow, error: parentError } = await supabase
          .from('parents')
          .select('id')
          .eq('profile_id', profile.id)
          .single();
        if (parentError) throw parentError;

        const { data: childrenRows, error: childrenError } = await supabase
          .from('students')
          .select('id, first_name, last_name, admission_no, class_id, classes(name)')
          .eq('parent_id', parentRow.id)
          .order('first_name', { ascending: true });
        if (childrenError) throw childrenError;
        studentRows = childrenRows ?? [];
      } else if (profile?.student_id) {
        const { data: studentRow, error: studentError } = await supabase
          .from('students')
          .select('id, first_name, last_name, admission_no, class_id, classes(name)')
          .eq('id', profile.student_id)
          .single();
        if (studentError) throw studentError;
        studentRows = studentRow ? [studentRow] : [];
      }

      setChildren(studentRows);
      const studentId = studentRows[0]?.id || '';
      setSelectedStudentId(studentId);

      // Start loading student snapshot in parallel with announcements
      const snapshotPromise = studentId ? loadStudentSnapshot(studentId) : Promise.resolve();
      
      const { data: announcementRows, error: announcementsError } = await supabase
        .from('announcements')
        .select('id, title, created_at')
        .eq('school_id', profile.school_id)
        .order('created_at', { ascending: false })
        .limit(4);
        
      if (announcementsError) throw announcementsError;
      setAnnouncements(announcementRows ?? []);
      
      await snapshotPromise;
    } catch (error) {
      console.error('Portal load error:', error);
      setChildren([]);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadStudentSnapshot(studentId) {
    try {
      const [resultsRes, attendanceRes, paymentsRes] = await Promise.all([
        supabase
          .from('results')
          .select('id, total, grade, term, session_year, subjects(name)')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false }),
        supabase
          .from('attendance_students')
          .select('id, attended_on, status')
          .eq('student_id', studentId)
          .order('attended_on', { ascending: false })
          .limit(30),
        supabase
          .from('payments')
          .select('id, amount, status, created_at')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false })
      ]);

      if (resultsRes.error) throw resultsRes.error;
      if (attendanceRes.error) throw attendanceRes.error;
      if (paymentsRes.error) throw paymentsRes.error;

      setResults(resultsRes.data ?? []);
      setAttendance(attendanceRes.data ?? []);
      setPayments(paymentsRes.data ?? []);
    } catch (error) {
      console.error('Student snapshot error:', error);
      setResults([]);
      setAttendance([]);
      setPayments([]);
    }
  }

  const latestSessionResults = useMemo(() => {
    if (results.length === 0) return [];
    const first = results[0];
    return results.filter(
      (row) => row.session_year === first.session_year && row.term === first.term
    );
  }, [results]);

  const attendancePresent = attendance.filter((row) => row.status === 'present').length;
  const attendanceRate = attendance.length ? Math.round((attendancePresent / attendance.length) * 100) : 0;
  const averageScore = latestSessionResults.length
    ? Math.round(latestSessionResults.reduce((sum, row) => sum + Number(row.total ?? 0), 0) / latestSessionResults.length)
    : 0;
  const totalClasses = selectedStudent?.class_id ? 1 : 0;
  const approvedPayments = payments.filter((row) => row.status === 'approved');
  const totalPaid = approvedPayments.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
        <div className="h-40 bg-white rounded-[2rem] border border-slate-100 animate-skeleton"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-white rounded-[2rem] border border-slate-100 animate-skeleton"></div>
          <div className="h-64 bg-white rounded-[2rem] border border-slate-100 animate-skeleton"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 pb-8">
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
        <div className="space-y-5">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] border border-blue-500 shadow-lg overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-6 gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative group shrink-0">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/30 backdrop-blur overflow-hidden flex items-center justify-center text-white font-semibold border-2 border-white shadow-sm">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl">
                        {selectedStudent ? `${selectedStudent.first_name?.[0] ?? ''}${selectedStudent.last_name?.[0] ?? ''}` : 'ST'}
                      </span>
                    )}
                  </div>
                  {!isParent && (
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          try {
                            const fileExt = file.name.split('.').pop();
                            const fileName = `${profile.id}/${Math.random()}.${fileExt}`;
                            
                            // 1. Upload to storage
                            const { error: uploadError } = await supabase.storage
                              .from('avatars')
                              .upload(fileName, file, { upsert: true });
                            
                            if (uploadError) throw uploadError;
                            
                            // 2. Get Public URL
                            const { data: { publicUrl } } = supabase.storage
                              .from('avatars')
                              .getPublicUrl(fileName);
                            
                            // 3. Update profile
                            const { error: updateError } = await supabase
                              .from('profiles')
                              .update({ avatar_url: publicUrl })
                              .eq('id', profile.id);
                            
                            if (updateError) throw updateError;
                            
                            // 4. Update local cache
                            mutate(profile.id);
                            setMsg('Profile picture updated successfully!');
                          } catch (err) {
                            alert('Failed to upload image: ' + (err.message || err));
                          }
                        }} 
                      />
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </label>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-semibold text-white truncate">
                      {selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name}` : 'Portal'}
                    </h1>
                    <ChevronDownIcon className="w-5 h-5 text-blue-100 shrink-0" />
                  </div>
                  <p className="text-sm text-blue-100 truncate flex items-center gap-1">
                    <AcademicCapIcon className="w-4 h-4 text-blue-200" />
                    {selectedStudent?.classes?.name
                      ? <span className="font-semibold text-white">{selectedStudent.classes.name}</span>
                      : <span>No class assigned</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {selectedStudentId && (
                  <button
                    type="button"
                    disabled={downloadingPdf}
                    onClick={async () => {
                      setDownloadingPdf(true);
                      setMsg('');
                      try {
                        const token = session?.access_token;
                        const url = `${API_URL}/api/report-card/${selectedStudentId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
                        window.open(url, '_blank');
                      } catch (err) {
                        setMsg('Failed: ' + err.message);
                      } finally {
                        setDownloadingPdf(false);
                      }
                    }}
                    className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-60"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    {downloadingPdf ? 'Opening...' : 'Report Card'}
                  </button>
                )}
                <BellIcon className="w-6 h-6 text-white" />
              </div>
            </div>

            {msg && (
              <div className="mx-5 mb-3 rounded-xl bg-white/20 px-4 py-2 text-sm text-white">
                {msg}
              </div>
            )}

            {isParent && children.length > 1 && (
              <div className="px-5 pb-4">
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full rounded-2xl border border-blue-300 bg-white/10 backdrop-blur px-4 py-3 text-sm text-white placeholder-blue-100"
                >
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.first_name} {child.last_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-5 py-5">
              <MetricCard value={`${attendanceRate}%`} label="Attendance" />
              <MetricCard value={averageScore} label="Avg Score" />
              <div className="col-span-2 sm:col-span-1">
                <MetricCard value={latestSessionResults.length} label="Subjects" />
              </div>
            </div>
          </div>


          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-soft p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Recent Results</h2>
              <Link to="/portal/results" className="text-sm text-blue-600">View More</Link>
            </div>
            <div className="space-y-3">
              {latestSessionResults.length === 0 ? (
                <p className="text-sm text-slate-500">No results published yet.</p>
              ) : (
                latestSessionResults.slice(0, 4).map((row) => (
                  <div key={row.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{row.subjects?.name ?? 'Subject'}</p>
                      <p className="text-xs text-slate-400">{row.term} | {row.session_year}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-slate-900">{row.total ?? 0}</p>
                      <p className="text-xs text-blue-600">{row.grade ?? '-'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-soft p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Announcements</h2>
              <Link to="/portal/messages" className="text-sm text-blue-600">View</Link>
            </div>
            <div className="space-y-3">
              {announcements.length === 0 ? (
                <p className="text-sm text-slate-500">No announcements available.</p>
              ) : (
                announcements.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-100 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-400 mt-1">{dayjs(item.created_at).format('DD MMM YYYY')}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-soft p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">Finance</h2>
              <Link to="/portal/payments" className="text-sm text-blue-600">Open</Link>
            </div>
            <div className="space-y-3">
              <FinanceRow icon={<CreditCardIcon className="w-5 h-5" />} label="Approved Payments" value={`NGN ${totalPaid.toLocaleString()}`} />
              <FinanceRow icon={<DocumentChartBarIcon className="w-5 h-5" />} label="Published Subjects" value={String(latestSessionResults.length)} />
              <FinanceRow icon={<CalendarDaysIcon className="w-5 h-5" />} label="Attendance Records" value={String(attendance.length)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ value, label }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-4 text-center">
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}

function FinanceRow({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-3 text-slate-700">
        <span className="text-blue-500">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}
