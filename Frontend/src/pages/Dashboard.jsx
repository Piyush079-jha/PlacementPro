import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { FileText, Briefcase, MessageSquare, Shield, TrendingUp, Award, Target, ChevronRight, Zap } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, color, sub, cta, onCta }) => (
  <div className="card flex items-start gap-4">
    <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-2xl font-display font-bold text-white">{value}</p>
      <p className="text-sm text-gray-400">{label}</p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
      {cta && (
        <button onClick={onCta} className="text-xs text-primary-400 hover:text-primary-300 mt-1 flex items-center gap-1">
          {cta} <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  </div>
);

const ReadinessRing = ({ score }) => {
  const circumference = 220;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative w-36 h-36">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
        <circle cx="40" cy="40" r="35" fill="none" stroke="url(#ringGrad)" strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.5s ease' }} />
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4f6ef7" />
            <stop offset="100%" stopColor="#f59e4a" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-display font-bold text-white">{score}%</span>
        <span className="text-xs text-gray-500">Ready</span>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/dashboard')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 rounded-2xl bg-white/3" />
      ))}
    </div>
  );

  const { user, stats, recentInterviews, readinessScore, skillGaps } = data || {};
  const chartData = (recentInterviews || []).map((i, idx) => ({
    name: `#${idx + 1} ${i.role?.split(' ')[0]}`,
    score: i.score
  })).reverse();

  const quickActions = [
    { label: 'Analyze Resume', icon: FileText, path: '/resume', color: 'bg-blue-500/15 text-blue-400', desc: 'Get AI feedback' },
    { label: 'Mock Interview', icon: MessageSquare, path: '/interview', color: 'bg-purple-500/15 text-purple-400', desc: 'Practice now' },
    { label: 'Find Jobs', icon: Briefcase, path: '/jobs', color: 'bg-green-500/15 text-green-400', desc: 'Browse listings' },
    { label: 'Detect Fake Job', icon: Shield, path: '/detect', color: 'bg-red-500/15 text-red-400', desc: 'Stay safe' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-display font-bold text-white">
          Hey, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          {user?.targetRole ? `Preparing for ${user.targetRole}` : 'Let\'s get you placed!'} 
          {user?.graduationYear ? ` · Batch of ${user.graduationYear}` : ''}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Resume Score" value={stats?.resumeAnalyzed ? `${user?.resumeScore || 0}%` : 'N/A'} color="bg-blue-500" sub={stats?.resumeAnalyzed ? 'Analyzed' : 'Not analyzed yet'} cta={!stats?.resumeAnalyzed ? 'Analyze now' : null} onCta={() => navigate('/resume')} />
        <StatCard icon={MessageSquare} label="Interviews" value={stats?.interviewSessions || 0} color="bg-purple-500" sub="Sessions completed" />
        <StatCard icon={Briefcase} label="Jobs Applied" value={stats?.jobsApplied || 0} color="bg-green-500" sub="Applications tracked" />
        <StatCard icon={Shield} label="Scam Scans" value={stats?.scansDetected || 0} color="bg-orange-500" sub="Jobs verified" />
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Readiness */}
        <div className="card flex flex-col items-center justify-center gap-4 py-8">
          <ReadinessRing score={readinessScore || 0} />
          <div className="text-center">
            <h3 className="font-display font-semibold text-white">Placement Readiness</h3>
            <p className="text-gray-500 text-sm mt-1">
              {readinessScore < 30 ? 'Just getting started!' : readinessScore < 60 ? 'Good progress, keep going!' : readinessScore < 85 ? 'Almost there!' : 'You\'re ready to ace it! 🚀'}
            </p>
          </div>
          {stats?.averageInterviewScore > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Award className="w-4 h-4 text-yellow-400" />
              <span className="text-gray-400">Avg interview score: <strong className="text-white">{stats.averageInterviewScore}%</strong></span>
            </div>
          )}
        </div>

        {/* Interview chart */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-400" />
              Interview Progress
            </h3>
            <button onClick={() => navigate('/interview')} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
              Start Session <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0d1225', border: '1px solid rgba(79,110,247,0.2)', borderRadius: '10px', fontSize: 12 }} />
                <Line type="monotone" dataKey="score" stroke="#4f6ef7" strokeWidth={2} dot={{ fill: '#4f6ef7', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-gray-600 gap-3">
              <MessageSquare className="w-8 h-8 opacity-40" />
              <p className="text-sm">Complete your first interview to see progress</p>
              <button onClick={() => navigate('/interview')} className="btn-primary text-xs py-1.5 px-4">Start Now</button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary-400" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((a, i) => (
            <button key={i} onClick={() => navigate(a.path)} className="card text-left hover:scale-[1.03] transition-transform duration-200 group">
              <div className={`w-10 h-10 rounded-xl ${a.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <a.icon className="w-5 h-5" />
              </div>
              <p className="font-medium text-white text-sm">{a.label}</p>
              <p className="text-xs text-gray-600 mt-0.5">{a.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Getting Started Checklist */}
      {readinessScore < 30 && (
        <div className="card border border-primary-500/20">
          <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary-400" />
            Get Started — 3 steps to boost your score
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Analyze your resume', done: stats?.resumeAnalyzed, path: '/resume', desc: 'Get ATS score + improvement tips' },
              { label: 'Complete a mock interview', done: stats?.interviewSessions > 0, path: '/interview', desc: 'Practice with AI interviewer' },
              { label: 'Browse verified jobs', done: stats?.jobsApplied > 0, path: '/jobs', desc: 'Apply to fresher-friendly roles' },
            ].map((step, i) => (
              <div key={i} onClick={() => !step.done && navigate(step.path)}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${step.done ? 'opacity-50' : 'cursor-pointer hover:bg-primary-500/5 border border-transparent hover:border-primary-500/20'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${step.done ? 'bg-green-500/20 text-green-400' : 'bg-primary-500/20 text-primary-400'}`}>
                  {step.done ? '✓' : i + 1}
                </div>
                <div>
                  <p className={`text-sm font-medium ${step.done ? 'line-through text-gray-500' : 'text-white'}`}>{step.label}</p>
                  <p className="text-xs text-gray-600">{step.desc}</p>
                </div>
                {!step.done && <ChevronRight className="w-4 h-4 text-gray-600 ml-auto" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skill Gaps */}
      <div className="card">
        <h3 className="font-display font-semibold text-white mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-primary-400" />
          Skill Gaps to Address
        </h3>
        {skillGaps?.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-2">
              {skillGaps.slice(0, 8).map((sg, i) => (
                <span key={i} className={`badge ${sg.priority === 'High' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : sg.priority === 'Medium' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                  {sg.skill}
                  <span className="opacity-60 text-xs ml-1">{sg.priority}</span>
                </span>
              ))}
            </div>
            <button onClick={() => navigate('/resume')} className="mt-4 text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
              Analyze resume to update gaps <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center gap-3">
            <Target className="w-8 h-8 text-gray-700" />
            <p className="text-sm text-gray-600">No skill gaps identified yet</p>
            <button onClick={() => navigate('/resume')} className="btn-primary text-xs py-1.5 px-4">
              Analyze Resume to Find Gaps
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
