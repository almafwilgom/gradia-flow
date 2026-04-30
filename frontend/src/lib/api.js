import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import { supabase } from './supabaseClient';

const base = import.meta.env.VITE_API_URL;

// Configure NProgress
NProgress.configure({ showSpinner: false, speed: 400, minimum: 0.2 });

export async function apiFetch(path, { method = 'GET', token, body } = {}) {
  if (!base) throw new Error('VITE_API_URL is missing');
  
  let authToken = token;
  if (!authToken) {
    const { data: { session } } = await supabase.auth.getSession();
    authToken = session?.access_token;
  }

  NProgress.start();
  try {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Request failed ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes('Failed to fetch') ||
      message.includes('NetworkError') ||
      message.includes('fetch')
    ) {
      throw new Error(`Cannot reach the backend at ${base}. Start the Express server in backend/ and make sure VITE_API_URL is correct.`);
    }
    throw error;
  } finally {
    NProgress.done();
  }
}
