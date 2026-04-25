// Supabase Edge Function: SMS dispatch
// Deploy: supabase functions deploy send-sms --no-verify-jwt
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const smsApiUrl = Deno.env.get('SMS_API_URL') ?? '';
const smsApiKey = Deno.env.get('SMS_API_KEY') ?? '';

const supabase = createClient(supabaseUrl, serviceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return json({ error: 'auth required' }, 401, req);
    const { data: userResp, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userResp?.user) return json({ error: 'invalid token' }, 401, req);

    const { phone, message, school_id } = await req.json();
    if (!phone || !message) return json({ error: 'phone and message required' }, 400, req);

    // debit wallet if present
    const { data: wallet } = await supabase.from('sms_wallets').select('*').eq('school_id', school_id).single();
    if (wallet && Number(wallet.balance) <= 0) return json({ error: 'Insufficient SMS wallet' }, 402, req);

    // send via provider if configured
    let status = 'queued';
    if (smsApiUrl && smsApiKey) {
      const resp = await fetch(smsApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${smsApiKey}` },
        body: JSON.stringify({ to: phone, message })
      });
      status = resp.ok ? 'sent' : 'failed';
    }

    await supabase.from('sms_logs').insert({
      school_id,
      phone,
      message,
      status,
      cost: 0
    });

    if (wallet) {
      await supabase.from('sms_wallets').update({ balance: Number(wallet.balance) - 1 }).eq('id', wallet.id);
    }

    return json({ status }, 200, req);
  } catch (error) {
    console.error('send-sms error', error);
    return json({ error: 'server' }, 500, req);
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
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req) }
  });
}
