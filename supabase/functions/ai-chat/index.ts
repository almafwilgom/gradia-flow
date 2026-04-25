/// <reference lib="dom" />
/// <reference lib="deno.ns" />
// Supabase Edge Function: AI Chat
// Deployed with: supabase functions deploy ai-chat --no-verify-jwt
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
    return new Response('ok', {
      headers: corsHeaders(req)
    });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return json({ error: 'Missing auth token' }, 401, req);
    }

    const { data: userResp, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userResp?.user) {
      return json({ error: 'Invalid or expired token' }, 401, req);
    }

    const body = await req.json();
    const messages = body?.messages ?? [];
    const schoolId = body?.school_id ?? null;
    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: 'messages array is required' }, 400, req);
    }

    // System primer keeps responses concise and helpful for school ops.
    const systemPrompt =
      'You are GradiaFlow AI, an assistant for school administrators, teachers, parents, and students. ' +
      'Provide concise answers, include actionable steps, and be mindful of Nigerian school context, currency = NGN.';

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.35,
      max_tokens: 600
    });

    const answer = completion.choices[0].message;

    // Persist lightweight log (non-blocking)
    supabase.from('messages').insert({
      school_id: schoolId,
      sender_profile_id: userResp.user.id,
      receiver_profile_id: null,
      body: `[AI_CHAT] ${JSON.stringify(answer)}`.slice(0, 2000)
    }).then().catch(() => {});

    return json({ reply: answer }, 200, req);
  } catch (error) {
    console.error('ai-chat error', error);
    return json({ error: 'Server error' }, 500, req);
  }
});

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

