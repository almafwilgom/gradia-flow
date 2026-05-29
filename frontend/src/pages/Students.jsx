import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { apiFetch } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { SimpleTable } from '../components/SimpleTable';
import { useActionModal } from '../hooks/useActionModal';
import { ActionModalRenderer } from '../components/ActionModals';
import { downloadCsv, parseCsv, sanitizeFilename } from '../lib/csv';

const SCHOOL_SECTIONS = [
  { value: 'nursery', label: 'Nursery' },
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' }
];

const emptyForm = {
  first_name: '',
  last_name: '',
  admission_no: '',
  class_id: '',
  stream_id: '',
  guardian_full_name: '',
  guardian_email: '',
  guardian_phone: '',
  guardian_address: ''
};

function normalizeSection(value) {
  const level = String(value || '').trim().toLowerCase();
  if (level.includes('nursery')) return 'nursery';
  if (level.includes('primary')) return 'primary';
  if (level.includes('secondary')) return 'secondary';
  return level;
}

function formatSection(value) {
  const section = SCHOOL_SECTIONS.find((item) => item.value === normalizeSection(value));
  return section?.label ?? value ?? 'Unassigned';
}

function groupClassesBySection(classes) {
  const groups = { nursery: [], primary: [], secondary: [], other: [] };
  classes.forEach((cls) => {
    const section = normalizeSection(cls.level);
    if (groups[section]) groups[section].push(cls);
    else groups.other.push(cls);
  });
  return groups;
}

export default function Students() {
  const { profile } = useAuth();
  const assignedClassId =
    profile?.role === 'teacher' ? profile?.teachers?.class_id ?? profile?.teachers?.[0]?.class_id ?? '' : '';
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [streams, setStreams] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [bulkImporting, setBulkImporting] = useState(false);
  const [attendanceStudent, setAttendanceStudent] = useState(null);
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState('');
  const modals = useActionModal();

  const load = async () => {
    if (!profile?.school_id) return;
    setLoadingData(true);
    setError(null);
    setInfo('');
    try {
      const studentQuery = supabase
        .from('students')
        .select(
          'id, first_name, last_name, admission_no, student_code, status, class_id, stream_id, classes(name, level), streams(name), parents(full_name, email, phone, address), profiles(id)'
        );
      const classQuery = supabase.from('classes').select('id, name, level');

      const [{ data: studentData, error: studentsErr }, { data: classData, error: classesErr }] = await Promise.all([
        profile?.role === 'teacher'
          ? studentQuery.eq('class_id', assignedClassId).order('created_at', { ascending: false }).limit(100)
          : studentQuery.eq('school_id', profile.school_id).order('created_at', { ascending: false }).limit(100),
        profile?.role === 'teacher'
          ? classQuery.eq('id', assignedClassId).order('level', { ascending: true }).order('name', { ascending: true })
          : classQuery.eq('school_id', profile.school_id).order('level', { ascending: true }).order('name', { ascending: true })
      ]);

      if (studentsErr) throw studentsErr;
      if (classesErr) throw classesErr;

      setStudents(studentData ?? []);
      setClasses(classData ?? []);

      const classIds = (classData ?? []).map((item) => item.id);
      if (classIds.length === 0) {
        setStreams([]);
        return;
      }

      const { data: streamData, error: streamsErr } = await supabase
        .from('streams')
        .select('id, name, class_id')
        .in('class_id', classIds)
        .order('name', { ascending: true });

      if (streamsErr) throw streamsErr;
      setStreams(streamData ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (profile?.school_id) load();
  }, [profile?.school_id]);

  useEffect(() => {
    if (profile?.role === 'teacher' && assignedClassId) {
      setForm((current) => ({
        ...current,
        class_id: assignedClassId
      }));
    }
  }, [profile?.role, assignedClassId, classes]);

  const classGroups = useMemo(() => groupClassesBySection(classes), [classes]);

  const displayedStudents = useMemo(
    () => students.filter((student) => !selectedClassId || student.class_id === selectedClassId),
    [students, selectedClassId]
  );

  const filteredStreams = useMemo(
    () => streams.filter((item) => item.class_id === form.class_id),
    [streams, form.class_id]
  );

  const downloadStudentTemplate = () => {
    const sampleClass = classes[0];
    const sampleStream = streams.find((item) => item.class_id === sampleClass?.id);
    downloadCsv('student-bulk-upload-template.csv', [
      [
        'first_name',
        'last_name',
        'admission_no',
        'class_id',
        'class_name',
        'stream_id',
        'stream_name',
        'guardian_full_name',
        'guardian_email',
        'guardian_phone',
        'guardian_address'
      ],
      [
        'Amina',
        'Okafor',
        'ADM-001',
        sampleClass?.id ?? '',
        sampleClass?.name ?? 'Primary 1',
        sampleStream?.id ?? '',
        sampleStream?.name ?? '',
        'Mrs Ada Okafor',
        'parent@example.com',
        '08030000000',
        '12 School Road'
      ]
    ]);
  };

  const readFileAsText = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = () => reject(new Error('Unable to read CSV file.'));
      reader.readAsText(file);
    });

  const resolveClassId = (row) => {
    if (row.class_id && classes.some((item) => item.id === row.class_id)) return row.class_id;
    const className = String(row.class_name || row.class || '').trim().toLowerCase();
    return classes.find((item) => item.name?.trim().toLowerCase() === className)?.id ?? '';
  };

  const resolveStreamId = (row, classId) => {
    if (row.stream_id && streams.some((item) => item.id === row.stream_id && item.class_id === classId)) {
      return row.stream_id;
    }
    const streamName = String(row.stream_name || row.stream || '').trim().toLowerCase();
    if (!streamName) return '';
    return streams.find((item) => item.class_id === classId && item.name?.trim().toLowerCase() === streamName)?.id ?? '';
  };

  const handleBulkStudentUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !profile?.school_id) return;

    setBulkImporting(true);
    setError(null);
    setInfo('');

    try {
      const rows = parseCsv(await readFileAsText(file));
      if (rows.length === 0) throw new Error('CSV file has no student rows.');

      let created = 0;
      const failures = [];

      for (const [index, row] of rows.entries()) {
        const classId = resolveClassId(row);
        const payload = {
          school_id: profile.school_id,
          first_name: row.first_name,
          last_name: row.last_name,
          admission_no: row.admission_no || row.admission_number,
          class_id: classId,
          stream_id: resolveStreamId(row, classId) || null,
          guardian_full_name: row.guardian_full_name || row.parent_name || row.guardian_name,
          guardian_email: row.guardian_email || row.parent_email,
          guardian_phone: row.guardian_phone || row.parent_phone,
          guardian_address: row.guardian_address || row.parent_address
        };

        try {
          if (!payload.first_name || !payload.last_name || !payload.admission_no || !payload.class_id) {
            throw new Error('Missing first_name, last_name, admission_no, or class/class_id');
          }
          await apiFetch('/api/students', { method: 'POST', body: payload });
          created += 1;
        } catch (err) {
          failures.push(`Row ${index + 2}: ${err.message}`);
        }
      }

      setInfo(`Bulk upload finished. Created ${created} student${created === 1 ? '' : 's'}.${failures.length ? ` ${failures.length} row(s) failed: ${failures.slice(0, 3).join(' | ')}` : ''}`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBulkImporting(false);
    }
  };

  const downloadStudentRecords = () => {
    const selectedClass = classes.find((item) => item.id === selectedClassId);
    const filename = `${sanitizeFilename(selectedClass?.name || 'all-classes')}-student-records.csv`;
    downloadCsv(filename, [
      ['student_code', 'admission_no', 'first_name', 'last_name', 'section', 'class', 'stream', 'status', 'guardian_name', 'guardian_email', 'guardian_phone', 'guardian_address'],
      ...displayedStudents.map((student) => [
        student.student_code ?? '',
        student.admission_no ?? '',
        student.first_name ?? '',
        student.last_name ?? '',
        formatSection(student.classes?.level),
        student.classes?.name ?? '',
        student.streams?.name ?? '',
        student.status ?? 'active',
        student.parents?.full_name ?? '',
        student.parents?.email ?? '',
        student.parents?.phone ?? '',
        student.parents?.address ?? ''
      ])
    ]);
  };

  const viewAttendance = async (student) => {
    setAttendanceStudent(student);
    setAttendanceRows([]);
    setAttendanceLoading(true);
    setError(null);
    try {
      const { data, error: attendanceErr } = await supabase
        .from('attendance_students')
        .select('attended_on, status, remarks')
        .eq('student_id', student.id)
        .order('attended_on', { ascending: false })
        .limit(200);

      if (attendanceErr) throw attendanceErr;
      setAttendanceRows(data ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const downloadAttendanceRecords = () => {
    if (!attendanceStudent) return;
    downloadCsv(`${sanitizeFilename(`${attendanceStudent.first_name}-${attendanceStudent.last_name}`)}-attendance.csv`, [
      ['student_code', 'admission_no', 'student_name', 'date', 'status', 'remarks'],
      ...attendanceRows.map((row) => [
        attendanceStudent.student_code ?? '',
        attendanceStudent.admission_no ?? '',
        `${attendanceStudent.first_name} ${attendanceStudent.last_name}`.trim(),
        row.attended_on,
        row.status,
        row.remarks ?? ''
      ])
    ]);
  };

  const addStudent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo('');
    try {
      if (!form.class_id) {
        throw new Error('Select a class for the student.');
      }
      if (!form.guardian_full_name || !form.guardian_email || !form.guardian_phone || !form.guardian_address) {
        throw new Error('Enter the parent or guardian full name, email, phone number, and address.');
      }

      const {
        data: { session }
      } = await supabase.auth.getSession();

      const createdStudent = await apiFetch('/api/students', {
        method: 'POST',
        token: session?.access_token,
        body: {
          school_id: profile.school_id,
          first_name: form.first_name,
          last_name: form.last_name,
          admission_no: form.admission_no,
          class_id: form.class_id,
          stream_id: form.stream_id || null,
          guardian_full_name: form.guardian_full_name,
          guardian_email: form.guardian_email,
          guardian_phone: form.guardian_phone,
          guardian_address: form.guardian_address
        }
      });

      setForm(emptyForm);
      setInfo(`Student added successfully. Student code: ${createdStudent?.student_code ?? 'Generated automatically'}.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createStudentAccount = async (student) => {
    setLoading(true);
    setInfo('');
    setError(null);
    try {
      const response = await apiFetch('/api/students/create-account', {
        method: 'POST',
        body: { student_id: student.id }
      });
      setInfo(`Account created for ${student.first_name}. Email: ${response.email}. Password is the student code.`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStudentClass = async (studentId, newClassId) => {
    try {
      const { error: updateErr } = await supabase
        .from('students')
        .update({ class_id: newClassId })
        .eq('id', studentId);
      if (updateErr) throw updateErr;
      modals.success.show('Student class updated.');
      load();
    } catch (err) {
      modals.error.show('Update failed', err.message);
    }
  };

  const toggleStudentStatus = async (studentId, currentStatus) => {
    const newStatus = currentStatus === 'disabled' ? 'active' : 'disabled';
    try {
      const { error: updateErr } = await supabase
        .from('students')
        .update({ status: newStatus })
        .eq('id', studentId);
      if (updateErr) throw updateErr;
      modals.success.show(newStatus === 'disabled' ? 'Student disabled.' : 'Student enabled.');
      load();
    } catch (err) {
      modals.error.show('Status update failed', err.message);
    }
  };

  const deleteStudent = async (studentId, name) => {
    modals.confirm.show(
      'Delete student?',
      `This will permanently remove ${name || 'this student'}.`,
      'Student records tied to this profile may no longer be available in the school dashboard.',
      async () => {
        modals.confirm.setLoading(true);
        try {
          const { error: deleteErr } = await supabase
            .from('students')
            .delete()
            .eq('id', studentId);
          if (deleteErr) throw deleteErr;
          modals.confirm.close();
          modals.success.show('Student deleted successfully.');
          load();
        } catch (err) {
          modals.error.show('Delete failed', err.message);
        } finally {
          modals.confirm.setLoading(false);
        }
      },
      { confirmText: 'Delete', isDangerous: true }
    );
  };

  return (
    <div className="space-y-4">
      <ActionModalRenderer modals={modals} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Students</h1>
          <p className="text-sm text-slate-500">Manage enrolment, class placement, and promotions.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((current) => !current)}
          className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-semibold hover:bg-brand-700"
        >
          {showForm ? 'Hide Form' : 'Add Student'}
        </button>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-card border border-slate-100 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <label className="text-sm text-slate-600 lg:w-80">
          Class records
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 bg-white"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            <option value="">All classes</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({formatSection(item.level)})
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadStudentTemplate}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Download Student CSV Template
          </button>
          <label className={`rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer ${bulkImporting ? 'bg-slate-100 text-slate-400' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}>
            {bulkImporting ? 'Uploading...' : 'Bulk Upload Students'}
            <input type="file" accept=".csv" className="hidden" onChange={handleBulkStudentUpload} disabled={bulkImporting} />
          </label>
          <button
            type="button"
            onClick={downloadStudentRecords}
            disabled={displayedStudents.length === 0}
            className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-semibold hover:bg-brand-700 disabled:opacity-60"
          >
            Download Class Students
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-4 shadow-card border border-slate-100 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Add New Student</h2>
              <p className="text-sm text-slate-500">
                Choose the section first, then the class under that section.
              </p>
            </div>
            {classes.length === 0 && (
              <Link
                to="/classes"
                className="rounded-lg border border-brand-200 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
              >
                Set Up Classes
              </Link>
            )}
          </div>

          <form onSubmit={addStudent} className="space-y-4">
            <div className="flex flex-col gap-3 md:grid md:grid-cols-3 xl:grid-cols-6">
              <input
                placeholder="First name"
                className="w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2"
                value={form.first_name}
                onChange={(e) => setForm((current) => ({ ...current, first_name: e.target.value }))}
                required
              />
              <input
                placeholder="Last name"
                className="w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2"
                value={form.last_name}
                onChange={(e) => setForm((current) => ({ ...current, last_name: e.target.value }))}
                required
              />
              <input
                placeholder="Admission No"
                className="w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2"
                value={form.admission_no}
                onChange={(e) => setForm((current) => ({ ...current, admission_no: e.target.value }))}
                required
              />
              <select
                className="w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 bg-white md:col-span-2"
                value={form.class_id}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    class_id: e.target.value,
                    stream_id: ''
                  }))
                }
                disabled={profile?.role === 'teacher' || classes.length === 0}
                required
              >
                <option value="">{classes.length === 0 ? 'No classes available' : 'Select class'}</option>
                {SCHOOL_SECTIONS.map((section) => {
                  const sectionClasses = classGroups[section.value] ?? [];
                  if (sectionClasses.length === 0) return null;
                  return (
                    <optgroup key={section.value} label={`── ${section.label} ──`}>
                      {sectionClasses.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
              {profile?.role === 'teacher' && assignedClassId && (
                <div className="w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 bg-slate-50 text-sm text-slate-600 md:col-span-2 xl:col-span-1">
                  Assigned class only: {classes.find((item) => item.id === assignedClassId)?.name ?? 'Loading class...'}
                </div>
              )}
              <select
                className="w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 bg-white"
                value={form.stream_id}
                onChange={(e) => setForm((current) => ({ ...current, stream_id: e.target.value }))}
                disabled={!form.class_id || filteredStreams.length === 0}
              >
                <option value="">{filteredStreams.length ? 'Select stream (optional)' : 'No streams available'}</option>
                {filteredStreams.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Parent / Guardian Information</h3>
                <p className="text-sm text-slate-500">
                  We&apos;ll save this guardian record and link it to the student automatically.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <input
                  placeholder="Guardian full name"
                  className="rounded-lg border border-slate-200 px-3 py-2"
                  value={form.guardian_full_name}
                  onChange={(e) => setForm((current) => ({ ...current, guardian_full_name: e.target.value }))}
                  required
                />
                <input
                  type="email"
                  placeholder="Guardian email"
                  className="rounded-lg border border-slate-200 px-3 py-2"
                  value={form.guardian_email}
                  onChange={(e) => setForm((current) => ({ ...current, guardian_email: e.target.value }))}
                  required
                />
                <input
                  placeholder="Guardian phone number"
                  className="rounded-lg border border-slate-200 px-3 py-2"
                  value={form.guardian_phone}
                  onChange={(e) => setForm((current) => ({ ...current, guardian_phone: e.target.value }))}
                  required
                />
                <input
                  placeholder="Guardian address"
                  className="rounded-lg border border-slate-200 px-3 py-2"
                  value={form.guardian_address}
                  onChange={(e) => setForm((current) => ({ ...current, guardian_address: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-brand-600 text-white px-4 py-2 font-semibold hover:bg-brand-700 disabled:opacity-70"
              >
                {loading ? 'Saving...' : 'Add Student'}
              </button>
            </div>
          </form>

          {error && <div className="text-sm text-rose-600">{error}</div>}
          {!error && info && <div className="text-sm text-emerald-700">{info}</div>}
          {!error && classes.length === 0 && (
            <div className="text-sm text-amber-700">
              No classes set up yet. Create classes on the Classes page first.
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-card border border-slate-100 overflow-hidden">
        <SimpleTable
          headers={['Name', 'Code', 'Parent', 'Section', 'Class', 'Stream', 'Status', 'Actions']}
          rows={displayedStudents.map((student) => [
            <div className="flex flex-col">
              <span className="font-medium text-slate-900">{`${student.first_name} ${student.last_name}`}</span>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${student.status === 'disabled' ? 'text-rose-500' : 'text-emerald-500'}`}>
                {student.status || 'active'}
              </span>
            </div>,
            student.student_code ?? '-',
            student.parents?.full_name ?? '-',
            formatSection(student.classes?.level),
            <select
              key={`student-class-${student.id}`}
              className={`text-sm border rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all ${student.status === 'disabled' ? 'opacity-50 grayscale' : ''}`}
              value={student.class_id || ''}
              onChange={(e) => updateStudentClass(student.id, e.target.value)}
              disabled={profile?.role === 'teacher' || student.status === 'disabled'}
            >
              <option value="">Unassigned</option>
              {SCHOOL_SECTIONS.map((section) => {
                const sectionClasses = classGroups[section.value] ?? [];
                if (sectionClasses.length === 0) return null;
                return (
                  <optgroup key={section.value} label={section.label}>
                    {sectionClasses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>,
            student.streams?.name ?? '-',
            student.status === 'disabled' ? 'Inactive' : 'Active',
            <div key={`actions-${student.id}`} className="flex items-center gap-3">
              <button
                onClick={() => viewAttendance(student)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Attendance
              </button>
              {!student.profiles?.id && profile?.role !== 'teacher' && (
                <button
                  onClick={() => createStudentAccount(student)}
                  className="text-emerald-600 hover:text-emerald-800 text-sm font-bold"
                  title="Enable Portal Access"
                >
                  Invite
                </button>
              )}
              <button
                onClick={() => toggleStudentStatus(student.id, student.status)}
                className={`font-medium text-sm transition-colors ${student.status === 'disabled' ? 'text-emerald-600 hover:text-emerald-800' : 'text-amber-600 hover:text-amber-800'}`}
              >
                {student.status === 'disabled' ? 'Enable' : 'Disable'}
              </button>
              <button
                onClick={() => deleteStudent(student.id, `${student.first_name} ${student.last_name}`)}
                className="text-rose-600 hover:text-rose-800 text-sm font-medium"
              >
                Delete
              </button>
            </div>
          ])}
        />
      </div>

      {attendanceStudent && (
        <div className="bg-white rounded-xl shadow-card border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Attendance: {attendanceStudent.first_name} {attendanceStudent.last_name}
              </h2>
              <p className="text-sm text-slate-500">
                {attendanceLoading ? 'Loading attendance...' : `${attendanceRows.length} attendance record(s)`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={downloadAttendanceRecords}
                disabled={attendanceRows.length === 0}
                className="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-semibold hover:bg-brand-700 disabled:opacity-60"
              >
                Download Attendance
              </button>
              <button
                type="button"
                onClick={() => {
                  setAttendanceStudent(null);
                  setAttendanceRows([]);
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
          <SimpleTable
            headers={['Date', 'Status', 'Remarks']}
            rows={attendanceRows.map((row) => [
              row.attended_on,
              row.status,
              row.remarks ?? '-'
            ])}
          />
        </div>
      )}

      {loadingData && <div className="text-sm text-slate-500">Loading students and class options...</div>}
    </div>
  );
}
