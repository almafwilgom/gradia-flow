// Supabase Edge Function: Paystack webhook handler
// Deploy: supabase functions deploy paystack-webhook --no-verify-jwt
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const paystackSecret = Deno.env.get('PAYSTACK_SECRET') ?? '';

const supabase = createClient(supabaseUrl, serviceKey);

serve(async (req) => {
  if (req.method === 'GET') return new Response('ok');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });

  try {
    const signature = req.headers.get('x-paystack-signature');
    const raw = await req.text();
    if (!signature) return json({ error: 'Missing signature' }, 400, req);

    // Verify signature
    const encoder = new TextEncoder();
    const key = encoder.encode(paystackSecret);
    const msg = encoder.encode(raw);
    const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-512' }, false, ['sign', 'verify']);
    const signed = await crypto.subtle.sign('HMAC', cryptoKey, msg);
    const hex = Array.from(new Uint8Array(signed))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    if (hex !== signature) return json({ error: 'Invalid signature' }, 401, req);

    const event = JSON.parse(raw);
    const data = event?.data;
    const reference = data?.reference;
    const amount = data?.amount ? data.amount / 100 : 0;
    const status = data?.status;

    if (!reference) return json({ error: 'Missing reference' }, 400, req);

    if (status === 'success') {
      // Mark payment approved by reference; assumes reference stored at creation
      const { data: payment } = await supabase
        .from('payments')
        .select('id, student_id, school_id')
        .eq('reference', reference)
        .single();

      if (payment?.id) {
        await supabase
          .from('payments')
          .update({ status: 'approved', amount })
          .eq('id', payment.id);

        // Unlock student's results
        await supabase.from('results').update({ locked: false }).eq('student_id', payment.student_id);
      }
    } else {
      await supabase.from('payments').update({ status: 'failed' }).eq('reference', reference);
    }

    return json({ received: true }, 200, req);
  } catch (error) {
    console.error('paystack webhook error', error);
    return json({ error: 'server' }, 500, req);
  }
});

function corsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
}

function json(payload: unknown, status: number, req: Request) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req) }
  });
}
