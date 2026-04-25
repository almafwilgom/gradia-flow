import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { apiFetch } from '../lib/api';
import Button from '../components/Button';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import Table from '../components/Table';
import Tabs from '../components/Tabs';

function deriveSchoolStatus(school) {
  if (school?.status === 'disabled' || school?.disabled_at) return 'disabled';
  if (school?.status === 'approved') return 'approved';
  return 'pending';
}

export default function SchoolDetails() {
  const { schoolId } = useParams();
  const navigate = useNavigate();
  const [school, setSchool] = useState(null);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [parents, setParents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (schoolId) fetchData();
  }, [schoolId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const data = await apiFetch(`/api/admin/schools/${schoolId}/details`);

      setSchool({
        ...data.school,
        status: deriveSchoolStatus(data.school)
      });
      setStudents(data.students);
      setTeachers(data.teachers);
      setParents(data.parents);
      setPayments(data.payments);
      setClasses(data.classes);
    } catch (error) {
      console.error('Error fetching school details:', error);
      setSchool(null);
    } finally {
      setLoading(false);
    }
  };

  const handleResetClasses = async () => {
    if (!window.confirm('This will DELETE all current classes for this school and replace them with a standard set (Nursery to SSS). Are you sure?')) {
      return;
    }

    try {
      setResetting(true);
      await apiFetch(`/api/admin/schools/${schoolId}/reset-classes`, { method: 'POST' });
      await fetchData();
      alert('Classes have been reset and seeded successfully.');
    } catch (err) {
      alert(err.message || 'Failed to reset classes.');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-slate-600">Loading school details...</div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="p-6">
        <div className="text-red-600">School not found.</div>
      </div>
    );
  }

  const overviewContent = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <h3 className="text-lg font-bold text-slate-900 mb-4">School Information</h3>
        <div className="space-y-3">
          <InfoRow label="Name" value={school.name} />
          <InfoRow label="School Code" value={school.school_code || 'Not assigned'} />
          <div>
            <p className="text-sm text-slate-600">Status</p>
            <StatusBadge status={school.status} />
          </div>
          <InfoRow label="Subscription Plan" value={school.subscription_plan || 'trial'} />
          <InfoRow
            label="Demo Ends"
            value={school.demo_expires_at ? new Date(school.demo_expires_at).toLocaleDateString() : '-'}
          />
          <InfoRow label="Created" value={new Date(school.created_at).toLocaleDateString()} />
          {school.disabled_reason ? <InfoRow label="Disable Reason" value={school.disabled_reason} /> : null}
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-slate-900 mb-4">Statistics</h3>
        <div className="space-y-3">
          <StatRow label="Total Students" value={students.length} tone="blue" />
          <StatRow label="Total Teachers" value={teachers.length} tone="green" />
          <StatRow label="Total Parents" value={parents.length} tone="purple" />
          <StatRow label="Total Payments" value={payments.length} tone="orange" />
          <StatRow label="Total Classes" value={classes.length} tone="blue" />
        </div>
      </Card>
    </div>
  );

  const classesContent = (
    <Table
      columns={[
        {
          key: 'name',
          label: 'Class Name'
        },
        {
          key: 'level',
          label: 'Level',
          render: (row) => row.level?.replace('_', ' ') || '-'
        },
        {
          key: 'fee',
          label: 'Termly Fee',
          render: (row) => `NGN ${Number(row.fee || 0).toLocaleString()}`
        }
      ]}
      data={classes}
    />
  );

  const studentsContent = (
    <Table
      columns={[
        {
          key: 'first_name',
          label: 'Name',
          render: (row) => `${row.first_name} ${row.last_name}`
        },
        {
          key: 'student_code',
          label: 'Student Code'
        },
        {
          key: 'admission_no',
          label: 'Admission No'
        },
        {
          key: 'classes',
          label: 'Class',
          render: (row) => row.classes?.name || '-'
        },
        {
          key: 'status',
          label: 'Status',
          render: (row) => <StatusBadge status={row.status || 'active'} />
        }
      ]}
      data={students}
    />
  );

  const teachersContent = (
    <Table
      columns={[
        {
          key: 'profiles',
          label: 'Name',
          render: (row) => row.profiles?.full_name || 'N/A'
        },
        {
          key: 'classes',
          label: 'Assigned Class',
          render: (row) => row.classes?.name || 'Unassigned'
        },
        {
          key: 'hired_at',
          label: 'Hired',
          render: (row) => (row.hired_at ? new Date(row.hired_at).toLocaleDateString() : '-')
        }
      ]}
      data={teachers}
    />
  );

  const parentsContent = (
    <Table
      columns={[
        {
          key: 'full_name',
          label: 'Name'
        },
        {
          key: 'email',
          label: 'Email'
        },
        {
          key: 'phone',
          label: 'Phone'
        },
        {
          key: 'address',
          label: 'Address'
        }
      ]}
      data={parents}
    />
  );

  const paymentsContent = (
    <Table
      columns={[
        {
          key: 'students',
          label: 'Student',
          render: (row) =>
            row.students ? `${row.students.first_name} ${row.students.last_name}` : 'N/A'
        },
        {
          key: 'amount',
          label: 'Amount',
          render: (row) => `NGN ${Number(row.amount || 0).toLocaleString()}`
        },
        {
          key: 'method',
          label: 'Method'
        },
        {
          key: 'status',
          label: 'Status',
          render: (row) => <StatusBadge status={row.status} />
        }
      ]}
      data={payments}
    />
  );

  const tabs = [
    { label: 'Overview', content: overviewContent },
    { label: `Classes (${classes.length})`, content: classesContent },
    { label: `Students (${students.length})`, content: studentsContent },
    { label: `Teachers (${teachers.length})`, content: teachersContent },
    { label: `Parents (${parents.length})`, content: parentsContent },
    { label: `Payments (${payments.length})`, content: paymentsContent }
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{school.name}</h1>
          <p className="text-slate-600">Code: {school.school_code || 'Not assigned'}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleResetClasses} 
            disabled={resetting}
          >
            {resetting ? 'Resetting...' : 'Reload Classes'}
          </Button>
          <Button variant="secondary" onClick={() => navigate('/super-admin/schools')}>
            Back
          </Button>
        </div>
      </div>

      <Card>
        <Tabs tabs={tabs} />
      </Card>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-sm text-slate-600">{label}</p>
      <p className="font-medium text-slate-900">{value}</p>
    </div>
  );
}

function StatRow({ label, value, tone }) {
  const toneClass = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600'
  }[tone];

  return (
    <div className={`flex justify-between items-center rounded-lg p-3 ${toneClass}`}>
      <span className="text-slate-700">{label}</span>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  );
}
