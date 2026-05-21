import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { SimpleTable } from '../components/SimpleTable';
import { useActionModal } from '../hooks/useActionModal';
import { ActionModalRenderer } from '../components/ActionModals';

export default function Exams() {
  const { profile } = useAuth();
  const isStaff = useMemo(() => ['super_admin', 'school_admin', 'teacher'].includes(profile?.role), [profile]);
  const isStudent = profile?.role === 'student';
  const teacherClassId =
    profile?.role === 'teacher' ? profile?.teachers?.class_id ?? profile?.teachers?.[0]?.class_id ?? '' : '';
  const [exams, setExams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [createForm, setCreateForm] = useState({
    title: '',
    start_at: dayjs().add(1, 'day').format('YYYY-MM-DDTHH:mm'),
    end_at: dayjs().add(1, 'day').add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
    duration_minutes: 60
  });
  const [questionForm, setQuestionForm] = useState({ question: '', options: ['', '', '', ''], correct_option: 'A' });
  const [answers, setAnswers] = useState({});
  const [countdown, setCountdown] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const modals = useActionModal();

  const loadExams = async () => {
    const query = supabase.from('exams').select('id, title, start_at, end_at, mode, duration_minutes, class_id');
    const scopedQuery =
      profile?.role === 'teacher' && teacherClassId
        ? query.eq('class_id', teacherClassId)
        : query.eq('school_id', profile?.school_id);
    const { data } = await scopedQuery.order('start_at', { ascending: true });
    setExams(data ?? []);
  };

  useEffect(() => {
    if (profile?.school_id) loadExams();
  }, [profile?.school_id]);

  const createExam = async (e) => {
    e.preventDefault();
    const payload = {
      school_id: profile.school_id,
      class_id: profile?.role === 'teacher' ? teacherClassId : null,
      title: createForm.title,
      start_at: createForm.start_at,
      end_at: createForm.end_at,
      duration_minutes: Number(createForm.duration_minutes)
    };
    await supabase.from('exams').insert(payload);
    setCreateForm({
      title: '',
      start_at: dayjs().add(1, 'day').format('YYYY-MM-DDTHH:mm'),
      end_at: dayjs().add(1, 'day').add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
      duration_minutes: 60
    });
    loadExams();
  };

  const loadQuestions = async (examId) => {
    const { data } = await supabase.from('exam_questions').select('*').eq('exam_id', examId);
    setQuestions(shuffle(data ?? []));
    setSelectedExam(exams.find((x) => x.id === examId) ?? null);
    setAnswers({});
    setSubmitted(false);
  };

  const addQuestion = async (e) => {
    e.preventDefault();
    if (!selectedExam) return;
    await supabase.from('exam_questions').insert({
      exam_id: selectedExam.id,
      question: questionForm.question,
      options: questionForm.options,
      correct_option: questionForm.correct_option,
      points: 1
    });
    setQuestionForm({ question: '', options: ['', '', '', ''], correct_option: 'A' });
    loadQuestions(selectedExam.id);
  };

  const submitExam = async () => {
    if (!selectedExam) return;
    try {
      let score = 0;
      questions.forEach((q) => {
        const answer = answers[q.id];
        if (answer && answer === q.correct_option) score += Number(q.points ?? 1);
      });

      const { error } = await supabase.from('exam_submissions').upsert({
        exam_id: selectedExam.id,
        student_id: profile.id,
        score,
        answers
      });
      if (error) throw error;

      setSubmitted(true);
      modals.success.show('Exam submitted', `Your answers were submitted successfully. Score: ${score}`);
    } catch (err) {
      modals.error.show('Submission failed', err.message || 'Unable to submit this exam right now.');
    }
  };

  useEffect(() => {
    if (!selectedExam) return;
    const timer = setInterval(() => {
      const now = dayjs();
      const end = dayjs(selectedExam.end_at);
      const diff = end.diff(now, 'second');
      if (diff <= 0) {
        setCountdown('Expired');
        clearInterval(timer);
      } else {
        const mins = Math.floor(diff / 60);
        const secs = diff % 60;
        setCountdown(`${mins}m ${secs}s`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedExam]);

  const withinWindow = selectedExam
    ? dayjs().isAfter(dayjs(selectedExam.start_at)) && dayjs().isBefore(dayjs(selectedExam.end_at))
    : false;

  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

  return (
    <div className="space-y-4">
      <ActionModalRenderer modals={modals} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Exams / CBT</h1>
          <p className="text-sm text-slate-500">Schedule, randomize questions, and auto-grade.</p>
        </div>
      </div>

      {isStaff && (
        <form onSubmit={createExam} className="bg-white rounded-xl p-4 shadow-card border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            placeholder="Title"
            value={createForm.title}
            onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
          <input
            type="datetime-local"
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={createForm.start_at}
            onChange={(e) => setCreateForm((f) => ({ ...f, start_at: e.target.value }))}
          />
          <input
            type="datetime-local"
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={createForm.end_at}
            onChange={(e) => setCreateForm((f) => ({ ...f, end_at: e.target.value }))}
          />
          <input
            type="number"
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={createForm.duration_minutes}
            onChange={(e) => setCreateForm((f) => ({ ...f, duration_minutes: e.target.value }))}
            placeholder="Duration (mins)"
          />
          <button className="md:col-span-4 rounded-lg bg-brand-600 text-white px-4 py-2 font-semibold hover:bg-brand-700">
            Create Exam
          </button>
        </form>
      )}

      <SimpleTable
        headers={['Title', 'Start', 'End', 'Actions']}
        rows={exams.map((e) => [
          e.title,
          dayjs(e.start_at).format('DD MMM, HH:mm'),
          dayjs(e.end_at).format('DD MMM, HH:mm'),
          <button key={e.id} className="text-brand-600" onClick={() => loadQuestions(e.id)}>
            {isStaff ? 'Manage' : 'Start'}
          </button>
        ])}
      />

      {selectedExam && (
        <div className="bg-white rounded-xl p-4 shadow-card border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{selectedExam.title}</h3>
            <span className="text-xs text-slate-500">
              {questions.length} questions • {selectedExam.duration_minutes} mins
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span>Window: {dayjs(selectedExam.start_at).format('DD MMM HH:mm')} → {dayjs(selectedExam.end_at).format('DD MMM HH:mm')}</span>
            <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700">Time left: {countdown || '—'}</span>
            {!withinWindow && <span className="text-rose-600">Outside exam window</span>}
            {submitted && <span className="text-emerald-600">Already submitted</span>}
          </div>

          {isStaff && (
            <form onSubmit={addQuestion} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <textarea
                className="rounded-lg border border-slate-200 px-3 py-2 md:col-span-2"
                placeholder="Question"
                value={questionForm.question}
                onChange={(e) => setQuestionForm((f) => ({ ...f, question: e.target.value }))}
                required
              />
              {questionForm.options.map((opt, idx) => (
                <input
                  key={idx}
                  className="rounded-lg border border-slate-200 px-3 py-2"
                  placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                  value={opt}
                  onChange={(e) =>
                    setQuestionForm((f) => {
                      const next = [...f.options];
                      next[idx] = e.target.value;
                      return { ...f, options: next };
                    })
                  }
                  required
                />
              ))}
              <select
                className="rounded-lg border border-slate-200 px-3 py-2"
                value={questionForm.correct_option}
                onChange={(e) => setQuestionForm((f) => ({ ...f, correct_option: e.target.value }))}
              >
                {['A', 'B', 'C', 'D'].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
              <button className="rounded-lg bg-slate-900 text-white px-4 py-2 font-semibold hover:bg-slate-800">
                Add Question
              </button>
            </form>
          )}

          {questions.length === 0 && <div className="text-sm text-slate-500">No questions yet.</div>}

          {questions.map((q, idx) => (
            <div key={q.id} className="border border-slate-100 rounded-lg p-3">
              <div className="font-semibold text-slate-800 mb-2">
                {idx + 1}. {q.question}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {q.options?.map((opt, i) => {
                  const letter = String.fromCharCode(65 + i);
                  return (
                    <label
                      key={letter}
                      className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg hover:border-brand-300"
                    >
                      {isStaff ? (
                        <input type="radio" checked={q.correct_option === letter} readOnly />
                      ) : (
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          value={letter}
                          checked={answers[q.id] === letter}
                          disabled={!withinWindow || submitted}
                          onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                        />
                      )}
                      <span className="font-semibold text-slate-700">{letter}.</span>
                      <span className="text-slate-700">{opt}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          {isStudent && questions.length > 0 && (
            <button
              onClick={submitExam}
              className="rounded-lg bg-brand-600 text-white px-4 py-2 font-semibold hover:bg-brand-700"
              disabled={!withinWindow || submitted}
            >
              Submit Answers
            </button>
          )}
        </div>
      )}
    </div>
  );
}
