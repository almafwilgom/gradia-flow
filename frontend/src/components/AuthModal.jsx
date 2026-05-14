import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  School,
  UserCircle,
  GraduationCap,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

const ROLES = [
  { id: 'school_admin', label: 'School Admin', icon: ShieldCheck },
  { id: 'teacher', label: 'Teacher', icon: GraduationCap },
  { id: 'parent', label: 'Parent', icon: UserCircle },
  { id: 'student', label: 'Student', icon: School }
];

export default function AuthModal({ isOpen, onClose, initialMode = 'login', onAuthSuccess }) {
  const [mode, setMode] = useState(initialMode); // 'login', 'register', 'verify'
  const [formData, setFormData] = useState({
    role: 'school_admin',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    schoolName: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, initialMode]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (mode === 'login') {
        // For demonstration, let's say "test@example.com" fails
        if (formData.email === 'test@example.com') {
          throw new Error('Invalid login credentials');
        }
        setSuccess(true);
        if (onAuthSuccess) onAuthSuccess('login');
      } else if (mode === 'register') {
        setMode('verify');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-[480px] bg-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] overflow-hidden border border-white/20"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors z-10 text-slate-400 hover:text-slate-600"
        >
          <X size={20} />
        </button>

        <div className="p-8 md:p-10">
          <AnimatePresence mode="wait">
            {mode === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-10">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500/10 text-brand-600 mb-6">
                    <School size={32} />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-2">GradiaFlow</h2>
                  <p className="text-slate-500 font-medium">Smart School Management Powered by AI</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Login Type */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Login Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {ROLES.slice(0, 2).map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, role: r.id }))}
                          className={`flex items-center gap-2 px-4 py-3 rounded-2xl border-2 transition-all text-sm font-semibold ${
                            formData.role === r.id 
                            ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm' 
                            : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                          }`}
                        >
                          <r.icon size={18} />
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Email</label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                        <Mail size={18} />
                      </div>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="admin@school.com"
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-transparent focus:border-brand-500 focus:bg-white rounded-2xl outline-none transition-all text-slate-900 font-medium placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Password</label>
                    </div>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                        <Lock size={18} />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        required
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="••••••••"
                        className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border-2 border-transparent focus:border-brand-500 focus:bg-white rounded-2xl outline-none transition-all text-slate-900 font-medium placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Error Message */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600"
                      >
                        <AlertCircle className="shrink-0 mt-0.5" size={18} />
                        <div className="text-sm">
                          <p className="font-bold mb-0.5">Invalid login credentials</p>
                          <p className="opacity-80">{error}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white font-bold rounded-2xl shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Sign In
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8 pt-8 border-t border-slate-100 text-center">
                  <p className="text-slate-500 font-medium">
                    No account?{' '}
                    <button 
                      onClick={() => setMode('register')}
                      className="text-brand-600 font-bold hover:text-brand-700 transition-colors"
                    >
                      Register
                    </button>
                  </p>
                </div>
              </motion.div>
            )}

            {mode === 'register' && (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-slate-900 mb-2">Create Account</h2>
                  <p className="text-slate-500 font-medium">Welcome! Let&apos;s get your school started.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Full Name</label>
                    <input
                      name="fullName"
                      required
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="John Doe"
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-brand-500 focus:bg-white rounded-2xl outline-none transition-all text-slate-900 font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="john@school.com"
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-brand-500 focus:bg-white rounded-2xl outline-none transition-all text-slate-900 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Password</label>
                      <input
                        type="password"
                        name="password"
                        required
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-brand-500 focus:bg-white rounded-2xl outline-none transition-all text-slate-900 font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Confirm</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        required
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-brand-500 focus:bg-white rounded-2xl outline-none transition-all text-slate-900 font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white font-bold rounded-2xl shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2 group mt-4 active:scale-[0.98]"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Create Account
                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8 pt-8 border-t border-slate-100 text-center">
                  <p className="text-slate-500 font-medium">
                    Already have an account?{' '}
                    <button 
                      onClick={() => setMode('login')}
                      className="text-brand-600 font-bold hover:text-brand-700 transition-colors"
                    >
                      Sign In
                    </button>
                  </p>
                </div>
              </motion.div>
            )}

            {mode === 'verify' && (
              <motion.div
                key="verify"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 20 }}
                className="text-center py-4"
              >
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-brand-500/20 blur-3xl rounded-full scale-150"></div>
                  <div className="relative w-24 h-24 bg-brand-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(31,111,255,0.4)]">
                    <Mail className="text-white" size={40} />
                  </div>
                </div>

                <h2 className="text-3xl font-bold text-slate-900 mb-4">Check your email</h2>
                <p className="text-slate-600 font-medium mb-8 leading-relaxed max-w-[280px] mx-auto">
                  We&apos;ve sent a verification link to <span className="text-slate-900 font-bold">{formData.email}</span>. Please confirm your email to activate your account.
                </p>

                <div className="space-y-4">
                  <button
                    onClick={() => setMode('login')}
                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-xl transition-all active:scale-[0.98]"
                  >
                    Back to Login
                  </button>
                  
                  <p className="text-sm text-slate-400">
                    Didn&apos;t receive the email? <button className="text-brand-600 font-bold hover:underline">Resend</button>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Accent Bar */}
        <div className="h-2 bg-gradient-to-r from-brand-400 via-brand-600 to-indigo-600"></div>
      </motion.div>
    </div>
  );
}
