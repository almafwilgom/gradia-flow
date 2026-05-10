import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../../lib/api';
const roles = [
  { value: 'school_admin', label: 'School Admin' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'parent', label: 'Parent' },
  { value: 'student', label: 'Student' }
];

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('school_admin');
  const [schoolName, setSchoolName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [schools, setSchools] = useState([]);
  const [schoolId, setSchoolId] = useState('');
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showVerificationSent, setShowVerificationSent] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const navigate = useNavigate();

  const normalizeSchoolCode = (value) => String(value || '').trim().toUpperCase();
  const apiBaseUrl = API_URL || 'http://localhost:4000';

  useEffect(() => {
    supabase
      .from('school_directory')
      .select('id,name,school_code')
      .then(({ data }) => setSchools(data ?? []));
  }, []);

  useEffect(() => {
    if (role === 'school_admin') {
      setSchoolId('');
      setSchoolCode('');
      setClasses([]);
      setClassId('');
      setStudentCode('');
      setTeacherCode('');
    }
    if (role !== 'student') {
      setStudentCode('');
    }
    if (role !== 'teacher') {
      setTeacherCode('');
    }
  }, [role]);

  useEffect(() => {
    const loadClasses = async () => {
      if (role !== 'teacher' || !schoolId) {
        setClasses([]);
        setClassId('');
        return;
      }

      try {
        const resp = await fetch(`${apiBaseUrl}/api/public/schools/${schoolId}/classes`);
        const json = await resp.json();
        if (!resp.ok) throw new Error(json.error || 'Unable to load classes');
        setClasses(json.classes ?? []);
      } catch (_err) {
        setClasses([]);
        setClassId('');
      }
    };

    loadClasses();
  }, [apiBaseUrl, role, schoolId]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (role === 'school_admin') {
        if (!schoolName) throw new Error('School name is required for admin signup');

        // Send custom confirmation email
        const emailRes = await fetch(`${apiBaseUrl}/api/public/auth/send-confirmation-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            full_name: fullName,
            school_name: schoolName
          })
        });

        if (!emailRes.ok) {
          const errorData = await emailRes.json();
          throw new Error(errorData.error || 'Failed to send confirmation email');
        }

        // Show verification sent message
        setVerificationEmail(email);
        setShowVerificationSent(true);
        setLoading(false);
        return;
      }

      // For non-admin roles (teacher, parent, student) - use existing flow
      if (role === 'teacher' && !classId) {
        throw new Error('Select the class you will manage');
      }
      if (role === 'teacher' && !teacherCode) {
        throw new Error('Enter your teacher code');
      }
      if (role === 'student' && !studentCode) {
        throw new Error('Enter your student code or admission number');
      }
      if (role !== 'school_admin' && !schoolId) {
        throw new Error('Select a school to join');
      }

      const fallbackPassword = role === 'student' ? studentCode : role === 'teacher' ? teacherCode : 'gradiaflow123';
      const resolvedPassword = password?.length >= 6 ? password : (fallbackPassword?.length >= 6 ? fallbackPassword : 'gradiaflow123');
      
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email,
        password: resolvedPassword,
        options: {
            data: {
              full_name: fullName,
              role,
              school_id: schoolId,
              class_id: role === 'teacher' ? classId : null,
              student_code: role === 'student' ? studentCode : null,
              teacher_code: role === 'teacher' ? teacherCode : null
            }
          }
        });
      if (signUpErr) throw signUpErr;
      if (!signUpData.user?.id) throw new Error('Unable to create user');

      if (signUpData.session) {
        navigate('/dashboard');
      } else {
        navigate('/login?verify=1');
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (showVerificationSent) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white shadow-card rounded-2xl w-full max-w-lg p-8 border border-slate-100">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-2xl font-semibold text-slate-900">Check Your Email</div>
            <p className="text-sm text-slate-500 mt-2">Verification email sent</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-slate-700 mb-2">
              We've sent a confirmation email to:
            </p>
            <p className="font-semibold text-slate-900">{verificationEmail}</p>
          </div>

          <div className="space-y-4 mb-6">
            <p className="text-sm text-slate-600">
              Click the link in the email to verify your address. The link expires in 24 hours.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800">
                <strong>Tip:</strong> Check your spam or promotions folder if you don't see it in your inbox.
              </p>
            </div>
          </div>

          <button
            onClick={() => window.location.href = 'https://gradiaflow.com/login'}
            className="w-full rounded-lg bg-brand-600 text-white py-2 font-semibold hover:bg-brand-700 transition mb-3"
          >
            Go to Login
          </button>

          <button
            onClick={() => setShowVerificationSent(false)}
            className="w-full rounded-lg border border-slate-200 text-slate-600 py-2 font-semibold hover:bg-slate-50 transition"
          >
            Back to Register
          </button>

          <p className="text-xs text-center text-slate-500 mt-4">
            Didn't receive the email?{' '}
            <button 
              onClick={() => setShowVerificationSent(false)}
              className="text-brand-600 hover:underline"
            >
              Try again
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white shadow-card rounded-2xl w-full max-w-lg p-8 border border-slate-100">
        <div className="text-center mb-6">
          <div className="text-2xl font-semibold text-slate-900">Create GradiaFlow Account</div>
          <p className="text-sm text-slate-500">Multi-tenant school management SaaS</p>
        </div>
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-600">Full Name</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:border-brand-400"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 bg-white"
              >
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {role === 'school_admin' ? (
            <div>
              <label className="text-sm text-slate-600">School Name</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:border-brand-400"
                placeholder="e.g., Sunrise Academy"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-600">School Code</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:border-brand-400"
                  placeholder="Enter the code given by your school"
                  value={schoolCode}
                  onChange={(e) => {
                    const nextCode = normalizeSchoolCode(e.target.value);
                    setSchoolCode(nextCode);
                    const matchedSchool = schools.find(
                      (school) => normalizeSchoolCode(school.school_code) === nextCode
                    );
                    setSchoolId(matchedSchool?.id ?? '');
                  }}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Students, teachers, and parents can use this code to find the right school quickly.
                </p>
              </div>
              <div>
                <label className="text-sm text-slate-600">Join School</label>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 bg-white"
                  value={schoolId}
                  onChange={(e) => {
                    const nextSchoolId = e.target.value;
                    setSchoolId(nextSchoolId);
                    const matchedSchool = schools.find((school) => school.id === nextSchoolId);
                    setSchoolCode(matchedSchool?.school_code ?? '');
                  }}
                  required
                >
                  <option value="">Select school</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.school_code ? `${s.name} (${s.school_code})` : s.name}
                    </option>
                  ))}
                  </select>
              </div>
              {role === 'teacher' && (
                <>
                  <div>
                    <label className="text-sm text-slate-600">Assigned Class</label>
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 bg-white"
                      value={classId}
                      onChange={(e) => setClassId(e.target.value)}
                      required
                      disabled={!schoolId || classes.length === 0}
                    >
                      <option value="">{schoolId ? 'Select class' : 'Choose school first'}</option>
                      {classes.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-slate-500">
                      Teachers can only manage students from their assigned class.
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">Teacher Code</label>
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:border-brand-400"
                      placeholder="Enter your teacher login code"
                      value={teacherCode}
                      onChange={(e) => setTeacherCode(e.target.value.trim())}
                      required
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Your teacher code is used to link your account and sign in.
                    </p>
                  </div>
                </>
              )}
              {role === 'student' && (
                <div>
                  <label className="text-sm text-slate-600">Student Code or Admission No</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:border-brand-400"
                    placeholder="Enter the code from your school"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value.trim())}
                    required
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    This links your login to your existing student record so results and attendance load automatically.
                  </p>
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-600">Email</label>
              <input
                type="email"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:border-brand-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {role === 'school_admin' ? (
              <div>
                <label className="text-sm text-slate-600">Password</label>
                <input
                  type="password"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:border-brand-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Login method</p>
                <p className="mt-2 text-sm text-slate-500">
                  Teachers and students do not need a separate password here. Your teacher/student code will be used to create and sign in to your account.
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  If you want to set a custom password later, you can do so from your settings after logging in.
                </p>
              </div>
            )}
          </div>
          {error && <div className="text-sm text-rose-600">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-600 text-white py-2 font-semibold hover:bg-brand-700 transition"
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <p className="mt-4 text-sm text-center text-slate-600">
          Already registered? <Link to="/login" className="text-brand-600">Login</Link>
        </p>
      </div>
    </div>
  );
}
                  Teachers and students do not need a separate password here. Your teacher/student code will be used to create and sign in to your account.
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  If you want to set a custom password later, you can do so from your settings after logging in.
                </p>
              </div>
            )}
          </div>
          {error && <div className="text-sm text-rose-600">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-600 text-white py-2 font-semibold hover:bg-brand-700 transition"
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <p className="mt-4 text-sm text-center text-slate-600">
          Already registered? <Link to="/login" className="text-brand-600">Login</Link>
        </p>
      </div>
    </div>
  );
}

