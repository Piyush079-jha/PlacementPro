import { useState, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Zap, TrendingUp, Target } from 'lucide-react';

const ROLES = [
  'Software Engineer', 'Frontend Developer', 'Backend Developer',
  'Full Stack Developer', 'Data Scientist', 'Data Analyst',
  'DevOps Engineer', 'ML Engineer', 'Android Developer',
  'iOS Developer', 'Product Manager', 'UI/UX Designer',
  'Cloud Engineer', 'Cybersecurity Analyst', 'QA Engineer',
];

const ScoreBar = ({ label, score, color = 'bg-primary-500' }) => (
  <div>
    <div className="flex justify-between text-sm mb-1.5">
      <span className="text-gray-400">{label}</span>
      <span className="text-white font-medium">{score}%</span>
    </div>
    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-1000`} style={{ width: `${score}%` }} />
    </div>
  </div>
);

const ScoreCircle = ({ score }) => {
  const color = score >= 70 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  const circumference = 220;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-28 h-28">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        <circle cx="40" cy="40" r="35" fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.5s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-display font-bold text-white">{score}</span>
        <span className="text-xs text-gray-500">/100</span>
      </div>
    </div>
  );
};

export default function ResumeAnalyzer() {
  const [resumeText, setResumeText] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [roleSuggestions, setRoleSuggestions] = useState([]);
  const [inputMode, setInputMode] = useState('text');
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    if (file.type === 'application/pdf') {
      setFileName(file.name);
      const formData = new FormData();
      formData.append('resume', file);
      try {
        toast.loading('Extracting text from PDF...', { id: 'pdf' });
        const res = await axios.post('/api/resume/parse-pdf', formData);
        setResumeText(res.data.text);
        toast.success('PDF text extracted!', { id: 'pdf' });
        setInputMode('text');
      } catch (err) {
        toast.error('PDF extraction failed — please paste your resume text', { id: 'pdf' });
      }
      return;
    }
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (e) => { setResumeText(e.target.result); setFileName(file.name); };
      reader.readAsText(file);
      return;
    }
    toast.error('Please upload a PDF or .txt file');
  };

  const handleRoleInput = (val) => {
    setTargetRole(val);
    if (val.length < 2) { setRoleSuggestions([]); return; }
    const matches = ROLES.filter(r => r.toLowerCase().includes(val.toLowerCase()));
    setRoleSuggestions(matches);
  };

  const handleAnalyze = async () => {
    if (!resumeText.trim() || resumeText.trim().length < 50) return toast.error('Please paste your resume text (minimum 50 characters)');
    setLoading(true);
    setAnalysis(null);
    try {
      const res = await axios.post('/api/resume/analyze', { resumeText, targetRole });
      setAnalysis(res.data.analysis);
      setActiveTab('overview');
      toast.success('Resume analyzed successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Analysis failed. Check your API key.');
    } finally {
      setLoading(false);
    }
  };

  const tabs = ['overview', 'improvements', 'skills', 'quickwins'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">Resume Analyzer</h1>
        <p className="text-gray-500">Get AI-powered feedback and improve your resume score</p>
      </div>

      {!analysis && (
        <div className="grid md:grid-cols-5 gap-6">
          {/* Left — Input (3 cols) */}
          <div className="md:col-span-3 card space-y-4">

            {/* Tab switcher */}
            <div className="flex gap-1 p-1 bg-white/3 rounded-xl border border-white/5 w-fit">
              <button onClick={() => { setInputMode('text'); setFileName(''); }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${inputMode === 'text' ? 'bg-primary-500 text-white' : 'text-gray-500 hover:text-white'}`}>
                <FileText className="w-3.5 h-3.5" /> Paste Text
              </button>
              <button onClick={() => { setInputMode('file'); setResumeText(''); }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${inputMode === 'file' ? 'bg-primary-500 text-white' : 'text-gray-500 hover:text-white'}`}>
                <Upload className="w-3.5 h-3.5" /> Upload File
              </button>
            </div>

            {/* File upload mode */}
            {inputMode === 'file' && (
              <div>
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => {
                    e.preventDefault(); setDragging(false);
                    handleFile(e.dataTransfer.files[0]);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${dragging ? 'border-primary-500 bg-primary-500/5' : 'border-white/10 hover:border-primary-500/40 hover:bg-primary-500/3'}`}
                >
                  <input ref={fileInputRef} type="file" accept=".txt,.pdf" className="hidden"
                    onChange={e => handleFile(e.target.files[0])}
                  />
                  <Upload className={`w-8 h-8 mx-auto mb-3 transition-colors ${dragging ? 'text-primary-400' : 'text-gray-600'}`} />
                  {fileName
                    ? <p className="text-sm text-primary-400 font-medium">{fileName} loaded ✓</p>
                    : <>
                        <p className="text-sm text-gray-400">Drop your resume here or <span className="text-primary-400 font-medium">browse</span></p>
                        <p className="text-xs text-gray-600 mt-1 flex items-center justify-center gap-1">
                          ✅ PDF supported &nbsp;·&nbsp; ✅ .txt supported
                        </p>
                      </>
                  }
                </div>
                {fileName && (
                  <button onClick={() => { setFileName(''); setResumeText(''); }}
                    className="text-xs text-gray-600 hover:text-red-400 mt-2 transition-colors">
                    ✕ Remove file
                  </button>
                )}
              </div>
            )}

            {/* Paste text mode */}
            {inputMode === 'text' && (
              <div>
                <textarea
                  className="input-field resize-none w-full"
                  style={{ minHeight: '220px' }}
                  placeholder={'Paste your full resume text here...\n\nInclude: Education, Skills, Projects, Experience, Achievements'}
                  value={resumeText}
                  onChange={e => setResumeText(e.target.value)}
                  disabled={loading}
                />
                <p className={`text-xs mt-1 ${resumeText.length >= 50 ? 'text-green-500' : 'text-gray-600'}`}>
                  {resumeText.length} characters {resumeText.length >= 50 ? '✓ ready' : '(min 50)'}
                </p>
              </div>
            )}

            <div className="relative">
              <label className="label">Target Role (optional)</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Software Engineer, Data Analyst"
                value={targetRole}
                onChange={e => handleRoleInput(e.target.value)}
                onBlur={() => setTimeout(() => setRoleSuggestions([]), 150)}
                disabled={loading}
              />
              {roleSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-dark-800 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                  {roleSuggestions.map(r => (
                    <div key={r} onMouseDown={() => { setTargetRole(r); setRoleSuggestions([]); }}
                      className="px-4 py-2.5 text-sm text-gray-300 hover:bg-primary-500/10 hover:text-white cursor-pointer transition-colors">
                      {r}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading || resumeText.length < 50}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analyzing with AI...</>
                : <><Zap className="w-4 h-4" /> Analyze Resume</>
              }
            </button>
          </div>

          {/* Right — What you'll get (2 cols) */}
          <div className="md:col-span-2 space-y-4 md:sticky md:top-6 md:self-start">
            <div className="card border border-primary-500/20">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary-400" />
                What you'll get
              </h3>
              <div className="space-y-3">
                {[
                  { icon: '🎯', label: 'ATS Score', desc: 'How well your resume passes applicant tracking systems' },
                  { icon: '💪', label: 'Strengths', desc: 'What your resume does well' },
                  { icon: '⚠️', label: 'Improvements', desc: 'Section-by-section fixes with suggestions' },
                  { icon: '🔍', label: 'Missing Keywords', desc: 'Keywords ATS systems are looking for' },
                  { icon: '📈', label: 'Skill Gaps', desc: 'Skills to learn for your target role' },
                  { icon: '⚡', label: 'Quick Wins', desc: 'Top changes to make right now' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-lg leading-none mt-0.5">{item.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card border border-white/5 bg-white/2">
              <p className="text-xs text-gray-600 leading-relaxed">
                💡 <strong className="text-gray-400">Tip:</strong> Copy everything from your resume — education, skills, projects, experience, achievements. More text = better analysis.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Show input again after analysis */}
      {analysis && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Analyzing: <span className="text-white">{resumeText.slice(0, 60)}...</span></p>
            <button onClick={() => { setAnalysis(null); setResumeText(''); setFileName(''); }}
              className="text-xs text-primary-400 hover:text-primary-300 border border-primary-500/20 px-3 py-1.5 rounded-lg transition-colors">
              Analyze New Resume
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {analysis && (
        <div className="space-y-5 animate-slide-up">
          {/* Score overview */}
          <div className="card">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <ScoreCircle score={analysis.score || 0} />
                <p className="text-sm text-gray-400 font-medium">Overall Score</p>
              </div>
              <div className="flex-1 space-y-3">
                <ScoreBar label="ATS Score" score={analysis.atsScore || 0} color="bg-blue-500" />
                <ScoreBar label="Content Quality" score={analysis.contentScore || 0} color="bg-green-500" />
                <ScoreBar label="Format & Structure" score={analysis.formatScore || 0} color="bg-purple-500" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-gray-300 text-sm leading-relaxed">{analysis.summary}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-white/3 rounded-xl border border-white/5 w-fit">
            {tabs.map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${activeTab === t ? 'bg-primary-500 text-white' : 'text-gray-500 hover:text-white'}`}
              >{t === 'quickwins' ? 'Quick Wins' : t}</button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'overview' && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="card">
                <h3 className="font-display font-semibold text-green-400 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Strengths
                </h3>
                <ul className="space-y-2">
                  {(analysis.strengths || []).map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card">
                <h3 className="font-display font-semibold text-red-400 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Missing Keywords
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(analysis.missingKeywords || []).map((k, i) => (
                    <span key={i} className="badge bg-red-500/10 text-red-400 border border-red-500/20">{k}</span>
                  ))}
                  {(!analysis.missingKeywords?.length) && <p className="text-sm text-gray-600">No critical keywords missing!</p>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'improvements' && (
            <div className="space-y-3">
              {(analysis.improvements || []).map((imp, i) => (
                <div key={i} className="card border border-yellow-500/10">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AlertCircle className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">{imp.section}</p>
                      <p className="text-red-400/80 text-xs mt-1">{imp.issue}</p>
                      <p className="text-green-400/80 text-xs mt-1">💡 {imp.suggestion}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="card">
                <h3 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" /> Skills Detected
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(analysis.skillsDetected || []).map((s, i) => (
                    <span key={i} className="badge bg-green-500/10 text-green-400 border border-green-500/20">{s}</span>
                  ))}
                </div>
              </div>
              <div className="card">
                <h3 className="font-display font-semibold text-white mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-orange-400" /> Skill Gaps
                </h3>
                <div className="space-y-2">
                  {(analysis.skillGaps || []).map((sg, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">{sg.skill}</span>
                      <span className={`badge text-xs ${sg.priority === 'High' ? 'bg-red-500/10 text-red-400' : sg.priority === 'Medium' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-blue-500/10 text-blue-400'}`}>
                        {sg.priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'quickwins' && (
            <div className="card">
              <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary-400" /> Quick Wins — Do These Now
              </h3>
              <div className="space-y-3">
                {(analysis.quickWins || []).map((w, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-primary-500/5 border border-primary-500/10 rounded-xl">
                    <div className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
                    <p className="text-sm text-gray-300">{w}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
