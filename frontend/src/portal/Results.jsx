import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/Card';
import Button from '../components/Button';
import Header from '../components/Header';
import BottomActionBar from '../components/BottomActionBar';
import { Link } from 'react-router-dom';
import { apiFetch, API_URL } from '../lib/api';

export default function PortalResults() {
  const { profile } = useAuth();
  const [results, setResults] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('table'); // Default to table for 15+ subjects

  useEffect(() => {
    if (profile?.student_id) {
      fetchResults();
    }
  }, [profile]);

  const fetchResults = async () => {
    try {
      setLoading(true);

      const { data: resultsData, error: resultsError } = await supabase
        .from('results')
        .select('session_year, term')
        .eq('student_id', profile?.student_id)
        .order('session_year', { ascending: false })
        .order('term', { ascending: false });

      if (resultsError) throw resultsError;

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

  const filteredResults = useMemo(() => {
    if (!selectedSession) return [];
    return results.filter(r => r.session_year === selectedSession.session_year && r.term === selectedSession.term);
  }, [results, selectedSession]);

  const displayedResults = useMemo(() => {
    if (!searchQuery) return filteredResults;
    return filteredResults.filter(r => r.subjects?.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [filteredResults, searchQuery]);

  const [downloading, setDownloading] = useState(false);

  const downloadResult = async () => {
    if (!profile?.student_id || !selectedSession) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Session expired');

      const url = `${API_URL}/api/report-card/${profile.student_id}` + 
                 `?term=${encodeURIComponent(selectedSession.term)}` +
                 `&session_year=${encodeURIComponent(selectedSession.session_year)}` +
                 `&token=${session.access_token}`;
      
      window.open(url, '_blank');
    } catch (error) {
      console.error('Download error:', error);
      alert('Could not open result. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
        <div className="h-10 bg-slate-200 rounded-lg animate-skeleton w-48"></div>
        <div className="h-40 bg-white rounded-3xl border border-slate-100 animate-skeleton"></div>
        <div className="h-64 bg-white rounded-3xl border border-slate-100 animate-skeleton"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto pb-32 md:pb-6">
      {/* Search and Summary */}

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

      {/* Search, View Toggle and Summary */}
      <div className="mt-4 mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search subjects..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex bg-slate-100 p-1 rounded-2xl self-end sm:self-auto">
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'cards' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Cards
            </button>
          </div>
        </div>

        {filteredResults.length > 0 && (
          <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0 shadow-lg shadow-blue-200 overflow-hidden relative">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="relative grid grid-cols-3 gap-4 py-2 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-blue-100 mb-1 font-bold">Average</p>
                <p className="text-3xl font-black">
                  {Math.round(
                    filteredResults.reduce((sum, r) => sum + (r.total || 0), 0) / (filteredResults.length || 1)
                  )}%
                </p>
              </div>
              <div className="border-l border-r border-white/10">
                <p className="text-[10px] uppercase tracking-wider text-blue-100 mb-1 font-bold">Subjects</p>
                <p className="text-3xl font-black">{filteredResults.length}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-blue-100 mb-1 font-bold">Status</p>
                <p className={`text-xl font-black ${
                  (filteredResults.reduce((sum, r) => sum + (r.total || 0), 0) / (filteredResults.length || 1)) >= 40 
                    ? 'text-emerald-300' 
                    : 'text-rose-300'
                }`}>
                  {(filteredResults.reduce((sum, r) => sum + (r.total || 0), 0) / (filteredResults.length || 1)) >= 40 ? 'PASS' : 'FAIL'}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Results Display */}
      <div className="mb-6">
        {displayedResults.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-300">
            <p className="text-slate-500">
              {filteredResults.length === 0 ? "No results available for this session" : "No subjects found matching your search."}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            {/* Header - Hidden on mobile, shown on desktop */}
            <div className="hidden sm:grid grid-cols-[1fr_80px_80px_80px_80px] bg-slate-50 border-b border-slate-100">
              <div className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subject</div>
              <div className="px-2 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">CA</div>
              <div className="px-2 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Exam</div>
              <div className="px-2 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Total</div>
              <div className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Grade</div>
            </div>

            <div className="divide-y divide-slate-50">
              {displayedResults.map((result) => (
                <div key={result.id} className="hover:bg-slate-50/50 transition-colors p-4 sm:p-0">
                  {/* Mobile Layout (Stacked/Dense) */}
                  <div className="sm:hidden space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm leading-tight truncate">{result.subjects?.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{result.subjects?.code}</p>
                      </div>
                      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shadow-sm ${result.grade === 'A' ? 'bg-emerald-50 text-emerald-600' :
                          result.grade === 'B' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                        {result.grade || '-'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-50 rounded-xl p-2 text-center border border-slate-100/50">
                        <p className="text-[9px] text-slate-400 uppercase font-bold">CA</p>
                        <p className="text-xs font-bold text-slate-700">{result.ca_score || 0}</p>
                      </div>
                      <div className="flex-1 bg-slate-50 rounded-xl p-2 text-center border border-slate-100/50">
                        <p className="text-[9px] text-slate-400 uppercase font-bold">Exam</p>
                        <p className="text-xs font-bold text-slate-700">{result.exam_score || 0}</p>
                      </div>
                      <div className="flex-1 bg-blue-50 rounded-xl p-2 text-center border border-blue-100/50">
                        <p className="text-[9px] text-blue-400 uppercase font-bold">Total</p>
                        <p className="text-xs font-bold text-blue-600">{result.total || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Layout (Grid) */}
                  <div className="hidden sm:grid grid-cols-[1fr_80px_80px_80px_80px] items-center">
                    <div className="px-6 py-4">
                      <p className="font-bold text-slate-900">{result.subjects?.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{result.subjects?.code}</p>
                    </div>
                    <div className="px-2 py-4 text-center font-semibold text-slate-600">{result.ca_score || 0}</div>
                    <div className="px-2 py-4 text-center font-semibold text-slate-600">{result.exam_score || 0}</div>
                    <div className="px-2 py-4 text-center font-black text-blue-600">{result.total || 0}</div>
                    <div className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-black text-sm ${result.grade === 'A' ? 'bg-emerald-50 text-emerald-600' :
                          result.grade === 'B' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                        {result.grade || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <BottomActionBar>
        <Link to="/portal/messages" className="flex-1">
          <Button variant="secondary" className="w-full">
            Send Message
          </Button>
        </Link>
        <Button variant="primary" className="flex-1" onClick={downloadResult} disabled={downloading}>
          {downloading ? 'Downloading...' : 'Download Result'}
        </Button>
      </BottomActionBar>
    </div>
  );
}
