import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

function hasRecoveryToken() {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return searchParams.get('type') === 'recovery' || hashParams.get('type') === 'recovery';
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mode, setMode] = useState(hasRecoveryToken() ? 'update' : 'request');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (session && hasRecoveryToken()) {
        setMode('update');
      }
    };

    checkSession();
  }, []);

  const handleSendResetLink = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (resetError) throw resetError;
      setNotice('Password reset link sent. Check your inbox and open the link on this device.');
    } catch (err) {
      setError(err.message || 'Unable to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    try {
      if (password.length < 8) {
        throw new Error('Use a password with at least 8 characters.');
      }
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match.');
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setNotice('Password updated successfully. Redirecting to login...');
      setTimeout(() => navigate('/login', { replace: true }), 1200);
    } catch (err) {
      setError(err.message || 'Unable to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white shadow-card rounded-2xl w-full max-w-md p-8 border border-slate-100">
        <div className="text-center mb-6">
          <div className="text-2xl font-semibold text-slate-900">Reset School Admin Password</div>
          <p className="text-sm text-slate-500">
            {mode === 'update'
              ? 'Set a new password for your school admin account.'
              : 'Enter the email used for the school admin account.'}
          </p>
        </div>

        <form onSubmit={mode === 'update' ? handleUpdatePassword : handleSendResetLink} className="space-y-4">
          {mode === 'update' ? (
            <>
              <div>
                <label className="text-sm text-slate-600">New Password</label>
                <input
                  type="password"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:border-brand-400"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm text-slate-600">Confirm Password</label>
                <input
                  type="password"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:border-brand-400"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </div>
            </>
          ) : (
            <div>
              <label className="text-sm text-slate-600">School Admin Email</label>
              <input
                type="email"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:border-brand-400"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          )}

          {error ? <div className="text-sm text-rose-600">{error}</div> : null}
          {notice ? <div className="text-sm text-emerald-700">{notice}</div> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-600 text-white py-2 font-semibold hover:bg-brand-700 transition"
          >
            {loading
              ? mode === 'update'
                ? 'Updating...'
                : 'Sending...'
              : mode === 'update'
                ? 'Update Password'
                : 'Send Reset Link'}
          </button>
        </form>

        <p className="mt-4 text-sm text-center text-slate-600">
          <Link to="/login" className="text-brand-600">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
