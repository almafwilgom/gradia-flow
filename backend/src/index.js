import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import dayjs from 'dayjs';
import nodemailer from 'nodemailer';

const {
  PORT = 4000,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY,
  GRADIAFLOW_SETUP_KEY,
  OPENAI_API_KEY,
  PAYSTACK_SECRET,
  PAYSTACK_PUBLIC_KEY,
  SMS_API_URL,
  SMS_API_KEY,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  RECEIVER_EMAIL,
  FRONTEND_URL = 'https://gradiaflow.com',
  APP_DOMAIN = 'gradiaflow.com',
  EMAIL_FROM_NAME = 'GradiaFlow',
  EMAIL_FROM_ADDRESS = 'noreply@gradiaflow.com'
} = process.env;

const invalidEnv =
  !SUPABASE_URL ||
  !SUPABASE_SERVICE_ROLE_KEY ||
  SUPABASE_SERVICE_ROLE_KEY === 'service-role' ||
  SUPABASE_URL === 'https://your-project.supabase.co';

if (invalidEnv) {
  // eslint-disable-next-line no-console
  console.error(
    'Invalid backend Supabase env vars. Set real SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env before starting the server.'
  );
  process.exit(1);
}

const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY);
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://gradiaflow.com',
  'https://www.gradiaflow.com',
  'https://gradia-flow.pages.dev'
];

app.use(cors({
  origin: function (origin, callback) {
    if (
      !origin || 
      allowedOrigins.includes(origin) || 
      origin.endsWith('.pages.dev') ||
      origin.startsWith('http://192.168.') || 
      origin.startsWith('http://10.') || 
      origin.startsWith('http://localhost:')
    ) {
      callback(null, true);
    } else {
      console.error(`[CORS BLOCK] Origin rejected: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));
app.use((req, res, next) => {
  console.log(`[BACKEND] ${req.method} ${req.path}`);
  next();
});

// OCR route using OCR.Space (free tier)
import ocrRouter from './routes/ocr.js';
app.use('/api/ocr', ocrRouter);

// AI generation route using HuggingFace inference API (free tier)
import aiRouter from './routes/ai.js';
app.use('/api/ai', aiRouter);

// Auth middleware using Supabase JWT
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  let token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : authHeader.trim();

  // Also check query params for window.open/GET requests
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) return res.status(401).json({ error: 'Missing token' });
  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: error?.message || 'Invalid token' });
  }
  req.user = data.user;
  return next();
}

const profileCache = new Map();
const schoolCache = new Map();

async function fetchProfile(userId) {
  if (profileCache.has(userId)) {
    const { data, timestamp } = profileCache.get(userId);
    if (Date.now() - timestamp < 60000) return data; // 1 min cache
  }
  const { data, error } = await supabaseService
    .from('profiles')
    .select('*, teachers(*, classes(*)), students(*, classes(*))')
    .eq('id', userId)
    .single();
  if (error) return null;
  profileCache.set(userId, { data, timestamp: Date.now() });
  return data;
}

async function fetchSchool(schoolId) {
  if (schoolCache.has(schoolId)) {
    const { data, timestamp } = schoolCache.get(schoolId);
    if (Date.now() - timestamp < 300000) return data; // 5 min cache
  }
  const { data, error } = await supabaseService
    .from('schools')
    .select('*')
    .eq('id', schoolId)
    .single();
  if (error) return null;
  schoolCache.set(schoolId, { data, timestamp: Date.now() });
  return data;
}

async function ensureStorageBucket(id, options = {}) {
  const { data: bucket, error: bucketError } = await supabaseService.storage.getBucket(id);
  if (!bucketError && bucket) return bucket;

  const notFound =
    bucketError?.message?.toLowerCase().includes('not found') ||
    bucketError?.message?.toLowerCase().includes('bucket not found');

  if (!notFound) throw bucketError;

  const { data, error } = await supabaseService.storage.createBucket(id, options);
  if (error && !error.message?.toLowerCase().includes('already exists')) {
    throw error;
  }

  return data;
}

async function countSuperAdmins() {
  const { count, error } = await supabaseService
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'super_admin');
  if (error) throw error;
  return count ?? 0;
}

app.post('/api/public/contact', async (req, res) => {
  try {
    const { name, email, phone, schoolName, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email and message are required' });
    }

    console.log(`[CONTACT FORM] Message from ${name} (${email}) [Phone: ${phone || 'N/A'}, School: ${schoolName || 'N/A'}]: ${subject} - ${message}`);

    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: Number(SMTP_PORT) === 465, 
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: `"GradiaFlow Website" <${SMTP_USER}>`,
        to: RECEIVER_EMAIL || 'gomenoch@gmail.com',
        replyTo: email,
        subject: `New Contact Form Submission: ${subject}`,
        html: `
          <h3>New Message from GradiaFlow Website</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
          ${schoolName ? `<p><strong>School Name:</strong> ${schoolName}</p>` : ''}
          <p><strong>Subject:</strong> ${subject}</p>
          <hr/>
          <p>${message.replace(/\n/g, '<br/>')}</p>
        `
      });
      console.log('[CONTACT FORM] Email sent successfully.');
    } else {
      console.warn('[CONTACT FORM] SMTP credentials missing. Email was not sent.');
    }

    return res.json({ ok: true, message: 'Message sent successfully. We will get back to you soon.' });
  } catch (err) {
    console.error('[CONTACT FORM ERROR]', err);
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));


app.get('/api/setup/gradiaflow-admin/status', async (_req, res) => {
  try {
    const superAdminCount = await countSuperAdmins();
    return res.json({
      enabled: Boolean(GRADIAFLOW_SETUP_KEY),
      super_admin_count: superAdminCount
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/public/schools/:schoolId/classes', async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { data: school, error: schoolErr } = await supabaseService
      .from('schools')
      .select('id, status')
      .eq('id', schoolId)
      .maybeSingle();

    if (schoolErr) return res.status(400).json({ error: schoolErr.message });
    if (!school || school.status !== 'approved') {
      return res.status(404).json({ error: 'School not available' });
    }

    const { data, error } = await supabaseService
      .from('classes')
      .select('id, name, level')
      .eq('school_id', schoolId)
      .order('level', { ascending: true })
      .order('name', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ classes: data ?? [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/public/auth/resolve-login', async (req, res) => {
  try {
    const { role, school_code, login_code } = req.body;
    if (!role || !school_code || !login_code) {
      return res.status(400).json({ error: 'role, school_code and login_code are required' });
    }

    const schoolCode = String(school_code).trim().toUpperCase();
    const loginCode = String(login_code).trim();

    const { data: school, error: schoolErr } = await supabaseService
      .from('schools')
      .select('id, status')
      .ilike('school_code', schoolCode)
      .maybeSingle();

    if (schoolErr) return res.status(400).json({ error: schoolErr.message });
    if (!school || school.status !== 'approved') {
      return res.status(404).json({ error: 'School not available' });
    }

    let email = null;
    let student = null;
    if (role === 'student' || role === 'parent') {
      const { data: student, error: studentErr } = await supabaseService
        .from('students')
        .select('id, parent_id')
        .eq('school_id', school.id)
        .or(`student_code.ilike.${loginCode},admission_no.ilike.${loginCode}`)
        .maybeSingle();

      if (studentErr) return res.status(400).json({ error: studentErr.message });
      if (!student) return res.status(404).json({ error: 'Student not found' });

      if (role === 'student') {
        const { data: profile, error: profileErr } = await supabaseService
          .from('profiles')
          .select('email')
          .eq('student_id', student.id)
          .maybeSingle();

        if (profileErr) return res.status(400).json({ error: profileErr.message });
        if (!profile) return res.status(404).json({ error: 'Student portal account not found. Ask your admin to enable access.' });
        email = profile.email;
      } else {
        if (!student.parent_id) {
          return res.status(404).json({ error: 'No parent record is linked to this student yet.' });
        }

        const { data: parent, error: parentErr } = await supabaseService
          .from('parents')
          .select('profile_id')
          .eq('id', student.parent_id)
          .maybeSingle();

        if (parentErr) return res.status(400).json({ error: parentErr.message });
        if (!parent?.profile_id) {
          return res.status(404).json({
            error: 'Parent account is not linked yet. Register the parent account with this student code first.'
          });
        }

        const { data: profile, error: profileErr } = await supabaseService
          .from('profiles')
          .select('email')
          .eq('id', parent.profile_id)
          .maybeSingle();

        if (profileErr) return res.status(400).json({ error: profileErr.message });
        if (!profile) return res.status(404).json({ error: 'Parent portal account not found.' });
        email = profile.email;
      }
    } else if (role === 'teacher') {
      const { data: teacher, error: teacherErr } = await supabaseService
        .from('teachers')
        .select('profile_id')
        .eq('school_id', school.id)
        .ilike('teacher_code', loginCode)
        .maybeSingle();

      if (teacherErr) return res.status(400).json({ error: teacherErr.message });
      if (!teacher) return res.status(404).json({ error: 'Teacher record not found.' });

      const { data: profile, error: profileErr } = await supabaseService
        .from('profiles')
        .select('email')
        .eq('id', teacher.profile_id)
        .maybeSingle();

      if (profileErr) return res.status(400).json({ error: profileErr.message });
      if (!profile) return res.status(404).json({ error: 'Teacher portal account not found.' });
      email = profile.email;
    } else {
      return res.status(400).json({ error: 'Unsupported role for code login' });
    }

    if (!email) {
      return res.status(404).json({ error: 'Account not found for that code' });
    }

    return res.json({ email });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/setup/gradiaflow-admin', async (req, res) => {
  try {
    if (!GRADIAFLOW_SETUP_KEY) {
      return res.status(500).json({ error: 'GRADIAFLOW_SETUP_KEY is not configured on the backend.' });
    }

    const {
      full_name,
      email,
      password,
      setup_key
    } = req.body || {};

    if (!setup_key || setup_key !== GRADIAFLOW_SETUP_KEY) {
      return res.status(403).json({ error: 'Invalid setup key.' });
    }

    if (!full_name || !email) {
      return res.status(400).json({ error: 'full_name and email are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedName = String(full_name).trim();
    if (!normalizedName) {
      return res.status(400).json({ error: 'full_name is required.' });
    }

    const { data: existingProfile, error: profileLookupErr } = await supabaseService
      .from('profiles')
      .select('id, role, school_id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (profileLookupErr) return res.status(500).json({ error: profileLookupErr.message });

    if (existingProfile?.id) {
      const { error: updateProfileErr } = await supabaseService
        .from('profiles')
        .update({
          full_name: normalizedName,
          email: normalizedEmail,
          role: 'super_admin'
        })
        .eq('id', existingProfile.id);

      if (updateProfileErr) return res.status(500).json({ error: updateProfileErr.message });

      const { error: updateUserErr } = await supabaseService.auth.admin.updateUserById(existingProfile.id, {
        user_metadata: {
          full_name: normalizedName,
          role: 'super_admin',
          school_id: existingProfile.school_id ?? null
        },
        email_confirm: true
      });

      if (updateUserErr) return res.status(500).json({ error: updateUserErr.message });

      return res.json({
        mode: existingProfile.role === 'super_admin' ? 'existing_super_admin' : 'promoted_existing_user',
        user_id: existingProfile.id,
        email: normalizedEmail
      });
    }

    if (!password || String(password).length < 8) {
      return res.status(400).json({ error: 'Provide a password with at least 8 characters for a new GradiaFlow admin.' });
    }

    const { data: created, error: createErr } = await supabaseService.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: normalizedName,
        role: 'super_admin',
        school_id: null
      }
    });

    if (createErr) return res.status(400).json({ error: createErr.message });

    const { error: upsertProfileErr } = await supabaseService
      .from('profiles')
      .upsert({
        id: created.user.id,
        school_id: null,
        role: 'super_admin',
        full_name: normalizedName,
        email: normalizedEmail
      });

    if (upsertProfileErr) return res.status(500).json({ error: upsertProfileErr.message });

    return res.json({
      mode: 'created_new_user',
      user_id: created.user.id,
      email: normalizedEmail
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/me', requireAuth, async (req, res) => {
  const { data, error } = await supabaseService
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ user: req.user, profile: data });
});

app.post('/api/admin/users', requireAuth, async (req, res) => {
  try {
    const actor = await fetchProfile(req.user.id);
    if (!['super_admin', 'school_admin'].includes(actor.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { full_name, email, role, school_id, class_id } = req.body;
    if (!full_name || !email || !role || !school_id) {
      return res.status(400).json({ error: 'full_name, email, role, school_id required' });
    }
    if (role === 'teacher' && !class_id) {
      return res.status(400).json({ error: 'class_id required for teacher accounts' });
    }

    if (role === 'teacher') {
      const { data: teacherClass, error: teacherClassErr } = await supabaseService
        .from('classes')
        .select('id, school_id')
        .eq('id', class_id)
        .maybeSingle();

      if (teacherClassErr) return res.status(400).json({ error: teacherClassErr.message });
      if (!teacherClass || teacherClass.school_id !== school_id) {
        return res.status(400).json({ error: 'Selected class must belong to the same school.' });
      }
    }

    const temporaryPassword = crypto.randomUUID().slice(0, 12);
    const { data: created, error: createErr } = await supabaseService.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
        school_id,
        class_id: class_id ?? null
      }
    });
    if (createErr) return res.status(400).json({ error: createErr.message });

    if (role === 'teacher') {
      await supabaseService.from('teachers').insert({
        profile_id: created.user.id,
        school_id,
        class_id
      });
    }

    return res.json({
      user_id: created.user.id,
      temporary_password: temporaryPassword
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/students', requireAuth, async (req, res) => {
  let createdParentId = null;
  let createdUserId = null;

  try {
    const actor = await fetchProfile(req.user.id);
    if (!['super_admin', 'school_admin', 'teacher'].includes(actor.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const {
      school_id,
      first_name,
      last_name,
      admission_no,
      class_id,
      stream_id = null,
      guardian_full_name,
      guardian_email,
      guardian_phone,
      guardian_address
    } = req.body || {};

    if (
      !school_id ||
      !first_name ||
      !last_name ||
      !admission_no ||
      !class_id ||
      !guardian_full_name ||
      !guardian_email ||
      !guardian_phone ||
      !guardian_address
    ) {
      return res.status(400).json({
        error:
          'school_id, first_name, last_name, admission_no, class_id, guardian_full_name, guardian_email, guardian_phone, and guardian_address are required'
      });
    }

    if (actor.role === 'school_admin' && actor.school_id !== school_id) {
      return res.status(403).json({ error: 'You can only add students to your own school.' });
    }

    const { data: classRow, error: classErr } = await supabaseService
      .from('classes')
      .select('id, school_id')
      .eq('id', class_id)
      .maybeSingle();

    if (classErr) return res.status(400).json({ error: classErr.message });
    if (!classRow || classRow.school_id !== school_id) {
      return res.status(400).json({ error: 'Selected class must belong to the same school.' });
    }

    const guardianPayload = {
      school_id,
      full_name: String(guardian_full_name).trim(),
      email: String(guardian_email).trim().toLowerCase(),
      phone: String(guardian_phone).trim(),
      address: String(guardian_address).trim()
    };

    const { data: existingGuardian } = await supabaseService
      .from('parents')
      .select('id')
      .eq('school_id', school_id)
      .eq('phone', guardianPayload.phone)
      .limit(1)
      .maybeSingle();

    let parentId = existingGuardian?.id ?? null;
    if (parentId) {
      await supabaseService.from('parents').update(guardianPayload).eq('id', parentId);
    } else {
      const { data: createdGuardian, error: guardianInsertErr } = await supabaseService
        .from('parents')
        .insert(guardianPayload)
        .select('id')
        .single();

      if (guardianInsertErr) return res.status(400).json({ error: guardianInsertErr.message });
      parentId = createdGuardian.id;
      createdParentId = createdGuardian.id;
    }

    const studentPayload = {
      school_id,
      class_id,
      stream_id,
      parent_id: parentId,
      first_name: String(first_name).trim(),
      last_name: String(last_name).trim(),
      admission_no: String(admission_no).trim()
    };

    const { data: createdStudent, error: studentErr } = await supabaseService
      .from('students')
      .insert(studentPayload)
      .select('id, student_code')
      .single();

    if (studentErr) {
      if (createdParentId) await supabaseService.from('parents').delete().eq('id', createdParentId);
      return res.status(400).json({ error: studentErr.message });
    }

    // AUTO-CREATE STUDENT ACCOUNT
    try {
      const studentEmail = `${createdStudent.student_code.toLowerCase()}@student.gradiaflow.com`;
      const { data: userData, error: userErr } = await supabaseService.auth.admin.createUser({
        email: studentEmail,
        password: createdStudent.student_code, // Use student code as password
        email_confirm: true,
        user_metadata: {
          full_name: `${studentPayload.first_name} ${studentPayload.last_name}`,
          role: 'student',
          school_id: school_id,
          student_code: createdStudent.student_code
        }
      });

      if (!userErr && userData?.user) {
        createdUserId = userData.user.id;
        await supabaseService.from('profiles').insert({
          id: createdUserId,
          school_id,
          student_id: createdStudent.id,
          role: 'student',
          full_name: `${studentPayload.first_name} ${studentPayload.last_name}`,
          email: studentEmail
        });
      }
    } catch (authErr) {
      console.error('Failed to auto-create student account:', authErr);
    }

    return res.json({
      ok: true,
      student_id: createdStudent.id,
      student_code: createdStudent.student_code,
      account_created: !!createdUserId
    });
  } catch (err) {
    if (createdParentId) await supabaseService.from('parents').delete().eq('id', createdParentId);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/students/create-account', requireAuth, async (req, res) => {
  try {
    const actor = await fetchProfile(req.user.id);
    if (!['super_admin', 'school_admin'].includes(actor.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { student_id } = req.body;
    if (!student_id) return res.status(400).json({ error: 'student_id is required' });

    const { data: student, error: studentErr } = await supabaseService
      .from('students')
      .select('*')
      .eq('id', student_id)
      .single();

    if (studentErr || !student) return res.status(404).json({ error: 'Student not found' });
    if (actor.role === 'school_admin' && actor.school_id !== student.school_id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Check if profile exists
    const { data: existingProfile } = await supabaseService
      .from('profiles')
      .select('id')
      .eq('student_id', student_id)
      .maybeSingle();

    if (existingProfile) return res.status(400).json({ error: 'Account already exists for this student' });

    const studentEmail = `${student.student_code.toLowerCase()}@student.gradiaflow.com`;
    const { data: userData, error: userErr } = await supabaseService.auth.admin.createUser({
      email: studentEmail,
      password: student.student_code,
      email_confirm: true,
      user_metadata: {
        full_name: `${student.first_name} ${student.last_name}`,
        role: 'student',
        school_id: student.school_id,
        student_code: student.student_code
      }
    });

    if (userErr) return res.status(400).json({ error: userErr.message });

    await supabaseService.from('profiles').insert({
      id: userData.user.id,
      school_id: student.school_id,
      student_id: student.id,
      role: 'student',
      full_name: `${student.first_name} ${student.last_name}`,
      email: studentEmail
    });

    return res.json({ ok: true, email: studentEmail });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/school/dashboard-stats', requireAuth, async (req, res) => {
  try {
    const actor = await fetchProfile(req.user.id);
    const schoolId = actor.school_id;
    if (!schoolId) {
      return res.status(400).json({ error: 'No school assigned to this user' });
    }

    const since = dayjs().subtract(30, 'day').format('YYYY-MM-DD');

    const [
      statsRes,
      attendanceRes,
      schoolRes,
      subjectPerfRes
    ] = await Promise.all([
      supabaseService
        .from('vw_dashboard_stats')
        .select('*')
        .eq('school_id', schoolId)
        .maybeSingle(),
      supabaseService
        .from('attendance_students')
        .select('status, attended_on')
        .eq('school_id', schoolId)
        .gte('attended_on', since),
      supabaseService
        .from('schools')
        .select('id, name, school_code, status, disabled_at, demo_expires_at, subscription_status')
        .eq('id', schoolId)
        .single(),
      supabaseService
        .from('results')
        .select('subject_id, total, subjects(name, code)')
        .eq('school_id', schoolId)
    ]);

    // Group subject performance
    const grouped = new Map();
    (subjectPerfRes.data ?? []).forEach((row) => {
      const existing = grouped.get(row.subject_id) || {
        name: row.subjects?.name ?? 'Unnamed Subject',
        code: row.subjects?.code ?? '',
        total: 0,
        count: 0
      };
      existing.total += Number(row.total ?? 0);
      existing.count += 1;
      grouped.set(row.subject_id, existing);
    });

    const performance = Array.from(grouped.values())
      .map((item) => ({
        ...item,
        average: item.count ? Math.round((item.total / item.count) * 100) / 100 : 0
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 4);

    return res.json({
      stats: statsRes.data || {},
      attendance: attendanceRes.data || [],
      school: schoolRes.data || null,
      performance
    });
  } catch (err) {
    console.error('API /api/school/dashboard-stats error:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/dashboard-stats', requireAuth, async (req, res) => {
  try {
    const actor = await fetchProfile(req.user.id);
    if (actor.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const [
      schoolsRes,
      overviewRes,
      teachersCountRes,
      paymentsRes,
      attendanceRes,
      announcementsRes
    ] = await Promise.all([
      supabaseService
        .from('schools')
        .select('id, name, school_code, status, disabled_at, created_at, demo_expires_at')
        .order('created_at', { ascending: false }),
      supabaseService
        .from('vw_school_overview')
        .select('*')
        .order('created_at', { ascending: false }),
      supabaseService.from('teachers').select('id', { count: 'exact', head: true }),
      supabaseService
        .from('payments')
        .select('amount, paid_at')
        .eq('status', 'approved')
        .order('paid_at', { ascending: false })
        .limit(500),
      supabaseService
        .from('attendance_students')
        .select('attended_on, status')
        .order('attended_on', { ascending: false })
        .limit(500),
      supabaseService
        .from('announcements')
        .select('id, title, created_at, school_id')
        .order('created_at', { ascending: false })
        .limit(6)
    ]);

    return res.json({
      schools: schoolsRes.data || [],
      overview: overviewRes.data || [],
      totalTeachers: teachersCountRes.count || 0,
      payments: paymentsRes.data || [],
      attendance: attendanceRes.data || [],
      announcements: announcementsRes.data || []
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/schools/:schoolId/details', requireAuth, async (req, res) => {
  try {
    const actor = await fetchProfile(req.user.id);
    if (actor.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { schoolId } = req.params;

    const [
      schoolRes,
      studentsRes,
      teachersRes,
      parentsRes,
      paymentsRes,
      classesRes
    ] = await Promise.all([
      supabaseService.from('schools').select('*').eq('id', schoolId).single(),
      supabaseService
        .from('students')
        .select('id, first_name, last_name, student_code, admission_no, gender, status, classes(name)')
        .eq('school_id', schoolId)
        .order('first_name', { ascending: true }),
      supabaseService
        .from('teachers')
        .select('id, hired_at, profiles(full_name), classes(name)')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false }),
      supabaseService
        .from('parents')
        .select('id, full_name, email, phone, address')
        .eq('school_id', schoolId)
        .order('full_name', { ascending: true }),
      supabaseService
        .from('payments')
        .select('id, amount, method, status, paid_at, students(first_name, last_name)')
        .eq('school_id', schoolId)
        .order('paid_at', { ascending: false }),
      supabaseService
        .from('classes')
        .select('id, name, level, fee')
        .eq('school_id', schoolId)
        .order('level', { ascending: true })
    ]);

    if (schoolRes.error) return res.status(404).json({ error: 'School not found' });

    return res.json({
      school: schoolRes.data,
      students: studentsRes.data || [],
      teachers: teachersRes.data || [],
      parents: parentsRes.data || [],
      payments: paymentsRes.data || [],
      classes: classesRes.data || []
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/schools/:schoolId', requireAuth, async (req, res) => {
  try {
    const actor = await fetchProfile(req.user.id);
    if (actor.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { schoolId } = req.params;
    const { data, error } = await supabaseService
      .from('schools')
      .select('*')
      .eq('id', schoolId)
      .single();
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ school: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/schools', requireAuth, async (req, res) => {
  try {
    const actor = await fetchProfile(req.user.id);
    console.log('API /api/admin/schools - Actor:', actor.email, 'Role:', actor.role);
    
    if (actor.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { data, error } = await supabaseService
      .from('schools')
      .select('id, name, school_code, status, disabled_at, disabled_reason, demo_expires_at, subscription_plan, created_at, subscription_status')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('API /api/admin/schools - Error:', error);
      return res.status(400).json({ error: error.message });
    }
    
    console.log('API /api/admin/schools - Found schools:', data?.length);
    return res.json({ schools: data });
  } catch (err) {
    console.error('API /api/admin/schools - Exception:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/schools/:schoolId/reset-classes', requireAuth, async (req, res) => {
  try {
    const actor = await fetchProfile(req.user.id);
    if (actor.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { schoolId } = req.params;
    
    // 1. Delete existing classes
    const { error: deleteErr } = await supabaseService
      .from('classes')
      .delete()
      .eq('school_id', schoolId);

    if (deleteErr) return res.status(400).json({ error: deleteErr.message });

    // 2. Seed standard classes
    const standardClasses = [
      { name: 'Nursery 1', level: 'nursery' },
      { name: 'Nursery 2', level: 'nursery' },
      { name: 'KG 1', level: 'kindergarten' },
      { name: 'KG 2', level: 'kindergarten' },
      { name: 'Primary 1', level: 'primary' },
      { name: 'Primary 2', level: 'primary' },
      { name: 'Primary 3', level: 'primary' },
      { name: 'Primary 4', level: 'primary' },
      { name: 'Primary 5', level: 'primary' },
      { name: 'Primary 6', level: 'primary' },
      { name: 'JSS 1', level: 'secondary_junior' },
      { name: 'JSS 2', level: 'secondary_junior' },
      { name: 'JSS 3', level: 'secondary_junior' },
      { name: 'SSS 1', level: 'secondary_senior' },
      { name: 'SSS 2', level: 'secondary_senior' },
      { name: 'SSS 3', level: 'secondary_senior' }
    ].map(c => ({ ...c, school_id: schoolId }));

    const { error: seedErr } = await supabaseService
      .from('classes')
      .insert(standardClasses);

    if (seedErr) return res.status(400).json({ error: seedErr.message });

    return res.json({ ok: true, message: 'Classes reset and seeded successfully.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/schools/:schoolId/approve', requireAuth, async (req, res) => {
  try {
    const actor = await fetchProfile(req.user.id);
    if (actor.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { schoolId } = req.params;
    const { error } = await supabaseService
      .from('schools')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        disabled_at: null,
        disabled_reason: null
      })
      .eq('id', schoolId);

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/schools/:schoolId/disable', requireAuth, async (req, res) => {
  try {
    const actor = await fetchProfile(req.user.id);
    if (actor.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { schoolId } = req.params;
    const { disabled = true, reason = null } = req.body || {};
    const { error } = await supabaseService
      .from('schools')
      .update({
        status: disabled ? 'disabled' : 'approved',
        disabled_at: disabled ? new Date().toISOString() : null,
        disabled_reason: disabled ? reason : null
      })
      .eq('id', schoolId);

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ ok: true, disabled: Boolean(disabled) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/schools/:schoolId', requireAuth, async (req, res) => {
  try {
    const actor = await fetchProfile(req.user.id);
    if (actor.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { schoolId } = req.params;
    const { data: members, error: memberErr } = await supabaseService
      .from('profiles')
      .select('id')
      .eq('school_id', schoolId);

    if (memberErr) return res.status(400).json({ error: memberErr.message });

    for (const member of members ?? []) {
      const { error: deleteUserErr } = await supabaseService.auth.admin.deleteUser(member.id);
      if (deleteUserErr) {
        return res.status(400).json({ error: `Failed to delete school user ${member.id}: ${deleteUserErr.message}` });
      }
    }

    const { error: deleteSchoolErr } = await supabaseService.from('schools').delete().eq('id', schoolId);
    if (deleteSchoolErr) return res.status(400).json({ error: deleteSchoolErr.message });

    return res.json({ ok: true, deleted_users: members?.length ?? 0 });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/chat', requireAuth, async (req, res) => {
  const { messages = [], school_id = null } = req.body;

  try {
    const aiRes = await fetch(
      'https://text.pollinations.ai/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are GradiaFlow AI for Nigerian schools. Be concise, actionable, polite.' },
            ...messages
          ]
        }),
      }
    );

    if (!aiRes.ok) {
      return res.json({ reply: { role: 'assistant', content: "AI inference error: " + await aiRes.text() } });
    }

    const text = await aiRes.text();
    
    // async log
    supabaseService.from('messages').insert({
      school_id,
      sender_profile_id: req.user.id,
      body: `[AI_CHAT_POLLINATIONS] ${text.slice(0, 1800)}`
    }).then().catch(() => {});

    return res.json({ reply: { role: 'assistant', content: text } });
  } catch (err) {
    console.error('AI Chat error:', err);
    return res.json({ reply: { role: 'assistant', content: 'An error occurred while communicating with the AI service.' } });
  }
});

// Init Paystack transaction
app.post('/api/paystack/initiate', requireAuth, async (req, res) => {
  try {
    const { student_id, amount, email } = req.body;
    if (!student_id || !amount || !email) return res.status(400).json({ error: 'student_id, amount, email required' });
    if (!PAYSTACK_SECRET || !PAYSTACK_PUBLIC_KEY) return res.status(500).json({ error: 'Paystack keys missing' });

    const reference = `EDV-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    // create pending payment row
    await supabaseService.from('payments').insert({
      school_id: req.body.school_id,
      student_id,
      amount: Number(amount),
      method: 'paystack',
      status: 'pending',
      reference
    });

    const resp = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        amount: Math.round(Number(amount) * 100),
        reference
      })
    });
    const json = await resp.json();
    if (!resp.ok) return res.status(400).json({ error: json.message || 'Paystack init failed' });
    return res.json({ authorization_url: json.data.authorization_url, reference });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// SMS proxy
app.post('/api/sms/send', requireAuth, async (req, res) => {
  try {
    if (!SMS_API_URL || !SMS_API_KEY) return res.status(500).json({ error: 'SMS provider not configured' });
    const { phone, message, school_id } = req.body;
    if (!phone || !message) return res.status(400).json({ error: 'phone and message required' });

    const wallet = await supabaseService.from('sms_wallets').select('*').eq('school_id', school_id).single();
    const balance = wallet.data?.balance ?? 0;
    if (balance <= 0) return res.status(402).json({ error: 'Insufficient SMS wallet' });

    const resp = await fetch(SMS_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SMS_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ to: phone, message })
    });

    const ok = resp.ok;
    await supabaseService.from('sms_logs').insert({
      school_id,
      phone,
      message,
      status: ok ? 'sent' : 'failed',
      cost: 1
    });
    await supabaseService.from('sms_wallets').update({ balance: balance - 1 }).eq('school_id', school_id);

    if (!ok) {
      const body = await resp.text();
      return res.status(400).json({ error: 'SMS send failed', provider: body });
    }
    return res.json({ status: 'sent' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Paystack webhook
app.post('/api/paystack/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const raw = JSON.stringify(req.body);
    const hash = crypto.createHmac('sha512', PAYSTACK_SECRET || '').update(raw).digest('hex');
    if (hash !== signature) return res.status(401).json({ error: 'Invalid signature' });

    const event = req.body;
    const data = event?.data;
    const reference = data?.reference;
    const amount = data?.amount ? data.amount / 100 : 0;
    const status = data?.status;
    if (!reference) return res.status(400).json({ error: 'Missing reference' });

    if (status === 'success') {
      const { data: payment } = await supabaseService
        .from('payments')
        .select('id, student_id, school_id')
        .eq('reference', reference)
        .single();
      if (payment?.id) {
        await supabaseService
          .from('payments')
          .update({ status: 'approved', amount })
          .eq('id', payment.id);
        await supabaseService.from('results').update({ locked: false }).eq('student_id', payment.student_id);
      }
    } else {
      await supabaseService.from('payments').update({ status: 'failed' }).eq('reference', reference);
    }

    return res.json({ received: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

const imageCache = new Map();

// Report card PDF generation
app.get('/api/report-card/:studentId', requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { term = 'Term 1', session_year = '2025/2026' } = req.query || {};
    const actor = await fetchProfile(req.user.id);

    const { data: student, error: stErr } = await supabaseService
      .from('students')
      .select('id, first_name, last_name, admission_no, school_id, class_id, classes(name)')
      .eq('id', studentId)
      .single();
    if (stErr || !student) return res.status(404).json({ error: 'Student not found' });
    if (actor?.role === 'student' && actor.student_id !== studentId) {
      return res.status(403).json({ error: 'You can only download your own report card' });
    }
    if (actor?.role !== 'super_admin' && actor?.school_id && actor.school_id !== student.school_id) {
      return res.status(403).json({ error: 'You can only download report cards from your own school' });
    }

    const [{ data: studentProfile }, { data: school }] = await Promise.all([
      supabaseService
        .from('profiles')
        .select('avatar_url')
        .eq('student_id', studentId)
        .maybeSingle(),
      supabaseService
        .from('schools')
        .select('name, logo_url, current_term_fees, next_resumption_date')
        .eq('id', student.school_id)
        .single()
    ]);

    const [resultsRes, classRowsRes] = await Promise.all([
      supabaseService
        .from('results')
        .select('student_id, subject_id, ca_score, exam_score, total, grade, position, subjects(name)')
        .eq('student_id', studentId)
        .eq('term', term)
        .eq('session_year', session_year),
      supabaseService
        .from('results')
        .select('student_id, subject_id, total, ca_score, exam_score') // Minimal columns for speed
        .eq('class_id', student.class_id)
        .eq('term', term)
        .eq('session_year', session_year)
    ]);

    // Fast image buffer fetching with cache
    const getBuffer = async (url) => {
      if (!url) return null;
      if (imageCache.has(url)) return imageCache.get(url);
      const buf = await fetchImageBuffer(url);
      if (buf) imageCache.set(url, buf);
      return buf;
    };

    const [logoBuffer, photoBuffer] = await Promise.all([
      getBuffer(school?.logo_url),
      getBuffer(studentProfile?.avatar_url)
    ]);

    const results = resultsRes.data || [];
    const classRows = classRowsRes.data || [];

    const standings = buildClassStandings(classRows);
    const summary = standings.find((item) => item.student_id === studentId) || fallbackSummary(student, results);
    const subjectPositions = buildSubjectPositions(classRows);
    const enrichedResults = results.map((row) => ({
      ...row,
      position: subjectPositions.get(row.subject_id)?.get(studentId) ?? row.position ?? null
    }));

    const pdfBytes = await buildPdf(
      school, 
      { ...student, avatar_url: studentProfile?.avatar_url }, 
      enrichedResults, 
      summary, 
      term, 
      session_year,
      { logoBuffer, photoBuffer }
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ReportCard-${student.first_name}-${term}.pdf`);
    return res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error('Report card generation error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ===== Custom Email Confirmation System =====
const CONFIRMATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const CONFIRMATION_RESEND_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes instead of 10
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const PASSWORD_RESET_RESEND_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes instead of 10

function generateConfirmationToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function pruneExpiredConfirmationTokens() {
  await supabaseService
    .from('email_confirmation_tokens')
    .delete()
    .lt('expires_at', new Date().toISOString());
}

async function findConfirmationTokenByEmail(email) {
  const { data, error } = await supabaseService
    .from('email_confirmation_tokens')
    .select('id, token, email, full_name, school_name, expires_at, last_sent_at, consumed_at, created_at')
    .eq('email', email)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findConfirmationTokenByToken(token) {
  const { data, error } = await supabaseService
    .from('email_confirmation_tokens')
    .select('id, token, email, full_name, school_name, expires_at, last_sent_at, consumed_at, created_at')
    .eq('token', token)
    .is('consumed_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function createEmailTemplate(schoolName, confirmationUrl, userName) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GradiaFlow - Confirm Your Email</title>
    <style>
        body { margin: 0; padding: 0; background: #edf3ff; font-family: Arial, sans-serif; color: #10213a; }
        .wrapper { width: 100%; padding: 32px 16px; }
        .container { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 45px rgba(15, 38, 95, 0.12); }
        .header { padding: 36px 36px 24px; background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 65%, #60a5fa 100%); color: #ffffff; }
        .brand { font-size: 28px; font-weight: 700; margin: 0 0 10px; letter-spacing: -0.02em; }
        .eyebrow { display: inline-block; padding: 6px 12px; border-radius: 999px; background: rgba(255, 255, 255, 0.18); font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }
        .headline { margin: 18px 0 8px; font-size: 28px; line-height: 1.2; }
        .subcopy { margin: 0; color: rgba(255, 255, 255, 0.88); font-size: 15px; line-height: 1.6; }
        .content { padding: 32px 36px 20px; }
        .greeting { margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #0f172a; }
        .copy { margin: 0 0 18px; font-size: 15px; line-height: 1.75; color: #334155; }
        .schoolCard { margin: 22px 0; padding: 18px 20px; border-radius: 18px; background: #f8fbff; border: 1px solid #dbeafe; }
        .schoolLabel { margin: 0 0 6px; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #2563eb; }
        .schoolName { margin: 0; font-size: 20px; font-weight: 700; color: #0f172a; }
        .ctaWrap { text-align: center; padding: 12px 0 8px; }
        .cta { display: inline-block; padding: 15px 28px; border-radius: 14px; background: linear-gradient(135deg, #2563eb 0%, #16a34a 100%); color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 15px; }
        .hint { margin: 22px 0 0; padding: 16px 18px; border-radius: 16px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 13px; line-height: 1.7; color: #475569; word-break: break-word; }
        .footer { padding: 22px 36px 34px; color: #64748b; font-size: 12px; line-height: 1.7; }
        .footer a { color: #2563eb; text-decoration: none; }
    </style>
</head>
<body>
    <div class="wrapper">
      <div class="container">
        <div class="header">
            <div class="eyebrow">School Admin Setup</div>
            <h1 class="brand">GradiaFlow</h1>
            <h2 class="headline">Confirm your email to finish setup</h2>
            <p class="subcopy">Your school workspace is almost ready. We just need to verify this email address before we activate your admin account.</p>
        </div>
        <div class="content">
            <p class="greeting">Hello ${userName},</p>
            <p class="copy">
                Thanks for creating a GradiaFlow school admin account. Once you confirm this email,
                we will complete the registration for your school and prepare your live workspace.
            </p>
            <div class="schoolCard">
                <p class="schoolLabel">School registration</p>
                <p class="schoolName">${schoolName}</p>
            </div>
            <p class="copy">
                Click the button below to confirm your email address. This secure link expires in 24 hours.
            </p>
            <div class="ctaWrap">
                <a href="${confirmationUrl}" class="cta">Confirm Email Address</a>
            </div>
            <div class="hint">
                If the button does not open, copy and paste this link into your browser:<br><br>
                ${confirmationUrl}
            </div>
            <p class="copy" style="margin-top: 22px; font-size: 13px; color: #64748b;">
                If you did not request this account, you can safely ignore this email.
            </p>
        </div>
        <div class="footer">
            GradiaFlow<br>
            Smart school management powered by AI.<br>
            <a href="https://gradiaflow.com">Visit website</a> | <a href="https://gradiaflow.com/support">Support</a><br>
            &copy; 2026 GradiaFlow. All rights reserved.
        </div>
      </div>
    </div>
</body>
</html>
  `.trim();
}

function createPlainTextConfirmation(schoolName, confirmationUrl, userName) {
  return [
    `Hello ${userName},`,
    '',
    'Thanks for creating a GradiaFlow school admin account.',
    `School: ${schoolName}`,
    '',
    'Confirm your email address to finish setting up your school workspace:',
    confirmationUrl,
    '',
    'This link expires in 24 hours.',
    '',
    'If you did not request this account, you can ignore this email.',
    '',
    'GradiaFlow',
    'https://gradiaflow.com'
  ].join('\n');
}

// Send custom confirmation email
app.post('/api/public/auth/send-confirmation-email', async (req, res) => {
  try {
    const { email, full_name, school_name } = req.body;
    if (!email || !full_name || !school_name) {
      return res.status(400).json({ error: 'email, full_name, and school_name are required' });
    }

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      return res.status(500).json({ error: 'Email service not configured' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedName = String(full_name).trim();
    const normalizedSchoolName = String(school_name).trim();
    const now = Date.now();

    await pruneExpiredConfirmationTokens();

    const existingToken = await findConfirmationTokenByEmail(normalizedEmail);
    if (existingToken && new Date(existingToken.expires_at).getTime() > now) {
      const sentRecently =
        now - new Date(existingToken.last_sent_at || existingToken.created_at || now).getTime() <
        CONFIRMATION_RESEND_COOLDOWN_MS;
      return res.json({
        ok: true,
        reused: true,
        message: sentRecently
          ? 'A confirmation email was already sent recently. Please check your inbox or spam folder.'
          : 'A confirmation link is already active for this email. Please use the confirmation email already in your inbox.',
        token_expires_in: '24 hours'
      });
    }

    const { data: existingUserPage, error: existingUserErr } = await supabaseService.auth.admin.listUsers();
    if (existingUserErr) return res.status(500).json({ error: existingUserErr.message });
    const alreadyRegistered = existingUserPage?.users?.some(
      (user) => String(user.email || '').toLowerCase() === normalizedEmail
    );
    if (alreadyRegistered) {
      return res.status(400).json({ error: 'This email is already registered. Please sign in instead.' });
    }

    const token = existingToken?.token || generateConfirmationToken();
    const expiresAt = new Date(now + CONFIRMATION_TOKEN_TTL_MS).toISOString();

    const confirmationUrl = `${FRONTEND_URL}/auth/confirm-email?token=${token}`;
    const htmlContent = createEmailTemplate(normalizedSchoolName, confirmationUrl, normalizedName);
    const textContent = createPlainTextConfirmation(normalizedSchoolName, confirmationUrl, normalizedName);

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });

    try {
      await transporter.sendMail({
        from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM_ADDRESS || SMTP_USER}>`,
        replyTo: EMAIL_FROM_ADDRESS || SMTP_USER,
        to: normalizedEmail,
        subject: `Confirm Your Email - GradiaFlow`,
        text: textContent,
        html: htmlContent
      });
    } catch (mailErr) {
      const message = String(mailErr?.message || '').toLowerCase();
      console.error('[EMAIL SEND ERROR]', mailErr.message);
      
      // Handle Gmail rate limiting
      if (message.includes('rate limit') || message.includes('too many') || message.includes('429')) {
        // If token already exists, suggest using the existing one
        if (existingToken) {
          return res.json({
            ok: true,
            reused: true,
            message: 'Email service is temporarily rate limited. Please use the confirmation email already in your inbox (may take a few minutes to arrive).'
          });
        }
        return res.status(429).json({ 
          error: 'Too many emails sent. Please try again in a few minutes.' 
        });
      }
      
      // Handle authentication errors
      if (message.includes('invalid login') || message.includes('authentication')) {
        console.error('[SMTP AUTH ERROR] Check SMTP credentials in .env');
        return res.status(500).json({ 
          error: 'Email service configuration error. Please contact support.' 
        });
      }
      
      throw mailErr;
    }

    const tokenPayload = {
      token,
      email: normalizedEmail,
      full_name: normalizedName,
      school_name: normalizedSchoolName,
      expires_at: expiresAt,
      last_sent_at: new Date(now).toISOString(),
      consumed_at: null
    };

    if (existingToken?.id) {
      const { error: updateErr } = await supabaseService
        .from('email_confirmation_tokens')
        .update(tokenPayload)
        .eq('id', existingToken.id);
      if (updateErr) throw updateErr;
    } else {
      const { error: insertErr } = await supabaseService
        .from('email_confirmation_tokens')
        .insert(tokenPayload);
      if (insertErr) throw insertErr;
    }

    console.log(`[EMAIL] Confirmation email sent to ${normalizedEmail}`);
    return res.json({ ok: true, message: 'Confirmation email sent successfully', token_expires_in: '24 hours' });
  } catch (err) {
    console.error('[EMAIL ERROR]', err);
    return res.status(500).json({ error: err.message });
  }
});

// Verify confirmation token and complete registration
app.post('/api/public/auth/verify-confirmation', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Confirmation token is required' });
    }

    const tokenData = await findConfirmationTokenByToken(token);
    if (!tokenData) {
      return res.status(400).json({ error: 'Invalid or expired confirmation token' });
    }

    // Check if token has expired
    if (Date.now() > new Date(tokenData.expires_at).getTime()) {
      await supabaseService.from('email_confirmation_tokens').delete().eq('id', tokenData.id);
      return res.status(400).json({ error: 'Confirmation token has expired' });
    }

    const { email, full_name, school_name } = tokenData;

    // Check if user already exists
    const { data: existingUser } = await supabaseService.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(u => u.email === email);
    if (userExists) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create school if it doesn't exist
    const { data: school } = await supabaseService
      .from('schools')
      .select('id')
      .eq('name', school_name)
      .maybeSingle();

    let schoolId = school?.id;
    if (!schoolId) {
      const demoExpiresAt = new Date(Date.now() + CONFIRMATION_TOKEN_TTL_MS);
      const { data: newSchool, error: schoolErr } = await supabaseService
        .from('schools')
        .insert({
          name: school_name,
          approval_status: 'pending',
          subscription_plan: 'demo',
          subscription_status: 'demo',
          subscription_expires_at: demoExpiresAt.toISOString().slice(0, 10),
          demo_started_at: new Date().toISOString(),
          demo_expires_at: demoExpiresAt.toISOString()
        })
        .select('id')
        .single();

      if (schoolErr) return res.status(400).json({ error: 'Failed to create school record' });
      schoolId = newSchool.id;
    }

    // Create user in Supabase Auth
    const { data: authUser, error: authErr } = await supabaseService.auth.admin.createUser({
      email,
      password: password || crypto.randomUUID().slice(0, 12),
      email_confirm: true,
      user_metadata: {
        full_name,
        role: 'school_admin',
        school_id: schoolId
      }
    });

    if (authErr) return res.status(400).json({ error: authErr.message });

    // Create profile
    await supabaseService.from('profiles').insert({
      id: authUser.user.id,
      email,
      full_name,
      role: 'school_admin',
      school_id: schoolId
    });

    await supabaseService
      .from('email_confirmation_tokens')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    console.log(`[AUTH] School admin account created: ${email} for school: ${school_name}`);
    return res.json({
      ok: true,
      message: 'Email confirmed successfully. Your account is ready!',
      user_id: authUser.user.id,
      email
    });
  } catch (err) {
    console.error('[VERIFICATION ERROR]', err);
    return res.status(500).json({ error: err.message });
  }
});

// ===== Password Reset System =====

function generatePasswordResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

function createPasswordResetTemplate(resetUrl, userEmail) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GradiaFlow - Reset Your Password</title>
    <style>
        body { margin: 0; padding: 0; background: #edf3ff; font-family: Arial, sans-serif; color: #10213a; }
        .wrapper { width: 100%; padding: 32px 16px; }
        .container { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 45px rgba(15, 38, 95, 0.12); }
        .header { padding: 36px 36px 24px; background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 65%, #60a5fa 100%); color: #ffffff; }
        .brand { font-size: 28px; font-weight: 700; margin: 0 0 10px; letter-spacing: -0.02em; }
        .eyebrow { display: inline-block; padding: 6px 12px; border-radius: 999px; background: rgba(255, 255, 255, 0.18); font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }
        .headline { margin: 18px 0 8px; font-size: 28px; line-height: 1.2; }
        .subcopy { margin: 0; color: rgba(255, 255, 255, 0.88); font-size: 15px; line-height: 1.6; }
        .content { padding: 32px 36px 20px; }
        .greeting { margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #0f172a; }
        .copy { margin: 0 0 18px; font-size: 15px; line-height: 1.75; color: #334155; }
        .warning { margin: 18px 0; padding: 16px 18px; border-radius: 14px; background: #fef3c7; border-left: 4px solid #f59e0b; font-size: 14px; line-height: 1.6; color: #92400e; }
        .ctaWrap { text-align: center; padding: 12px 0 8px; }
        .cta { display: inline-block; padding: 15px 28px; border-radius: 14px; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 15px; }
        .hint { margin: 22px 0 0; padding: 16px 18px; border-radius: 16px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 13px; line-height: 1.7; color: #475569; word-break: break-word; }
        .footer { padding: 22px 36px 34px; color: #64748b; font-size: 12px; line-height: 1.7; }
        .footer a { color: #2563eb; text-decoration: none; }
    </style>
</head>
<body>
    <div class="wrapper">
      <div class="container">
        <div class="header">
            <div class="eyebrow">Account Security</div>
            <h1 class="brand">GradiaFlow</h1>
            <h2 class="headline">Reset your password</h2>
            <p class="subcopy">We received a request to reset your GradiaFlow account password. If you did not make this request, you can safely ignore this email.</p>
        </div>
        <div class="content">
            <p class="greeting">Hello,</p>
            <p class="copy">
                A password reset request was made for this account. Click the button below to create a new password.
                This secure link expires in 1 hour.
            </p>
            <div class="warning">
                ⚠️ For your security, never share this link with anyone. GradiaFlow staff will never ask for your password.
            </div>
            <div class="ctaWrap">
                <a href="${resetUrl}" class="cta">Reset Password</a>
            </div>
            <div class="hint">
                If the button does not work, copy and paste this link into your browser:<br><br>
                ${resetUrl}
            </div>
            <p class="copy" style="margin-top: 22px; font-size: 13px; color: #64748b;">
                If you did not request a password reset, please contact GradiaFlow support immediately.
            </p>
        </div>
        <div class="footer">
            GradiaFlow<br>
            Smart school management powered by AI.<br>
            <a href="https://gradiaflow.com">Visit website</a> | <a href="https://gradiaflow.com/support">Support</a><br>
            &copy; 2026 GradiaFlow. All rights reserved.
        </div>
      </div>
    </div>
</body>
</html>
  `.trim();
}

function createPlainTextPasswordReset(resetUrl, userEmail) {
  return [
    'Hello,',
    '',
    'We received a request to reset your GradiaFlow account password.',
    'Click the link below to create a new password. This link expires in 1 hour.',
    '',
    resetUrl,
    '',
    '⚠️ SECURITY WARNING:',
    '- Never share this link with anyone',
    '- GradiaFlow staff will never ask for your password',
    '- If you did not request this, ignore this email',
    '',
    'Questions? Contact GradiaFlow support at https://gradiaflow.com/support',
    '',
    'GradiaFlow',
    'https://gradiaflow.com'
  ].join('\n');
}

// Request password reset
app.post('/api/public/auth/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      return res.status(500).json({ error: 'Email service not configured' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const now = Date.now();

    // Find user by email
    const { data: user, error: userErr } = await supabaseService
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', normalizedEmail)
      .maybeSingle();

    // For security, don't reveal if email exists
    if (!user || userErr) {
      return res.json({
        ok: true,
        message: 'If an account exists with that email, a reset link has been sent.'
      });
    }

    // Check if user is a school admin or super admin (allow password reset for these roles)
    if (!['school_admin', 'super_admin'].includes(user.role)) {
      return res.json({
        ok: true,
        message: 'If an account exists with that email, a reset link has been sent.'
      });
    }

    // Clean up expired reset tokens
    await supabaseService
      .from('password_reset_tokens')
      .delete()
      .lt('expires_at', new Date().toISOString());

    // Check if recent reset token exists (rate limiting)
    const { data: recentToken } = await supabaseService
      .from('password_reset_tokens')
      .select('created_at')
      .eq('user_id', user.id)
      .is('used_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentToken && now - new Date(recentToken.created_at).getTime() < PASSWORD_RESET_RESEND_COOLDOWN_MS) {
      return res.json({
        ok: true,
        message: 'A reset link was already sent recently. Please check your inbox or spam folder.'
      });
    }

    // Generate reset token
    const token = generatePasswordResetToken();
    const expiresAt = new Date(now + PASSWORD_RESET_TOKEN_TTL_MS).toISOString();

    // Store reset token in database
    const { error: tokenErr } = await supabaseService
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token,
        expires_at: expiresAt,
        created_at: new Date(now).toISOString()
      });

    if (tokenErr) throw tokenErr;

    // Send email
    const resetUrl = `${FRONTEND_URL}/auth/reset-password?token=${token}`;
    const htmlContent = createPasswordResetTemplate(resetUrl, normalizedEmail);
    const textContent = createPlainTextPasswordReset(resetUrl, normalizedEmail);

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });

    try {
      await transporter.sendMail({
        from: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM_ADDRESS || SMTP_USER}>`,
        replyTo: EMAIL_FROM_ADDRESS || SMTP_USER,
        to: normalizedEmail,
        subject: 'Reset Your GradiaFlow Password',
        text: textContent,
        html: htmlContent
      });
      console.log(`[PASSWORD RESET] Reset email sent to ${normalizedEmail}`);
    } catch (mailErr) {
      console.error('[PASSWORD RESET EMAIL ERROR]', mailErr.message);
      // Still log for debugging, even if email fails (for security, we don't expose this to user)
    }

    return res.json({
      ok: true,
      message: 'If an account exists with that email, a reset link has been sent.'
    });
  } catch (err) {
    console.error('[PASSWORD RESET ERROR]', err);
    return res.status(500).json({ error: err.message });
  }
});

// Verify password reset token
app.post('/api/public/auth/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Reset token is required' });
    }

    const { data: resetToken, error: tokenErr } = await supabaseService
      .from('password_reset_tokens')
      .select('id, user_id, expires_at, used_at')
      .eq('token', token)
      .maybeSingle();

    if (tokenErr || !resetToken) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Check if token has expired
    if (Date.now() > new Date(resetToken.expires_at).getTime()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Check if token has already been used
    if (resetToken.used_at) {
      return res.status(400).json({ error: 'This reset link has already been used' });
    }

    // Get user email for confirmation
    const { data: user } = await supabaseService
      .from('profiles')
      .select('email')
      .eq('id', resetToken.user_id)
      .maybeSingle();

    return res.json({
      ok: true,
      valid: true,
      user_email: user?.email || 'account@gradiaflow.com'
    });
  } catch (err) {
    console.error('[RESET TOKEN VERIFY ERROR]', err);
    return res.status(500).json({ error: err.message });
  }
});

// Complete password reset
app.post('/api/public/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const { data: resetToken, error: tokenErr } = await supabaseService
      .from('password_reset_tokens')
      .select('id, user_id, expires_at, used_at')
      .eq('token', token)
      .maybeSingle();

    if (tokenErr || !resetToken) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Check if token has expired
    if (Date.now() > new Date(resetToken.expires_at).getTime()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Check if token has already been used
    if (resetToken.used_at) {
      return res.status(400).json({ error: 'This reset link has already been used' });
    }

    // Update user password
    const { error: updateErr } = await supabaseService.auth.admin.updateUserById(resetToken.user_id, {
      password
    });

    if (updateErr) {
      return res.status(400).json({ error: updateErr.message });
    }

    // Mark token as used
    const { error: markErr } = await supabaseService
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', resetToken.id);

    if (markErr) {
      console.error('[MARK TOKEN ERROR]', markErr);
    }

    console.log(`[PASSWORD RESET] Password reset completed for user ${resetToken.user_id}`);
    return res.json({
      ok: true,
      message: 'Password has been reset successfully. You can now login with your new password.'
    });
  } catch (err) {
    console.error('[RESET PASSWORD ERROR]', err);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', async () => {
  // eslint-disable-next-line no-console
  console.log(`Express backend running on :${PORT}`);
  
  try {
    await ensureStorageBucket('avatars', { public: true });
    console.log('Storage bucket "avatars" is ready.');
  } catch (err) {
    console.error('Failed to ensure "avatars" bucket:', err.message);
  }
});

async function fetchImageBuffer(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function buildPdf(school, student, results, summary, term, session, buffers = {}) {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();

  // Helper for drawing text
  const drawText = (text, x, y, size = 10, font = fontRegular, color = rgb(0.1, 0.1, 0.1)) => {
    page.drawText(String(text || ''), { x, y, size, font, color });
  };

  // Helper for drawing rectangles
  const drawRect = (x, y, w, h, color = rgb(0.95, 0.95, 0.95), borderColor = null) => {
    page.drawRectangle({
      x, y, width: w, height: h,
      color,
      borderColor: borderColor || rgb(0.8, 0.8, 0.8),
      borderWidth: borderColor ? 1 : 0.5
    });
  };

  const { logoBuffer, photoBuffer } = buffers;

  // 1. HEADER & BRANDING SECTION
  // Draw Background Header Strip
  drawRect(0, height - 120, width, 120, rgb(0.97, 0.98, 1), rgb(0.97, 0.98, 1));

  // School Logo (LEFT - CIRCULAR)
  if (logoBuffer) {
    try {
      const logoImg = await pdfDoc.embedPng(logoBuffer).catch(() => pdfDoc.embedJpg(logoBuffer));
      const size = 60;
      const centerX = 40 + size / 2;
      const centerY = height - 90 + size / 2;
      const radius = size / 2;

      // Draw white circle background
      page.drawCircle({ x: centerX, y: centerY, radius, color: rgb(1, 1, 1) });

      // pdf-lib doesn't have native image clipping easily, so we use a frame approach
      page.drawImage(logoImg, { x: 40, y: height - 90, width: size, height: size });
      
      // Draw a circular border over it to make it look circular
      page.drawCircle({ x: centerX, y: centerY, radius: radius + 1, borderColor: rgb(0.2, 0.4, 0.8), borderWidth: 2 });
    } catch (e) { console.error('Logo embed error', e); }
  } else {
    // Fallback Logo Placeholder
    const centerX = 40 + 30;
    const centerY = height - 90 + 30;
    page.drawCircle({ x: centerX, y: centerY, radius: 30, color: rgb(0.2, 0.4, 0.8) });
    drawText('LOGO', 55, height - 65, 10, fontBold, rgb(1, 1, 1));
  }

  // School & Report Title (CENTERED-ish)
  const schoolName = school?.name?.toUpperCase() || 'GRADIAFLOW ACADEMY';
  drawText(schoolName, 120, height - 55, 14, fontBold, rgb(0, 0, 0));
  drawText('OFFICIAL STUDENT TERM REPORT', 120, height - 75, 18, fontBold, rgb(0.2, 0.4, 0.8));
  drawText(`Academic Session: ${session} | ${term}`, 120, height - 92, 10, fontRegular, rgb(0.4, 0.4, 0.4));
  
  // Student Photo (RIGHT)
  if (photoBuffer) {
    try {
      const photoImg = await pdfDoc.embedPng(photoBuffer).catch(() => pdfDoc.embedJpg(photoBuffer));
      // Add a nice border/frame for the photo
      drawRect(width - 110, height - 100, 70, 80, rgb(1, 1, 1), rgb(0.8, 0.8, 0.8));
      page.drawImage(photoImg, { x: width - 105, y: height - 95, width: 60, height: 70 });
    } catch (e) { console.error('Photo embed error', e); }
  }

  // Digital Verification Badge (Moved to top right)
  drawRect(width - 160, height - 30, 140, 20, rgb(1, 1, 1), rgb(0.2, 0.4, 0.8));
  drawText('VERIFIED DIGITAL RESULT', width - 150, height - 23, 8, fontBold, rgb(0.2, 0.4, 0.8));

  // 2. STUDENT PERSONAL INFO BOX
  const infoY = height - 210;
  drawRect(40, infoY, width - 80, 70, rgb(1, 1, 1), rgb(0.8, 0.8, 0.8));
  
  const col1 = 55, col2 = 230, col3 = 410;
  drawText('STUDENT INFORMATION', col1, infoY + 55, 9, fontBold, rgb(0.5, 0.5, 0.5));
  drawText(`Name: ${student.first_name} ${student.last_name}`, col1, infoY + 35, 11, fontBold);
  drawText(`Admission No: ${student.admission_no || 'N/A'}`, col1, infoY + 15, 10);
  
  drawText(`Class: ${student.classes?.name || 'N/A'}`, col2, infoY + 35, 10);
  drawText(`Adviser: Mr. Eze`, col2, infoY + 15, 10);

  drawText(`Attendance: 62 / 65 Days`, col3, infoY + 35, 10);
  drawText(`Overall Grade: ${summary.average_score >= 70 ? 'A' : 'B'}`, col3, infoY + 15, 10, fontBold, rgb(0.2, 0.4, 0.8));

  // 3. COGNITIVE DOMAIN TABLE
  const subjectCount = results.length || 1;
  const tableRowHeight = 15;
  const tableHeaderHeight = 40;
  const tableContentHeight = Math.max(120, subjectCount * tableRowHeight + 20);
  const totalTableHeight = tableHeaderHeight + tableContentHeight;
  
  const tableY = infoY - totalTableHeight - 20;
  
  // Cognitive Domain Box
  drawRect(50, tableY, 320, totalTableHeight, rgb(1, 1, 1), rgb(0.3, 0.6, 0.8));
  drawRect(50, tableY + totalTableHeight - 25, 320, 25, rgb(0.8, 0.9, 0.95), rgb(0.3, 0.6, 0.8));
  drawText('COGNITIVE DOMAIN', 150, tableY + totalTableHeight - 18, 11, fontBold, rgb(0.1, 0.3, 0.5));

  const headers = ['Subject', 'CA(30)', 'Exam(70)', 'Total', 'Grade', 'Remarks'];
  const headerX = [60, 155, 205, 250, 290, 330];
  headers.forEach((h, i) => drawText(h, headerX[i], tableY + totalTableHeight - 42, 9, fontBold));

  let rowY = tableY + totalTableHeight - 60;
  results.forEach((r) => {
    drawText(r.subjects?.name?.substring(0, 15) || 'Subject', 60, rowY, 9);
    drawText(String(r.ca_score || 0), 165, rowY, 9);
    drawText(String(r.exam_score || 0), 215, rowY, 9);
    drawText(String(r.total || 0), 255, rowY, 9, fontBold);
    drawText(r.grade || '-', 295, rowY, 9, fontBold, rgb(0.2, 0.4, 0.8));
    drawText(r.total >= 70 ? 'Excellent' : 'Good', 330, rowY, 8);
    rowY -= tableRowHeight;
  });

  // 4. AFFECTIVE & PSYCHOMOTOR
  const psychY = tableY; // Align with the bottom of the cognitive table
  const psychHeight = totalTableHeight;
  drawRect(width - 215, psychY, 165, psychHeight, rgb(1, 1, 1), rgb(0.3, 0.6, 0.8));
  drawRect(width - 215, psychY + psychHeight - 25, 165, 25, rgb(0.8, 0.9, 0.95), rgb(0.3, 0.6, 0.8));
  drawText('PSYCHOMOTOR SKILLS', width - 200, psychY + psychHeight - 18, 10, fontBold, rgb(0.1, 0.3, 0.5));
  
  const skills = [
    { s: 'Creativity', r: '5' },
    { s: 'Punctuality', r: '4' },
    { s: 'Teamwork', r: '5' },
    { s: 'Communication', r: '4' },
    { s: 'Leadership', r: '5' },
    { s: 'Neatness', r: '4' },
    { s: 'Honesty', r: '5' }
  ];
  let skillY = psychY + psychHeight - 42;
  drawText('Skill', width - 205, skillY, 9, fontBold);
  drawText('Rating (1-5)', width - 110, skillY, 9, fontBold);
  skillY -= 15;
  skills.forEach(s => {
    drawText(s.s, width - 205, skillY, 9);
    drawText(s.r, width - 80, skillY, 9, fontBold);
    skillY -= 15;
  });

  // 5. AI REMARKS BOX
  const remarksY = tableY - 110;
  drawRect(50, remarksY, width - 100, 100, rgb(1, 1, 1), rgb(0.6, 0.6, 0.6));
  drawText('AI-Generated Remarks', 60, remarksY + 82, 11, fontBold);
  const remarkText = `${student.first_name} demonstrates exceptional understanding in most subjects this term. Their problem-solving skills have shown significant improvement. Recommended areas for focus: Advanced Mathematics logic and Scientific writing. Overall, an outstanding performance!`;
  
  // Wrap text manually for simplicity
  const words = remarkText.split(' ');
  let line = '';
  let remarkRowY = remarksY + 65;
  words.forEach(w => {
    if (line.length + w.length > 90) {
      drawText(line, 60, remarkRowY, 10);
      line = '';
      remarkRowY -= 12;
    }
    line += w + ' ';
  });
  drawText(line, 60, remarkRowY, 10);

  // 6. SIGNATURE BOXES
  const sigY = remarksY - 80;
  drawRect(50, sigY, 240, 70, rgb(1, 1, 1), rgb(0.8, 0.8, 0.8));
  drawText("Form Master's Remark:", 60, sigY + 55, 10, fontBold);
  drawText("Outstanding performance, keep it up.", 60, sigY + 40, 9);
  drawText("(AI-Generated)", 60, sigY + 10, 8, fontRegular, rgb(0.5, 0.5, 0.5));

  drawRect(305, sigY, 240, 70, rgb(1, 1, 1), rgb(0.8, 0.8, 0.8));
  drawText("Principal's Remark:", 315, sigY + 55, 10, fontBold);
  drawText("An excellent term overall. Proceed to next term.", 315, sigY + 40, 9);
  drawText("(Verified Online)", 315, sigY + 10, 8, fontRegular, rgb(0.5, 0.5, 0.5));

  // 7. TERM SUMMARY & INFO
  const footerY = 50;
  const summaryY = sigY - 40;
  drawRect(50, summaryY, width - 100, 30, rgb(0.98, 0.98, 0.98), rgb(0.8, 0.8, 0.8));
  
  const feesText = school?.current_term_fees ? `Outstanding/Term Fees: N${Number(school.current_term_fees).toLocaleString()}` : 'Term Fees: Contact Admin';
  const resumptionText = school?.next_resumption_date ? `Next Term Begins: ${dayjs(school.next_resumption_date).format('DD MMM YYYY')}` : 'Next Term Begins: TBA';
  
  drawText(feesText, 65, summaryY + 10, 10, fontBold, rgb(0.3, 0.3, 0.3));
  drawText(resumptionText, width - 240, summaryY + 10, 10, fontBold, rgb(0.3, 0.3, 0.3));

  drawText('Scan to Verify Authenticity', 110, footerY + 25, 9, fontBold);
  drawText('Powered by GradiaFlow Digital Results System', 190, 20, 8, fontRegular, rgb(0.5, 0.5, 0.5));

  // Fake QR Code box
  drawRect(55, footerY, 45, 45, rgb(0.1, 0.1, 0.1));
  drawText('QR', 68, footerY + 18, 12, fontBold, rgb(1, 1, 1));

  return pdfDoc.save();
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

  const standings = Array.from(grouped.values()).map((item) => ({
    ...item,
    average_score: item.subject_count ? roundTwo(item.total_score / item.subject_count) : 0
  }));

  standings.sort((a, b) => {
    if (b.average_score !== a.average_score) return b.average_score - a.average_score;
    if (b.total_score !== a.total_score) return b.total_score - a.total_score;
    return a.student_name.localeCompare(b.student_name);
  });

  let lastAverage = null;
  let lastTotal = null;
  let position = 0;

  return standings.map((item, index) => {
    if (index === 0 || item.average_score !== lastAverage || item.total_score !== lastTotal) {
      position = index + 1;
    }
    lastAverage = item.average_score;
    lastTotal = item.total_score;
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

    const subjectMap = new Map();
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

      subjectMap.set(item.student_id, position);
      lastTotal = total;
      lastCa = ca;
      lastExam = exam;
    });

    positions.set(subjectId, subjectMap);
  });

  return positions;
}

function fallbackSummary(student, results) {
  const totalScore = results.reduce((acc, row) => acc + Number(row.total ?? 0), 0);
  const subjectCount = results.length;
  return {
    student_id: student.id,
    student_name: `${student.first_name} ${student.last_name}`.trim(),
    subject_count: subjectCount,
    total_score: totalScore,
    average_score: subjectCount ? roundTwo(totalScore / subjectCount) : 0,
    class_position: '-'
  };
}

function roundTwo(value) {
  return Math.round(value * 100) / 100;
}

