import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { apiFetch } from '../lib/api';
import Card from '../components/Card';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import Table from '../components/Table';
import { useAuth } from '../hooks/useAuth';
import { useActionModal } from '../hooks/useActionModal';
import { ActionModalRenderer } from '../components/ActionModals';

function deriveSchoolStatus(school) {
  if (school?.status === 'disabled' || school?.disabled_at) return 'disabled';
  if (school?.status === 'approved') return 'approved';
  return 'pending';
}

export default function SuperAdminSchools() {
  const { session } = useAuth();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busySchoolId, setBusySchoolId] = useState(null);
  const modals = useActionModal();

  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const q = queryParams.get('q') || '';

  useEffect(() => {
    fetchSchools();
  }, [session?.user?.user_metadata?.role]);

  const fetchSchools = async () => {
    try {
      setLoading(true);
      setError('');

      const [schoolsResponse, { data: overviewRows, error: overviewError }] =
        await Promise.all([
          apiFetch('/api/admin/schools'),
          supabase
            .from('vw_school_overview')
            .select('id, total_students, total_classes')
        ]);

      const schoolRows = schoolsResponse.schools;
      if (overviewError) throw overviewError;

      const overviewMap = new Map((overviewRows || []).map((row) => [row.id, row]));
      const normalized = (schoolRows || []).map((school) => {
        const overview = overviewMap.get(school.id);
        return {
          ...school,
          status: deriveSchoolStatus(school),
          total_students: overview?.total_students || 0,
          total_classes: overview?.total_classes || 0
        };
      });

      setSchools(normalized);
    } catch (fetchError) {
      console.error('Error fetching schools:', fetchError);
      setError(fetchError.message || 'Unable to load schools right now.');
    } finally {
      setLoading(false);
    }
  };

  const runSchoolAction = async (schoolId, path, { method = 'POST', body, successMessage }) => {
    try {
      setBusySchoolId(schoolId);
      setError('');
      setNotice('');

      const {
        data: { session }
      } = await supabase.auth.getSession();

      await apiFetch(path, {
        method,
        token: session?.access_token,
        body
      });

      setNotice(successMessage);
      modals.success.show(successMessage);
      await fetchSchools();
    } catch (actionError) {
      console.error('School action error:', actionError);
      setError(actionError.message || 'The school action could not be completed.');
      modals.error.show('Action failed', actionError.message || 'The school action could not be completed.');
    } finally {
      setBusySchoolId(null);
    }
  };

  const handleApprove = async (schoolId) => {
    await runSchoolAction(schoolId, `/api/admin/schools/${schoolId}/approve`, {
      successMessage: 'School approved successfully.'
    });
  };

  const handleDisableToggle = async (school) => {
    const disabling = !school.disabled_at;
    const runToggle = async () => {
      modals.confirm.setLoading(true);
      await runSchoolAction(school.id, `/api/admin/schools/${school.id}/disable`, {
        body: {
          disabled: disabling,
          reason: disabling ? 'Disabled by super admin' : null
        },
        successMessage: disabling ? 'School disabled successfully.' : 'School re-enabled successfully.'
      });
      modals.confirm.close();
      modals.confirm.setLoading(false);
    };

    if (disabling) {
      modals.confirm.show(
        'Disable school?',
        `Staff and families in ${school.name} will lose access until it is re-enabled.`,
        'You can re-enable the school later from this same screen.',
        runToggle,
        { confirmText: 'Disable', isDangerous: true }
      );
      return;
    }

    await runToggle();
  };

  const handleDelete = (school) => {
    modals.confirm.show(
      'Delete school?',
      `You are about to permanently delete ${school.name}.`,
      'This permanently removes the school and all linked accounts. This action cannot be undone.',
      async () => {
        modals.confirm.setLoading(true);
        await runSchoolAction(school.id, `/api/admin/schools/${school.id}`, {
          method: 'DELETE',
          successMessage: 'School deleted successfully.'
        });
        modals.confirm.close();
        modals.confirm.setLoading(false);
      },
      { confirmText: 'Delete', isDangerous: true }
    );
  };

  const filteredSchools = useMemo(() => {
    let result = schools;
    if (filter !== 'all') {
      result = result.filter((s) => s.status === filter);
    }
    if (q) {
      const lowerQ = q.toLowerCase();
      result = result.filter(
        (s) =>
          s.name?.toLowerCase().includes(lowerQ) ||
          s.school_code?.toLowerCase().includes(lowerQ)
      );
    }
    return result;
  }, [schools, filter, q]);

  const counts = useMemo(
    () => ({
      pending: schools.filter((school) => school.status === 'pending').length,
      approved: schools.filter((school) => school.status === 'approved').length,
      disabled: schools.filter((school) => school.status === 'disabled').length
    }),
    [schools]
  );

  const columns = [
    {
      key: 'name',
      label: 'School Name',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-600">{row.school_code || 'No code yet'}</p>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      key: 'subscription_plan',
      label: 'Plan'
    },
    {
      key: 'total_students',
      label: 'Students'
    },
    {
      key: 'total_classes',
      label: 'Classes'
    },
    {
      key: 'demo_expires_at',
      label: 'Demo Ends',
      render: (row) => (row.demo_expires_at ? new Date(row.demo_expires_at).toLocaleDateString() : '-')
    }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-slate-600">Loading schools...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <ActionModalRenderer modals={modals} />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Schools Management</h1>
        <p className="text-slate-600">Manage approvals, access status, and live school records.</p>
      </div>

      {notice ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { value: 'all', label: `All (${schools.length})` },
          { value: 'pending', label: `Pending (${counts.pending})` },
          { value: 'approved', label: `Approved (${counts.approved})` },
          { value: 'disabled', label: `Disabled (${counts.disabled})` }
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === tab.value
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        <Table
          columns={columns}
          data={filteredSchools}
          actions={(school) => (
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/super-admin/schools/${school.id}`)}
              >
                View
              </Button>

              {school.status === 'pending' ? (
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => handleApprove(school.id)}
                  disabled={busySchoolId === school.id}
                >
                  {busySchoolId === school.id ? 'Working...' : 'Approve'}
                </Button>
              ) : null}

              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleDisableToggle(school)}
                disabled={busySchoolId === school.id}
              >
                {busySchoolId === school.id
                  ? 'Working...'
                  : school.disabled_at
                    ? 'Enable'
                    : 'Disable'}
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(school)}
                disabled={busySchoolId === school.id}
              >
                Delete
              </Button>
            </div>
          )}
        />
      </Card>

      {filteredSchools.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-slate-600">No schools found for this filter.</p>
        </Card>
      ) : null}
    </div>
  );
}

