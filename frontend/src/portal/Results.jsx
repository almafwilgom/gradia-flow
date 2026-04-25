import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/Card';
import Button from '../components/Button';
import Header from '../components/Header';
import BottomActionBar from '../components/BottomActionBar';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';

export default function PortalResults() {
  const { profile } = useAuth();
  const [results, setResults] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.student_id) {
      fetchResults();
    }
  }, [profile]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      
      // Get unique sessions
      const { data: resultsData, error: resultsError } = await supabase
        .from('results')
        .select('session_year, term')
        .eq('student_id', profile?.student_id)
        .order('session_year', { ascending: false })
        .order('term', { ascending: false });

      if (resultsError) throw resultsError;

      // Get unique sessions
      const uniqueSessions = Array.from(
        new Map(
          resultsData?.map(r => [
            `${r.session_year}-${r.term}`,
            { session_year: r.session_year, term: r.term }
          ])
        ).values()
      );

      setSessions(uniqueSessions);
      if (uniqueSessions.length > 0 && !selectedSession) {
        setSelectedSession(uniqueSessions[0]);
      }

      // Fetch all results
      const { data: allResults, error: allResultsError } = await supabase
        .from('results')
        .select(`
          id,
          session_year,
          term,
          subject_id,
          ca_score,
          exam_score,
          total,
          grade,
          subjects(name, code)
        `)
        .eq('student_id', profile?.student_id);

      if (allResultsError) throw allResultsError;
      setResults(allResults || []);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = selectedSession
    ? results.filter(r => r.session_year === selectedSession.session_year && r.term === selectedSession.term)
    : [];

  const downloadResult = async () => {
    if (!profile?.student_id || !selectedSession) return;

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      const data = await apiFetch(`/api/report-card/${profile.student_id}`, {
        method: 'POST',
        token: session.access_token,
        body: {
          term: selectedSession.term,
          session_year: selectedSession.session_year
        }
      });

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Download result error:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <Header title="Student Results" showBack />
        <div className="mt-4">Loading results...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-32 md:pb-6">
      <Header title="Student Results" showBack />

      {/* Session Selector */}
      {sessions.length > 1 && (
        <Card className="mt-4 mb-6">
          <label className="block text-sm font-medium text-slate-900 mb-2">
            Select Session:
          </label>
          <select
            value={selectedSession ? `${selectedSession.session_year}-${selectedSession.term}` : ''}
            onChange={(e) => {
              const [year, term] = e.target.value.split('-');
              setSelectedSession({ session_year: year, term });
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            {sessions.map((session) => (
              <option
                key={`${session.session_year}-${session.term}`}
                value={`${session.session_year}-${session.term}`}
              >
                {session.session_year} - {session.term}
              </option>
            ))}
          </select>
        </Card>
      )}

      {/* Results Display */}
      {filteredResults.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-slate-600">No results available for this session</p>
        </Card>
      ) : (
        <>
          {/* Grade Summary */}
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-blue-100">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xs text-slate-600 mb-1">Average Grade</p>
                <p className="text-3xl font-bold text-blue-600">
                  {Math.round(
                    filteredResults.reduce((sum, r) => sum + (r.total || 0), 0) / filteredResults.length
                  )}%
                </p>
              </div>
              <div className="text-center border-l border-r border-blue-200">
                <p className="text-xs text-slate-600 mb-1">Subjects</p>
                <p className="text-3xl font-bold text-blue-600">{filteredResults.length}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-600 mb-1">Status</p>
                <p className="text-lg font-bold text-green-600">PASS</p>
              </div>
            </div>
          </Card>

          {/* Results Cards */}
          <div className="space-y-3 mb-6">
            {filteredResults.map((result) => (
              <Card key={result.id} className="border-l-4 border-blue-600">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900">{result.subjects?.name}</h3>
                    <p className="text-xs text-slate-600">Code: {result.subjects?.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">{result.grade || 'N/A'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-200">
                  <div className="text-center">
                    <p className="text-xs text-slate-600">CA</p>
                    <p className="font-semibold text-slate-900">{result.ca_score || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-600">Exam</p>
                    <p className="font-semibold text-slate-900">{result.exam_score || 0}</p>
                  </div>
                  <div className="text-center bg-blue-50 rounded">
                    <p className="text-xs text-slate-600">Total</p>
                    <p className="font-semibold text-blue-600">{result.total || 0}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Bottom Action Bar */}
      <BottomActionBar>
        <Link to="/portal/messages" className="flex-1">
          <Button variant="secondary" className="w-full">
            Send Message
          </Button>
        </Link>
        <Button variant="primary" className="flex-1" onClick={downloadResult}>
          Download Result
        </Button>
      </BottomActionBar>
    </div>
  );
}
