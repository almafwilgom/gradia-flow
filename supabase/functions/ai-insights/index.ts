/// <reference lib="dom" />
/// <reference lib="deno.ns" />
// Supabase Edge Function: AI Insights
// Deployed with: supabase functions deploy ai-insights --no-verify-jwt
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import OpenAI from 'https://esm.sh/openai@4.24.7?target=deno';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openai = new OpenAI({ apiKey: openaiKey });

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return json({ error: 'Missing auth token' }, 401, req);

    const { data: userResp, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userResp?.user) return json({ error: 'Invalid token' }, 401, req);

    const body = await req.json();
    const { student_id, school_id, mode } = body;

    const normalizedStudentId = student_id ?? body.student?.id;
    if (!normalizedStudentId) {
      return json({ error: 'student_id is required' }, 400, req);
    }

    if (mode === 'comments') {
      const payload = buildCommentPayload(body);
      const prompt = buildCommentsPrompt(payload);

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are GradiaFlow AI generating concise, professional school report remarks. Return valid JSON only.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        response_format: { type: 'json_object' },
        max_tokens: 450
      });

      const content = completion.choices[0].message?.content ?? '{}';
      const parsed = safeJsonParse(content);

      return json(
        {
          comments: {
            general: parsed.general || '',
            form_teacher: parsed.form_teacher || parsed.formTeacher || '',
            principal: parsed.principal || '',
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
            improvements: Array.isArray(parsed.improvements) ? parsed.improvements : []
          },
          meta: {
            mode: 'comments',
            student_id: normalizedStudentId,
            school_id
          }
        },
        200,
        req
      );
    }

    // Fetch recent academics
    const { data: resultRows } = await supabase
      .from('results')
      .select('subject_id, term, session_year, ca_score, exam_score, total, grade')
      .eq('student_id', normalizedStudentId)
      .order('created_at', { ascending: false })
      .limit(12);

    // Attendance (last 30 days)
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { data: attendanceRows } = await supabase
      .from('attendance_students')
      .select('status, attended_on')
      .eq('student_id', normalizedStudentId)
      .gte('attended_on', since.toISOString().slice(0, 10));

    const insightsPrompt = buildInsightsPrompt(resultRows ?? [], attendanceRows ?? []);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are GradiaFlow AI generating concise academic insights.' },
        { role: 'user', content: insightsPrompt }
      ],
      temperature: 0.25,
      max_tokens: 350
    });

    const content = completion.choices[0].message?.content ?? '';
    return json(
      {
        insights: content,
        meta: {
          mode: 'insights',
          student_id: normalizedStudentId,
          school_id
        }
      },
      200,
      req
    );
  } catch (error) {
    console.error('ai-insights error', error);
    return json({ error: 'Server error' }, 500, req);
  }
});

function buildInsightsPrompt(results: any[], attendance: any[]) {
  const attendRate =
    attendance.length === 0
      ? 'N/A'
      : `${Math.round(
          (attendance.filter((a: any) => a.status === 'present').length / attendance.length) * 100
        )}%`;

  const summary = {
    attendance_rate: attendRate,
    total_records: results.length,
    avg_total:
      results.length === 0
        ? 0
        : (
            results.reduce((acc: number, r: any) => acc + Number(r.total ?? 0), 0) /
            results.length
          ).toFixed(2),
    weak_subjects: results
      .filter((r: any) => Number(r.total ?? 0) < 50)
      .map((r: any) => r.subject_id)
      .slice(0, 5)
  };

  return `Student snapshot:
Attendance rate last 30d: ${summary.attendance_rate}
Subjects below 50: ${summary.weak_subjects.join(', ') || 'none'}
Average total: ${summary.avg_total}
Provide 3 bullet insights and 3 study recommendations. Keep it under 120 words.`;
}

function buildCommentPayload(body: any) {
  const results = Array.isArray(body.results) ? body.results : [];
  const metrics = body.metrics || deriveMetrics(results);

  return {
    student: body.student || {},
    attendance: body.attendance || null,
    behaviour: body.behaviour || null,
    metrics,
    results: results.slice(0, 12),
    term: body.term || null,
    session_year: body.session_year || null,
    school_id: body.school_id || null
  };
}

function buildCommentsPrompt(payload: any) {
  const studentName = [
    payload.student?.first_name,
    payload.student?.last_name
  ]
    .filter(Boolean)
    .join(' ')
    .trim() || 'The student';

  const subjects = payload.results
    .map((result: any) => {
      const subjectName = result.subjects?.name || result.subject || result.subject_id || 'Unknown Subject';
      return `${subjectName}: ${Number(result.total ?? 0)} (${result.grade || 'N/A'})`;
    })
    .join('; ');

  return `Generate professional school report comments as JSON with keys:
general, form_teacher, principal, strengths, improvements.

Student name: ${studentName}
Term: ${payload.term || 'N/A'}
Session: ${payload.session_year || 'N/A'}
Average score: ${payload.metrics?.averageScore ?? 0}
Best score: ${payload.metrics?.bestScore ?? 0}
Worst score: ${payload.metrics?.worstScore ?? 0}
Attendance percentage: ${payload.attendance?.attendance_percentage ?? 'N/A'}
Days absent: ${payload.attendance?.days_absent ?? 'N/A'}
Behaviour rating: ${payload.behaviour?.overall_rating ?? 'average'}
Subjects: ${subjects || 'No result data supplied'}

Rules:
- general: one concise overall summary under 45 words
- form_teacher: one encouraging remark under 55 words
- principal: one formal remark under 45 words
- strengths: array of 2 short phrases
- improvements: array of 2 short phrases
- Keep tone warm, professional, and suitable for a report card
- Do not include markdown or extra keys`;
}

function deriveMetrics(results: any[]) {
  if (!results.length) {
    return {
      averageScore: 0,
      bestScore: 0,
      worstScore: 0
    };
  }

  const scores = results.map((result: any) => Number(result.total ?? 0));

  return {
    averageScore: Number((scores.reduce((sum: number, value: number) => sum + value, 0) / scores.length).toFixed(2)),
    bestScore: Math.max(...scores),
    worstScore: Math.min(...scores)
  };
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return {};
  }
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