/// <reference lib="dom" />
/// <reference lib="deno.ns" />

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

interface ReportCardRequest {
  student_id: string;
  term: string;
  session_year: string;
  school_id?: string;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const appUrl = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return json({ error: 'Missing auth token' }, 401, req);
    }

    const { data: userResp, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userResp?.user) {
      return json({ error: 'Invalid token' }, 401, req);
    }

    const { student_id, term, session_year, school_id }: ReportCardRequest = await req.json();

    if (!student_id || !term || !session_year) {
      return json({ error: 'student_id, term, and session_year are required' }, 400, req);
    }

    const [
      { data: student, error: studentError },
      { data: results, error: resultsError },
      { data: attendance, error: attendanceError },
      { data: behaviour, error: behaviourError },
      { data: formRemarks, error: formRemarksError },
      { data: principalRemarks, error: principalRemarksError }
    ] = await Promise.all([
      supabase.from('students').select('*').eq('id', student_id).single(),
      supabase
        .from('results')
        .select('*, subjects(*)')
        .eq('student_id', student_id)
        .eq('term', term)
        .eq('session_year', session_year),
      supabase
        .from('attendance_summary')
        .select('*')
        .eq('student_id', student_id)
        .eq('term', term)
        .eq('session_year', session_year)
        .maybeSingle(),
      supabase
        .from('behaviour_evaluations')
        .select('*')
        .eq('student_id', student_id)
        .eq('term', term)
        .eq('session_year', session_year)
        .maybeSingle(),
      supabase
        .from('form_master_remarks')
        .select('*')
        .eq('student_id', student_id)
        .eq('term', term)
        .eq('session_year', session_year)
        .maybeSingle(),
      supabase
        .from('principal_remarks')
        .select('*')
        .eq('student_id', student_id)
        .eq('term', term)
        .eq('session_year', session_year)
        .maybeSingle()
    ]);

    if (studentError || !student) {
      throw studentError ?? new Error('Student not found');
    }

    if (resultsError) {
      throw resultsError;
    }

    if (attendanceError && attendanceError.code !== 'PGRST116') {
      throw attendanceError;
    }

    if (behaviourError && behaviourError.code !== 'PGRST116') {
      throw behaviourError;
    }

    if (formRemarksError && formRemarksError.code !== 'PGRST116') {
      throw formRemarksError;
    }

    if (principalRemarksError && principalRemarksError.code !== 'PGRST116') {
      throw principalRemarksError;
    }

    const schoolId = school_id || student.school_id;
    if (!schoolId) {
      return json({ error: 'school_id is required when the student record has no school_id' }, 400, req);
    }

    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('*')
      .eq('id', schoolId)
      .single();

    if (schoolError || !school) {
      throw schoolError ?? new Error('School not found');
    }

    const subjectResults = (results ?? []).map((result: any) => ({
      ...result,
      subject_name: result.subjects?.name ?? result.subject_name ?? 'Subject',
      remark: result.remark ?? gradeRemark(result.grade, result.total)
    }));

    const totalScore = subjectResults.reduce((sum: number, row: any) => sum + Number(row.total ?? 0), 0);
    const averageScore = subjectResults.length ? totalScore / subjectResults.length : 0;

    const verificationCode = crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
    const verificationUrl = appUrl ? `${appUrl}/verify/${verificationCode}` : null;

    const { data: resultReport, error: reportError } = await supabase
      .from('result_reports')
      .insert({
        student_id,
        school_id: schoolId,
        term,
        session_year,
        verification_code: verificationCode,
        total_subjects: subjectResults.length,
        average_score: Number(averageScore.toFixed(2)),
        qr_code_url: null
      })
      .select()
      .single();

    if (reportError) {
      throw reportError;
    }

    const reportCard = {
      id: resultReport.id,
      verification_code: verificationCode,
      verification_url: verificationUrl,
      generated_at: new Date().toISOString(),
      student,
      school,
      attendance: attendance ?? null,
      behaviour: behaviour ?? null,
      formRemarks: formRemarks ?? null,
      principalRemarks: principalRemarks ?? null,
      class: {
        id: student.class_id ?? null,
        name: student.class_name ?? student.class_id ?? 'Class'
      },
      term: {
        term,
        name: `${term} Term`,
        session_year
      },
      results: subjectResults,
      summary: {
        total_subjects: subjectResults.length,
        total_score: totalScore,
        average_score: Number(averageScore.toFixed(2)),
        term,
        session_year
      }
    };

    return json(
      {
        success: true,
        report: {
          id: resultReport.id,
          verification_code: verificationCode
        },
        report_card: reportCard,
        data: reportCard
      },
      200,
      req
    );
  } catch (error) {
    console.error('report-card error', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate report card'
      },
      400,
      req
    );
  }
});

function gradeRemark(grade?: string, total?: number) {
  if (grade) {
    const normalizedGrade = grade.toUpperCase();

    if (normalizedGrade === 'A') return 'Excellent';
    if (normalizedGrade === 'B') return 'Very Good';
    if (normalizedGrade === 'C') return 'Good';
    if (normalizedGrade === 'D') return 'Fair';
    if (normalizedGrade === 'E') return 'Needs Improvement';
    if (normalizedGrade === 'F') return 'Poor';
  }

  const numericTotal = Number(total ?? 0);
  if (numericTotal >= 70) return 'Excellent';
  if (numericTotal >= 60) return 'Very Good';
  if (numericTotal >= 50) return 'Good';
  if (numericTotal >= 45) return 'Fair';
  if (numericTotal >= 40) return 'Needs Improvement';
  return 'Poor';
}

function corsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
}

function json(payload: unknown, status: number, req: Request) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(req)
    }
  });
}