import { useMemo } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import {
  BuildingLibraryIcon,
  AcademicCapIcon,
  UsersIcon,
  ClockIcon,
  ChevronRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

async function fetchSuperAdminData() {
  return apiFetch('/api/admin/dashboard-stats');
}

function buildAttendanceTrend(attendanceRows) {
  const lastSixMonths = Array.from({ length: 6 }).map((_, index) => {
    const date = dayjs().subtract(5 - index, 'month');
    return {
      key: date.format('YYYY-MM'),
      label: date.format('MMM'),
      present: 0,
      total: 0
    };
  });

  const map = new Map(lastSixMonths.map((entry) => [entry.key, entry]));

  attendanceRows.forEach((row) => {
    const key = dayjs(row.attended_on).format('YYYY-MM');
    const month = map.get(key);
    if (!month) return;
    month.total += 1;
    if (row.status === 'present') month.present += 1;
  });

  return lastSixMonths.map((entry) => ({
    name: entry.label,
    percent: entry.total ? Math.round((entry.present / entry.total) * 100) : 0
  }));
}

function buildPlatformOverview(overviewRows) {
  const lastSixMonths = Array.from({ length: 6 }).map((_, index) => {
    const date = dayjs().subtract(5 - index, 'month');
    return {
      key: date.format('YYYY-MM'),
      label: date.format('MMM YY'),
      schools: 0,
      students: 0
    };
  });

  const map = new Map(lastSixMonths.map((entry) => [entry.key, entry]));

  overviewRows.forEach((school) => {
    const key = dayjs(school.created_at).format('YYYY-MM');
    const month = map.get(key);
    if (!month) return;
    month.schools += 1;
    month.students += Number(school.total_students ?? 0);
  });

  return lastSixMonths.map((entry) => ({
    name: entry.label,
    schools: entry.schools,
    students: entry.students
  }));
}

export default function SuperAdminDashboard() {
  const { profile } = useAuth();
  const { data, error } = useSWR(
    profile?.role === 'super_admin' ? ['super-admin-dashboard', profile.id] : null,
    fetchSuperAdminData
  );
  const safeData = data ?? {
    schools: [],
    overview: [],
    totalTeachers: 0,
    payments: [],
    attendance: [],
    announcements: []
  };

  const stats = useMemo(() => {
    const overview = safeData.overview ?? [];
    const schools = safeData.schools ?? [];
    const payments = safeData.payments ?? [];

    return {
      totalSchools: schools.length,
      totalStudents: overview.reduce((sum, item) => sum + Number(item.total_students ?? 0), 0),
      pendingApprovals: schools.filter((school) => school.status !== 'approved').length,
      totalTeachers: safeData.totalTeachers ?? 0,
      revenue: payments.reduce((sum, item) => sum + Number(item.amount ?? 0), 0)
    };
  }, [safeData]);

  const platformOverview = useMemo(
    () => buildPlatformOverview(safeData.overview ?? []),
    [safeData.overview]
  );

  const attendanceTrend = useMemo(
    () => buildAttendanceTrend(safeData.attendance ?? []),
    [safeData.attendance]
  );

  const pendingSchools = (safeData.schools ?? []).filter((school) => school.status !== 'approved');
  const announcements = safeData.announcements ?? [];
  const riskSchools = (safeData.overview ?? [])
    .filter((school) => Number(school.total_students ?? 0) === 0 || school.status !== 'approved')
    .slice(0, 3);

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error.message}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Super Admin Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time platform view across all schools.</p>
        </div>
        <Link
          to="/super-admin/schools"
          className="flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-100 transition-colors"
        >
          <BuildingLibraryIcon className="w-5 h-5" />
          <span>Manage Schools</span>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<BuildingLibraryIcon className="w-6 h-6" />} tone="orange" value={stats.totalSchools} label="Total Schools" />
        <StatCard icon={<AcademicCapIcon className="w-6 h-6" />} tone="blue" value={stats.totalStudents} label="Total Students" />
        <StatCard icon={<ClockIcon className="w-6 h-6" />} tone="green" value={stats.pendingApprovals} label="Pending Approval" />
        <StatCard icon={<UsersIcon className="w-6 h-6" />} tone="purple" value={stats.totalTeachers} label="Total Teachers" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] p-6 shadow-soft border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800">Platform Overview</h2>
              <span className="text-sm text-slate-400">Past 6 Months</span>
            </div>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={platformOverview} margin={{ top: 10, right: 20, bottom: 10, left: -15 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)' }} />
                  <Line type="monotone" dataKey="students" stroke="#4f8df7" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="schools" stroke="#52c7b8" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
            <div className="bg-white rounded-[2rem] p-6 shadow-soft border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800">Attendance Overview</h2>
                <span className="text-sm text-slate-400">Last 6 Months</span>
              </div>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={attendanceTrend} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="super-admin-attendance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6ea8fe" stopOpacity={0.24} />
                        <stop offset="95%" stopColor="#6ea8fe" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)' }} />
                    <Area type="monotone" dataKey="percent" stroke="#4f8df7" strokeWidth={3} fillOpacity={1} fill="url(#super-admin-attendance)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-[2rem] p-6 shadow-soft border border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                  <SparklesIcon className="w-5 h-5 text-indigo-500" />
                  <h2 className="text-lg font-bold text-slate-800">AI Insights</h2>
                </div>
                <div className="space-y-3">
                  <InsightCard title={`${stats.pendingApprovals} schools awaiting approval`} body="Use the schools manager to review onboarding and activate access." />
                  <InsightCard title={`${riskSchools.length} schools need attention`} body="Schools with no enrolled students or pending setup are highlighted here." />
                  <InsightCard title={`NGN ${Number(stats.revenue).toLocaleString()} collected`} body="Approved payments are flowing through the live finance data." />
                </div>
              </div>

              <div className="bg-white rounded-[2rem] p-6 shadow-soft border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-800">Announcements</h2>
                  <Link to="/super-admin/schools-management" className="text-sm text-blue-600 flex items-center gap-1">
                    View More <ChevronRightIcon className="w-4 h-4" />
                  </Link>
                </div>
                <div className="space-y-3">
                  {announcements.length === 0 ? (
                    <p className="text-sm text-slate-500">No platform announcements yet.</p>
                  ) : (
                    announcements.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                        <p className="text-xs text-slate-400 mt-1">{dayjs(item.created_at).format('DD MMM YYYY')}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] p-6 shadow-soft border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">Recent Approvals</h2>
              <Link to="/super-admin/schools" className="text-sm text-blue-600 flex items-center gap-1">
                View Review <ChevronRightIcon className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {pendingSchools.length === 0 ? (
                <p className="text-sm text-slate-500">All schools are currently reviewed.</p>
              ) : (
                pendingSchools.slice(0, 5).map((school) => (
                  <div key={school.id} className="rounded-2xl border border-slate-100 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{school.name}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {school.school_code ?? 'No school code'} • {dayjs(school.created_at).format('DD MMM YYYY')}
                        </p>
                      </div>
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        Pending
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-6 shadow-soft border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Platform Snapshot</h2>
            <div className="space-y-4">
              {(data?.overview ?? []).slice(0, 4).map((school) => (
                <div key={school.id}>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium text-slate-700">{school.name}</span>
                    <span className="text-slate-400">{Number(school.total_students ?? 0)} students</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400"
                      style={{
                        width: `${Math.min(100, Number(school.total_students ?? 0) > 0 ? Number(school.total_students ?? 0) / 5 : 8)}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, tone, value, label }) {
  const toneClasses = {
    orange: 'bg-orange-50 text-orange-500',
    blue: 'bg-blue-50 text-blue-500',
    green: 'bg-emerald-50 text-emerald-500',
    purple: 'bg-violet-50 text-violet-500'
  };

  return (
    <div className="bg-white rounded-3xl p-5 shadow-soft border border-slate-100 flex items-center gap-4 hover:shadow-card transition-shadow">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${toneClasses[tone]}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
        <div className="text-sm text-slate-400 font-medium tracking-wide">{label}</div>
      </div>
    </div>
  );
}

function InsightCard({ title, body }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="text-xs text-slate-500 mt-1">{body}</p>
    </div>
  );
}
