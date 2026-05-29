import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, X, School, UserCircle, Mail, Lock, ArrowRight, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../../lib/api';


const roles = [
  { value: 'school_admin', label: 'School Admin', description: 'Register a new school' },
  { value: 'teacher', label: 'Teacher', description: 'Join your school staff' },
  { value: 'student', label: 'Student', description: 'Access your learning portal' },
  { value: 'parent', label: 'Parent', description: 'Monitor child progress' }
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
  const [showPassword, setShowPassword] = useState(false);
  const [showVerificationSent, setShowVerificationSent] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationMessage, setVerificationMessage] = useState('');
  const navigate = useNavigate();

  const normalizeSchoolCode = (value) => String(value || '').trim().toUpperCase();
  const apiBaseUrl = API_URL;

  const sendSchoolAdminConfirmation = async () => {
    if (!schoolName) throw new Error('School name is required for admin signup');

    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          school_name: schoolName,
          role: 'school_admin',
          pending_registration: true
        },
        emailRedirectTo: `${window.location.origin}/auth/confirm-email`
      }
    });

    if (signUpErr) {
      throw signUpErr;
    }

    if (!signUpData.user?.id) {
      throw new Error('Unable to create user');
    }

    setVerificationEmail(email);
    setVerificationMessage('Check your inbox and open the confirmation link we sent.');
    setShowVerificationSent(true);
  };

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
        await sendSchoolAdminConfirmation();
        setLoading(false);
        return;
      }

      // For non-admin roles
      if (role === 'teacher' && !classId) throw new Error('Select the class you will manage');
      if (role === 'teacher' && !teacherCode) throw new Error('Enter your teacher code');
      if (role === 'student' && !studentCode) throw new Error('Enter your student code');
      if (role !== 'school_admin' && !schoolId) throw new Error('Select a school to join');

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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-12 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/20 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 blur-[120px] rounded-full"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] shadow-2xl p-10 z-10 text-center"
        >
          <div className="w-20 h-20 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/20">
            <CheckCircle2 className="text-white" size={40} />
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-4">Verification Sent</h2>
          <p className="text-white/70 mb-8 leading-relaxed">
            We've sent a magic link to <span className="text-white font-semibold">{verificationEmail}</span>. Please check your inbox and confirm your account.
          </p>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 text-left">
            <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              Pro Tip
            </h4>
            <p className="text-white/60 text-sm">
              If you don't see the email within 2 minutes, check your spam or junk folder. The link will expire in 24 hours.
            </p>
          </div>

          <button
            onClick={() => navigate('/login')}
            className="w-full py-4 bg-white text-slate-900 font-bold rounded-2xl hover:bg-slate-100 transition-all mb-4"
          >
            Return to Login
          </button>
          
          <button
            onClick={() => setShowVerificationSent(false)}
            className="text-white/60 hover:text-white transition-colors text-sm font-medium"
          >
            Didn't get the email? Try again
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/20 blur-[120px] rounded-full"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden z-10"
      >
        {/* Left Side - Visual/Marketing */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-indigo-600 to-brand-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/gradiaflow_auth_bg.png')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30">
                <School className="text-white" size={28} />
              </div>
              <span className="text-3xl font-bold text-white tracking-tight">GradiaFlow</span>
            </div>
            
            <h1 className="text-5xl font-bold text-white leading-tight mb-6">
              Start Your <span className="text-brand-200">Digital Journey</span>
            </h1>
            <p className="text-white/80 text-xl max-w-md font-light leading-relaxed">
              Join the future of education management. Simple setup, powerful features, AI-driven insights.
            </p>
          </div>

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-4 text-white/90">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <CheckCircle2 size={20} />
              </div>
              <span className="font-medium">Multi-tenant architecture</span>
            </div>
            <div className="flex items-center gap-4 text-white/90">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <CheckCircle2 size={20} />
              </div>
              <span className="font-medium">AI-powered performance analytics</span>
            </div>
            <div className="flex items-center gap-4 text-white/90">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <CheckCircle2 size={20} />
              </div>
              <span className="font-medium">Real-time collaboration</span>
            </div>
          </div>
        </div>

        {/* Right Side - Register Form */}
        <div className="p-8 lg:p-12 bg-white relative overflow-y-auto max-h-[90vh] lg:max-h-none">
          <div className="max-w-md mx-auto">
            <div className="text-center lg:text-left mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Create Account</h2>
              <p className="text-slate-500">Select your role and fill in your details</p>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 overflow-hidden"
                >
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3 text-red-700 text-sm">
                    <p className="font-medium">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto hover:bg-red-100 p-1 rounded-full">
                      <X size={16} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleRegister} className="space-y-5">
              {/* Role Selection */}
              <div className="grid grid-cols-2 gap-3">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      role === r.value 
                        ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20' 
                        : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <p className={`text-sm font-bold ${role === r.value ? 'text-brand-700' : 'text-slate-700'}`}>{r.label}</p>
                    <p className="text-[10px] text-slate-400 leading-tight mt-1">{r.description}</p>
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 ml-1">Full Name</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <UserCircle size={18} />
                    </div>
                    <input
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-slate-900"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {role === 'school_admin' ? (
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 ml-1">School Name</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <School size={18} />
                      </div>
                      <input
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-slate-900"
                        placeholder="Sunrise Global Academy"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">School Code</label>
                      <input
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-brand-500 transition-all text-slate-900"
                        placeholder="e.g. SCH123"
                        value={schoolCode}
                        onChange={(e) => {
                          const nextCode = normalizeSchoolCode(e.target.value);
                          setSchoolCode(nextCode);
                          const matchedSchool = schools.find(s => normalizeSchoolCode(s.school_code) === nextCode);
                          setSchoolId(matchedSchool?.id ?? '');
                        }}
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Select School</label>
                      <select
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-brand-500 transition-all text-slate-900 appearance-none cursor-pointer"
                        value={schoolId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setSchoolId(id);
                          const matched = schools.find(s => s.id === id);
                          setSchoolCode(matched?.school_code ?? '');
                        }}
                        required
                      >
                        <option value="">Choose your school</option>
                        {schools.map((s) => (
                          <option key={s.id} value={s.id}>{s.name} {s.school_code ? `(${s.school_code})` : ''}</option>
                        ))}
                      </select>
                    </div>

                    {role === 'teacher' && (
                      <div className="grid grid-cols-1 gap-3 pt-2">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Assigned Class</label>
                          <select
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-brand-500 transition-all text-slate-900 appearance-none cursor-pointer disabled:opacity-50"
                            value={classId}
                            onChange={(e) => setClassId(e.target.value)}
                            required
                            disabled={!schoolId || classes.length === 0}
                          >
                            <option value="">{schoolId ? 'Select class' : 'Choose school first'}</option>
                            {classes.map((item) => (
                              <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Teacher Code</label>
                          <input
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-brand-500 transition-all text-slate-900"
                            placeholder="Enter code"
                            value={teacherCode}
                            onChange={(e) => setTeacherCode(e.target.value.trim())}
                            required
                          />
                        </div>
                      </div>
                    )}

                    {role === 'student' && (
                      <div className="space-y-1.5 pt-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Admission/Student Code</label>
                        <input
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-brand-500 transition-all text-slate-900"
                          placeholder="e.g. ADM2024001"
                          value={studentCode}
                          onChange={(e) => setStudentCode(e.target.value.trim())}
                          required
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 ml-1">Email Address</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-slate-900"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {role === 'school_admin' ? (
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 ml-1">Password</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <Lock size={18} />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="w-full pl-11 pr-11 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-slate-900"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex gap-3">
                    <Sparkles className="text-indigo-600 flex-shrink-0 mt-0.5" size={18} />
                    <p className="text-[11px] text-indigo-700 leading-relaxed font-medium">
                      Teachers and students use their unique code as the initial login credential. You can set a custom password in your profile settings later.
                    </p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold rounded-2xl shadow-xl shadow-brand-200 transition-all flex items-center justify-center gap-2 group mt-4"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Create Account
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-slate-500 text-sm">
                Already have an account?{' '}
                <Link to="/login" className="font-bold text-brand-600 hover:text-brand-700 hover:underline">
                  Login here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

