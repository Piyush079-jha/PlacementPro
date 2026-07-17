import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { MessageSquare, Play, CheckCircle, ChevronRight, Award, RotateCcw, Clock, Video, Brain, ListChecks, Languages, XCircle, FileText, Timer } from 'lucide-react';
import VideoInterview from './VideoInterview';
import Editor from '@monaco-editor/react';

const roles = ['Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Data Scientist', 'Data Analyst', 'DevOps Engineer', 'ML Engineer', 'Android Developer', 'Product Manager'];
const difficulties = ['Easy', 'Medium', 'Hard'];
const types = ['mixed', 'Technical', 'Behavioral', 'HR', 'DSA'];

const STAGES = { MODE: 'mode', SETUP: 'setup', VIDEO_SETUP: 'video_setup', ACTIVE: 'active', REVIEW: 'review', RESULTS: 'results', MCQ_SETUP: 'mcq_setup', MCQ_ACTIVE: 'mcq_active', MCQ_RESULTS: 'mcq_results', OA_SETUP: 'oa_setup', OA_ACTIVE: 'oa_active', OA_RESULTS: 'oa_results' };

const OA_SECTIONS = ['Aptitude', 'Reasoning', 'Verbal', 'Coding'];
const OA_SECTION_TIME = { Aptitude: 10 * 60, Reasoning: 10 * 60, Verbal: 8 * 60, Coding: 20 * 60 }; // seconds

const OA_STORAGE_KEY = 'oa_progress_v1';

const loadOAProgress = () => {
  try {
    const raw = localStorage.getItem(OA_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const clearOAProgress = () => {
  try { localStorage.removeItem(OA_STORAGE_KEY); } catch {}
};

const ScoreBadge = ({ score }) => {
  const color = score >= 8 ? 'text-green-400 bg-green-500/10 border-green-500/20' : score >= 6 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20';
  return <span className={`badge ${color} text-base font-bold`}>{score}/10</span>;
};

export default function Interview() {
  const savedOA = loadOAProgress();
  const [config, setConfig] = useState({ role: '', difficulty: 'Medium', count: 5, type: 'mixed' });
  const [stage, setStage] = useState(savedOA ? STAGES.OA_ACTIVE : STAGES.MODE);
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [evaluations, setEvaluations] = useState({});
  const [loading, setLoading] = useState(false);
  const [evalLoading, setEvalLoading] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [saved, setSaved] = useState(false);
  const [mode, setMode] = useState('Technical');
  const [mcqCategory, setMcqCategory] = useState('Aptitude');
  const [mcqDifficulty, setMcqDifficulty] = useState('Medium');
  const [mcqQuestions, setMcqQuestions] = useState([]);
  const [mcqIndex, setMcqIndex] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [mcqLoading, setMcqLoading] = useState(false);

  const [oaLoading, setOaLoading] = useState(false);
  const [oaSectionIndex, setOaSectionIndex] = useState(savedOA?.oaSectionIndex ?? 0);
  const [oaTimeLeft, setOaTimeLeft] = useState(savedOA?.oaTimeLeft ?? 0);
  const [oaData, setOaData] = useState(savedOA?.oaData ?? { Aptitude: [], Reasoning: [], Verbal: [], Coding: [] });
  const [oaAnswers, setOaAnswers] = useState(savedOA?.oaAnswers ?? { Aptitude: {}, Reasoning: {}, Verbal: {}, Coding: {} });
  const [oaCodingIndex, setOaCodingIndex] = useState(savedOA?.oaCodingIndex ?? 0);
  const [oaCode, setOaCode] = useState(savedOA?.oaCode ?? {});
  const [oaRunResults, setOaRunResults] = useState(savedOA?.oaRunResults ?? {});
  const [oaRunning, setOaRunning] = useState(false);
  const [oaLanguage, setOaLanguage] = useState(savedOA?.oaLanguage ?? 'javascript');
  const [oaStarterCodeCache, setOaStarterCodeCache] = useState(savedOA?.oaStarterCodeCache ?? {}); // { [problemIndex]: { [language]: code } }
  const [oaLangLoading, setOaLangLoading] = useState(false);
  const [oaCompany, setOaCompany] = useState(''); // '' = generic OA, otherwise company name
  const COMPANIES = ['TCS', 'Infosys', 'Wipro', 'Capgemini', 'Cognizant', 'Amazon', 'Google', 'Microsoft', 'Deloitte'];
  // const [oaVerbalIndex, setOaVerbalIndex] = useState(0);
  // const [oaVerbalEval, setOaVerbalEval] = useState({});
  // const [oaVerbalLoading, setOaVerbalLoading] = useState(false);

  const startInterview = async () => {
    if (!config.role) return toast.error('Please select a role');
    setLoading(true);
    try {
      const res = await axios.post('/api/interview/questions', config);
      setQuestions(res.data.questions);
      setAnswers({});
      setEvaluations({});
      setCurrentQ(0);
      setStage(STAGES.ACTIVE);
      setStartTime(Date.now());
      setSaved(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate questions. Check API key.');
    } finally {
      setLoading(false);
    }
  };

  const evaluateAnswer = async () => {
    const q = questions[currentQ];
    const answer = answers[currentQ];
    if (!answer?.trim() || answer.trim().length < 10) return toast.error('Please write a proper answer (at least 10 characters)');
    setEvalLoading(true);
    try {
      const res = await axios.post('/api/interview/evaluate', { question: q.question, answer, role: config.role, type: q.type });
      setEvaluations(prev => ({ ...prev, [currentQ]: res.data.evaluation }));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Evaluation failed');
    } finally {
      setEvalLoading(false);
    }
  };

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) { setCurrentQ(c => c + 1); }
    else { setStage(STAGES.REVIEW); }
  };

  const finishInterview = async () => {
    if (saved) return;
    const duration = startTime ? Math.round((Date.now() - startTime) / 1000 / 60) : 0;
    const qs = questions.map((q, i) => ({
      question: q.question, userAnswer: answers[i] || '',
      feedback: evaluations[i]?.feedback || '', score: evaluations[i]?.score,
      idealAnswer: evaluations[i]?.idealAnswer || ''
    }));
    try {
      const res = await axios.post('/api/interview/save', { role: config.role, difficulty: config.difficulty, questions: qs, duration });
      toast.success(`Interview saved! Score: ${res.data.overallScore}%`);
      setSaved(true);
      setStage(STAGES.RESULTS);
    } catch (err) {
      toast.error('Failed to save interview');
    }
  };

  const reset = () => { setStage(STAGES.MODE); setQuestions([]); setAnswers({}); setEvaluations({}); setSaved(false); };

  const startMcq = async () => {
    setMcqLoading(true);
    try {
      const res = await axios.post('/api/interview/mcq-questions', { category: mcqCategory, difficulty: mcqDifficulty, count: 10 });
      setMcqQuestions(res.data.questions);
      setMcqIndex(0);
      setMcqAnswers({});
      setStage(STAGES.MCQ_ACTIVE);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate questions');
    } finally {
      setMcqLoading(false);
    }
  };

  const selectMcqAnswer = (optionIndex) => {
    if (mcqAnswers[mcqIndex] != null) return;
    setMcqAnswers(prev => ({ ...prev, [mcqIndex]: optionIndex }));
  };

  const nextMcqQuestion = () => {
    if (mcqIndex < mcqQuestions.length - 1) setMcqIndex(i => i + 1);
    else setStage(STAGES.MCQ_RESULTS);
  };

  const mcqScore = () => {
    let correct = 0;
    mcqQuestions.forEach((q, i) => { if (mcqAnswers[i] === q.correctIndex) correct++; });
    return correct;
  };

  const resetMcq = () => { setStage(STAGES.MODE); setMcqQuestions([]); setMcqAnswers({}); setMcqIndex(0); };

  const startOA = async () => {
    setOaLoading(true);
    try {
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      const usingCompany = !!oaCompany;
      const aptRes = usingCompany
        ? await axios.post('/api/interview/company-questions', { company: oaCompany, section: 'Aptitude', difficulty: 'Medium', count: 10 })
        : await axios.post('/api/interview/mcq-questions', { category: 'Aptitude', difficulty: 'Medium', count: 10 });
      await delay(1500);
      const reaRes = usingCompany
        ? await axios.post('/api/interview/company-questions', { company: oaCompany, section: 'Reasoning', difficulty: 'Medium', count: 10 })
        : await axios.post('/api/interview/mcq-questions', { category: 'Reasoning', difficulty: 'Medium', count: 10 });
      await delay(1500);
      const verRes = usingCompany
        ? await axios.post('/api/interview/company-questions', { company: oaCompany, section: 'Verbal', difficulty: 'Medium', count: 10 })
        : await axios.post('/api/interview/mcq-questions', { category: 'Verbal', difficulty: 'Medium', count: 10 });
      await delay(1500);
      const codeRes = usingCompany
        ? await axios.post('/api/interview/company-questions', { company: oaCompany, section: 'Coding', difficulty: 'Medium', count: 2, language: oaLanguage })
        : await axios.post('/api/interview/coding-questions', { difficulty: 'Medium', count: 2, language: oaLanguage });
      setOaData({
        Aptitude: aptRes.data.questions,
        Reasoning: reaRes.data.questions,
        Verbal: verRes.data.questions,
        Coding: codeRes.data.questions
      });
      setOaAnswers({ Aptitude: {}, Reasoning: {}, Verbal: {}, Coding: {} });
      setOaCode(Object.fromEntries(codeRes.data.questions.map((q, i) => [i, q.starterCode || ''])));
      setOaRunResults({});
      setOaSectionIndex(0);
      setOaCodingIndex(0);
      setOaTimeLeft(OA_SECTION_TIME[OA_SECTIONS[0]]);
      setStage(STAGES.OA_ACTIVE);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to generate assessment. Please try again.');
    } finally {
      setOaLoading(false);
    }
  };

  const confirmAdvanceSection = (section) => {
    if (section === 'Coding') { advanceOASection(); return; }
    const total = oaData[section]?.length || 0;
    const answered = Object.keys(oaAnswers[section] || {}).length;
    if (answered < total) {
      const proceed = window.confirm(`You've answered ${answered}/${total} questions in ${section}. Submit anyway?`);
      if (!proceed) return;
    }
    advanceOASection();
  };

  const advanceOASection = () => {
    if (oaSectionIndex < OA_SECTIONS.length - 1) {
      const next = oaSectionIndex + 1;
      setOaSectionIndex(next);
      setOaTimeLeft(OA_SECTION_TIME[OA_SECTIONS[next]]);
      setOaCodingIndex(0);
    } else {
      clearOAProgress();
      setStage(STAGES.OA_RESULTS);
    }
  };

  const selectOAMcqAnswer = (section, qIndex, optionIndex) => {
    setOaAnswers(prev => ({ ...prev, [section]: { ...prev[section], [qIndex]: optionIndex } }));
  };

  // const evaluateOAVerbal = async () => {
  //   const q = oaData.Verbal[oaVerbalIndex];
  //   const answer = oaAnswers.Verbal[oaVerbalIndex];
  //   if (!answer?.trim() || answer.trim().length < 10) return toast.error('Please write a proper answer (at least 10 characters)');
  //   setOaVerbalLoading(true);
  //   try {
  //     const res = await axios.post('/api/interview/evaluate', { question: q.question, answer, role: 'Software Engineer', type: 'Verbal' });
  //     setOaVerbalEval(prev => ({ ...prev, [oaVerbalIndex]: res.data.evaluation }));
  //   } catch (err) {
  //     toast.error(err.response?.data?.error || 'Evaluation failed');
  //   } finally {
  //     setOaVerbalLoading(false);
  //   }
  // };

  const changeOALanguage = async (lang) => {
    if (lang === oaLanguage) return;
    setOaLanguage(lang);
    const problem = oaData.Coding[oaCodingIndex];
    if (!problem) return;

    const cached = oaStarterCodeCache[oaCodingIndex]?.[lang];
    if (cached != null) {
      setOaCode(prev => ({ ...prev, [oaCodingIndex]: cached }));
      return;
    }

    setOaLangLoading(true);
    try {
      const res = await axios.post('/api/interview/starter-code', { title: problem.title, description: problem.description, language: lang });
      const code = res.data.starterCode;
      setOaStarterCodeCache(prev => ({ ...prev, [oaCodingIndex]: { ...(prev[oaCodingIndex] || {}), [lang]: code } }));
      setOaCode(prev => ({ ...prev, [oaCodingIndex]: code }));
    } catch (err) {
      toast.error('Failed to load starter code for this language');
    } finally {
      setOaLangLoading(false);
    }
  };

  const resetToStarterCode = () => {
    const problem = oaData.Coding[oaCodingIndex];
    if (!problem) return;
    const original = oaStarterCodeCache[oaCodingIndex]?.[oaLanguage] ?? problem.starterCode ?? '';
    setOaCode(prev => ({ ...prev, [oaCodingIndex]: original }));
    toast.success('Code reset to starter template');
  };

  const runOACode = async () => {
    const problem = oaData.Coding[oaCodingIndex];
    const code = oaCode[oaCodingIndex] || '';
    if (!code.trim()) return toast.error('Please write some code first');
    setOaRunning(true);
    try {
      const res = await axios.post('/api/interview/run-code', { code, language: oaLanguage, testCases: problem.testCases });
      setOaRunResults(prev => ({ ...prev, [oaCodingIndex]: res.data }));
      setOaAnswers(prev => ({ ...prev, Coding: { ...prev.Coding, [oaCodingIndex]: { code, passedCount: res.data.passedCount, totalCount: res.data.totalCount } } }));
      if (res.data.allPassed) toast.success('All test cases passed!');
      else toast(`${res.data.passedCount}/${res.data.totalCount} test cases passed`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Code execution failed');
    } finally {
      setOaRunning(false);
    }
  };

  const oaSectionScore = (section) => {
    if (section === 'Coding') {
      const entries = Object.values(oaAnswers.Coding);
      if (!entries.length) return { correct: 0, total: oaData.Coding.length };
      const totalPassed = entries.reduce((sum, e) => sum + (e.passedCount || 0), 0);
      const totalCases = entries.reduce((sum, e) => sum + (e.totalCount || 0), 0);
      return { correct: totalPassed, total: totalCases };
    }
    let correct = 0;
    oaData[section].forEach((q, i) => { if (oaAnswers[section][i] === q.correctIndex) correct++; });
    return { correct, total: oaData[section].length };
  };

  const resetOA = () => {
    clearOAProgress();
    setStage(STAGES.MODE);
    setOaData({ Aptitude: [], Reasoning: [], Verbal: [], Coding: [] });
    setOaAnswers({ Aptitude: {}, Reasoning: {}, Verbal: {}, Coding: {} });
    setOaSectionIndex(0);
    setOaCodingIndex(0);
    setOaRunResults({});
  };

  const avgScore = () => {
    const scores = Object.values(evaluations).filter(e => e?.score != null).map(e => e.score);
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) : 0;
  };

  useEffect(() => {
    if (stage !== STAGES.OA_ACTIVE) return;
    if (oaTimeLeft <= 0) { advanceOASection(); return; }
    const timer = setInterval(() => setOaTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [stage, oaTimeLeft, oaSectionIndex]);

  useEffect(() => {
    if (stage !== STAGES.OA_ACTIVE) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [stage]);

  useEffect(() => {
    if (stage !== STAGES.OA_ACTIVE) return;
    const payload = { oaData, oaAnswers, oaSectionIndex, oaTimeLeft, oaCodingIndex, oaCode, oaRunResults, oaLanguage, oaStarterCodeCache };
    try { localStorage.setItem(OA_STORAGE_KEY, JSON.stringify(payload)); } catch {}
  }, [stage, oaData, oaAnswers, oaSectionIndex, oaTimeLeft, oaCodingIndex, oaCode, oaRunResults, oaLanguage, oaStarterCodeCache]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  /* ── MODE PICKER ── */
  if (stage === STAGES.MODE) return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-1">Prep Zone</h1>
        <p className="text-gray-500">AI-powered practice for every part of the placement process</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl">
        <button
          onClick={() => setStage(STAGES.OA_SETUP)}
          className="card text-left space-y-3 border border-white/10 hover:border-primary-500/30 transition-all group relative overflow-hidden"
        >
          <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wide bg-primary-500/15 text-primary-400 px-2 py-0.5 rounded-full">New</span>
          <div className="w-11 h-11 rounded-xl bg-primary-500/10 flex items-center justify-center group-hover:bg-primary-500/15 transition-colors">
            <FileText className="w-5 h-5 text-primary-400" />
          </div>
          <h2 className="font-display font-semibold text-white text-lg">Online Assessment</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            A real OA-style test — Aptitude, Reasoning, Verbal, and Coding sections, each timed, just like TCS/Infosys/Capgemini drives.
          </p>
          <span className="inline-flex items-center gap-1 text-primary-400 text-sm font-medium pt-1">
            Start <ChevronRight className="w-4 h-4" />
          </span>
        </button>

        <button
          onClick={() => setStage(STAGES.VIDEO_SETUP)}
          className="card text-left space-y-3 border border-white/10 hover:border-primary-500/30 transition-all group relative overflow-hidden"
        >
          <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wide bg-primary-500/15 text-primary-400 px-2 py-0.5 rounded-full">New</span>
          <div className="w-11 h-11 rounded-xl bg-primary-500/10 flex items-center justify-center group-hover:bg-primary-500/15 transition-colors">
            <Video className="w-5 h-5 text-primary-400" />
          </div>
          <h2 className="font-display font-semibold text-white text-lg">Video Interview</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            A live, AI-led interview with your webcam and voice — just like a real call.
          </p>
          <span className="inline-flex items-center gap-1 text-primary-400 text-sm font-medium pt-1">
            Start <ChevronRight className="w-4 h-4" />
          </span>
        </button>

        </div>
    </div>
  );

  if (stage === STAGES.VIDEO_SETUP) return <VideoInterview onBack={() => setStage(STAGES.MODE)} />;

  if (stage === STAGES.SETUP) return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-1">{mode === 'Verbal' ? 'Verbal Practice' : 'Technical Interview'}</h1>
        <p className="text-gray-500">AI-powered mock interviews with real-time evaluation and feedback</p>
      </div>

      <div className="card max-w-lg space-y-5">
        <h2 className="font-display font-semibold text-white flex items-center gap-2">
          <Play className="w-4 h-4 text-primary-400" /> Configure Your Interview
        </h2>
        <div>
          <label className="label">Target Role *</label>
          <select className="input-field" value={config.role} onChange={e => setConfig(p => ({ ...p, role: e.target.value }))}>
            <option value="">Select role...</option>
            {roles.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {difficulties.map(d => (
            <button key={d} onClick={() => setConfig(p => ({ ...p, difficulty: d }))}
              className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${config.difficulty === d ? 'bg-primary-500 border-primary-500 text-white' : 'border-white/10 text-gray-400 hover:border-primary-500/30'}`}>
              {d}
            </button>
          ))}
        </div>
        {mode !== 'Verbal' && (
        <div>
          <label className="label">Interview Type</label>
          <select className="input-field" value={config.type} onChange={e => setConfig(p => ({ ...p, type: e.target.value }))}>
            {types.map(t => <option key={t} value={t}>{t === 'mixed' ? 'Mixed (All types)' : t}</option>)}
          </select>
        </div>
        )}
        <div>
          <label className="label">Number of Questions: {config.count}</label>
          <input type="range" min="3" max="10" value={config.count} onChange={e => setConfig(p => ({ ...p, count: parseInt(e.target.value) }))}
            className="w-full accent-primary-500" />
          <div className="flex justify-between text-xs text-gray-600 mt-1"><span>3 (Quick)</span><span>10 (Full)</span></div>
        </div>
        <button onClick={startInterview} disabled={loading || !config.role} className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</> : <><Play className="w-4 h-4" /> Start Interview</>}
        </button>
        <button onClick={() => setStage(STAGES.MODE)} className="btn-ghost w-full text-sm">← Back to mode selection</button>
      </div>
    </div>
  );

  if (stage === STAGES.ACTIVE) {
    const q = questions[currentQ];
    const ev = evaluations[currentQ];
    const answered = !!answers[currentQ]?.trim();
    const evaluated = !!ev;

    return (
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">{config.role} Interview</h1>
            <p className="text-gray-500 text-sm">{config.difficulty} · {config.type === 'mixed' ? 'Mixed Types' : config.type}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Question {currentQ + 1}/{questions.length}</p>
            <div className="flex gap-1 mt-1">
              {questions.map((_, i) => (
                <div key={i} className={`h-1 w-6 rounded-full transition-all ${i < currentQ ? 'bg-green-400' : i === currentQ ? 'bg-primary-400' : 'bg-white/10'}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="card border border-primary-500/15">
          <div className="flex items-center gap-2 mb-4">
            <span className={`badge text-xs ${q.type === 'DSA' ? 'bg-red-500/10 text-red-400' : q.type === 'Behavioral' ? 'bg-yellow-500/10 text-yellow-400' : q.type === 'HR' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>{q.type}</span>
            <span className="text-xs text-gray-600">Be specific and detailed</span>
          </div>
          <p className="text-white text-lg leading-relaxed font-medium">{q.question}</p>
          {q.hints?.length > 0 && (
            <details className="mt-4">
              <summary className="text-xs text-primary-400 cursor-pointer select-none hover:text-primary-300">Hint (click to reveal)</summary>
              <ul className="mt-2 space-y-1">
                {q.hints.map((h, i) => <li key={i} className="text-xs text-gray-400 pl-3 border-l border-primary-500/30">{h}</li>)}
              </ul>
            </details>
          )}
        </div>

        <div>
          <label className="label">Your Answer</label>
          <textarea
            className="input-field min-h-36 resize-none"
            placeholder="Type your detailed answer here. Be specific, use examples, and structure your response clearly..."
            value={answers[currentQ] || ''}
            onChange={e => setAnswers(p => ({ ...p, [currentQ]: e.target.value }))}
            disabled={evaluated}
          />
          <p className="text-xs text-gray-600 mt-1">{(answers[currentQ] || '').length} chars · Aim for 100+ words</p>
        </div>

        {!evaluated ? (
          <div className="flex gap-3">
            <button onClick={evaluateAnswer} disabled={evalLoading || !answered} className="btn-primary flex items-center gap-2 disabled:opacity-50">
              {evalLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Evaluating...</> : <><Zap className="w-4 h-4" /> Get AI Feedback</>}
            </button>
            <button onClick={nextQuestion} className="btn-ghost text-sm">
              Skip {currentQ === questions.length - 1 ? '→ Finish' : '→ Next'}
            </button>
          </div>
        ) : (
          <div className="space-y-3 animate-slide-up">
            <div className="card border border-primary-500/20">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white">AI Feedback</h3>
                <ScoreBadge score={ev.score} />
              </div>
              <p className="text-gray-300 text-sm mb-3 leading-relaxed">{ev.feedback}</p>
              {ev.idealAnswer && (
                <details>
                  <summary className="text-xs text-primary-400 cursor-pointer hover:text-primary-300">View ideal answer structure</summary>
                  <p className="mt-2 text-xs text-gray-400 p-3 bg-white/3 rounded-lg leading-relaxed">{ev.idealAnswer}</p>
                </details>
              )}
            </div>
            <button onClick={nextQuestion} className="btn-primary flex items-center gap-2">
              {currentQ < questions.length - 1 ? <>Next Question <ChevronRight className="w-4 h-4" /></> : <>Finish Interview <CheckCircle className="w-4 h-4" /></>}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (stage === STAGES.REVIEW) return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-white">Review Answers</h1>
        <span className="badge bg-primary-500/15 text-primary-400 border border-primary-500/25">Avg Score: {avgScore()}%</span>
      </div>
      <div className="space-y-4">
        {questions.map((q, i) => (
          <div key={i} className="card">
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="text-white font-medium text-sm flex-1">{i + 1}. {q.question}</p>
              {evaluations[i] && <ScoreBadge score={evaluations[i].score} />}
            </div>
            {answers[i] ? <p className="text-gray-400 text-sm bg-white/3 rounded-lg p-3">{answers[i]}</p> : <p className="text-gray-600 text-sm italic">Skipped</p>}
            {evaluations[i]?.feedback && <p className="text-xs text-primary-300/70 mt-2 pt-2 border-t border-white/5">{evaluations[i].feedback}</p>}
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={finishInterview} className="btn-primary flex items-center gap-2">
          <Award className="w-4 h-4" /> Save Results
        </button>
        <button onClick={reset} className="btn-ghost flex items-center gap-2">
          <RotateCcw className="w-4 h-4" /> New Interview
        </button>
      </div>
    </div>
  );

  if (stage === STAGES.RESULTS) return (
    <div className="space-y-5 animate-slide-up text-center max-w-lg mx-auto">
      <div className="text-6xl">🎉</div>
      <h1 className="text-3xl font-display font-bold text-white">Interview Complete!</h1>
      <div className="card">
        <div className="text-5xl font-display font-bold text-gradient-blue mb-2">{avgScore()}%</div>
        <p className="text-gray-400">Overall Score</p>
        <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/5 text-sm text-left">
          <div><span className="text-gray-500">Role</span><p className="text-white font-medium mt-0.5">{config.role}</p></div>
          <div><span className="text-gray-500">Difficulty</span><p className="text-white font-medium mt-0.5">{config.difficulty}</p></div>
          <div><span className="text-gray-500">Questions</span><p className="text-white font-medium mt-0.5">{questions.length}</p></div>
          <div><span className="text-gray-500">Evaluated</span><p className="text-white font-medium mt-0.5">{Object.keys(evaluations).length}</p></div>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={reset} className="btn-primary flex-1 flex items-center justify-center gap-2">
          <RotateCcw className="w-4 h-4" /> Try Again
        </button>
      </div>
    </div>
  );

  if (stage === STAGES.MCQ_SETUP) return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-1">{mcqCategory} Practice</h1>
        <p className="text-gray-500">MCQs with instant right/wrong feedback and explanations</p>
      </div>
      <div className="card max-w-lg space-y-5">
        <h2 className="font-display font-semibold text-white flex items-center gap-2">
          <Play className="w-4 h-4 text-primary-400" /> Configure Your Practice
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {difficulties.map(d => (
            <button key={d} onClick={() => setMcqDifficulty(d)}
              className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${mcqDifficulty === d ? 'bg-primary-500 border-primary-500 text-white' : 'border-white/10 text-gray-400 hover:border-primary-500/30'}`}>
              {d}
            </button>
          ))}
        </div>
        <button onClick={startMcq} disabled={mcqLoading} className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50">
          {mcqLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</> : <><Play className="w-4 h-4" /> Start Practice</>}
        </button>
        <button onClick={() => setStage(STAGES.MODE)} className="btn-ghost w-full text-sm">← Back to mode selection</button>
      </div>
    </div>
  );

  if (stage === STAGES.MCQ_ACTIVE) {
    const q = mcqQuestions[mcqIndex];
    const selected = mcqAnswers[mcqIndex];
    const answered = selected != null;

    return (
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">{mcqCategory} Practice</h1>
            <p className="text-gray-500 text-sm">{mcqDifficulty}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Question {mcqIndex + 1}/{mcqQuestions.length}</p>
            <div className="flex gap-1 mt-1">
              {mcqQuestions.map((_, i) => (
                <div key={i} className={`h-1 w-6 rounded-full transition-all ${i < mcqIndex ? 'bg-green-400' : i === mcqIndex ? 'bg-primary-400' : 'bg-white/10'}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="card border border-primary-500/15">
          <p className="text-white text-lg leading-relaxed font-medium">{q.question}</p>
        </div>

        <div className="space-y-3">
          {q.options.map((opt, i) => {
            let stateClasses = 'border-white/10 hover:border-primary-500/30 text-gray-300';
            if (answered) {
              if (i === q.correctIndex) stateClasses = 'border-green-500/40 bg-green-500/10 text-green-300';
              else if (i === selected) stateClasses = 'border-red-500/40 bg-red-500/10 text-red-300';
              else stateClasses = 'border-white/5 text-gray-600';
            }
            return (
              <button key={i} onClick={() => selectMcqAnswer(i)} disabled={answered}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm flex items-center gap-3 ${stateClasses}`}>
                {answered && i === q.correctIndex && <CheckCircle className="w-4 h-4 shrink-0" />}
                {answered && i === selected && i !== q.correctIndex && <XCircle className="w-4 h-4 shrink-0" />}
                <span>{opt}</span>
              </button>
            );
          })}
        </div>

        {answered && (
          <div className="space-y-3 animate-slide-up">
            <div className="card border border-primary-500/20">
              <h3 className="font-semibold text-white mb-2">
                {selected === q.correctIndex ? 'Correct!' : 'Not quite'}
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">{q.explanation}</p>
            </div>
            <button onClick={nextMcqQuestion} className="btn-primary flex items-center gap-2">
              {mcqIndex < mcqQuestions.length - 1 ? <>Next Question <ChevronRight className="w-4 h-4" /></> : <>Finish <CheckCircle className="w-4 h-4" /></>}
            </button>
          </div>
        )}
      </div>
    );
  }
  if (stage === STAGES.OA_SETUP) return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-1">Online Assessment</h1>
        <p className="text-gray-500">Aptitude, Reasoning, Verbal, and Coding — each section is timed, just like a real OA</p>
      </div>
      {oaLoading ? (
        <div className="card max-w-lg space-y-5 animate-pulse">
          <div className="h-5 w-40 bg-white/10 rounded" />
          <div className="space-y-3">
            {OA_SECTIONS.map(s => (
              <div key={s} className="h-11 rounded-xl bg-white/5 border border-white/10" />
            ))}
          </div>
          <div className="h-9 w-full bg-white/5 rounded-xl" />
          <div className="h-11 w-full bg-primary-500/20 rounded-xl" />
          <p className="text-xs text-gray-600 text-center">Preparing your assessment — this can take a few seconds...</p>
        </div>
      ) : (
      <div className="card max-w-lg space-y-5">
        <h2 className="font-display font-semibold text-white flex items-center gap-2">
          <Play className="w-4 h-4 text-primary-400" /> What to expect
        </h2>
        <div>
          <label className="label">Company (optional)</label>
          <select className="input-field" value={oaCompany} onChange={e => setOaCompany(e.target.value)}>
            <option value="">Generic OA (no specific company)</option>
            {COMPANIES.map(c => <option key={c} value={c}>{c} — actual drive pattern</option>)}
          </select>
          {oaCompany && <p className="text-xs text-primary-400 mt-1">Questions will follow {oaCompany}'s real OA pattern, blending verified past questions with AI-styled ones.</p>}
        </div>
        <div className="space-y-3">
          {OA_SECTIONS.map(s => (
            <div key={s} className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/10 text-sm">
              <span className="text-gray-300">{s}</span>
              <span className="text-gray-500 flex items-center gap-1"><Timer className="w-3.5 h-3.5" /> {OA_SECTION_TIME[s] / 60} min</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600">Each section auto-submits and moves to the next when time runs out. You cannot go back to a previous section. You'll choose your coding language inside the Coding section.</p>
        <button onClick={startOA} disabled={oaLoading} className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50">
          {oaLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Preparing assessment...</> : <><Play className="w-4 h-4" /> Start Assessment</>}
        </button>
        <button onClick={() => setStage(STAGES.MODE)} className="btn-ghost w-full text-sm">← Back to mode selection</button>
      </div>
      )}
    </div>
  );

  if (stage === STAGES.OA_ACTIVE) {
    const section = OA_SECTIONS[oaSectionIndex];

    const exitAssessment = () => {
      const proceed = window.confirm('Leave the assessment? Your progress will be lost.');
      if (!proceed) return;
      clearOAProgress();
      setStage(STAGES.MODE);
    };

    return (
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex gap-2 items-center">
            <button onClick={exitAssessment} className="btn-ghost text-xs text-gray-500 hover:text-red-400 mr-2">← Exit</button>
            {OA_SECTIONS.map((s, i) => (
              <span key={s} className={`badge text-xs ${i === oaSectionIndex ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30' : i < oaSectionIndex ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-gray-600'}`}>{s}</span>
            ))}
          </div>
          <div className={`flex items-center gap-1.5 font-mono text-sm ${oaTimeLeft <= 30 ? 'text-red-400' : oaTimeLeft <= 60 ? 'text-yellow-400' : 'text-gray-300'}`}>
            <Clock className="w-4 h-4" /> {formatTime(oaTimeLeft)}
          </div>
        </div>

        {(section === 'Aptitude' || section === 'Reasoning') && (
          <div className="space-y-4">
            {oaData[section].map((q, i) => (
              <div key={i} className="card space-y-3">
                <p className="text-white font-medium text-sm">{i + 1}. {q.question}</p>
                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <button key={oi} onClick={() => selectOAMcqAnswer(section, i, oi)}
                      className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all ${oaAnswers[section][i] === oi ? 'border-primary-500/50 bg-primary-500/10 text-primary-300' : 'border-white/10 text-gray-300 hover:border-primary-500/30'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={() => confirmAdvanceSection(section)} className="btn-primary flex items-center gap-2">
              {oaSectionIndex < OA_SECTIONS.length - 1 ? <>Submit & Next Section <ChevronRight className="w-4 h-4" /></> : <>Finish Assessment <CheckCircle className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {section === 'Verbal' && (
          <div className="space-y-4">
            {oaData.Verbal.map((q, i) => {
              const hasPassage = q.question.includes('|||');
              const [passage, actualQuestion] = hasPassage ? q.question.split('|||') : [null, q.question];
              return (
                <div key={i} className="card space-y-3">
                  {passage && (
                    <div className="bg-white/3 border border-white/10 rounded-lg p-3">
                      <p className="text-gray-400 text-xs italic leading-relaxed whitespace-pre-line">{passage.trim()}</p>
                    </div>
                  )}
                  <p className="text-white font-medium text-sm whitespace-pre-line">{i + 1}. {actualQuestion.trim()}</p>
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => (
                      <button key={oi} onClick={() => selectOAMcqAnswer('Verbal', i, oi)}
                        className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all ${oaAnswers.Verbal[i] === oi ? 'border-primary-500/50 bg-primary-500/10 text-primary-300' : 'border-white/10 text-gray-300 hover:border-primary-500/30'}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <button onClick={() => confirmAdvanceSection('Verbal')} className="btn-primary flex items-center gap-2">
              Submit & Next Section <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {section === 'Coding' && (() => {
          const problem = oaData.Coding[oaCodingIndex];
          const runResult = oaRunResults[oaCodingIndex];
          if (!problem) return null;
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">Problem {oaCodingIndex + 1}/{oaData.Coding.length}</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                <div className="space-y-4">
                  <div className="card space-y-3 p-6">
                    <h3 className="font-semibold text-white text-lg">{problem.title}</h3>
                    <p className="text-gray-300 text-base leading-relaxed whitespace-pre-line">{problem.description}</p>
                    {problem.constraints && <p className="text-sm text-gray-500">Constraints: {problem.constraints}</p>}
                  </div>
                  {runResult && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400">{runResult.passedCount}/{runResult.totalCount} test cases passed</p>
                      {runResult.results.filter(r => !r.hidden).map((r, ri) => (
                        <div key={ri} className={`card text-xs space-y-1 border ${r.passed ? 'border-green-500/20' : 'border-red-500/20'}`}>
                          <p className="text-gray-400">Input: <span className="text-gray-300">{r.input}</span></p>
                          <p className="text-gray-400">Expected: <span className="text-gray-300">{r.expectedOutput}</span></p>
                          <p className="text-gray-400">Got: <span className={r.passed ? 'text-green-400' : 'text-red-400'}>{r.actualOutput || '(no output)'}</span></p>
                        </div>
                      ))}
                      <p className="text-xs text-gray-600">+ {runResult.results.filter(r => r.hidden).length} hidden test case(s)</p>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm text-gray-400">Language:</span>
                    <select
                      className="input-field w-40 py-2 text-sm"
                      value={oaLanguage}
                      disabled={oaLangLoading}
                      onChange={e => changeOALanguage(e.target.value)}
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="java">Java</option>
                      <option value="cpp">C++</option>
                      <option value="c">C</option>
                    </select>
                    {oaLangLoading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    <button onClick={resetToStarterCode} className="btn-ghost text-xs ml-auto flex items-center gap-1">
                      <RotateCcw className="w-3.5 h-3.5" /> Reset code
                    </button>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-white/10">
                    <Editor
                      height="500px"
                      language={oaLanguage === 'cpp' ? 'cpp' : oaLanguage}
                      theme="vs-dark"
                      value={oaCode[oaCodingIndex] ?? problem.starterCode ?? ''}
                      onChange={(val) => setOaCode(prev => ({ ...prev, [oaCodingIndex]: val ?? '' }))}
                      options={{ minimap: { enabled: false }, fontSize: 14, lineNumbers: 'on', scrollBeyondLastLine: false, padding: { top: 12 } }}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={runOACode} disabled={oaRunning} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                      {oaRunning ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Running...</> : <><Play className="w-4 h-4" /> Run Code</>}
                    </button>
                    <button onClick={() => oaCodingIndex < oaData.Coding.length - 1 ? setOaCodingIndex(i => i + 1) : advanceOASection()} className="btn-ghost text-sm">
                      {oaCodingIndex < oaData.Coding.length - 1 ? 'Next Problem →' : 'Finish Assessment →'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  if (stage === STAGES.OA_RESULTS) {
    const sectionScores = OA_SECTIONS.map(s => ({ section: s, ...oaSectionScore(s) }));
    return (
      <div className="space-y-5 animate-slide-up text-center max-w-lg mx-auto">
        <div className="text-6xl">🏆</div>
        <h1 className="text-3xl font-display font-bold text-white">Assessment Complete!</h1>
        <div className="card space-y-4">
          {sectionScores.map(s => (
            <div key={s.section} className="flex items-center justify-between text-sm border-b border-white/5 pb-3 last:border-0 last:pb-0">
              <span className="text-gray-400">{s.section}</span>
              <span className="text-white font-semibold">{s.correct}/{s.total}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={resetOA} className="btn-primary flex-1 flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" /> Try Again
          </button>
        </div>
      </div>
    );
  }

  if (stage === STAGES.MCQ_RESULTS) return (
    <div className="space-y-5 animate-slide-up text-center max-w-lg mx-auto">
      <div className="text-6xl">🎯</div>
      <h1 className="text-3xl font-display font-bold text-white">Practice Complete!</h1>
      <div className="card">
        <div className="text-5xl font-display font-bold text-gradient-blue mb-2">{mcqScore()}/{mcqQuestions.length}</div>
        <p className="text-gray-400">Correct Answers</p>
        <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/5 text-sm text-left">
          <div><span className="text-gray-500">Category</span><p className="text-white font-medium mt-0.5">{mcqCategory}</p></div>
          <div><span className="text-gray-500">Difficulty</span><p className="text-white font-medium mt-0.5">{mcqDifficulty}</p></div>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={resetMcq} className="btn-primary flex-1 flex items-center justify-center gap-2">
          <RotateCcw className="w-4 h-4" /> Try Again
        </button>
      </div>
    </div>
  );
}

// Polyfill missing import
function Zap({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>; }