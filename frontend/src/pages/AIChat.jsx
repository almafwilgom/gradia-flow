import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../lib/api';

function formatApiError(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith('{')) {
    try {
      const parsed = JSON.parse(message);
      return parsed.error || parsed.message || message;
    } catch {
      return message;
    }
  }
  return message;
}

export default function AIChat() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I am GradiaFlow AI. Ask me about attendance, results, or study tips.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [genTopic, setGenTopic] = useState('');
  const [genSubject, setGenSubject] = useState('Mathematics');
  const [genCount, setGenCount] = useState(5);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const nextMessages = [...messages, { role: 'user', content: input.trim() }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Your session has expired. Please sign in again before using AI Chat.');
      }

      const data = await apiFetch('/api/ai/chat', {
        method: 'POST',
        token: session.access_token,
        body: { messages: nextMessages, school_id: profile?.school_id }
      });

      setMessages((current) => [
        ...current,
        { role: 'assistant', content: data?.reply?.content ?? 'No response' }
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { role: 'assistant', content: formatApiError(error) }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-xl shadow-card border border-slate-100">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">AI Chat</h1>
          <p className="text-xs text-slate-500">Powered by OpenAI via the GradiaFlow backend</p>
        </div>
      </div>
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <div className="text-xs text-slate-600 mb-2">AI Question Generator</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-sm">
          <input
            className="border border-slate-200 rounded-lg px-3 py-2"
            placeholder="Subject"
            value={genSubject}
            onChange={(e) => setGenSubject(e.target.value)}
          />
          <input
            className="border border-slate-200 rounded-lg px-3 py-2 md:col-span-2"
            placeholder="Topic"
            value={genTopic}
            onChange={(e) => setGenTopic(e.target.value)}
          />
          <input
            type="number"
            className="border border-slate-200 rounded-lg px-3 py-2"
            value={genCount}
            onChange={(e) => setGenCount(e.target.value)}
          />
          <button
            className="rounded-lg bg-slate-900 text-white px-3 py-2 font-semibold"
            disabled={loading}
            onClick={(e) => {
              e.preventDefault();
              const prompt = `Generate ${genCount} CBT-style questions with answers for ${genSubject} on ${genTopic}. Include options A-D and the correct option.`;
              setInput(prompt);
            }}
          >
            Prep Prompt
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((message, idx) => (
          <div
            key={idx}
            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              message.role === 'user'
                ? 'ml-auto bg-brand-600 text-white'
                : 'mr-auto bg-slate-100 text-slate-800'
            }`}
          >
            {message.content}
          </div>
        ))}
        {loading && <div className="text-xs text-slate-500">Thinking...</div>}
      </div>
      <form onSubmit={sendMessage} className="border-t border-slate-100 px-3 py-3 flex items-center gap-2">
        <input
          className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:border-brand-400"
          placeholder="Ask GradiaFlow AI..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          className="rounded-full bg-brand-600 text-white px-4 py-2 text-sm font-semibold hover:bg-brand-700"
          disabled={loading}
        >
          Send
        </button>
      </form>
    </div>
  );
}

