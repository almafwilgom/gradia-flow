import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useState } from 'react';
import {
  ChevronLeftIcon,
  Bars3Icon,
  BellIcon,
  HomeIcon,
  DocumentChartBarIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  ChatBubbleLeftEllipsisIcon,
  SparklesIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { AcademicCapIcon } from '@heroicons/react/24/solid';
import { PageWrapper } from '../components/PageWrapper';

export default function PortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const menuItems = [
    { label: 'Dashboard', path: '/portal/home', icon: <HomeIcon className="w-5 h-5"/> },
    { label: 'Results', path: '/portal/results', icon: <DocumentChartBarIcon className="w-5 h-5"/> },
    { label: 'Attendance', path: '/portal/attendance', icon: <CalendarDaysIcon className="w-5 h-5"/> },
    { label: 'Payments', path: '/portal/payments', icon: <CreditCardIcon className="w-5 h-5"/> },
    { label: 'Messages', path: '/portal/messages', icon: <ChatBubbleLeftEllipsisIcon className="w-5 h-5"/> },
    { label: 'AI Chat', path: '/portal/ai', icon: <SparklesIcon className="w-5 h-5"/> },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#f4f6f8] text-slate-800 font-sans overflow-hidden">
      
      {/* Mobile Sliding Menu */}
      {mobileMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-slate-900/50 z-40 md:hidden transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-[260px] bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 translate-x-0 md:hidden">
             <div className="p-6 border-b border-blue-500/20 bg-gradient-to-r from-blue-600/20 to-indigo-600/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                    <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-lg font-bold text-white">GradiaFlow</span>
                </div>
             </div>
             <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
               {menuItems.map((item) => (
                 <NavLink
                   key={item.path}
                   to={item.path}
                   onClick={() => setMobileMenuOpen(false)}
                   className={({ isActive }) =>
                     `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                       isActive 
                         ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25' 
                         : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
                     }`
                   }
                 >
                   {item.icon}
                   {item.label}
                 </NavLink>
               ))}
               <button
                 onClick={handleLogout}
                 className="flex items-center gap-3 w-full rounded-xl px-4 py-3 text-sm font-medium text-slate-400 hover:bg-red-500/20 hover:text-red-300 transition-colors mt-6"
               >
                 <ArrowRightOnRectangleIcon className="w-5 h-5"/>
                 Logout
               </button>
             </div>
          </div>
        </>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 h-full bg-gradient-to-b from-slate-900 to-slate-950 text-slate-400 flex-col relative z-20 shrink-0 shadow-xl">
        <div className="h-[72px] px-6 flex items-center gap-3 border-b border-blue-500/20 shrink-0">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg overflow-hidden shrink-0">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-xl font-bold text-white tracking-wide">GradiaFlow</span>
        </div>
        
        {/* User Info Section in Sidebar */}
        <div className="px-6 py-6 border-b border-blue-500/10 bg-gradient-to-r from-blue-500/5 to-indigo-500/5">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 overflow-hidden border-2 border-blue-400/30 shrink-0 flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-white">
                    {profile?.full_name?.[0]?.toUpperCase() ?? 'S'}
                  </span>
                )}
             </div>
             <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">{profile?.full_name || 'Student'}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest truncate">{profile?.role}</div>
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25' 
                    : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="p-4 mt-auto border-t border-blue-500/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full rounded-xl px-3 py-3 text-sm font-medium text-slate-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Header Inside Content Area */}
        <div className="md:hidden bg-gradient-to-r from-blue-600 to-indigo-600 h-[60px] px-4 flex items-center justify-between sticky top-0 z-40 border-b border-blue-500/30 shadow-lg shrink-0">
          <button onClick={() => navigate(-1)} className="text-white hover:text-blue-100 w-8 h-8 flex items-center justify-center p-0 m-0 transition-colors">
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-1.5 flex-1 justify-center">
             <div className="w-8 h-8 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center shadow-md overflow-hidden shrink-0">
               <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
             </div>
             <span className="text-lg font-bold text-white tracking-tight">GradiaFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative text-white hover:text-blue-100 transition-colors">
              <BellIcon className="w-6 h-6" />
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-400 rounded-full border-2 border-white"></span>
            </button>
            <button className="text-white hover:text-blue-100 transition-colors" onClick={() => setMobileMenuOpen(true)}>
              <Bars3Icon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
          <div className="p-3 sm:p-5 md:p-8">
            <PageWrapper key={location.pathname}>
              <Outlet />
            </PageWrapper>
          </div>
        </div>
      </div>
    </div>
  );
}
