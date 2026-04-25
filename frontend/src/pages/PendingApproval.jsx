import dayjs from 'dayjs';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSchoolAccess } from '../hooks/useSchoolAccess';

function formatStatus(school) {
  if (!school) return 'Checking status';
  if (school.status === 'disabled' || school.disabled_at) return 'Disabled';
  if (school.status !== 'approved') return 'Pending approval';
  return 'Approved';
}

export default function PendingApproval() {
  const { profile } = useAuth();
  const { school, error, loading, isOperational, isDisabled } = useSchoolAccess(profile);

  if (profile?.role !== 'school_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return <div className="text-sm text-slate-600">Checking your school access...</div>;
  }

  if (error) {
    return <div className="text-sm text-rose-600">{error.message}</div>;
  }

  if (isOperational) {
    return <Navigate to="/dashboard" replace />;
  }

  const title = isDisabled ? 'School access is currently disabled' : 'Your school is pending approval';
  const description = isDisabled
    ? 'GradiaFlow has paused access for this school. We kept you on a clear holding page so you are not dropped into empty modules.'
    : 'Thanks for setting up your school. We are reviewing the account before unlocking the full school workspace.';

  return (
    <div className="space-y-6">
      <div className="max-w-3xl space-y-2">
        <div
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            isDisabled ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {formatStatus(school)}
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-600">{description}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="text-lg font-semibold text-slate-900">School review summary</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">School name</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{school?.name ?? 'Not available'}</div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">School code</div>
              <div className="mt-1 text-lg font-semibold tracking-wide text-slate-900">
                {school?.school_code ?? 'Generating...'}
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Demo access ends</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {school?.demo_expires_at ? dayjs(school.demo_expires_at).format('DD MMM YYYY') : 'Not set'}
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Current status</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{formatStatus(school)}</div>
            </div>
          </div>

          {school?.disabled_reason && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <div className="font-semibold">Disable note</div>
              <div className="mt-1">{school.disabled_reason}</div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="text-lg font-semibold text-slate-900">What you can do now</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li>- Review your school settings and make sure your logo, bank details, and branding are complete.</li>
            <li>- Keep your school code handy. It becomes useful to your team as soon as GradiaFlow approves the school.</li>
            <li>- Come back to this page anytime to check whether approval has been granted or access has been restored.</li>
          </ul>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/settings"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Open Settings
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Refresh Status
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="text-lg font-semibold text-slate-900">What happens next</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">1. Review</div>
            <div className="mt-1">
              GradiaFlow checks the school account details before school-wide privileges are switched on.
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">2. Activation</div>
            <div className="mt-1">
              Once approved, your school code becomes active for student, parent, and staff onboarding.
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">3. Full access</div>
            <div className="mt-1">
              Your normal dashboard, classes, students, payments, and other modules unlock automatically.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

