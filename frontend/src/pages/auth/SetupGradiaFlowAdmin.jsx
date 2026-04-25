import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';

function formatSetupMessage(error) {
  const message = error instanceof Error ? error.message : String(error);

  try {
    const parsed = JSON.parse(message);
    return parsed.error || message;
  } catch {
    return message;
  }
}

export default function SetupGradiaFlowAdmin() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    setup_key: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    let mounted = true;

    apiFetch('/api/setup/gradiaflow-admin/status')
      .then((data) => {
        if (mounted) setStatus(data);
      })
      .catch((err) => {
        if (mounted) setStatusError(formatSetupMessage(err));
      });

    return () => {
      mounted = false;
    };
  }, []);

  const helperText = useMemo(() => {
    if (!status) return 'This hidden setup page can create the first GradiaFlow admin or promote an existing account.';
    if (!status.enabled) return 'Set GRADIAFLOW_SETUP_KEY in backend/.env and restart the backend to unlock this flow.';
    if ((status.super_admin_count ?? 0) === 0) return 'No GradiaFlow admin exists yet. This will create the first one.';
    return 'A super admin already exists. Use this page to create another one or promote an existing account by email.';
  }, [status]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        setup_key: form.setup_key.trim()
      };

      if (!payload.full_name || !payload.email || !payload.setup_key) {
        throw new Error('Full name, email, and setup key are required.');
      }

      const data = await apiFetch('/api/setup/gradiaflow-admin', {
        method: 'POST',
        body: payload
      });

      setSuccess(data);
      setForm((current) => ({
        ...current,
        password: ''
      }));

      const refreshedStatus = await apiFetch('/api/setup/gradiaflow-admin/status');
      setStatus(refreshedStatus);
    } catch (err) {
      setError(formatSetupMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="bg-white shadow-card rounded-2xl w-full max-w-xl p-8 border border-slate-100 space-y-6">
        <div className="space-y-2">
          <div className="text-2xl font-semibold text-slate-900">GradiaFlow Admin Setup</div>
          <p className="text-sm text-slate-500">
            Hidden bootstrap page for creating or promoting a GradiaFlow super admin without touching SQL.
          </p>
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
            {helperText}
          </div>
        </div>

        {statusError && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
            {statusError}
          </div>
        )}

        {status && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Setup key</div>
              <div className="mt-1 font-semibold text-slate-900">{status.enabled ? 'Configured' : 'Missing'}</div>
            </div>
            <div className="rounded-xl border border-slate-200 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Existing super admins</div>
              <div className="mt-1 font-semibold text-slate-900">{status.super_admin_count ?? 0}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-600">Full name</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:border-brand-400"
                value={form.full_name}
                onChange={(e) => setForm((current) => ({ ...current, full_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Email</label>
              <input
                type="email"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:border-brand-400"
                value={form.email}
                onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-600">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:border-brand-400"
              value={form.password}
              onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))}
              placeholder="Required for a brand new admin account"
            />
            <p className="mt-1 text-xs text-slate-500">
              If the email already exists, we will promote that account and ignore this password.
            </p>
          </div>

          <div>
            <label className="text-sm text-slate-600">Setup key</label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:border-brand-400"
              value={form.setup_key}
              onChange={(e) => setForm((current) => ({ ...current, setup_key: e.target.value }))}
              required
            />
          </div>

          {error && <div className="text-sm text-rose-600">{error}</div>}
          {success && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
              {success.mode === 'created_new_user' && `GradiaFlow admin created for ${success.email}.`}
              {success.mode === 'promoted_existing_user' && `Existing account promoted to GradiaFlow admin for ${success.email}.`}
              {success.mode === 'existing_super_admin' && `${success.email} is already a GradiaFlow admin.`}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-600 text-white py-2 font-semibold hover:bg-brand-700 transition disabled:opacity-70"
          >
            {loading ? 'Saving setup...' : 'Create GradiaFlow Admin'}
          </button>
        </form>

        <div className="flex items-center justify-between text-sm text-slate-500">
          <Link to="/login" className="text-brand-600">
            Back to login
          </Link>
          {success && (
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-brand-600 font-medium"
            >
              Go to login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

