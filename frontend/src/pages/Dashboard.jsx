import useSWR from 'swr';
import dayjs from 'dayjs';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { apiFetch } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import {
  AcademicCapIcon,
  UsersIcon,
  RectangleGroupIcon,
  BanknotesIcon,
  ChevronRightIcon,
  BellIcon,
  ChatBubbleLeftEllipsisIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  HandThumbUpIcon
} from '@heroicons/react/24/outline';

const fetchSchoolDashboardData = async () => {
  return apiFetch('/api/school/dashboard-stats');
};

const fetchAIInsights = async (key, stats, token) => {
  if (!stats || !token) return null;
  try {
    const prompt = `Based on the following school statistics, provide 3 concise AI insights for the school dashboard:
Teachers: ${stats.total_teachers ?? 0}
Students: ${stats.total_students ?? 0}
Parents: ${stats.total_parents ?? 0}
Classes: ${stats.total_classes ?? 0}
Attendance %: ${Math.round((stats.attendance_pct ?? 0) * 100)}
Fees Collected: NGN ${Number(stats.fees_collected ?? 0).toLocaleString()}

Provide exactly 3 bullet points of actionable insights. Be specific and helpful.`;

    const response = await apiFetch('/api/ai/chat', {
      method: 'POST',
      token,
      body: {
        messages: [{ role: 'user', content: prompt }],
        school_id: stats.school_id
      }
    });
    const reply = response.reply.content;
    const insights = reply.split('\n').filter(line => line.trim().startsWith('-') || line.trim().startsWith('•')).map(line => line.trim().replace(/^[-•]\s*/, ''));
    return insights.slice(0, 3);
  } catch (err) {
    console.error('AI Insights error:', err);
    return null;
  }
};

export default function Dashboard() {
  const { profile, session } = useAuth();
  const isStudent = profile?.role === 'student';
  const isGradiaFlowAdmin = profile?.role === 'super_admin';
  const isTeacher = profile?.role === 'teacher';
  const teacherClass = profile?.teachers?.classes ?? profile?.teachers?.[0]?.classes ?? null;
  const teacherClassId = profile?.teachers?.class_id ?? profile?.teachers?.[0]?.class_id ?? '';

  const { data: dashboardData, error: dashboardError } = useSWR(
    profile?.school_id && !isGradiaFlowAdmin ? ['school-dashboard', profile.id] : null,
    fetchSchoolDashboardData
  );

  const { data: schoolsOverview, error: schoolsError } = useSWR(
    isGradiaFlowAdmin ? ['schools-overview'] : null,
    async () => {
      const { data, error } = await supabase.from('vw_school_overview').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  );

  const { data: teacherStudents } = useSWR(
    isTeacher && teacherClassId ? ['teacher-students', teacherClassId] : null,
    async () => {
      const { data, error } = await supabase.from('students').select('id, first_name, last_name, admission_no, status').eq('class_id', teacherClassId).order('first_name', { ascending: true });
      if (error) throw error;
      return data;
    }
  );

  const data = dashboardData?.stats;
  const attendanceRows = dashboardData?.attendance;
  const subjectPerformance = dashboardData?.performance;

  const { data: aiInsights } = useSWR(
    data && session?.access_token ? ['ai-insights', data, session.access_token] : null,
    fetchAIInsights
  );

  const stats = isGradiaFlowAdmin
    ? [
        { label: 'Schools', value: String(schoolsOverview?.length ?? 0) },
        { label: 'Pending Approval', value: String((schoolsOverview ?? []).filter(i => i.status !== 'approved').length) },
        { label: 'Disabled Schools', value: String((schoolsOverview ?? []).filter(i => i.status === 'disabled').length) },
        { label: 'Total Students', value: String((schoolsOverview ?? []).reduce((t, i) => t + Number(i.total_students ?? 0), 0)) }
      ]
    : [
        { label: 'Total Students', value: String(data?.total_students ?? 0) },
        { label: 'Total Teachers', value: String(data?.total_teachers ?? 0) },
        { label: 'Total Classes', value: String(data?.total_classes ?? 0) },
        { label: 'Total Funds', value: `NGN ${Number(data?.fees_collected ?? 0).toLocaleString()}` }
      ];

  const insightsFallback = [
    `Dashboard statistics are being tracked for ${stats?.[0]?.value} students.`,
    `Revenue collection stands at ${stats?.[3]?.value}.`,
    `Performance monitoring active across all subjects.`
  ];

  if (isStudent) return <Navigate to="/portal/home" replace />;
  if (dashboardError || schoolsError) return (
    <div className="p-8 text-center bg-rose-50 rounded-3xl m-6 border border-rose-100">
      <h2 className="text-rose-800 font-bold mb-2">Dashboard Error</h2>
      <p className="text-rose-600 text-sm mb-4">{dashboardError?.message || schoolsError?.message}</p>
      <button onClick={() => window.location.reload()} className="bg-rose-600 text-white px-6 py-2 rounded-xl text-sm font-bold">Retry</button>
    </div>
  );

  if (!dashboardData && !schoolsOverview && !isTeacher) return <div className="p-8 animate-pulse space-y-6"><div className="h-20 bg-slate-100 rounded-3xl"></div><div className="grid grid-cols-4 gap-4"><div className="h-32 bg-slate-100 rounded-3xl"></div><div className="h-32 bg-slate-100 rounded-3xl"></div><div className="h-32 bg-slate-100 rounded-3xl"></div><div className="h-32 bg-slate-100 rounded-3xl"></div></div></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-[2rem] bg-white p-6 shadow-soft border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
            <p className="text-sm text-slate-500">Welcome back, {profile?.full_name}</p>
          </div>
          <div className="flex items-center gap-3">
             {data?.current_session_year && (
               <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-2">
                 <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">{data.current_session_year}</span>
                 {data.current_term && <span className="text-xs text-blue-400">|</span>}
                 {data.current_term && <span className="text-xs font-semibold text-blue-500">{data.current_term}</span>}
               </div>
             )}
             <div className="relative"><MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" placeholder="Search..." className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-blue-100"/></div>
             <button className="p-2.5 rounded-full bg-slate-50 text-slate-400 hover:text-blue-500 transition-colors"><BellIcon className="w-5 h-5"/></button>
          </div>
        </div>
      </div>


      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-3xl p-6 shadow-soft border border-slate-100 flex items-center gap-4 hover:shadow-card transition-all">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${i === 0 ? 'bg-blue-50 text-blue-500' : i === 1 ? 'bg-orange-50 text-orange-500' : i === 2 ? 'bg-green-50 text-green-500' : 'bg-purple-50 text-purple-500'}`}>
              {i === 0 ? <AcademicCapIcon className="w-6 h-6"/> : i === 1 ? <UsersIcon className="w-6 h-6"/> : i === 2 ? <RectangleGroupIcon className="w-6 h-6"/> : <BanknotesIcon className="w-6 h-6"/>}
            </div>
            <div>
              <div className="text-xl font-bold text-slate-800">{s.value}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Insights & Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-white rounded-[2rem] p-8 shadow-soft border border-slate-100 h-[300px] flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-4 animate-bounce">
                <SparklesIcon className="w-8 h-8"/>
              </div>
              <h2 className="text-xl font-bold text-slate-800">School Performance Data</h2>
              <p className="text-slate-500 text-sm max-w-sm">Detailed visual charts are being optimized for your school's data. Access reports via the sidebar.</p>
           </div>
        </div>

        <div className="space-y-6">
           <div className="bg-white rounded-[2rem] p-8 shadow-soft border border-slate-100">
              <div className="flex items-center gap-2 mb-6">
                <SparklesIcon className="w-5 h-5 text-purple-500"/>
                <h2 className="text-lg font-bold text-slate-800">AI Insights</h2>
              </div>
              <ul className="space-y-4">
                {(aiInsights ?? insightsFallback).map((insight, idx) => (
                  <li key={idx} className="flex gap-3 text-sm">
                    <span className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">{idx+1}</span>
                    <span className="text-slate-600 leading-relaxed">{insight}</span>
                  </li>
                ))}
              </ul>
           </div>
        </div>
      </div>
    </div>
  );
}
