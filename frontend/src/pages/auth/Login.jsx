import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertTriangle, X, Lock, Mail, School, UserCircle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../../lib/api';

const roles = [
  { value: 'school_admin', label: 'School Admin', icon: <School size={18} /> },
  { value: 'super_admin', label: 'Super Admin', icon: <UserCircle size={18} /> },
  { value: 'teacher', label: 'Teacher', icon: <UserCircle size={18} /> },
  { value: 'parent', label: 'Parent', icon: <UserCircle size={18} /> },
  { value: 'student', label: 'Student', icon: <UserCircle size={18} /> }
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
  const [showVerifyModal, setShowVerifyModal] = useState(params.get('verify') === '1');
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
    
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user?.id) {
      setLoading(false);
      navigate('/dashboard', { replace: true });
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    setLoading(false);
    if (profileError) {
      navigate('/dashboard', { replace: true });
      return;
    }

    if (profile?.role === 'student' || profile?.role === 'parent') {
      navigate('/portal/home', { replace: true });
      return;
    }

    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/20 blur-[120px] rounded-full"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden z-10"
      >
        {/* Left Side - Visual/Marketing */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-brand-600 to-indigo-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/gradiaflow_auth_bg.png')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30">
                <School className="text-white" size={28} />
              </div>
              <span className="text-3xl font-bold text-white tracking-tight">GradiaFlow</span>
            </div>
            
            <h1 className="text-5xl font-bold text-white leading-tight mb-6">
              Empowering Education with <span className="text-brand-200">AI Innovation</span>
            </h1>
            <p className="text-white/80 text-xl max-w-md font-light leading-relaxed">
              Experience the next generation of school management. Seamless, smart, and designed for growth.
            </p>
          </div>

          <div className="relative z-10">
            <div className="flex -space-x-4 mb-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-12 h-12 rounded-full border-2 border-brand-500 bg-slate-200 overflow-hidden shadow-lg">
                  <img src={`https://i.pravatar.cc/150?u=${i+10}`} alt="User" />
                </div>
              ))}
              <div className="w-12 h-12 rounded-full border-2 border-brand-500 bg-brand-400 flex items-center justify-center text-white text-xs font-bold shadow-lg">
                +2k
              </div>
            </div>
            <p className="text-white/70 text-sm font-medium">
              Join 2,000+ schools worldwide scaling with GradiaFlow.
            </p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="p-8 lg:p-16 bg-white relative">
          <div className="max-w-md mx-auto">
            <div className="text-center lg:text-left mb-10">
              <div className="lg:hidden flex justify-center mb-6">
                <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-200">
                  <School className="text-white" size={32} />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h2>
              <p className="text-slate-500">Enter your credentials to access your dashboard</p>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 overflow-hidden"
                >
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3 text-red-700">
                    <AlertTriangle className="flex-shrink-0 mt-0.5" size={18} />
                    <div className="text-sm">
                      <p className="font-bold mb-1">Login failed</p>
                      <p className="opacity-90">{error}</p>
                    </div>
                    <button onClick={() => setError(null)} className="ml-auto hover:bg-red-100 p-1 rounded-full transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleLogin} className="space-y-6">
              <AnimatePresence>
                {showVerifyModal && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
                  >
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.9, opacity: 0, y: 20 }}
                      className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center relative overflow-hidden"
                    >
                      {/* Decorative Background */}
                      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-500 to-indigo-600"></div>
                      
                      <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Mail className="text-brand-600" size={36} />
                      </div>
                      
                      <h3 className="text-2xl font-bold text-slate-900 mb-3">Check Your Email</h3>
                      <p className="text-slate-600 mb-8 leading-relaxed">
                        We've sent a verification link to your email address. Please click the link to activate your account before signing in.
                      </p>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setShowVerifyModal(false);
                          // Clean up URL
                          navigate('/login', { replace: true });
                        }}
                        className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all shadow-lg active:scale-[0.98]"
                      >
                        Got it, thanks!
                      </button>
                      
                      <p className="mt-6 text-xs text-slate-400">
                        Didn't receive it? Check your spam folder.
                      </p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block ml-1">Login Type</label>
                <div className="grid grid-cols-1 gap-2">
                  <select
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all appearance-none cursor-pointer text-slate-700 font-medium"
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
              </div>

              {role === 'school_admin' || role === 'super_admin' ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 block ml-1">Email Address</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <Mail size={20} />
                      </div>
                      <input
                        type="email"
                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-slate-900 placeholder:text-slate-400"
                        placeholder="name@school.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-sm font-semibold text-slate-700">Password</label>
                      <Link to="/auth/forgot-password" size="sm" className="text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline">
                        Forgot Password?
                      </Link>
                    </div>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <Lock size={20} />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="w-full pl-12 pr-12 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-slate-900"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 block ml-1">School Code</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <School size={20} />
                      </div>
                      <input
                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-slate-900 placeholder:text-slate-400"
                        placeholder="e.g. SCH123"
                        value={schoolCode}
                        onChange={(e) => setSchoolCode(e.target.value.trim().toUpperCase())}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 block ml-1">
                      {role === 'teacher' ? 'Teacher Code' : 'Student/Admission Code'}
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <Lock size={20} />
                      </div>
                      <input
                        className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-slate-900"
                        placeholder="Enter your ID"
                        value={loginCode}
                        onChange={(e) => setLoginCode(e.target.value.trim())}
                        required
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 ml-1">
                      Use the unique ID provided by your school administration.
                    </p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold rounded-2xl shadow-xl shadow-brand-200 transition-all flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Sign In to Account
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-10 text-center">
              <p className="text-slate-500">
                Don&apos;t have an account?{' '}
                <Link to="/register" className="font-bold text-brand-600 hover:text-brand-700 hover:underline">
                  Create Account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating Elements for Premium Feel */}
      <div className="absolute top-1/4 right-10 w-24 h-24 bg-white/5 rounded-full border border-white/10 animate-pulse-subtle"></div>
      <div className="absolute bottom-1/4 left-10 w-32 h-32 bg-white/5 rounded-full border border-white/10 animate-bounce-subtle"></div>
    </div>
  );
}

