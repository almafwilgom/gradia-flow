import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import {
  AcademicCapIcon,
  UsersIcon,
  RectangleGroupIcon,
  BanknotesIcon,
  HandThumbUpIcon,
  SparklesIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  BellIcon,
  ChatBubbleLeftEllipsisIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { SimpleTable } from '../components/SimpleTable';
import { useActionModal } from '../hooks/useActionModal';
import { ActionModalRenderer } from '../components/ActionModals';

const SCHOOL_SECTIONS = [
  { value: 'nursery', label: 'Nursery' },
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' }
];

const CLASS_PRESETS = [
  { name: 'Nursery 1', level: 'nursery' },
  { name: 'Nursery 2', level: 'nursery' },
  { name: 'KG 1', level: 'nursery' },
  { name: 'KG 2', level: 'nursery' },
  { name: 'Primary 1', level: 'primary' },
  { name: 'Primary 2', level: 'primary' },
  { name: 'Primary 3', level: 'primary' },
  { name: 'Primary 4', level: 'primary' },
  { name: 'Primary 5', level: 'primary' },
  { name: 'Primary 6', level: 'primary' },
  { name: 'JSS 1', level: 'secondary' },
  { name: 'JSS 2', level: 'secondary' },
  { name: 'JSS 3', level: 'secondary' },
  { name: 'SSS 1', level: 'secondary' },
  { name: 'SSS 2', level: 'secondary' },
  { name: 'SSS 3', level: 'secondary' }
];

const SUBJECT_PRESETS = {
  nursery: [
    { name: 'English Language', code: 'ENG' },
    { name: 'Mathematics', code: 'MTH' },
    { name: 'Quantitative Reasoning', code: 'QTR' },
    { name: 'Verbal Reasoning', code: 'VRB' },
    { name: 'Phonics', code: 'PHO' },
    { name: 'Handwriting', code: 'HWR' },
    { name: 'Basic Science', code: 'BSC' },
    { name: 'Health Habits', code: 'HEH' },
    { name: 'Social Habits', code: 'SOH' },
    { name: 'Creative Arts', code: 'CRA' },
    { name: 'Rhymes', code: 'RHY' },
    { name: 'Physical and Health Education', code: 'PHE' }
  ],
  primary: [
    { name: 'English Studies', code: 'ENG' },
    { name: 'Mathematics', code: 'MTH' },
    { name: 'Basic Science and Technology', code: 'BST' },
    { name: 'National Values', code: 'NVA' },
    { name: 'Pre-Vocational Studies', code: 'PVS' },
    { name: 'Cultural and Creative Arts', code: 'CCA' },
    { name: 'Computer Studies / ICT', code: 'ICT' },
    { name: 'Physical and Health Education', code: 'PHE' },
    { name: 'French', code: 'FRE' },
    { name: 'Religious Studies', code: 'RSD' },
    { name: 'Nigerian Language', code: 'NLA' },
    { name: 'Civic Education', code: 'CVC' }
  ],
  jss: [
    { name: 'English Studies', code: 'ENG' },
    { name: 'Mathematics', code: 'MTH' },
    { name: 'Basic Science', code: 'BSC' },
    { name: 'Basic Technology', code: 'BTE' },
    { name: 'National Values', code: 'NVA' },
    { name: 'Business Studies', code: 'BST' },
    { name: 'Cultural and Creative Arts', code: 'CCA' },
    { name: 'Computer Studies', code: 'CST' },
    { name: 'French', code: 'FRE' },
    { name: 'Nigerian Language', code: 'NLA' },
    { name: 'Christian Religious Studies', code: 'CRS' },
    { name: 'Islamic Religious Studies', code: 'IRS' },
    { name: 'Physical and Health Education', code: 'PHE' },
    { name: 'Home Economics', code: 'HEC' },
    { name: 'Agricultural Science', code: 'AGR' }
  ],
  sss: [
    { name: 'English Language', code: 'ENG' },
    { name: 'Mathematics', code: 'MTH' },
    { name: 'Civic Education', code: 'CVC' },
    { name: 'Biology', code: 'BIO' },
    { name: 'Chemistry', code: 'CHM' },
    { name: 'Physics', code: 'PHY' },
    { name: 'Further Mathematics', code: 'FMT' },
    { name: 'Economics', code: 'ECO' },
    { name: 'Government', code: 'GOV' },
    { name: 'Geography', code: 'GEO' },
    { name: 'Literature in English', code: 'LIT' },
    { name: 'Agricultural Science', code: 'AGR' },
    { name: 'Computer Studies / ICT', code: 'ICT' },
    { name: 'Commerce', code: 'COM' },
    { name: 'Financial Accounting', code: 'ACC' },
    { name: 'Christian Religious Studies', code: 'CRS' },
    { name: 'Islamic Religious Studies', code: 'IRS' }
  ]
};

const PRESET_OPTIONS = [
  { value: 'nursery', label: 'Nursery Curriculum' },
  { value: 'primary', label: 'Primary Curriculum' },
  { value: 'jss', label: 'Junior Secondary (JSS)' },
  { value: 'sss', label: 'Senior Secondary (SSS)' }
];

function normalizeSection(value) {
  const level = String(value || '').trim().toLowerCase();
  if (level.includes('nursery')) return 'nursery';
  if (level.includes('primary')) return 'primary';
  if (level.includes('secondary')) return 'secondary';
  return level;
}

function formatSection(value) {
  const match = SCHOOL_SECTIONS.find((item) => item.value === normalizeSection(value));
  return match?.label ?? value ?? 'Unassigned';
}

function classLabel(item) {
  if (!item?.name) return 'Unknown class';
  return `${item.name} (${formatSection(item.level)})`;
}

function inferPresetKey(classItem) {
  const level = normalizeSection(classItem?.level);
  const name = String(classItem?.name || '').toLowerCase();

  if (level === 'nursery') return 'nursery';
  if (level === 'primary') return 'primary';
  if (name.includes('sss') || name.includes('senior')) return 'sss';
  if (name.includes('jss') || name.includes('junior')) return 'jss';
  return level === 'secondary' ? 'jss' : 'primary';
}

export default function Classes() {
  const { profile } = useAuth();
  const isTeacher = profile?.role === 'teacher';
  const assignedClassId = profile?.teachers?.class_id ?? profile?.teachers?.[0]?.class_id ?? '';
  const [classes, setClasses] = useState([]);
  const [streams, setStreams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [fees, setFees] = useState([]);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState('');
  const modals = useActionModal();

  const [classForm, setClassForm] = useState({ name: '', level: 'nursery', fee: 0 });
  const [streamForm, setStreamForm] = useState({ class_id: '', name: '' });
  const [subjectForm, setSubjectForm] = useState({ class_id: '', name: '', code: '' });
  const [feeForm, setFeeForm] = useState({ class_id: '', name: '', amount: 0 });
  const [presetForm, setPresetForm] = useState({ class_id: '', preset_key: 'nursery' });

  const [selectedClass, setSelectedClass] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [classTeacher, setClassTeacher] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const viewClassDetails = async (cls) => {
    setSelectedClass(cls);
    setLoadingDetails(true);
    try {
      const [{ data: studentsData }, { data: teacherData }] = await Promise.all([
        supabase
          .from('students')
          .select('id, first_name, last_name, admission_no, status')
          .eq('class_id', cls.id)
          .order('first_name', { ascending: true }),
        supabase
          .from('teachers')
          .select('id, profiles(full_name)')
          .eq('class_id', cls.id)
          .maybeSingle()
      ]);
      setClassStudents(studentsData || []);
      setClassTeacher(teacherData);
    } catch (err) {
      console.error('Error loading class details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const load = async () => {
    if (!profile?.school_id) return;
    setError(null);
    try {
      const scopedClassId = isTeacher ? assignedClassId : '';
      const [classesRes, subjectsRes, feesRes] = await Promise.all([
        supabase
          .from('classes')
          .select('*')
          .eq(scopedClassId ? 'id' : 'school_id', scopedClassId || profile.school_id)
          .order('level', { ascending: true })
          .order('name', { ascending: true }),
        supabase
          .from('subjects')
          .select('*, classes(name, level)')
          .eq(scopedClassId ? 'class_id' : 'school_id', scopedClassId || profile.school_id)
          .order('class_id', { ascending: true })
          .order('name', { ascending: true }),
        supabase
          .from('fee_structures')
          .select('*, classes(name, level)')
          .eq(scopedClassId ? 'class_id' : 'school_id', scopedClassId || profile.school_id)
          .order('created_at', { ascending: false })
      ]);

      if (classesRes.error) throw classesRes.error;
      if (subjectsRes.error) throw subjectsRes.error;
      if (feesRes.error) throw feesRes.error;

      const classRows = classesRes.data ?? [];
      setClasses(classRows);
      setSubjects(subjectsRes.data ?? []);
      setFees(feesRes.data ?? []);

      const classIds = classRows.map((item) => item.id);
      if (classIds.length === 0) {
        setStreams([]);
      } else {
        const streamsRes = await supabase
          .from('streams')
          .select('id, name, class_id, classes!inner(name, level, school_id)')
          .in('class_id', classIds)
          .eq('classes.school_id', profile.school_id)
          .order('created_at', { ascending: false });

        if (streamsRes.error) throw streamsRes.error;
        setStreams(streamsRes.data ?? []);
      }

      setPresetForm((current) => {
        if (current.class_id && classRows.some((item) => item.id === current.class_id)) {
          return current;
        }
        const firstClass = classRows[0];
        return firstClass
          ? { class_id: firstClass.id, preset_key: inferPresetKey(firstClass) }
          : { class_id: '', preset_key: 'nursery' };
      });
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (profile?.school_id) load();
  }, [profile?.school_id]);

  const sortedClasses = useMemo(() => classes.slice(), [classes]);

  const addClass = async (e) => {
    e.preventDefault();
    if (isTeacher) {
      setError('Teachers can only view classes. Class setup is for school admins.');
      return;
    }
    setError(null);
    setInfo('');
    try {
      const { error: insertErr } = await supabase.from('classes').insert({
        ...classForm,
        fee: Number(classForm.fee),
        school_id: profile.school_id
      });
      if (insertErr) throw insertErr;
      setClassForm({ name: '', level: 'nursery', fee: 0 });
      setInfo('Class added successfully.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const addStream = async (e) => {
    e.preventDefault();
    if (isTeacher) {
      setError('Teachers cannot add streams.');
      return;
    }
    setError(null);
    setInfo('');
    try {
      const { error: insertErr } = await supabase.from('streams').insert(streamForm);
      if (insertErr) throw insertErr;
      setStreamForm({ class_id: '', name: '' });
      setInfo('Stream added successfully.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const addSubject = async (e) => {
    e.preventDefault();
    if (isTeacher) {
      setError('Teachers cannot add subjects.');
      return;
    }
    setError(null);
    setInfo('');
    try {
      const { error: insertErr } = await supabase.from('subjects').insert({
        class_id: subjectForm.class_id,
        name: subjectForm.name.trim(),
        code: subjectForm.code.trim().toUpperCase(),
        school_id: profile.school_id
      });
      if (insertErr) throw insertErr;
      setSubjectForm({ class_id: '', name: '', code: '' });
      setInfo('Subject added to class.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const addFee = async (e) => {
    e.preventDefault();
    if (isTeacher) {
      setError('Teachers cannot add fee structures.');
      return;
    }
    setError(null);
    setInfo('');
    try {
      const { error: insertErr } = await supabase.from('fee_structures').insert({
        ...feeForm,
        amount: Number(feeForm.amount),
        school_id: profile.school_id
      });
      if (insertErr) throw insertErr;
      setFeeForm({ class_id: '', name: '', amount: 0 });
      setInfo('Fee structure saved.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const loadPresetClasses = async () => {
    if (isTeacher) {
      setInfo('Teachers can only view their assigned class. Standard class presets are for school admins.');
      return;
    }
    setError(null);
    setInfo('');
    try {
      const existingKeys = new Set(
        classes.map((item) => `${item.name.trim().toLowerCase()}::${normalizeSection(item.level)}`)
      );

      const missing = CLASS_PRESETS.filter(
        (item) => !existingKeys.has(`${item.name.trim().toLowerCase()}::${item.level}`)
      ).map((item) => ({
        school_id: profile.school_id,
        name: item.name,
        level: item.level,
        fee: 0
      }));

      if (missing.length === 0) {
        setInfo('All standard classes already exist for this school.');
        return;
      }

      const { error: insertErr } = await supabase.from('classes').insert(missing);
      if (insertErr) throw insertErr;

      setInfo(`${missing.length} standard classes added.`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const loadPresetSubjects = async () => {
    if (isTeacher) {
      setInfo('Teachers cannot load subject presets.');
      return;
    }
    setError(null);
    setInfo('');
    try {
      if (!presetForm.class_id) {
        throw new Error('Select a class before loading subject presets.');
      }

      const classItem = classes.find((item) => item.id === presetForm.class_id);
      if (!classItem) {
        throw new Error('Selected class was not found.');
      }

      const presetKey = presetForm.preset_key || inferPresetKey(classItem);
      const presetSubjects = SUBJECT_PRESETS[presetKey] ?? [];
      if (presetSubjects.length === 0) {
        throw new Error('No subject preset found for the selected curriculum.');
      }

      const existingKeys = new Set(
        subjects
          .filter((item) => item.class_id === presetForm.class_id)
          .map((item) => `${item.name.trim().toLowerCase()}::${item.code.trim().toUpperCase()}`)
      );

      const missing = presetSubjects
        .filter((item) => !existingKeys.has(`${item.name.trim().toLowerCase()}::${item.code}`))
        .map((item) => ({
          school_id: profile.school_id,
          class_id: presetForm.class_id,
          name: item.name,
          code: item.code
        }));

      if (missing.length === 0) {
        setInfo(`All ${PRESET_OPTIONS.find((item) => item.value === presetKey)?.label ?? presetKey} subjects already exist for ${classItem.name}.`);
        return;
      }

      const { error: insertErr } = await supabase.from('subjects').insert(missing);
      if (insertErr) throw insertErr;

      setInfo(`${missing.length} curriculum subjects added to ${classItem.name}. You can still edit or delete any of them.`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeSubject = async (subjectId, subjectName) => {
    if (isTeacher) {
      setError('Teachers cannot remove subjects.');
      return;
    }
    modals.confirm.show(
      'Remove subject?',
      `Remove ${subjectName} from this class?`,
      'Any saved results for this subject will also be removed for affected students.',
      async () => {
        modals.confirm.setLoading(true);
        setError(null);
        setInfo('');
        try {
          const { error: deleteErr } = await supabase.from('subjects').delete().eq('id', subjectId);
          if (deleteErr) throw deleteErr;
          setInfo(`${subjectName} removed successfully.`);
          modals.confirm.close();
          modals.success.show(`${subjectName} removed successfully.`);
          await load();
        } catch (err) {
          setError(err.message);
          modals.error.show('Remove failed', err.message);
        } finally {
          modals.confirm.setLoading(false);
        }
      },
      { confirmText: 'Remove', isDangerous: true }
    );
  };

  if (selectedClass) {
    return (
      <div className="space-y-6">
        <ActionModalRenderer modals={modals} />
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedClass(null)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ChevronLeftIcon className="w-6 h-6 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{selectedClass.name}</h1>
            <p className="text-slate-500">{formatSection(selectedClass.level)} Section</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Class Teacher</h3>
              {classTeacher ? (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg uppercase">
                    {classTeacher.profiles?.full_name?.substring(0, 2)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{classTeacher.profiles?.full_name}</p>
                    <p className="text-xs text-slate-400 font-medium">Assigned Class Teacher</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">No teacher assigned yet.</p>
              )}
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Class Stats</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600 font-medium">Total Students</span>
                  <span className="text-sm font-bold text-slate-900">{classStudents.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600 font-medium">Active</span>
                  <span className="text-sm font-bold text-emerald-600">
                    {classStudents.filter(s => s.status === 'active').length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <h3 className="font-bold text-slate-800">Students List</h3>
                <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full uppercase">
                  {classStudents.length} Enrolled
                </span>
              </div>
              {loadingDetails ? (
                <div className="p-12 text-center text-slate-400">Loading students...</div>
              ) : classStudents.length === 0 ? (
                <div className="p-12 text-center text-slate-400">No students enrolled in this class yet.</div>
              ) : (
                <SimpleTable
                  headers={['Student Name', 'Admission No', 'Status']}
                  rows={classStudents.map(s => [
                    `${s.first_name} ${s.last_name}`,
                    s.admission_no || '-',
                    <span key={s.id} className={`capitalize font-bold text-xs ${s.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {s.status}
                    </span>
                  ])}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ActionModalRenderer modals={modals} />
      <div>
        <h1 className="text-xl font-semibold">Classes & Subjects</h1>
        <p className="text-sm text-slate-500">
          Manage nursery, primary, and secondary classes, then load Nigerian curriculum subject presets and edit them anytime.
        </p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-card border border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-800">Standard Class Presets</h3>
          <p className="text-sm text-slate-500">
            Load Nursery 1-2, KG 1-2, Primary 1-6, and JSS/SSS 1-3 automatically.
          </p>
        </div>
        {!isTeacher && (
          <button
            type="button"
            onClick={loadPresetClasses}
            className="rounded-lg bg-slate-900 text-white px-4 py-2 font-semibold hover:bg-slate-800"
          >
            Load Standard Classes
          </button>
        )}
      </div>

      {!isTeacher ? (
        <form
          onSubmit={addClass}
          className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl shadow-card border border-slate-100"
        >
          <input
            className="border border-slate-200 rounded-lg px-3 py-2"
            placeholder="Class name"
            value={classForm.name}
            onChange={(e) => setClassForm((current) => ({ ...current, name: e.target.value }))}
            required
          />
          <select
            className="border border-slate-200 rounded-lg px-3 py-2 bg-white"
            value={classForm.level}
            onChange={(e) => setClassForm((current) => ({ ...current, level: e.target.value }))}
            required
          >
            {SCHOOL_SECTIONS.map((section) => (
              <option key={section.value} value={section.value}>
                {section.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="border border-slate-200 rounded-lg px-3 py-2"
            placeholder="Fee (NGN)"
            value={classForm.fee}
            onChange={(e) => setClassForm((current) => ({ ...current, fee: e.target.value }))}
          />
          <button className="rounded-lg bg-brand-600 text-white px-4 py-2 font-semibold hover:bg-brand-700">
            Add Class
          </button>
        </form>
      ) : (
        <div className="rounded-xl border border-slate-100 bg-white p-4 text-sm text-slate-600 shadow-card">
          Teachers can view their assigned class here, but class setup is restricted to school admins.
        </div>
      )}

      {error && <div className="text-sm text-rose-600">{error}</div>}
      {!error && info && <div className="text-sm text-emerald-700">{info}</div>}

      <div className="bg-white p-4 rounded-xl shadow-card border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-3">{isTeacher ? 'Assigned Class' : 'Classes'}</h3>
        <SimpleTable
          headers={['Class', 'Section', 'Base Fee', 'Actions']}
          rows={sortedClasses.map((item) => [
            item.name,
            formatSection(item.level),
            `NGN ${Number(item.fee || 0).toLocaleString()}`,
            <button
              key={`view-${item.id}`}
              onClick={() => viewClassDetails(item)}
              className="text-blue-600 hover:text-blue-800 font-bold text-sm"
            >
              View Students
            </button>
          ])}
        />
      </div>

      <div className="bg-white p-4 rounded-xl shadow-card border border-slate-100 space-y-3">
        <div>
          <h3 className="font-semibold text-slate-800">Load Nigerian Curriculum Subject Presets</h3>
          <p className="text-sm text-slate-500">
            Start with a preset, then add or remove subjects to match your school&apos;s exact offering.
          </p>
        </div>
        {!isTeacher ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <select
              className="border border-slate-200 rounded-lg px-3 py-2 bg-white"
              value={presetForm.class_id}
              onChange={(e) => {
                const classItem = classes.find((item) => item.id === e.target.value);
                setPresetForm({
                  class_id: e.target.value,
                  preset_key: classItem ? inferPresetKey(classItem) : 'nursery'
                });
              }}
            >
              <option value="">Select class</option>
              {sortedClasses.map((item) => (
                <option key={item.id} value={item.id}>
                  {classLabel(item)}
                </option>
              ))}
            </select>
            <select
              className="border border-slate-200 rounded-lg px-3 py-2 bg-white"
              value={presetForm.preset_key}
              onChange={(e) => setPresetForm((current) => ({ ...current, preset_key: e.target.value }))}
            >
              {PRESET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadPresetSubjects}
              className="rounded-lg bg-brand-600 text-white px-4 py-2 font-semibold hover:bg-brand-700"
            >
              Load Subject Preset
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Teachers can view the subjects attached to their assigned class here.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-800">Streams</h3>
          {!isTeacher ? (
            <form onSubmit={addStream} className="grid grid-cols-3 gap-3 text-sm">
              <select
                className="border border-slate-200 rounded-lg px-3 py-2 bg-white"
                value={streamForm.class_id}
                onChange={(e) => setStreamForm((current) => ({ ...current, class_id: e.target.value }))}
                required
              >
                <option value="">Class</option>
                {sortedClasses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {classLabel(item)}
                  </option>
                ))}
              </select>
              <input
                className="border border-slate-200 rounded-lg px-3 py-2"
                placeholder="Stream name"
                value={streamForm.name}
                onChange={(e) => setStreamForm((current) => ({ ...current, name: e.target.value }))}
                required
              />
              <button className="rounded-lg bg-slate-900 text-white px-3 py-2 font-semibold">Add</button>
            </form>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Stream management is disabled for teachers.
            </div>
          )}
          <SimpleTable
            headers={['Class', 'Stream']}
            rows={streams.map((item) => [classLabel(item.classes ?? {}), item.name])}
          />
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-slate-800">Add Custom Subject</h3>
          {!isTeacher ? (
            <form onSubmit={addSubject} className="grid grid-cols-4 gap-3 text-sm">
              <select
                className="border border-slate-200 rounded-lg px-3 py-2 bg-white col-span-2"
                value={subjectForm.class_id}
                onChange={(e) => setSubjectForm((current) => ({ ...current, class_id: e.target.value }))}
                required
              >
                <option value="">Class</option>
                {sortedClasses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {classLabel(item)}
                  </option>
                ))}
              </select>
              <input
                className="border border-slate-200 rounded-lg px-3 py-2"
                placeholder="Subject"
                value={subjectForm.name}
                onChange={(e) => setSubjectForm((current) => ({ ...current, name: e.target.value }))}
                required
              />
              <input
                className="border border-slate-200 rounded-lg px-3 py-2 uppercase"
                placeholder="Code"
                value={subjectForm.code}
                onChange={(e) => setSubjectForm((current) => ({ ...current, code: e.target.value.toUpperCase() }))}
                required
              />
              <button className="col-span-4 rounded-lg bg-brand-600 text-white px-3 py-2 font-semibold">
                Add Subject
              </button>
            </form>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Teachers can only review subject lists for their assigned class.
            </div>
          )}
          <p className="text-xs text-slate-500">
            Subject presets are editable. You can add a missing subject here or remove any preset subject from the table below.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-slate-800">Subjects by Class</h3>
        <SimpleTable
          headers={['Class', 'Section', 'Subject', 'Code', 'Action']}
          rows={subjects.map((item) => [
            item.classes?.name ?? '',
            formatSection(item.classes?.level),
            item.name,
            item.code,
            isTeacher ? (
              'View only'
            ) : (
              <button
                key={`delete-${item.id}`}
                type="button"
                onClick={() => removeSubject(item.id, item.name)}
                className="rounded-md border border-rose-200 px-3 py-1 text-rose-600 hover:bg-rose-50"
              >
                Remove
              </button>
            )
          ])}
        />
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-slate-800">Fee Structures</h3>
        {!isTeacher ? (
          <form onSubmit={addFee} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
            <select
              className="border border-slate-200 rounded-lg px-3 py-2 bg-white"
              value={feeForm.class_id}
              onChange={(e) => setFeeForm((current) => ({ ...current, class_id: e.target.value }))}
              required
            >
              <option value="">Class</option>
              {sortedClasses.map((item) => (
                <option key={item.id} value={item.id}>
                  {classLabel(item)}
                </option>
              ))}
            </select>
            <input
              className="border border-slate-200 rounded-lg px-3 py-2"
              placeholder="Name"
              value={feeForm.name}
              onChange={(e) => setFeeForm((current) => ({ ...current, name: e.target.value }))}
              required
            />
            <input
              type="number"
              className="border border-slate-200 rounded-lg px-3 py-2"
              placeholder="Amount"
              value={feeForm.amount}
              onChange={(e) => setFeeForm((current) => ({ ...current, amount: e.target.value }))}
              required
            />
            <button className="rounded-lg bg-slate-900 text-white px-3 py-2 font-semibold">Add Fee</button>
          </form>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Fee setup is disabled for teachers.
          </div>
        )}
        <SimpleTable
          headers={['Class', 'Name', 'Amount']}
          rows={fees.map((item) => [classLabel(item.classes ?? {}), item.name, `NGN ${Number(item.amount).toLocaleString()}`])}
        />
      </div>
    </div>
  );
}
