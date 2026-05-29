import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../lib/api';
import { SimpleTable } from '../components/SimpleTable';
import { downloadCsv, parseCsv, sanitizeFilename } from '../lib/csv';

const TERM_OPTIONS = ['Term 1', 'Term 2', 'Term 3'];
const ENTRY_MODES = [
  { value: 'student', label: 'Student Score Sheet' },
  { value: 'bulk', label: 'Bulk Class Entry' }
];

function scoreToGrade(total) {
  if (total >= 70) return 'A';
  if (total >= 60) return 'B';
  if (total >= 50) return 'C';
  if (total >= 45) return 'D';
  if (total >= 40) return 'E';
  return 'F';
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundTwo(value) {
  return Math.round(value * 100) / 100;
}

function computeTotal(caScore, examScore) {
  return roundTwo(toNumber(caScore) + toNumber(examScore));
}

function defaultSessionYear() {
  const year = dayjs().month() >= 7 ? dayjs().year() : dayjs().year() - 1;
  return `${year}/${year + 1}`;
}

function buildClassStandings(rows) {
  const grouped = new Map();

  rows.forEach((row) => {
    const studentId = row.student_id;
    const studentName = `${row.students?.first_name ?? ''} ${row.students?.last_name ?? ''}`.trim() || 'Student';

    if (!grouped.has(studentId)) {
      grouped.set(studentId, {
        student_id: studentId,
        student_name: studentName,
        subject_count: 0,
        total_score: 0
      });
    }

    const current = grouped.get(studentId);
    current.subject_count += 1;
    current.total_score += Number(row.total ?? 0);
  });

  const summaries = Array.from(grouped.values()).map((item) => ({
    ...item,
    average_score: item.subject_count ? roundTwo(item.total_score / item.subject_count) : 0
  }));

  summaries.sort((a, b) => {
    if (b.average_score !== a.average_score) return b.average_score - a.average_score;
    if (b.total_score !== a.total_score) return b.total_score - a.total_score;
    return a.student_name.localeCompare(b.student_name);
  });

  let lastAverage = null;
  let lastGrandTotal = null;
  let position = 0;

  return summaries.map((item, index) => {
    if (index === 0 || item.average_score !== lastAverage || item.total_score !== lastGrandTotal) {
      position = index + 1;
    }
    lastAverage = item.average_score;
    lastGrandTotal = item.total_score;
    return {
      ...item,
      class_position: position
    };
  });
}

function buildSubjectPositions(rows) {
  const grouped = new Map();

  rows.forEach((row) => {
    const key = row.subject_id;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  });

  const positions = new Map();

  grouped.forEach((items, subjectId) => {
    const sorted = [...items].sort((a, b) => {
      const totalDiff = Number(b.total ?? 0) - Number(a.total ?? 0);
      if (totalDiff !== 0) return totalDiff;
      const caDiff = Number(b.ca_score ?? 0) - Number(a.ca_score ?? 0);
      if (caDiff !== 0) return caDiff;
      return Number(b.exam_score ?? 0) - Number(a.exam_score ?? 0);
    });

    const subjectPositions = new Map();
    let lastTotal = null;
    let lastCa = null;
    let lastExam = null;
    let position = 0;

    sorted.forEach((item, index) => {
      const total = Number(item.total ?? 0);
      const ca = Number(item.ca_score ?? 0);
      const exam = Number(item.exam_score ?? 0);

      if (index === 0 || total !== lastTotal || ca !== lastCa || exam !== lastExam) {
        position = index + 1;
      }

      subjectPositions.set(item.student_id, position);
      lastTotal = total;
      lastCa = ca;
      lastExam = exam;
    });

    positions.set(subjectId, subjectPositions);
  });

  return positions;
}

export default function Results() {
  const { profile } = useAuth();
  const isStudent = profile?.role === 'student';
  const isTeacher = profile?.role === 'teacher';
  const teacherClassId = profile?.teachers?.class_id ?? profile?.teachers?.[0]?.class_id ?? '';
  const linkedStudent = profile?.students ?? null;
  const linkedStudentId = linkedStudent?.id ?? profile?.student_id ?? '';
  const linkedStudentClassId = linkedStudent?.class_id ?? '';
  const [entryMode, setEntryMode] = useState('student');
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [classResults, setClassResults] = useState([]);
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [filters, setFilters] = useState({
    class_id: '',
    student_id: '',
    subject_id: '',
    term: 'Term 1',
    session_year: defaultSessionYear()
  });
  const [sheetRows, setSheetRows] = useState([]);
  const [bulkRows, setBulkRows] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [summary, setSummary] = useState(null);
  const [classStandings, setClassStandings] = useState([]);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [loadingClassData, setLoadingClassData] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [savingStudent, setSavingStudent] = useState(false);
  const [savingBulk, setSavingBulk] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [reportMsg, setReportMsg] = useState('');
  const [error, setError] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);

  const handleAIScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setReportMsg('Analyzing photo...');
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Image = reader.result;
        const res = await apiFetch('/api/ocr', {
          method: 'POST',
          body: { base64Image }
        });
        setReportMsg('Scan complete. Extracted Text:\n' + (res.text || 'No text found'));
      };
      reader.onerror = () => {
        setReportMsg('Failed to read image.');
      };
    } catch (err) {
      setReportMsg('OCR failed.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setError(null);
    setReportMsg('');

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const text = evt.target.result;
          const data = parseCsv(text);
          if (data.length === 0) throw new Error('File is empty or missing student result rows.');

          setReportMsg(`Processing ${data.length} rows...`);

          const payload = [];
          for (const row of data) {
            const admissionNo = row.admission_no || row.admission_number || row.student_id;
            const subjectCode = row.subject_code || row.subject;

            const student = students.find(s => 
              String(s.admission_no).toLowerCase() === String(admissionNo).toLowerCase()
            );
            const subject = classSubjects.find(sub => 
              String(sub.code).toLowerCase() === String(subjectCode).toLowerCase()
            );

            if (student && subject) {
              const ca = toNumber(row.ca || row.ca_score || 0);
              const exam = toNumber(row.exam || row.exam_score || 0);
              const total = computeTotal(ca, exam);
              
              payload.push({
                school_id: profile.school_id,
                class_id: filters.class_id || student.class_id,
                student_id: student.id,
                subject_id: subject.id,
                term: row.term || filters.term,
                session_year: row.session || row.session_year || filters.session_year,
                ca_score: ca,
                exam_score: exam,
                grade: scoreToGrade(total)
              });
            }
          }

          if (payload.length === 0) {
            throw new Error('No matching students or subjects found. Ensure columns are: Admission_No, Subject_Code, CA, Exam');
          }

          const { error: upsertErr } = await supabase
            .from('results')
            .upsert(payload, { onConflict: 'student_id,subject_id,term,session_year' });

          if (upsertErr) throw upsertErr;

          setReportMsg(`Success! Uploaded ${payload.length} results.`);
          if (filters.class_id) loadClassContext(filters.class_id);
        } catch (err) {
          setError(err.message);
        } finally {
          setUploadingFile(false);
        }
      };

      reader.readAsText(file);
    } catch (err) {
      setError('Import failed: ' + err.message);
      setUploadingFile(false);
    }
  };

  const filteredStudents = useMemo(
    () => students.filter((student) => !filters.class_id || student.class_id === filters.class_id),
    [students, filters.class_id]
  );

  const currentAverage = useMemo(() => {
    if (sheetRows.length === 0) return 0;
    return roundTwo(
      sheetRows.reduce((sum, row) => sum + computeTotal(row.ca_score, row.exam_score), 0) / sheetRows.length
    );
  }, [sheetRows]);

  const attendanceSummary = useMemo(() => {
    return attendanceRows.reduce(
      (acc, row) => {
        const status = String(row.status ?? '').toLowerCase();
        if (status === 'present') acc.present += 1;
        if (status === 'absent') acc.absent += 1;
        if (status === 'late') acc.late += 1;
        if (status === 'excused') acc.excused += 1;
        return acc;
      },
      { present: 0, absent: 0, late: 0, excused: 0 }
    );
  }, [attendanceRows]);

  const currentSubject = useMemo(
    () => classSubjects.find((subject) => subject.id === filters.subject_id) ?? null,
    [classSubjects, filters.subject_id]
  );

  const activeSubjectRow = useMemo(
    () => sheetRows.find((row) => row.subject_id === selectedSubjectId) ?? sheetRows[0] ?? null,
    [sheetRows, selectedSubjectId]
  );

  const loadReferences = async () => {
    if (!profile?.school_id) return;
    setLoadingRefs(true);
    setError(null);
    try {
      const [classesRes, studentsRes, schoolRes] = await Promise.all([
        supabase
          .from('classes')
          .select('id, name, level')
          .eq('school_id', profile.school_id)
          .order('level', { ascending: true })
          .order('name', { ascending: true }),
        supabase
          .from('students')
          .select('id, first_name, last_name, class_id, admission_no, classes(name, level)')
          .eq(isTeacher && teacherClassId ? 'class_id' : 'school_id', isTeacher && teacherClassId ? teacherClassId : profile.school_id)
          .order('first_name', { ascending: true }),
        supabase
          .from('schools')
          .select('*')
          .eq('id', profile.school_id)
          .maybeSingle()
      ]);

      if (classesRes.error) throw classesRes.error;
      if (studentsRes.error) throw studentsRes.error;

      const classRows = classesRes.data ?? [];
      setClasses(isTeacher && teacherClassId ? classRows.filter((item) => item.id === teacherClassId) : classRows);
      setStudents(studentsRes.data ?? []);

      if (!schoolRes.error && schoolRes.data) {
        const currentTerm = schoolRes.data.current_term;
        const currentSession = schoolRes.data.current_session_year;
        setFilters((current) => ({
          ...current,
          term: current.term === 'Term 1' && currentTerm ? currentTerm : current.term,
          session_year: current.session_year === defaultSessionYear() && currentSession ? currentSession : current.session_year
        }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingRefs(false);
    }
  };

  const loadClassContext = async (classId = filters.class_id) => {
    if (!profile?.school_id || !classId) {
      setClassSubjects([]);
      setClassResults([]);
      setClassStandings([]);
      return;
    }

    setLoadingClassData(true);
    setError(null);

    try {
      const [subjectsRes, resultsRes] = await Promise.all([
        supabase
          .from('subjects')
          .select('id, name, code')
          .eq('school_id', profile.school_id)
          .eq('class_id', classId)
          .order('name', { ascending: true }),
        supabase
          .from('results')
          .select('student_id, subject_id, ca_score, exam_score, total, grade, position, students(first_name,last_name)')
          .eq('school_id', profile.school_id)
          .eq('class_id', classId)
          .eq('term', filters.term)
          .eq('session_year', filters.session_year)
      ]);

      if (subjectsRes.error) throw subjectsRes.error;
      if (resultsRes.error) throw resultsRes.error;

      const subjects = subjectsRes.data ?? [];
      const results = resultsRes.data ?? [];

      setClassSubjects(subjects);
      setClassResults(results);
      setClassStandings(buildClassStandings(results));
    } catch (err) {
      setError(err.message);
      setClassSubjects([]);
      setClassResults([]);
      setClassStandings([]);
    } finally {
      setLoadingClassData(false);
    }
  };

  useEffect(() => {
    if (profile?.school_id) loadReferences();
  }, [profile?.school_id]);

  useEffect(() => {
    if (isTeacher && teacherClassId) {
      setFilters((current) =>
        current.class_id === teacherClassId
          ? current
          : { ...current, class_id: teacherClassId, student_id: '', subject_id: '' }
      );
    }
  }, [isTeacher, teacherClassId]);

  useEffect(() => {
    if (!isStudent || !linkedStudentId) return;

    setEntryMode('student');
    setFilters((current) => ({
      ...current,
      class_id: linkedStudentClassId || current.class_id,
      student_id: linkedStudentId,
      subject_id: ''
    }));
  }, [isStudent, linkedStudentId, linkedStudentClassId]);

  useEffect(() => {
    if (!filters.class_id) {
      setFilters((current) => ({ ...current, student_id: '', subject_id: '' }));
      setSelectedStudent(null);
      setSheetRows([]);
      setBulkRows([]);
      setSummary(null);
      setClassSubjects([]);
      setClassResults([]);
      setClassStandings([]);
      return;
    }

    loadClassContext(filters.class_id);
  }, [filters.class_id, filters.term, filters.session_year, profile?.school_id]);

  useEffect(() => {
    if (!filters.class_id || !filters.student_id) return;

    const studentStillMatches = students.some(
      (student) => student.id === filters.student_id && student.class_id === filters.class_id
    );

    if (!studentStillMatches) {
      setFilters((current) => ({ ...current, student_id: '' }));
      setSelectedStudent(null);
      setSheetRows([]);
      setSummary(null);
    }
  }, [filters.class_id, filters.student_id, students]);

  useEffect(() => {
    if (!filters.student_id) {
      setSelectedStudent(null);
      setSheetRows([]);
      setSelectedSubjectId('');
      setSummary(null);
      return;
    }

    const student = students.find((item) => item.id === filters.student_id);
    if (!student) {
      setSelectedStudent(null);
      setSheetRows([]);
      setSummary(null);
      return;
    }

    const resultMap = new Map(
      classResults.filter((row) => row.student_id === filters.student_id).map((row) => [row.subject_id, row])
    );
    const subjectPositions = buildSubjectPositions(classResults);

    const rows = classSubjects.map((subject) => {
      const existing = resultMap.get(subject.id);
      return {
        subject_id: subject.id,
        subject_name: subject.name,
        subject_code: subject.code,
        ca_score: existing?.ca_score ?? '',
        exam_score: existing?.exam_score ?? '',
        total: existing?.total ?? 0,
        grade: existing?.grade ?? '',
        position: subjectPositions.get(subject.id)?.get(filters.student_id) ?? existing?.position ?? null
      };
    });

    const standings = buildClassStandings(classResults);
    const summaryRow =
      standings.find((item) => item.student_id === filters.student_id) ??
      (rows.length > 0
        ? {
            student_id: filters.student_id,
            student_name: `${student.first_name} ${student.last_name}`.trim(),
            subject_count: rows.length,
            total_score: rows.reduce((sum, row) => sum + computeTotal(row.ca_score, row.exam_score), 0),
            average_score: rows.length
              ? roundTwo(
                  rows.reduce((sum, row) => sum + computeTotal(row.ca_score, row.exam_score), 0) / rows.length
                )
              : 0,
            class_position: '-'
          }
        : null);

    setSelectedStudent(student);
    setSheetRows(rows);
    setSelectedSubjectId((current) => current && rows.some((row) => row.subject_id === current) ? current : rows[0]?.subject_id ?? '');
    setSummary(summaryRow);
  }, [filters.student_id, classSubjects, classResults, students]);

  useEffect(() => {
    const studentId = selectedStudent?.id;
    if (!studentId || !profile?.school_id) {
      setAttendanceRows([]);
      return;
    }

    const loadAttendance = async () => {
      setLoadingAttendance(true);
      try {
        const { data, error: attErr } = await supabase
          .from('attendance_students')
          .select('attended_on, status, remarks')
          .eq('school_id', profile.school_id)
          .eq('student_id', studentId)
          .order('attended_on', { ascending: false })
          .limit(30);

        if (attErr) throw attErr;
        setAttendanceRows(data ?? []);
      } catch (err) {
        setError(err.message);
        setAttendanceRows([]);
      } finally {
        setLoadingAttendance(false);
      }
    };

    loadAttendance();
  }, [selectedStudent?.id, profile?.school_id]);

  useEffect(() => {
    if (!filters.subject_id) {
      setBulkRows([]);
      return;
    }

    const resultMap = new Map(
      classResults.filter((row) => row.subject_id === filters.subject_id).map((row) => [row.student_id, row])
    );

    const rows = filteredStudents.map((student) => {
      const existing = resultMap.get(student.id);
      return {
        student_id: student.id,
        student_name: `${student.first_name} ${student.last_name}`.trim(),
        admission_no: student.admission_no ?? '-',
        ca_score: existing?.ca_score ?? '',
        exam_score: existing?.exam_score ?? '',
        total: existing?.total ?? 0,
        grade: existing?.grade ?? ''
      };
    });

    setBulkRows(rows);
  }, [filters.subject_id, filteredStudents, classResults]);

  const handleScoreChange = (subjectId, field, value) => {
    setSheetRows((current) =>
      current.map((row) => {
        if (row.subject_id !== subjectId) return row;
        const updated = { ...row, [field]: value };
        const total = computeTotal(updated.ca_score, updated.exam_score);
        return {
          ...updated,
          total,
          grade: scoreToGrade(total)
        };
      })
    );
  };

  const handleBulkScoreChange = (studentId, field, value) => {
    setBulkRows((current) =>
      current.map((row) => {
        if (row.student_id !== studentId) return row;
        const updated = { ...row, [field]: value };
        const total = computeTotal(updated.ca_score, updated.exam_score);
        return {
          ...updated,
          total,
          grade: scoreToGrade(total)
        };
      })
    );
  };

  const saveStudentResults = async () => {
    if (!selectedStudent) {
      setError('Select a student first.');
      return;
    }
    if (sheetRows.length === 0) {
      setError('No subjects are assigned to this student class yet.');
      return;
    }

    setSavingStudent(true);
    setError(null);
    setReportMsg('');

    try {
      const payload = sheetRows.map((row) => {
        const total = computeTotal(row.ca_score, row.exam_score);
        return {
          school_id: profile.school_id,
          class_id: selectedStudent.class_id,
          student_id: selectedStudent.id,
          subject_id: row.subject_id,
          term: filters.term,
          session_year: filters.session_year,
          ca_score: toNumber(row.ca_score),
          exam_score: toNumber(row.exam_score),
          grade: scoreToGrade(total)
        };
      });

      const { error: upsertErr } = await supabase
        .from('results')
        .upsert(payload, { onConflict: 'student_id,subject_id,term,session_year' });

      if (upsertErr) throw upsertErr;

      await loadClassContext(selectedStudent.class_id);
      setReportMsg('Student results saved. You can now download the PDF result.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingStudent(false);
    }
  };

  const saveBulkResults = async () => {
    if (!filters.class_id) {
      setError('Select a class first.');
      return;
    }
    if (!filters.subject_id) {
      setError('Select a subject for bulk entry.');
      return;
    }
    if (bulkRows.length === 0) {
      setError('No students found for this class.');
      return;
    }

    setSavingBulk(true);
    setError(null);
    setReportMsg('');

    try {
      const payload = bulkRows.map((row) => {
        const total = computeTotal(row.ca_score, row.exam_score);
        return {
          school_id: profile.school_id,
          class_id: filters.class_id,
          student_id: row.student_id,
          subject_id: filters.subject_id,
          term: filters.term,
          session_year: filters.session_year,
          ca_score: toNumber(row.ca_score),
          exam_score: toNumber(row.exam_score),
          grade: scoreToGrade(total)
        };
      });

      const { error: upsertErr } = await supabase
        .from('results')
        .upsert(payload, { onConflict: 'student_id,subject_id,term,session_year' });

      if (upsertErr) throw upsertErr;

      await loadClassContext(filters.class_id);
      setReportMsg(`Bulk results saved for ${currentSubject?.name ?? 'selected subject'}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingBulk(false);
    }
  };

  const downloadStudentPdf = async () => {
    const studentId = filters.student_id || selectedStudent?.id || linkedStudentId;
    if (!studentId) {
      setReportMsg('Select a student first.');
      return;
    }

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      const data = await apiFetch(`/api/report-card/${studentId}`, {
        method: 'POST',
        token: session.access_token,
        body: {
          term: filters.term,
          session_year: filters.session_year
        }
      });

      if (data?.url) {
        window.open(data.url, '_blank');
        setReportMsg('PDF result is ready to download.');
      } else {
        setReportMsg('PDF result was generated, but no download link was returned.');
      }
    } catch (err) {
      setReportMsg(err.message);
    }
  };

  const downloadResultTemplate = () => {
    const selectedClass = classes.find((item) => item.id === filters.class_id);
    const subjects = filters.subject_id
      ? classSubjects.filter((subject) => subject.id === filters.subject_id)
      : classSubjects;
    const rows = [];

    filteredStudents.forEach((student) => {
      subjects.forEach((subject) => {
        rows.push([
          student.admission_no ?? '',
          `${student.first_name} ${student.last_name}`.trim(),
          subject.code ?? '',
          subject.name ?? '',
          filters.term,
          filters.session_year,
          '',
          ''
        ]);
      });
    });

    downloadCsv(`${sanitizeFilename(selectedClass?.name || 'class')}-bulk-results-template.csv`, [
      ['admission_no', 'student_name', 'subject_code', 'subject_name', 'term', 'session_year', 'ca_score', 'exam_score'],
      ...(rows.length
        ? rows
        : [['ADM-001', 'Student Name', 'MATH', 'Mathematics', filters.term, filters.session_year, '20', '60']])
    ]);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Results</h1>
          <p className="text-sm text-slate-500">
            {isStudent
              ? 'View your scores, attendance, and download your PDF result instantly.'
              : 'Use student score sheets for one learner or bulk class entry to score a whole subject at once.'}
          </p>
        </div>
      </div>

      {!isStudent && (
        <>
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-2">
              {ENTRY_MODES.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setEntryMode(mode.value)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    entryMode === mode.value
                      ? 'bg-brand-600 text-white'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={downloadResultTemplate}
                disabled={!filters.class_id || filteredStudents.length === 0 || classSubjects.length === 0}
                className="rounded-lg px-4 py-2 text-sm font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 disabled:opacity-60"
              >
                Download Result CSV Template
              </button>
              <label className={`rounded-lg px-4 py-2 text-sm font-semibold transition cursor-pointer flex items-center gap-2 ${
                uploadingFile ? 'bg-slate-100 text-slate-400' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}>
                {uploadingFile ? 'Processing...' : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Bulk Upload (CSV)
                  </>
                )}
                <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} disabled={uploadingFile} />
              </label>

              <label className="rounded-lg px-4 py-2 text-sm font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
                Scan Photo (AI)
                <input type="file" className="hidden" accept="image/*" onChange={handleAIScan} disabled={ocrLoading} />
              </label>

              <button 
                onClick={() => {
                  loadReferences();
                  if (filters.class_id) loadClassContext(filters.class_id);
                }}
                className="rounded-lg px-4 py-2 text-sm font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              >
                Refresh Data
              </button>
            </div>
          </div>

          <div className="bg-white shadow-card border border-slate-100 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 xl:grid-cols-6 gap-3 text-sm">
            {isTeacher ? (
              <div className="rounded-lg border border-slate-200 px-3 py-2 bg-slate-50 text-slate-700 flex items-center">
                {classes.find((item) => item.id === teacherClassId)?.name ?? 'Assigned class'}
              </div>
            ) : (
              <select
                className="rounded-lg border border-slate-200 px-3 py-2 bg-white"
                value={filters.class_id}
                onChange={(e) =>
                  setFilters((current) => ({
                    ...current,
                    class_id: e.target.value,
                    student_id: '',
                    subject_id: ''
                  }))
                }
              >
                <option value="">Select class</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            )}

            {entryMode === 'student' ? (
              <>
                <select
                  className="rounded-lg border border-slate-200 px-3 py-2 bg-white"
                  value={filters.student_id}
                  onChange={(e) => setFilters((current) => ({ ...current, student_id: e.target.value }))}
                  disabled={!filters.class_id}
                >
                  <option value="">{filters.class_id ? 'Select student' : 'Choose class first'}</option>
                  {filteredStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.first_name} {student.last_name}
                    </option>
                  ))}
                </select>
                <div className="rounded-lg border border-slate-200 px-3 py-2 bg-slate-50 text-slate-600 flex items-center">
                  {selectedStudent ? 'Student sheet loaded' : 'Select a student to open the sheet'}
                </div>
              </>
            ) : (
              <>
                <select
                  className="rounded-lg border border-slate-200 px-3 py-2 bg-white"
                  value={filters.subject_id}
                  onChange={(e) => setFilters((current) => ({ ...current, subject_id: e.target.value }))}
                  disabled={!filters.class_id}
                >
                  <option value="">{filters.class_id ? 'Select subject' : 'Choose class first'}</option>
                  {classSubjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
                <div className="rounded-lg border border-slate-200 px-3 py-2 bg-slate-50 text-slate-600 flex items-center">
                  {currentSubject ? `${currentSubject.name} (${currentSubject.code})` : 'Subject sheet will load here'}
                </div>
              </>
            )}

            <select
              className="rounded-lg border border-slate-200 px-3 py-2 bg-white"
              value={filters.term}
              onChange={(e) => setFilters((current) => ({ ...current, term: e.target.value }))}
            >
              {TERM_OPTIONS.map((term) => (
                <option key={term} value={term}>
                  {term}
                </option>
              ))}
            </select>
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              value={filters.session_year}
              onChange={(e) => setFilters((current) => ({ ...current, session_year: e.target.value }))}
              placeholder="Session e.g. 2025/2026"
            />
            <div className={`rounded-lg border px-3 py-2 flex items-center transition-colors ${!loadingClassData && filters.class_id && classSubjects.length === 0 ? 'bg-amber-50 border-amber-200 text-amber-700 font-semibold' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
              {loadingClassData ? 'Refreshing class data...' : filters.class_id && classSubjects.length === 0 ? 'No subjects found! Add them in Classes page.' : `${classSubjects.length} class subjects loaded`}
            </div>
          </div>
        </>
      )}

      {error && <div className="text-sm text-rose-600">{error}</div>}
      {reportMsg && <div className="text-sm text-slate-600">{reportMsg}</div>}
      {loadingRefs && <div className="text-sm text-slate-500">Loading classes and students...</div>}
      {isStudent && !linkedStudentId && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your student account is not linked yet. Ask your school admin to connect your login to your student record.
        </div>
      )}

      {entryMode === 'student' && selectedStudent && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-100 shadow-card p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Student</div>
              <div className="mt-1 font-semibold text-slate-900">
                {selectedStudent.first_name} {selectedStudent.last_name}
              </div>
              <div className="text-sm text-slate-500">{selectedStudent.admission_no ?? 'No admission number'}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-card p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Subjects</div>
              <div className="mt-1 font-semibold text-slate-900">{sheetRows.length}</div>
              <div className="text-sm text-slate-500">Stacked on the left side</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-card p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Average</div>
              <div className="mt-1 font-semibold text-slate-900">{currentAverage.toFixed(2)}</div>
              <div className="text-sm text-slate-500">Auto-calculated from total scores</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-card p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">Class Position</div>
              <div className="mt-1 font-semibold text-slate-900">{summary?.class_position ?? '-'}</div>
              <div className="text-sm text-slate-500">Updates after results are saved</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-4">
            <div className="bg-white rounded-xl shadow-card border border-slate-100">
              <div className="p-4 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900">Subjects</h2>
                <p className="text-sm text-slate-500">
                  {isStudent ? 'Pick a subject from the left to view it.' : 'Pick a subject from the left to edit it.'}
                </p>
              </div>
              <div className="max-h-[640px] overflow-y-auto p-3 space-y-2">
                {sheetRows.map((row) => {
                  const isActive = row.subject_id === activeSubjectRow?.subject_id;
                  return (
                    <button
                      key={row.subject_id}
                      type="button"
                      onClick={() => setSelectedSubjectId(row.subject_id)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        isActive
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{row.subject_name}</div>
                          <div className="text-xs uppercase tracking-wide text-slate-500">{row.subject_code}</div>
                        </div>
                        <div className="text-xs font-semibold text-slate-700">
                          {computeTotal(row.ca_score, row.exam_score).toFixed(2)}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        Grade {scoreToGrade(computeTotal(row.ca_score, row.exam_score))} - Position{' '}
                        {row.position ?? '-'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-card border border-slate-100">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {activeSubjectRow?.subject_name ?? 'Select a subject'}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {isStudent
                      ? 'Your subject score details.'
                      : 'Edit CA and Exam for the subject selected from the left panel.'}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!isStudent && (
                    <button
                      type="button"
                      onClick={saveStudentResults}
                      disabled={savingStudent || sheetRows.length === 0}
                      className="rounded-lg bg-brand-600 text-white px-4 py-2 font-semibold hover:bg-brand-700 disabled:opacity-70"
                    >
                      {savingStudent ? 'Saving results...' : 'Save Student Results'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={downloadStudentPdf}
                    disabled={!(filters.student_id || selectedStudent?.id || linkedStudentId)}
                    className="rounded-lg border border-slate-300 bg-white text-slate-700 px-4 py-2 font-semibold hover:bg-slate-50 disabled:opacity-70"
                  >
                    Download PDF Result
                  </button>
                </div>
              </div>

              <div className="p-4">
                {activeSubjectRow ? (
                  isStudent ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs uppercase tracking-wide text-slate-500">Subject code</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900">{activeSubjectRow.subject_code}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs uppercase tracking-wide text-slate-500">Current total</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900">
                          {computeTotal(activeSubjectRow.ca_score, activeSubjectRow.exam_score).toFixed(2)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm flex items-center justify-between">
                        <span className="text-slate-500">CA</span>
                        <span className="font-semibold text-slate-900">{activeSubjectRow.ca_score || 0}</span>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm flex items-center justify-between">
                        <span className="text-slate-500">Exam</span>
                        <span className="font-semibold text-slate-900">{activeSubjectRow.exam_score || 0}</span>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm flex items-center justify-between">
                        <span className="text-slate-500">Grade</span>
                        <span className="font-semibold text-slate-900">
                          {scoreToGrade(computeTotal(activeSubjectRow.ca_score, activeSubjectRow.exam_score))}
                        </span>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm flex items-center justify-between">
                        <span className="text-slate-500">Position</span>
                        <span className="font-semibold text-slate-900">{activeSubjectRow.position ?? '-'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs uppercase tracking-wide text-slate-500">Subject code</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900">{activeSubjectRow.subject_code}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs uppercase tracking-wide text-slate-500">Current total</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900">
                          {computeTotal(activeSubjectRow.ca_score, activeSubjectRow.exam_score).toFixed(2)}
                        </div>
                      </div>
                      <label className="space-y-1">
                        <span className="block text-xs text-slate-500">CA score</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2"
                          value={activeSubjectRow.ca_score}
                          onChange={(e) =>
                            handleScoreChange(activeSubjectRow.subject_id, 'ca_score', e.target.value)
                          }
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="block text-xs text-slate-500">Exam score</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2"
                          value={activeSubjectRow.exam_score}
                          onChange={(e) =>
                            handleScoreChange(activeSubjectRow.subject_id, 'exam_score', e.target.value)
                          }
                        />
                      </label>
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm flex items-center justify-between">
                        <span className="text-slate-500">Total</span>
                        <span className="font-semibold text-slate-900">
                          {computeTotal(activeSubjectRow.ca_score, activeSubjectRow.exam_score).toFixed(2)}
                        </span>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm flex items-center justify-between">
                        <span className="text-slate-500">Grade</span>
                        <span className="font-semibold text-slate-900">
                          {scoreToGrade(computeTotal(activeSubjectRow.ca_score, activeSubjectRow.exam_score))}
                        </span>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm flex items-center justify-between md:col-span-2">
                        <span className="text-slate-500">Position</span>
                        <span className="font-semibold text-slate-900">{activeSubjectRow.position ?? '-'}</span>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                    {isStudent
                      ? 'No subject selected yet. Pick one from the left panel to view your score details.'
                      : 'No subject selected. Pick one from the left panel to start editing.'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-card border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Attendance</h2>
                <p className="text-sm text-slate-500">Your latest attendance records.</p>
              </div>
              <div className="text-sm text-slate-600">
                {loadingAttendance ? 'Loading attendance...' : `${attendanceRows.length} records`}
              </div>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ['Present', attendanceSummary.present],
                ['Absent', attendanceSummary.absent],
                ['Late', attendanceSummary.late],
                ['Excused', attendanceSummary.excused]
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
                </div>
              ))}
            </div>
            <div className="px-4 pb-4">
              <SimpleTable
                headers={['Date', 'Status', 'Remarks']}
                rows={attendanceRows.map((row) => [
                  row.attended_on,
                  row.status,
                  row.remarks ?? '-'
                ])}
              />
            </div>
          </div>
        </div>
      )}

      {entryMode === 'bulk' && filters.class_id && (
        <div className="bg-white rounded-xl shadow-card border border-slate-100 overflow-x-auto">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Bulk Class Entry</h2>
              <p className="text-sm text-slate-500">
                Choose one subject and enter CA and Exam scores for every student in the class.
              </p>
            </div>
            <button
              type="button"
              onClick={saveBulkResults}
              disabled={savingBulk || !filters.subject_id || bulkRows.length === 0}
              className="rounded-lg bg-brand-600 text-white px-4 py-2 font-semibold hover:bg-brand-700 disabled:opacity-70"
            >
              {savingBulk ? 'Saving bulk results...' : 'Save Bulk Results'}
            </button>
          </div>
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                {['Student', 'Admission No', 'CA', 'Exam', 'Total', 'Grade'].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {bulkRows.map((row) => (
                <tr key={row.student_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-800 font-medium">{row.student_name}</td>
                  <td className="px-4 py-3 text-slate-500">{row.admission_no}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className="w-24 rounded-lg border border-slate-200 px-3 py-2"
                      value={row.ca_score}
                      onChange={(e) => handleBulkScoreChange(row.student_id, 'ca_score', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className="w-24 rounded-lg border border-slate-200 px-3 py-2"
                      value={row.exam_score}
                      onChange={(e) => handleBulkScoreChange(row.student_id, 'exam_score', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-800">{computeTotal(row.ca_score, row.exam_score).toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-800">{scoreToGrade(computeTotal(row.ca_score, row.exam_score))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filters.subject_id && (
            <div className="p-4 text-sm text-amber-700">Select a subject to load the class-wide score sheet.</div>
          )}
          {filters.subject_id && bulkRows.length === 0 && (
            <div className="p-4 text-sm text-slate-500">No students were found in this class yet.</div>
          )}
        </div>
      )}

      {classStandings.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Class Standings</h2>
          <SimpleTable
            headers={['Position', 'Student', 'Subjects', 'Grand Total', 'Average']}
            rows={classStandings.map((item) => [
              item.class_position,
              item.student_name,
              item.subject_count,
              roundTwo(item.total_score).toFixed(2),
              item.average_score.toFixed(2)
            ])}
          />
        </div>
      )}
    </div>
  );
}
