import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { MessageSquare, Play, CheckCircle, ChevronRight, Award, RotateCcw, Clock } from 'lucide-react';

const roles = ['Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Data Scientist', 'Data Analyst', 'DevOps Engineer', 'ML Engineer', 'Android Developer', 'Product Manager'];
const difficulties = ['Easy', 'Medium', 'Hard'];
const types = ['mixed', 'Technical', 'Behavioral', 'HR', 'DSA'];

const STAGES = { SETUP: 'setup', ACTIVE: 'active', REVIEW: 'review', RESULTS: 'results' };

const ScoreBadge = ({ score }) => {
  const color = score >= 8 ? 'text-green-400 bg-green-500/10 border-green-500/20' : score >= 6 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20';
  return <span className={`badge ${color} text-base font-bold`}>{score}/10</span>;
};

export default function Interview() {
  const [config, setConfig] = useState({ role: '', difficulty: 'Medium', count: 5, type: 'mixed' });
  const [stage, setStage] = useState(STAGES.SETUP);
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [evaluations, setEvaluations] = useState({});
  const [loading, setLoading] = useState(false);
  const [evalLoading, setEvalLoading] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [saved, setSaved] = useState(false);

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

  const reset = () => { setStage(STAGES.SETUP); setQuestions([]); setAnswers({}); setEvaluations({}); setSaved(false); };

  const avgScore = () => {
    const scores = Object.values(evaluations).filter(e => e?.score != null).map(e => e.score);
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) : 0;
  };

  if (stage === STAGES.SETUP) return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-1">Interview Prep</h1>
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
        <div>
          <label className="label">Interview Type</label>
          <select className="input-field" value={config.type} onChange={e => setConfig(p => ({ ...p, type: e.target.value }))}>
            {types.map(t => <option key={t} value={t}>{t === 'mixed' ? 'Mixed (All types)' : t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Number of Questions: {config.count}</label>
          <input type="range" min="3" max="10" value={config.count} onChange={e => setConfig(p => ({ ...p, count: parseInt(e.target.value) }))}
            className="w-full accent-primary-500" />
          <div className="flex justify-between text-xs text-gray-600 mt-1"><span>3 (Quick)</span><span>10 (Full)</span></div>
        </div>
        <button onClick={startInterview} disabled={loading || !config.role} className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</> : <><Play className="w-4 h-4" /> Start Interview</>}
        </button>
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
}

// Polyfill missing import
function Zap({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>; }
