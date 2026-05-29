import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useSchoolAccess } from '../hooks/useSchoolAccess';
import { useState } from 'react';
import { mutate } from 'swr';
import {
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  ChatBubbleLeftEllipsisIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  UsersIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  DocumentChartBarIcon,
  CreditCardIcon,
  SparklesIcon,
  RectangleGroupIcon,
  MegaphoneIcon,
  BanknotesIcon,
  ChatBubbleBottomCenterTextIcon,
  GlobeAltIcon,
  TicketIcon,
  Cog8ToothIcon,
  BuildingLibraryIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { AcademicCapIcon } from '@heroicons/react/24/solid';
import { PageWrapper } from '../components/PageWrapper';
import { AskAIWidget } from '../components/AskAIWidget';

const navItems = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: <Squares2X2Icon className="w-5 h-5" />, roles: ['school_admin'] },
  { label: 'Dashboard', to: '/teacher/dashboard', icon: <Squares2X2Icon className="w-5 h-5" />, roles: ['teacher'] },
  { label: 'Dashboard', to: '/dashboard', icon: <Squares2X2Icon className="w-5 h-5" />, roles: ['super_admin', 'parent', 'student'] },
  { label: 'Students', to: '/students', icon: <UserGroupIcon className="w-5 h-5" />, roles: ['super_admin', 'school_admin', 'teacher'] },
  { label: 'Staff', to: '/staff', icon: <UsersIcon className="w-5 h-5" />, roles: ['super_admin', 'school_admin'] },
  { label: 'Attendance', to: '/attendance', icon: <CalendarDaysIcon className="w-5 h-5" />, roles: ['super_admin', 'school_admin', 'teacher'] },
  { label: 'Exams', to: '/exams', icon: <DocumentTextIcon className="w-5 h-5" />, roles: ['super_admin', 'school_admin', 'teacher', 'student'] },
  { label: 'Results', to: '/results', icon: <DocumentChartBarIcon className="w-5 h-5" />, roles: ['super_admin', 'school_admin', 'teacher', 'parent', 'student'] },
  { label: 'Payments', to: '/payments', icon: <CreditCardIcon className="w-5 h-5" />, roles: ['super_admin', 'school_admin', 'parent'] },
  { label: 'AI Insights', to: '/ai', icon: <SparklesIcon className="w-5 h-5" />, roles: ['super_admin', 'school_admin', 'teacher', 'parent', 'student'] },
  { label: 'Classes', to: '/classes', icon: <RectangleGroupIcon className="w-5 h-5" />, roles: ['super_admin', 'school_admin', 'teacher'] },
  { label: 'Announcements', to: '/announcements', icon: <MegaphoneIcon className="w-5 h-5" />, roles: ['super_admin', 'school_admin', 'teacher'] },
  { label: 'Finance', to: '/finance', icon: <BanknotesIcon className="w-5 h-5" />, roles: ['super_admin', 'school_admin'] },
  { label: 'Settings', to: '/settings', icon: <Cog8ToothIcon className="w-5 h-5" />, roles: ['super_admin', 'school_admin'] }
];

const limitedSchoolAdminNav = [
  { label: 'Approval Status', to: '/pending-approval', icon: <Squares2X2Icon className="w-5 h-5" /> },
  { label: 'Settings', to: '/settings', icon: <Cog8ToothIcon className="w-5 h-5" /> }
];

const teacherNavPaths = new Set(['/teacher/dashboard', '/students', '/attendance', '/exams', '/results', '/ai']);

export default function Layout() {
  const { profile } = useAuth();
  const { isOperational, isPending, isDisabled } = useSchoolAccess(profile);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const allowedNav =
    profile?.role === 'school_admin' && !isOperational
      ? limitedSchoolAdminNav
      : profile?.role === 'teacher'
        ? navItems.filter((item) => item.roles.includes(profile?.role) && teacherNavPaths.has(item.to))
        : navItems.filter((item) => item.roles.includes(profile?.role));

  const signOut = async () => {
    // Clear all SWR caches before logging out
    mutate(() => true, undefined, false);
    await supabase.auth.signOut();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="flex h-screen bg-[#f4f6f8] text-slate-800 font-sans overflow-hidden">
      {/* Sidebar Overlay */}
      {open && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-20 md:hidden transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-30 w-64 h-full bg-sidebar text-slate-400 transition-transform duration-300 flex flex-col shadow-xl md:shadow-none`}>
        <div className="h-[72px] px-6 flex items-center border-b border-white/5">
  <div className="h-12 w-full flex items-center justify-start overflow-hidden">
    <img src="/gradiaflow_logo.jpg" alt="GradiaFlow" className="h-full object-contain rounded-md" />
  </div>
</div>

        {profile?.role === 'school_admin' && !isOperational && (
          <div className="px-5 mt-4">
            <div className={`rounded-xl px-3 py-2 text-xs font-semibold ${isDisabled ? 'bg-red-500/10 text-red-400' : 'bg-orange-500/10 text-orange-400'}`}>
              {isDisabled ? 'School disabled' : isPending ? 'Pending approval' : 'Limited access'}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {allowedNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-sidebar-active text-white shadow-sm' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`
              }
              onClick={() => setOpen(false)}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Bottom Profile Section */}
        <div className="p-4 mt-auto">
          <button
            onClick={signOut}
            className="flex items-center gap-3 w-full rounded-xl px-3 py-3 text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content View */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <header className="h-[72px] bg-gradient-to-r from-sidebar to-slate-800 sticky top-0 z-40 flex items-center justify-between px-4 md:px-8 border-b border-slate-700/50 shadow-md">
          <div className="flex items-center gap-4 flex-1">
            <button className="md:hidden text-slate-300 hover:text-white transition-colors" onClick={() => setOpen(true)}>
              <Bars3Icon className="w-6 h-6" />
            </button>
            <div className="relative w-full max-w-md hidden sm:block">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search everything..." 
                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-2xl py-2.5 pl-11 pr-4 text-sm text-white placeholder-slate-400 focus:bg-slate-700 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all" 
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-5">
            <button className="relative p-2 rounded-xl bg-slate-800/50 text-slate-300 hover:text-white hover:bg-slate-700 transition-all duration-200 group">
              <BellIcon className="w-6 h-6" />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-slate-800 ring-2 ring-rose-500/20 animate-pulse"></span>
            </button>
            <button className="relative p-2 rounded-xl bg-slate-800/50 text-slate-300 hover:text-white hover:bg-slate-700 transition-all duration-200 hidden sm:block">
              <ChatBubbleLeftEllipsisIcon className="w-6 h-6" />
            </button>
            <div className="hidden sm:block w-px h-8 bg-slate-700"></div>
            
            <div className="flex items-center gap-3 cursor-pointer select-none">
              <div className="flex flex-col items-end hidden md:flex">
                <span className="text-sm font-semibold text-white leading-tight">{profile?.full_name || 'Admin'}</span>
                <span className="text-xs text-slate-400 capitalize">{profile?.role?.replace('_', ' ') || 'User'}</span>
              </div>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-slate-700 shadow-sm" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-blue-600 text-white flex items-center justify-center font-semibold shadow-sm border-2 border-slate-700">
                  {getInitials(profile?.full_name)}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Content area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <PageWrapper key={location.pathname}>
            <Outlet />
          </PageWrapper>
        </div>
      </main>

      <AskAIWidget />
    </div>
  );
}
