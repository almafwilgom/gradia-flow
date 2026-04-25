import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';

function formatStudentName(student) {
  return `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim();
}

export default function Attendance() {
  const { profile } = useAuth();
  const assignedClassId =
    profile?.role === 'teacher' ? profile?.teachers?.class_id ?? profile?.teachers?.[0]?.class_id ?? '' : '';
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [savingKey, setSavingKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const recordMap = useMemo(() => {
    return new Map(records.map((record) => [record.student_id, record]));
  }, [records]);

  const loadStudents = async () => {
    if (!profile?.school_id) return;
    const query = supabase.from('students').select('id, first_name, last_name, class_id, stream_id, status');
    const scopedQuery =
      profile?.role === 'teacher'
        ? query.eq('class_id', assignedClassId)
        : query.eq('school_id', profile.school_id);

    const { data, error: studentError } = await scopedQuery.order('first_name', { ascending: true });

    if (studentError) throw studentError;
    setStudents(data ?? []);
  };

  const loadRecords = async (date) => {
    if (!profile?.school_id) return;
    const query = supabase.from('attendance_students').select('id, student_id, status, attended_on');
    const scopedQuery =
      profile?.role === 'teacher'
        ? query.eq('class_id', assignedClassId)
        : query.eq('school_id', profile.school_id);

    const { data, error: recordError } = await scopedQuery.eq('attended_on', date);

    if (recordError) throw recordError;
    setRecords(data ?? []);
  };

  const reload = async (date = selectedDate) => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([loadStudents(), loadRecords(date)]);
    } catch (err) {
      setError(err.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.school_id && (profile?.role !== 'teacher' || assignedClassId)) {
      reload(selectedDate);
    }
  }, [profile?.school_id, profile?.role, assignedClassId, selectedDate]);

  const markAttendance = async (studentId, status) => {
    if (!profile?.school_id) return;
    const key = `${studentId}:${status}`;
    setSavingKey(key);
    setError('');

    try {
      const student = students.find((item) => item.id === studentId);
      await supabase.from('attendance_students').upsert({
        school_id: profile.school_id,
        student_id: studentId,
        class_id: student?.class_id ?? assignedClassId ?? null,
        attended_on: selectedDate,
        status
      });
      await loadRecords(selectedDate);
    } catch (err) {
      setError(err.message || 'Failed to save attendance');
    } finally {
      setSavingKey('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Attendance</h1>
          <p className="text-sm text-slate-500">Track daily attendance</p>
        </div>
        <label className="text-sm text-slate-600">
          Date
          <input
            type="date"
            className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 bg-white"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </label>
      </div>

      {error && <div className="text-sm text-rose-600">{error}</div>}
      {loading && <div className="text-sm text-slate-500">Loading attendance...</div>}

      <div className="overflow-x-auto bg-white shadow-card border border-slate-100 rounded-xl">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Student
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {students.map((student) => {
              const current = recordMap.get(student.id);
              const isPresent = current?.status === 'present';
              const isAbsent = current?.status === 'absent';

              return (
                <tr key={student.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700 font-medium">{formatStudentName(student)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={savingKey === `${student.id}:present`}
                        onClick={() => markAttendance(student.id, 'present')}
                        className={`rounded-lg px-3 py-1.5 text-sm font-semibold border transition ${
                          isPresent
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                        }`}
                      >
                        Present
                      </button>
                      <button
                        type="button"
                        disabled={savingKey === `${student.id}:absent`}
                        onClick={() => markAttendance(student.id, 'absent')}
                        className={`rounded-lg px-3 py-1.5 text-sm font-semibold border transition ${
                          isAbsent
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                        }`}
                      >
                        Absent
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {selectedDate ? dayjs(selectedDate).format('DD MMM YYYY') : 'Today'}
                  </td>
                </tr>
              );
            })}
            {students.length === 0 && (
              <tr>
                <td colSpan="3" className="px-4 py-6 text-center text-slate-500">
                  No students found for this school.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
