import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, CheckCircle2, AlertCircle, Eye, EyeOff, ArrowLeft, School, ShieldCheck } from 'lucide-react';
import { API_URL } from '../../lib/api';
import { supabase } from '../../lib/supabaseClient';

function StrengthBar({ password }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password)
  ];
  const strength = checks.filter(Boolean).length;
  const colors = ['bg-slate-200', 'bg-red-400', 'bg-yellow-400', 'bg-brand-400', 'bg-emerald-500'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i <= strength ? colors[strength] : 'bg-slate-100'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${strength <= 1 ? 'text-red-500' : strength <= 2 ? 'text-yellow-500' : strength <= 3 ? 'text-brand-500' : 'text-emerald-500'}`}>
        {labels[strength]}
      </p>
    </div>
  );
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [isSupabaseReset, setIsSupabaseReset] = useState(false);

  // Verify token/session on mount
  useEffect(() => {
    // 1. Check for Supabase Auth recovery session
    async function checkSupabaseSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsSupabaseReset(true);
        setVerified(true);
        setUserEmail(session.user?.email || '');
        setVerifying(false);
        return true;
      }
      return false;
    }

    // 2. Listen for auth state change (like PASSWORD_RECOVERY event)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setIsSupabaseReset(true);
        setVerified(true);
        setUserEmail(session?.user?.email || '');
        setVerifying(false);
      }
    });

    // 3. Fallback to token query param if no Supabase session exists
    async function verifyToken() {
      const hasSession = await checkSupabaseSession();
      if (hasSession) return;

      if (!token) {
        // Wait a little bit in case the hash takes a moment to process by Supabase listener
        setTimeout(async () => {
          const stillNoSession = !(await checkSupabaseSession());
          if (stillNoSession) {
            setError('Invalid reset link — token is missing.');
            setVerifying(false);
          }
        }, 1500);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/public/auth/verify-reset-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Invalid or expired reset link');
          setVerifying(false);
          return;
        }

        setVerified(true);
        setUserEmail(data.user_email || '');
        setVerifying(false);
      } catch (err) {
        setError(err.message || 'Failed to verify reset link');
        setVerifying(false);
      }
    }

    verifyToken();

    return () => subscription.unsubscribe();
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      if (isSupabaseReset) {
        const { error: updateErr } = await supabase.auth.updateUser({ password });
        if (updateErr) {
          setError(updateErr.message || 'Failed to reset password via Supabase');
          setLoading(false);
          return;
        }
        // Sign out to clean up recovery session
        await supabase.auth.signOut();
      } else {
        const res = await fetch(`${API_URL}/api/public/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password })
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to reset password');
          setLoading(false);
          return;
        }
      }

      setSubmitted(true);
      setTimeout(() => navigate('/login'), 3500);
    } catch (err) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  }

  const pageWrapper = (children) => (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/20 blur-[120px] rounded-full" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        {children}
      </motion.div>
    </div>
  );

  // ── Loading state ─────────────────────────────────────────────────────────
  if (verifying) {
    return pageWrapper(
      <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 text-center overflow-hidden">
        <div className="w-16 h-16 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin mx-auto mb-6" />
        <p className="text-slate-600 font-medium">Verifying your reset link...</p>
        <div className="h-2 bg-gradient-to-r from-brand-400 via-brand-600 to-indigo-600 mt-10 -mx-10 -mb-10" />
      </div>
    );
  }

  // ── Invalid token state ───────────────────────────────────────────────────
  if (!verified) {
    return pageWrapper(
      <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-red-400 to-rose-600" />
        <div className="p-8 md:p-10 text-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="text-red-500" size={36} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Link Invalid or Expired</h2>
          <p className="text-slate-500 font-medium mb-8 leading-relaxed">
            {error || 'This password reset link is invalid or has already been used.'}
          </p>
          <button
            onClick={() => navigate('/auth/forgot-password')}
            className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl transition-all active:scale-[0.98]"
          >
            Request a New Link
          </button>
          <button
            onClick={() => navigate('/login')}
            className="flex items-center justify-center gap-2 text-slate-400 hover:text-slate-600 text-sm font-medium mt-5 mx-auto transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (submitted) {
    return pageWrapper(
      <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-brand-500" />
        <div className="p-8 md:p-10 text-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-emerald-400/20 blur-3xl rounded-full scale-150" />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200 }}
              className="relative w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(16,185,129,0.4)]"
            >
              <CheckCircle2 className="text-white" size={44} />
            </motion.div>
          </div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-3xl font-bold text-slate-900 mb-3"
          >
            Password Reset!
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-500 font-medium mb-8"
          >
            Your password has been updated. Redirecting you to login...
          </motion.p>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            onClick={() => navigate('/login')}
            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all active:scale-[0.98]"
          >
            Go to Login
          </motion.button>

          {/* Auto-redirect progress */}
          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 3.5, ease: 'linear' }}
            style={{ transformOrigin: 'left' }}
            className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-400"
          />
        </div>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  return pageWrapper(
    <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-brand-400 via-brand-600 to-indigo-600" />
      <div className="p-8 md:p-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500/10 text-brand-600 mb-5">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Create New Password</h1>
          <p className="text-slate-500 font-medium text-sm">
            Resetting password for <span className="text-slate-900 font-bold">{userEmail}</span>
          </p>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600"
            >
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <p className="text-sm font-medium">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* New Password */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
              New Password
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
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
            <StrengthBar password={password} />
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
              Confirm Password
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                <Lock size={18} />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                className={`w-full pl-11 pr-12 py-3.5 bg-slate-50 border-2 focus:bg-white rounded-2xl outline-none transition-all text-slate-900 font-medium placeholder:text-slate-400 ${
                  confirmPassword && password !== confirmPassword
                    ? 'border-red-400 focus:border-red-500'
                    : confirmPassword && password === confirmPassword
                    ? 'border-emerald-400 focus:border-emerald-500'
                    : 'border-transparent focus:border-brand-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-500 font-medium ml-1">Passwords don&apos;t match</p>
            )}
            {confirmPassword && password === confirmPassword && (
              <p className="text-xs text-emerald-500 font-medium ml-1 flex items-center gap-1">
                <CheckCircle2 size={12} /> Passwords match
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white font-bold rounded-2xl shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] mt-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          🔒 GradiaFlow staff will never ask for your password
        </p>
      </div>
    </div>
  );
}
