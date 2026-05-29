import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { API_URL } from '../../lib/api';

export default function ConfirmEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mode, setMode] = useState(null); // 'supabase' | 'custom'

  // Custom token from old flow
  const customToken = searchParams.get('token');

  useEffect(() => {
    async function handleInvite() {
      // --- Supabase invite flow: token is in the URL hash ---
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.replace('#', ''));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type'); // 'invite' or 'signup'

      if (accessToken) {
        const { error: sessionErr } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        if (sessionErr) {
          setError('Your invite link has expired or is invalid. Please register again.');
          setStatus('error');
          return;
        }

        if (type === 'signup') {
          // If it is self-signup, the password is already set. Finalize registration immediately.
          setStatus('loading');
          try {
            const { data: { user } } = await supabase.auth.getUser();
            const schoolName = user?.user_metadata?.school_name;
            const fullName = user?.user_metadata?.full_name;

            if (user?.user_metadata?.pending_registration && schoolName) {
              const res = await fetch(`${API_URL}/api/public/auth/finalize-registration`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify({ school_name: schoolName, full_name: fullName })
              });
              if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to finalize school registration');
              }
            }
            setStatus('success');
            setTimeout(() => navigate('/login'), 2500);
          } catch (err) {
            setError(err.message);
            setStatus('error');
          }
          return;
        }

        // Otherwise if it's invite type, prompt user to set password
        setMode('supabase');
        setShowPasswordForm(true);
        setStatus('ready');
        return;
      }

      // --- Custom token flow (legacy) ---
      if (customToken) {
        setMode('custom');
        setShowPasswordForm(true);
        setStatus('ready');
        return;
      }

      // No token at all
      setError('No confirmation token found. Please check your email link.');
      setStatus('error');
    }

    handleInvite();
  }, [customToken]);

  const validatePassword = () => {
    setPasswordError(null);
    if (!password) { setPasswordError('Please enter a password'); return false; }
    if (password.length < 6) { setPasswordError('Password must be at least 6 characters'); return false; }
    if (password !== confirmPassword) { setPasswordError('Passwords do not match'); return false; }
    return true;
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (!validatePassword()) return;

    setConfirming(true);
    setError(null);
    setPasswordError(null);

    try {
      if (mode === 'supabase') {
        // Update the user's password directly via Supabase
        const { error: updateErr } = await supabase.auth.updateUser({ password });
        if (updateErr) throw new Error(updateErr.message);

        // Fetch user metadata to finalize school setup
        const { data: { user } } = await supabase.auth.getUser();
        const schoolName = user?.user_metadata?.school_name;
        const fullName = user?.user_metadata?.full_name;

        if (user?.user_metadata?.pending_registration && schoolName) {
          const { data: { session } } = await supabase.auth.getSession();
          await fetch(`${API_URL}/api/public/auth/finalize-registration`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({ school_name: schoolName, full_name: fullName })
          });
        }
      } else {
        // Legacy custom token flow
        const res = await fetch(`${API_URL}/api/public/auth/verify-confirmation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: customToken, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to confirm email');
      }

      setStatus('success');
      setShowPasswordForm(false);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message);
      setConfirming(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4 py-8">
        <div className="bg-white shadow-xl rounded-2xl w-full max-w-lg p-8 border border-slate-200">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
            <p className="text-slate-600 font-medium">Verifying your email address...</p>
            <p className="text-sm text-slate-500 mt-2">This may take a moment</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error' && !showPasswordForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4 py-8">
        <div className="bg-white shadow-xl rounded-2xl w-full max-w-lg p-8 border border-slate-200">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-slate-900">Verification Failed</div>
            <p className="text-sm text-slate-500 mt-2">Link Expired or Invalid</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">
              <strong>Error:</strong> {error || 'Your confirmation link has expired or is invalid.'}
            </p>
          </div>
          <p className="text-sm text-slate-600 mb-6">
            Confirmation links expire after 24 hours for security. Please register again to receive a fresh confirmation link.
          </p>
          <Link to="/register" className="block w-full text-center rounded-lg bg-blue-600 text-white py-3 font-semibold hover:bg-blue-700 transition mb-3">
            Register Again
          </Link>
          <Link to="/login" className="block w-full text-center rounded-lg border border-slate-300 text-slate-700 py-3 font-semibold hover:bg-slate-50 transition">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4 py-8">
        <div className="bg-white shadow-xl rounded-2xl w-full max-w-lg p-8 border border-slate-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-slate-900">Email Confirmed!</div>
            <p className="text-sm text-slate-500 mt-2">Account setup complete</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 my-6">
            <p className="text-sm text-green-800">
              ✓ Your email has been successfully verified. Your school admin account is now ready to use!
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              You will be redirected to the login page in a moment. If not, click the button below.
            </p>
          </div>
          <Link to="/login" className="block w-full text-center rounded-lg bg-blue-600 text-white py-3 font-semibold hover:bg-blue-700 transition">
            Continue to Login
          </Link>
        </div>
      </div>
    );
  }

  // status === 'ready' — password form
  if (showPasswordForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4 py-8">
        <div className="bg-white shadow-xl rounded-2xl w-full max-w-lg p-8 border border-slate-200">
          <div className="text-center mb-8">
            <div className="text-3xl font-bold text-slate-900 mb-2">Create Admin Password</div>
            <p className="text-slate-500">Complete your school admin setup</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <p className="text-sm text-blue-800">
              Your email has been verified successfully. Now set a secure password to complete your account setup.
            </p>
          </div>
          <form onSubmit={handleConfirm} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`w-full rounded-lg border ${passwordError ? 'border-red-400' : 'border-slate-300'} px-4 py-3 pr-12 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200`}
                  placeholder="Enter a secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={confirming}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors" tabIndex={-1}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">At least 6 characters</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`w-full rounded-lg border ${passwordError ? 'border-red-400' : 'border-slate-300'} px-4 py-3 pr-12 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200`}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={confirming}
                  required
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors" tabIndex={-1}>
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {passwordError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{passwordError}</p>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={confirming}
              className="w-full rounded-lg bg-blue-600 text-white py-3 font-semibold hover:bg-blue-700 transition disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {confirming ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Confirming...</span>
                </>
              ) : 'Confirm & Create Account'}
            </button>
          </form>
          <p className="mt-4 text-xs text-center text-slate-500">
            Your email has been verified. Create a password to complete registration.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
