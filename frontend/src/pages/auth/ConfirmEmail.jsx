import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../../lib/api';

export default function ConfirmEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [error, setError] = useState(null);
  const [password, setPassword] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const token = searchParams.get('token');
  const apiBaseUrl = API_URL;

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('No confirmation token provided');
      return;
    }

    // Token is valid, show password form
    setShowPasswordForm(true);
    setStatus('ready');
  }, [token]);

  const handleConfirm = async (e) => {
    e.preventDefault();
    setConfirming(true);
    setError(null);

    try {
      if (!password) {
        throw new Error('Please enter a password');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const res = await fetch(`${apiBaseUrl}/api/public/auth/verify-confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to confirm email');
      }

      setStatus('success');
      setShowPasswordForm(false);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (err) {
      setError(err.message);
      setConfirming(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white shadow-card rounded-2xl w-full max-w-lg p-8 border border-slate-100">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600">Verifying your email...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error' && !showPasswordForm) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white shadow-card rounded-2xl w-full max-w-lg p-8 border border-slate-100">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="text-2xl font-semibold text-slate-900">Link Expired</div>
            <p className="text-sm text-slate-500 mt-2">{error}</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800">
              Your confirmation link has expired. Please register again to receive a new link.
            </p>
          </div>

          <Link
            to="/register"
            className="block w-full text-center rounded-lg bg-brand-600 text-white py-2 font-semibold hover:bg-brand-700 transition mb-3"
          >
            Register Again
          </Link>

          <Link
            to="/login"
            className="block w-full text-center rounded-lg border border-slate-200 text-slate-600 py-2 font-semibold hover:bg-slate-50 transition"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white shadow-card rounded-2xl w-full max-w-lg p-8 border border-slate-100">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-2xl font-semibold text-slate-900">Email Confirmed!</div>
            <p className="text-sm text-slate-500 mt-2">Your account is ready to use</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 my-6">
            <p className="text-sm text-green-800">
              Your email has been successfully verified. Redirecting to login...
            </p>
          </div>

          <Link
            to="/login"
            className="block w-full text-center rounded-lg bg-brand-600 text-white py-2 font-semibold hover:bg-brand-700 transition"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white shadow-card rounded-2xl w-full max-w-lg p-8 border border-slate-100">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="text-2xl font-semibold text-slate-900">Create Your Password</div>
          <p className="text-sm text-slate-500 mt-2">Secure your GradiaFlow account</p>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4">
          <div>
            <label className="text-sm text-slate-600">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:border-brand-400"
              placeholder="Enter a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <p className="mt-1 text-xs text-slate-500">
              Must be at least 6 characters
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Tip:</strong> Use a combination of uppercase, lowercase, numbers, and symbols for a strong password.
            </p>
          </div>

          {error && (
            <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={confirming}
            className="w-full rounded-lg bg-brand-600 text-white py-2 font-semibold hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {confirming ? 'Confirming...' : 'Confirm & Create Account'}
          </button>
        </form>

        <p className="mt-4 text-xs text-center text-slate-500">
          Your email has been verified. Create a password to complete registration.
        </p>
      </div>
    </div>
  );
}
