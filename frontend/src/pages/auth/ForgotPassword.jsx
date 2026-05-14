import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mail, CheckCircle2, School, AlertCircle } from 'lucide-react';
import { API_URL } from '../../lib/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/public/auth/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send reset email');
        return;
      }

      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/20 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Back button */}
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 text-sm font-medium group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Login
        </button>

        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="p-8 md:p-10"
              >
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500/10 text-brand-600 mb-5">
                    <School size={32} />
                  </div>
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">Forgot Password?</h1>
                  <p className="text-slate-500 font-medium">
                    Enter your email and we&apos;ll send you a reset link
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
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
                      Email Address
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                        <Mail size={18} />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@school.com"
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-transparent focus:border-brand-500 focus:bg-white rounded-2xl outline-none transition-all text-slate-900 font-medium placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white font-bold rounded-2xl shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>
                </form>

                <p className="text-center text-slate-400 text-sm mt-6">
                  Check your spam folder if you don&apos;t see it in a few minutes.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 20 }}
                className="p-8 md:p-10 text-center"
              >
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-brand-500/20 blur-3xl rounded-full scale-150" />
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                    className="relative w-24 h-24 bg-brand-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(31,111,255,0.4)]"
                  >
                    <Mail className="text-white" size={40} />
                  </motion.div>
                </div>

                <h2 className="text-3xl font-bold text-slate-900 mb-3">Check your email</h2>
                <p className="text-slate-500 font-medium mb-2">We&apos;ve sent a reset link to</p>
                <p className="text-brand-600 font-bold text-lg mb-8">{email}</p>

                <div className="bg-slate-50 rounded-2xl p-5 text-left mb-8 space-y-2">
                  <p className="text-sm font-bold text-slate-700 mb-3">Next steps:</p>
                  {['Click the link in the email', 'Create your new password', 'Sign back in'].map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </div>
                      <span className="text-sm text-slate-600">{step}</span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-slate-400 mb-4">⏱ Link expires in 1 hour</p>

                <button
                  onClick={() => { setSubmitted(false); setEmail(''); setError(''); }}
                  className="text-brand-600 font-bold hover:text-brand-700 transition-colors text-sm"
                >
                  Try a different email
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom accent */}
          <div className="h-2 bg-gradient-to-r from-brand-400 via-brand-600 to-indigo-600" />
        </div>
      </motion.div>
    </div>
  );
}
