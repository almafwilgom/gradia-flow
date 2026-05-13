import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../../lib/api';

const roles = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'school_admin', label: 'School Admin' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'parent', label: 'Parent' },
  { value: 'student', label: 'Student' }
];

export default function Login() {
  const [role, setRole] = useState('school_admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const verifyNotice = params.get('verify') === '1';
  const apiBaseUrl = API_URL;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let loginEmail = email;
    let loginPassword = password;

    const usesCodeLogin = role === 'teacher' || role === 'student' || role === 'parent';

    if (usesCodeLogin) {
      if (!schoolCode || !loginCode) {
        setError('School code and ID are required for teacher, parent, and student login');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${apiBaseUrl}/api/public/auth/resolve-login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            role,
            school_code: schoolCode,
            login_code: loginCode
          })
        });

        const resolveData = await response.json();
        if (!response.ok) throw new Error(resolveData.error || 'Unable to resolve account');

        loginEmail = resolveData.email;
        loginPassword = loginCode;
      } catch (resolveError) {
        setLoading(false);
        setError(resolveError.message);
        return;
      }
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user?.id) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      navigate('/dashboard', { replace: true });
      return;
    }

    if (profile?.role === 'student') {
      navigate('/portal/home', { replace: true });
      return;
    }

    if (profile?.role === 'parent') {
      navigate('/portal/home', { replace: true });
      return;
    }

    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white shadow-card rounded-2xl w-full max-w-md p-8 border border-slate-100">
        <div className="text-center mb-6">
          <div className="text-2xl font-semibold text-slate-900">GradiaFlow</div>
          <p className="text-sm text-slate-500">Smart School Management Powered by AI</p>
        </div>
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
              >
                <motion.div 
                  className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full border border-red-100 text-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                    <AlertTriangle className="text-red-500" size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Login Failed</h3>
                  <p className="text-slate-600 mb-6">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2"
                  >
                    Try Again
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        <form onSubmit={handleLogin} className="space-y-4">
          {verifyNotice && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
              Check your email to verify the account, then sign in.
            </div>
          )}
          <div>
            <label className="text-sm text-slate-600">Login Type</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 bg-white"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {roles.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          {role === 'school_admin' || role === 'super_admin' ? (
            <>
              <div>
                <label className="text-sm text-slate-600">Email</label>
                <input
                  type="email"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:border-brand-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm text-slate-600">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 pr-10 focus:outline-none focus:border-brand-400"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {role === 'school_admin' && (
                <div className="flex justify-between items-center py-2">
                  <div className="text-xs text-slate-500 italic">
                    Lost your credentials?
                  </div>
                  <Link 
                    to="/auth/forgot-password" 
                    className="text-sm font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-2 py-1 rounded border border-brand-100 hover:bg-brand-100 transition-colors"
                  >
                    Reset Password
                  </Link>
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <label className="text-sm text-slate-600">School Code</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:border-brand-400"
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value.trim().toUpperCase())}
                  required
                />
              </div>
              <div>
                <label className="text-sm text-slate-600">{role === 'teacher' ? 'Teacher Code' : 'Student Code or Admission No'}</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:border-brand-400"
                  value={loginCode}
                  onChange={(e) => setLoginCode(e.target.value.trim())}
                  required
                />
              </div>
              <div className="text-xs text-slate-500">
                Use your school code and your ID. For parents, use the student&apos;s code or admission number.
              </div>
            </>
          )}
          {error && <div className="text-sm text-rose-600">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-600 text-white py-2 font-semibold hover:bg-brand-700 transition"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="mt-4 text-sm text-center text-slate-600">
          No account? <Link to="/register" className="text-brand-600">Register</Link>
        </p>
      </div>
    </div>
  );
}
