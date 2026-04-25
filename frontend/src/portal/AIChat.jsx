import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { apiFetch } from '../lib/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Header from '../components/Header';
import ChatBubble from '../components/ChatBubble';

export default function PortalAIChat() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: 'Hello. I am your GradiaFlow study assistant. Ask about results, attendance, or a school subject.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input.trim()
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      const data = await apiFetch('/api/ai/chat', {
        method: 'POST',
        token: session.access_token,
        body: {
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content
          }))
        }
      });

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: data?.reply?.content || 'I could not generate a response right now.'
        }
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: error.message || 'Something went wrong while contacting the AI service.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-32 md:pb-6">
      <Header title="AI Study Assistant" showBack />

      <Card className="mt-6 mb-6 min-h-96 max-h-96 overflow-y-auto p-4 bg-slate-50">
        <div className="space-y-4">
          {messages.map((message) => (
            <ChatBubble
              key={message.id}
              message={message.content}
              isOwn={message.role === 'user'}
              timestamp={null}
            />
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-300 text-slate-900 px-4 py-2 rounded-lg rounded-bl-none">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-600 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-slate-600 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-slate-600 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') sendMessage();
            }}
            placeholder="Ask about your studies, results, or attendance..."
            disabled={loading}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100"
          />
          <Button variant="primary" onClick={sendMessage} disabled={loading}>
            {loading ? '...' : 'Send'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
