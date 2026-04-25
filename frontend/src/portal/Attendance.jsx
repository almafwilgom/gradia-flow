import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/Card';
import Header from '../components/Header';
import StatusBadge from '../components/StatusBadge';

export default function PortalAttendance() {
  const { profile } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.student_id) {
      fetchAttendance();
    }
  }, [profile]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('attendance_students')
        .select('*')
        .eq('student_id', profile?.student_id)
        .order('attended_on', { ascending: false });

      if (error) throw error;
      setAttendance(data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const presentCount = attendance.filter(a => a.status === 'present').length;
  const absentCount = attendance.filter(a => a.status === 'absent').length;
  const lateCount = attendance.filter(a => a.status === 'late').length;
  const total = attendance.length;
  const percentage = total > 0 ? ((presentCount / total) * 100).toFixed(1) : 0;

  if (loading) {
    return (
      <div className="p-4">
        <Header title="Attendance" showBack />
        <div className="mt-4">Loading attendance...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-6">
      <Header title="Attendance" showBack />

      {/* Attendance Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 mb-6">
        <Card className="text-center bg-green-50">
          <p className="text-sm text-slate-600">Present</p>
          <p className="text-2xl font-bold text-green-600">{presentCount}</p>
        </Card>
        <Card className="text-center bg-red-50">
          <p className="text-sm text-slate-600">Absent</p>
          <p className="text-2xl font-bold text-red-600">{absentCount}</p>
        </Card>
        <Card className="text-center bg-yellow-50">
          <p className="text-sm text-slate-600">Late</p>
          <p className="text-2xl font-bold text-yellow-600">{lateCount}</p>
        </Card>
        <Card className="text-center bg-blue-50">
          <p className="text-sm text-slate-600">Percentage</p>
          <p className="text-2xl font-bold text-blue-600">{percentage}%</p>
        </Card>
      </div>

      {/* Attendance List */}
      <Card>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Attendance Records</h2>

        {attendance.length === 0 ? (
          <p className="text-slate-600 text-center py-8">No attendance records</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {attendance.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-3 border-b border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {new Date(record.attended_on).toLocaleDateString()}
                  </p>
                  {record.remarks && (
                    <p className="text-xs text-slate-600">{record.remarks}</p>
                  )}
                </div>
                <StatusBadge status={record.status} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Attendance Target */}
      <Card className="mt-6 bg-blue-50 border-l-4 border-blue-600">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-900">Attendance Target</p>
            <p className="text-sm text-slate-600">You need to maintain 85% attendance</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600">{percentage}%</p>
            {percentage >= 85 ? (
              <p className="text-xs text-green-600 font-medium">✓ On Track</p>
            ) : (
              <p className="text-xs text-red-600 font-medium">⚠ Below Target</p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}