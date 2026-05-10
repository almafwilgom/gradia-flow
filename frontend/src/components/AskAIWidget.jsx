import { useState } from 'react';
import { apiFetch } from '../lib/api';
import { ChatBubbleLeftEllipsisIcon, XMarkIcon } from '@heroicons/react/24/outline';

export function AskAIWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I am your GradiaFlow AI assistant. How can I help you today?' }
  ]);

  const handleSend = async () => {
    if (!query.trim()) return;
    const userMsg = query.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setQuery('');
    setLoading(true);

    try {
      const res = await apiFetch('/api/ai', {
        method: 'POST',
        body: { prompt: userMsg }
      });
      setMessages(prev => [...prev, { role: 'assistant', text: res.answer || 'Sorry, I could not generate a response.' }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error connecting to AI service.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-all duration-200 z-50 flex items-center justify-center"
      >
        <ChatBubbleLeftEllipsisIcon className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 flex flex-col overflow-hidden">
          <div className="bg-indigo-600 p-4 flex items-center justify-between text-white">
            <div className="font-semibold flex items-center gap-2">
              <ChatBubbleLeftEllipsisIcon className="w-5 h-5" />
              GradiaFlow AI
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 p-4 h-80 overflow-y-auto flex flex-col gap-3 bg-slate-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="px-4 py-2 rounded-2xl max-w-[85%] text-sm bg-white border border-slate-200 text-slate-400 rounded-bl-none shadow-sm flex items-center gap-1">
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-slate-100 bg-white">
            <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
              <input 
                type="text" 
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Ask me anything..." 
                className="flex-1 px-3 py-2 text-sm bg-slate-100 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all outline-none"
              />
              <button 
                type="submit" 
                disabled={loading || !query.trim()}
                className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
