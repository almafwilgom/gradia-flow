import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { apiFetch } from '../lib/api';
import Card from '../components/Card';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import Table from '../components/Table';
import { useAuth } from '../hooks/useAuth';

function deriveSchoolStatus(school) {
  if (school?.status === 'disabled' || school?.disabled_at) return 'disabled';
  if (school?.status === 'approved') return 'approved';
  return 'pending';
}

// ── Premium Success Modal ────────────────────────────────────────────────────
function SuccessModal({ isOpen, message, onClose }) {
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(onClose, 3500);
      return () => clearTimeout(t);
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 18, stiffness: 300 }}
            className="relative bg-white rounded-[2rem] shadow-2xl p-10 max-w-sm w-full text-center overflow-hidden"
          >
            {/* Top gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-brand-500" />

            {/* Animated icon */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-emerald-400/20 blur-2xl rounded-full scale-150" />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                className="relative w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.4)]"
              >
                <CheckCircle2 className="text-white" size={40} />
              </motion.div>
            </div>

            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold text-slate-900 mb-2"
            >
              Success!
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-slate-500 font-medium mb-8 leading-relaxed"
            >
              {message}
            </motion.p>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              onClick={onClose}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all active:scale-[0.98]"
            >
              Done
            </motion.button>

            {/* Auto-close progress bar */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 3.5, ease: 'linear' }}
              style={{ transformOrigin: 'left' }}
              className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-400"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Premium Confirm Modal ────────────────────────────────────────────────────
function ConfirmDeleteModal({ isOpen, school, onConfirm, onCancel, busy }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 20 }}
            className="relative bg-white rounded-[2rem] shadow-2xl p-8 max-w-sm w-full overflow-hidden"
          >
            {/* Top danger accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-400 to-rose-600" />

            <button
              onClick={onCancel}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center justify-center w-16 h-16 bg-red-50 rounded-2xl mx-auto mb-6">
              <Trash2 className="text-red-500" size={30} />
            </div>

            <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Delete School?</h3>
            <p className="text-slate-500 text-center text-sm leading-relaxed mb-2">
              You are about to permanently delete
            </p>
            <p className="text-slate-900 font-bold text-center text-lg mb-4">
              {school?.name}
            </p>
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-8 flex gap-2 items-start">
              <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
              <p className="text-red-700 text-xs font-medium">
                This permanently removes the school and all linked accounts. This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={busy}
                className="flex-1 py-3 border-2 border-slate-200 text-slate-700 font-semibold rounded-2xl hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={busy}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {busy ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function SuperAdminSchools() {
  const { session } = useAuth();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busySchoolId, setBusySchoolId] = useState(null);

  // Modal states
  const [successModal, setSuccessModal] = useState({ open: false, message: '' });
  const [confirmModal, setConfirmModal] = useState({ open: false, school: null });
  const [deleteBusy, setDeleteBusy] = useState(false);

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
      await fetchSchools();
    } catch (actionError) {
      console.error('School action error:', actionError);
      setError(actionError.message || 'The school action could not be completed.');
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
    if (
      disabling &&
      !window.confirm(`Disable ${school.name}? Staff and families in this school will lose access until it is re-enabled.`)
    ) {
      return;
    }

    await runSchoolAction(school.id, `/api/admin/schools/${school.id}/disable`, {
      body: {
        disabled: disabling,
        reason: disabling ? 'Disabled by super admin' : null
      },
      successMessage: disabling ? 'School disabled successfully.' : 'School re-enabled successfully.'
    });
  };

  // Opens the premium confirm modal instead of window.confirm()
  const handleDelete = (school) => {
    setConfirmModal({ open: true, school });
  };

  const executeDelete = async () => {
    const school = confirmModal.school;
    if (!school) return;

    setDeleteBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await apiFetch(`/api/admin/schools/${school.id}`, {
        method: 'DELETE',
        token: session?.access_token
      });

      setConfirmModal({ open: false, school: null });
      setSuccessModal({ open: true, message: 'School deleted successfully.' });
      await fetchSchools();
    } catch (err) {
      setConfirmModal({ open: false, school: null });
      setError(err.message || 'Failed to delete school.');
    } finally {
      setDeleteBusy(false);
    }
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
      {/* Premium Success Modal */}
      <SuccessModal
        isOpen={successModal.open}
        message={successModal.message}
        onClose={() => setSuccessModal({ open: false, message: '' })}
      />

      {/* Premium Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={confirmModal.open}
        school={confirmModal.school}
        onConfirm={executeDelete}
        onCancel={() => setConfirmModal({ open: false, school: null })}
        busy={deleteBusy}
      />

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


