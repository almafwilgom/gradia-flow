import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
// ... existing imports ...
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import RoleBasedRedirect from './components/RoleBasedRedirect';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ConfirmEmail from './pages/auth/ConfirmEmail';
import SetupGradiaFlowAdmin from './pages/auth/SetupGradiaFlowAdmin';
import Dashboard from './pages/Dashboard';
import PendingApproval from './pages/PendingApproval';
import Students from './pages/Students';
import Staff from './pages/Staff';
import Attendance from './pages/Attendance';
import Results from './pages/Results';
import Payments from './pages/Payments';
import ParentDashboard from './pages/ParentDashboard';
import AIChat from './pages/AIChat';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import Exams from './pages/Exams';
import Classes from './pages/Classes';
import Finance from './pages/Finance';
import SMS from './pages/SMS';
import Website from './pages/Website';
import Subscriptions from './pages/Subscriptions';
import Announcements from './pages/Announcements';

// Super Admin Pages
import SuperAdminDashboard from './super-admin/Dashboard';
import SuperAdminSchools from './super-admin/Schools';
import SuperAdminSchoolDetails from './super-admin/SchoolDetails';
import SuperAdminLayout from './super-admin/Layout';
import SchoolsManagement from './super-admin/SchoolsManagement';

// Portal Pages
import PortalHome from './portal/Home';
import PortalResults from './portal/Results';
import PortalAttendance from './portal/Attendance';
import PortalPayments from './portal/Payments';
import PortalMessages from './portal/Messages';
import PortalAIChat from './portal/AIChat';
import PortalLayout from './portal/Layout';
import EnhancedPortal from './portal/EnhancedPortal';

// New Premium Pages
import TeacherDashboard from './pages/TeacherDashboard';
import FinancialDashboard from './pages/FinancialDashboard';

// Public Pages
import Home from './pages/Home';
import AboutUs from './pages/AboutUs';
import Services from './pages/Services';
import ContactUs from './pages/ContactUs';
import PublicLayout from './components/PublicLayout';

export default function App() {
  const location = useLocation();

  useEffect(() => {
    NProgress.start();
    NProgress.done();
  }, [location.pathname]);

  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/services" element={<Services />} />
        <Route path="/contact" element={<ContactUs />} />
      </Route>

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/confirm-email" element={<ConfirmEmail />} />
      <Route path="/setup/gradiaflow-admin" element={<SetupGradiaFlowAdmin />} />

      {/* Role-based redirect after login */}
      <Route path="/dashboard" element={<RoleBasedRedirect />} />

      {/* Super Admin Routes */}
      <Route element={<ProtectedRoute roles={['super_admin']} />}>
        <Route element={<SuperAdminLayout />}>
          <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
          <Route path="/super-admin/schools" element={<SuperAdminSchools />} />
          <Route path="/super-admin/schools/:schoolId" element={<SuperAdminSchoolDetails />} />
          <Route path="/super-admin/schools-management" element={<SchoolsManagement />} />
          <Route path="/super-admin" element={<Navigate to="/super-admin/dashboard" replace />} />
        </Route>
      </Route>

      {/* Admin Routes (School Admin & Teacher) */}
      <Route element={<ProtectedRoute roles={['school_admin', 'teacher']} />}>
        <Route element={<Layout />}>
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
          <Route path="/financial/dashboard" element={<FinancialDashboard />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
          <Route path="/students" element={<Students />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/exams" element={<Exams />} />
          <Route path="/results" element={<Results />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/ai" element={<AIChat />} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/sms" element={<SMS />} />
          <Route path="/website" element={<Website />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/teacher" element={<Navigate to="/teacher/dashboard" replace />} />
        </Route>
      </Route>

      {/* Portal Routes (Parent & Student) */}
      <Route element={<ProtectedRoute roles={['parent', 'student']} />}>
        <Route element={<PortalLayout />}>
          <Route path="/portal/home" element={<PortalHome />} />
          <Route path="/portal/enhanced" element={<EnhancedPortal />} />
          <Route path="/portal/results" element={<PortalResults />} />
          <Route path="/portal/attendance" element={<PortalAttendance />} />
          <Route path="/portal/payments" element={<PortalPayments />} />
          <Route path="/portal/messages" element={<PortalMessages />} />
          <Route path="/portal/ai" element={<PortalAIChat />} />
          <Route path="/portal" element={<Navigate to="/portal/home" replace />} />
        </Route>
      </Route>

      {/* Fallback routes */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
