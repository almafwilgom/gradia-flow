import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  Bars3Icon,
  Squares2X2Icon,
  BuildingLibraryIcon,
  Cog8ToothIcon,
  ArrowRightOnRectangleIcon,
  MagnifyingGlassIcon,
  BellIcon,
  ChatBubbleLeftEllipsisIcon
} from '@heroicons/react/24/outline';
import { AcademicCapIcon } from '@heroicons/react/24/solid';

export default function SuperAdminLayout() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const menuItems = [
    { label: 'Overview', path: '/super-admin/dashboard', icon: <Squares2X2Icon className="w-5 h-5" /> },
    { label: 'Manage Schools', path: '/super-admin/schools', icon: <BuildingLibraryIcon className="w-5 h-5" /> },
    { label: 'System Settings', path: '/super-admin/schools-management', icon: <Cog8ToothIcon className="w-5 h-5" /> },
  ];

  const getInitials = (name) => {
    if (!name) return 'SA';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      navigate(`/super-admin/schools?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const notifications = [
    { id: 1, title: 'New School Registration', time: '2 mins ago', type: 'info' },
    { id: 2, title: 'Payment Approved: Christ Academy', time: '1 hour ago', type: 'success' },
    { id: 3, title: 'Trial Expiring Soon: Gradia Flow', time: '5 hours ago', type: 'warning' },
  ];

  const messages = [
    { id: 1, from: 'Admin: Christ Academy', preview: 'Can we upgrade our plan?', time: '10:30 AM' },
    { id: 2, from: 'Support', preview: 'System maintenance scheduled for tonight.', time: 'Yesterday' },
  ];

  return (
    <div className="flex h-screen bg-[#f4f6f8] text-slate-800 font-sans overflow-hidden">
      {/* Sidebar Overlay */}
      {(open || showNotifications || showMessages) && (
        <div 
          className="fixed inset-0 z-20 transition-opacity"
          onClick={() => {
            setOpen(false);
            setShowNotifications(false);
            setShowMessages(false);
          }}
        />
      )}

      {/* Sidebar */}
      <aside className={`${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-30 w-64 h-full bg-sidebar text-slate-400 transition-transform duration-300 flex flex-col shadow-xl md:shadow-none`}>
        <div className="h-[72px] px-6 flex items-center gap-3 border-b border-white/5">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-lg overflow-hidden shrink-0">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-xl font-bold text-white tracking-wide">GradiaFlow</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
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
            onClick={handleLogout}
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
        <header className="h-[72px] bg-gradient-to-r from-sidebar to-slate-800 flex items-center justify-between px-4 md:px-8 shrink-0 relative z-10 shadow-md border-b border-slate-700/50">
          <div className="flex items-center gap-4 flex-1">
            <button className="md:hidden text-slate-300 hover:text-white transition-colors" onClick={() => setOpen(true)}>
              <Bars3Icon className="w-6 h-6" />
            </button>
            <div className="relative w-full max-w-md hidden sm:block">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search Schools..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-full py-2.5 pl-11 pr-4 text-sm text-white placeholder-slate-400 focus:bg-slate-700 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all" 
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowMessages(false);
                }}
                className={`relative p-2 rounded-full transition-colors ${showNotifications ? 'bg-slate-700 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}
              >
                <BellIcon className="w-6 h-6" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-800"></span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <span className="font-bold text-slate-800">Notifications</span>
                    <button className="text-xs text-blue-600 font-medium hover:underline">Mark all read</button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors">
                        <div className="flex gap-3">
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.type === 'success' ? 'bg-green-500' : n.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                          <div>
                            <p className="text-sm font-medium text-slate-800 leading-snug">{n.title}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{n.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-slate-50/50 text-center">
                    <button className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">View All Notifications</button>
                  </div>
                </div>
              )}
            </div>

            <div className="relative hidden sm:block">
              <button 
                onClick={() => {
                  setShowMessages(!showMessages);
                  setShowNotifications(false);
                }}
                className={`relative p-2 rounded-full transition-colors ${showMessages ? 'bg-slate-700 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'}`}
              >
                <ChatBubbleLeftEllipsisIcon className="w-6 h-6" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-slate-800"></span>
              </button>

              {showMessages && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <span className="font-bold text-slate-800">Messages</span>
                    <button className="text-xs text-blue-600 font-medium hover:underline">New Message</button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {messages.map((m) => (
                      <div key={m.id} className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 shrink-0 uppercase text-xs">
                          {m.from.substring(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-start">
                            <p className="text-sm font-bold text-slate-800 truncate">{m.from}</p>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{m.time}</span>
                          </div>
                          <p className="text-xs text-slate-500 truncate">{m.preview}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-slate-50/50 text-center">
                    <button className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">Go to Messenger</button>
                  </div>
                </div>
              )}
            </div>

            <div className="hidden sm:block w-px h-8 bg-slate-700 mx-1"></div>
            
            <div className="flex items-center gap-3 cursor-pointer select-none group">
              <div className="flex flex-col items-end hidden md:flex">
                <span className="text-sm font-bold text-white leading-tight group-hover:text-blue-400 transition-colors">{profile?.full_name || 'James Adetegan'}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Super Admin</span>
              </div>
              <div className="relative">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-10 h-10 rounded-xl object-cover border-2 border-slate-700 shadow-sm ring-1 ring-slate-600" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold shadow-sm border-2 border-slate-700 ring-1 ring-slate-600">
                    {getInitials(profile?.full_name)}
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800"></div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-[#f4f6f8]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
