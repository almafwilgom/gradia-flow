import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/Card';
import Button from '../components/Button';
import Header from '../components/Header';
import ChatBubble from '../components/ChatBubble';

export default function PortalMessages() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  useEffect(() => {
    if (profile?.school_id) {
      fetchTeachers();
    }
  }, [profile?.school_id]);

  useEffect(() => {
    if (profile?.id && selectedTeacher?.profile_id) {
      fetchMessages();
    } else if (!selectedTeacher) {
      setMessages([]);
      setLoading(false);
    }
  }, [profile?.id, profile?.school_id, selectedTeacher?.profile_id]);

  const fetchTeachers = async () => {
    try {
      setError('');
      const { data, error } = await supabase
        .from('teachers')
        .select('profile_id, profiles(full_name)')
        .eq('school_id', profile?.school_id)
        .limit(5);

      if (error) throw error;
      setTeachers(data || []);
      if (data && data.length > 0 && !selectedTeacher) {
        setSelectedTeacher(data[0]);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setError(error.message || 'Unable to load teachers right now.');
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError('');
      if (!selectedTeacher?.profile_id || !profile?.id) {
        setMessages([]);
        return;
      }

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('school_id', profile?.school_id)
        .or(
          `and(sender_profile_id.eq.${profile.id},receiver_profile_id.eq.${selectedTeacher.profile_id}),and(sender_profile_id.eq.${selectedTeacher.profile_id},receiver_profile_id.eq.${profile.id})`
        )
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError(error.message || 'Unable to load the conversation yet.');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTeacher) return;

    try {
      setSending(true);
      setError('');
      const { error } = await supabase
        .from('messages')
        .insert({
          school_id: profile?.school_id,
          sender_profile_id: profile?.id,
          receiver_profile_id: selectedTeacher?.profile_id,
          body: newMessage,
        });

      if (error) throw error;
      setNewMessage('');
      await fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error.message || 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-32 md:pb-6">
      <Header title="Messages" showBack />

      {/* Teacher Selector */}
      {teachers.length > 1 && (
        <Card className="mt-6 mb-6">
          <label className="block text-sm font-medium text-slate-900 mb-2">
            Chat with:
          </label>
          <select
            value={selectedTeacher?.profile_id || ''}
            onChange={(e) => {
              const teacher = teachers.find(t => t.profile_id === e.target.value);
              setSelectedTeacher(teacher);
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
          >
            {teachers.map((teacher) => (
              <option key={teacher.profile_id} value={teacher.profile_id}>
                {teacher.profiles?.full_name}
              </option>
            ))}
          </select>
        </Card>
      )}

      {/* Messages Display */}
      <Card className="mb-6 min-h-96 max-h-96 overflow-y-auto p-4">
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p className="text-slate-600 text-center">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-slate-600 text-center">No messages yet</p>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                message={msg.body}
                isOwn={msg.sender_profile_id === profile?.id}
                timestamp={msg.created_at}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Message Input */}
      <Card>
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !sending) sendMessage();
            }}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <Button variant="primary" onClick={sendMessage} disabled={sending || !selectedTeacher}>
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
