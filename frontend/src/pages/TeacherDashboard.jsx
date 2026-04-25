import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/Card';
import Button from '../components/Button';
import { Link } from 'react-router-dom';

export default function TeacherDashboard() {
  const { profile } = useAuth();
  const [teacher, setTeacher] = useState(null);
  const [markingProgress, setMarkingProgress] = useState(null);
  const [classes, setClasses] = useState([]);
  const [pendingAttendance, setPendingAttendance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) load();
  }, [profile?.id]);

  const load = async () => {
    setLoading(true);
    try {
      // Fetch teacher info
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('*, classes(*)')
        .eq('profile_id', profile.id)
        .single();

      setTeacher(teacherData);

      if (teacherData?.class_id) {
        // Fetch assigned class
        const { data: classData } = await supabase
          .from('classes')
          .select('*')
          .eq('id', teacherData.class_id)
          .single();
        
        setClasses(classData ? [classData] : []);

        // Fetch marking progress
        const { data: progressData } = await supabase
          .from('teacher_marking_progress')
          .select('*')
          .eq('teacher_id', teacherData.id)
          .eq('term', getCurrentTerm())
          .eq('session_year', getCurrentYear())
          .single();

        setMarkingProgress(progressData);

        // Count pending attendance
        const { data: studentData } = await supabase
          .from('students')
          .select('id')
          .eq('class_id', teacherData.class_id)
          .eq('status', 'active');

        const { data: attendanceData } = await supabase
          .from('attendance_students')
          .select('id')
          .eq('class_id', teacherData.class_id)
          .eq('attended_on', new Date().toISOString().split('T')[0]);

        setPendingAttendance(
          (studentData?.length || 0) - (attendanceData?.length || 0)
        );
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentTerm = () => {
    const month = new Date().getMonth();
    if (month <= 3) return 'First Term';
    if (month <= 7) return 'Second Term';
    return 'Third Term';
  };

  const getCurrentYear = () => {
    const year = new Date().getFullYear();
    return `${year}/${year + 1}`;
  };

  return (
    <div className="space-y-6 p-4">
      {loading && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Loading your class dashboard...
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Welcome, {profile?.full_name}</h1>
        <p className="text-slate-500 mt-1">Teacher Dashboard</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {classes.length > 0 ? classes[0].name : 'N/A'}
            </div>
            <p className="text-sm text-slate-500 mt-2">Assigned Class</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-emerald-600">{pendingAttendance}</div>
            <p className="text-sm text-slate-500 mt-2">Pending Attendance</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-amber-600">
              {markingProgress?.classwork_progress || 0}%
            </div>
            <p className="text-sm text-slate-500 mt-2">Classwork Marks</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {markingProgress?.exam_progress || 0}%
            </div>
            <p className="text-sm text-slate-500 mt-2">Exam Marks</p>
          </div>
        </Card>
      </div>

      {/* AI Assistant Suggestions */}
      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">🤖 AI Teaching Assistant</h2>
        <div className="space-y-3">
          {pendingAttendance > 0 && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl">📍</div>
              <div>
                <p className="font-semibold text-slate-900">Mark Attendance</p>
                <p className="text-sm text-slate-600">
                  You have {pendingAttendance} students without attendance marked for today.
                </p>
                <Link
                  to="/attendance"
                  className="text-sm text-blue-600 font-semibold hover:text-blue-700 mt-2 inline-block"
                >
                  Mark Now →
                </Link>
              </div>
            </div>
          )}

          {markingProgress && markingProgress.comments_progress < 50 && (
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <div className="text-2xl">💬</div>
              <div>
                <p className="font-semibold text-slate-900">Complete Remarks</p>
                <p className="text-sm text-slate-600">
                  {100 - (markingProgress.comments_progress || 0)}% of remarks still need to be completed.
                </p>
              </div>
            </div>
          )}

          {markingProgress && markingProgress.behaviour_progress < 50 && (
            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl">⭐</div>
              <div>
                <p className="font-semibold text-slate-900">Behaviour Evaluation</p>
                <p className="text-sm text-slate-600">
                  Complete behaviour assessments for your class.
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Marking Progress */}
      {markingProgress && (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">📊 Marking Progress</h2>
          <div className="space-y-4">
            <ProgressBar label="Classwork Marks" progress={markingProgress.classwork_progress} />
            <ProgressBar label="Quiz Marks" progress={markingProgress.quiz_progress} />
            <ProgressBar label="Exam Marks" progress={markingProgress.exam_progress} />
            <ProgressBar label="Remarks Completed" progress={markingProgress.comments_progress} />
            <ProgressBar label="Behaviour Assessment" progress={markingProgress.behaviour_progress} />
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Link
            to="/attendance"
            className="p-3 bg-blue-50 rounded-lg text-center hover:bg-blue-100 transition"
          >
            <div className="text-2xl mb-2">📍</div>
            <p className="text-sm font-semibold text-slate-900">Attendance</p>
          </Link>

          <Link
            to="/results"
            className="p-3 bg-green-50 rounded-lg text-center hover:bg-green-100 transition"
          >
            <div className="text-2xl mb-2">📊</div>
            <p className="text-sm font-semibold text-slate-900">Results</p>
          </Link>

          <Link
            to="/classes"
            className="p-3 bg-purple-50 rounded-lg text-center hover:bg-purple-100 transition"
          >
            <div className="text-2xl mb-2">👥</div>
            <p className="text-sm font-semibold text-slate-900">Class</p>
          </Link>

          <Link
            to="/announcements"
            className="p-3 bg-orange-50 rounded-lg text-center hover:bg-orange-100 transition"
          >
            <div className="text-2xl mb-2">📢</div>
            <p className="text-sm font-semibold text-slate-900">Announcements</p>
          </Link>
        </div>
      </Card>
    </div>
  );
}

function ProgressBar({ label, progress }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm font-semibold text-slate-900">{progress}%</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
