import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Shield, AlertTriangle, CheckCircle, XCircle, Zap, Search, Lock, Link } from 'lucide-react';

// Animated counter for risk score
function CountUp({ target, duration = 1200 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(timer); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return <span>{val}</span>;
}

const VERDICT_CONFIG = {
  Genuine:    { color: '#22c55e', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.2)',  label: 'Genuine Job',       emoji: '✅' },
  Suspicious: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', label: 'Suspicious Posting', emoji: '⚠️' },
  Fake:       { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)',  label: 'Likely a Scam',      emoji: '🚫' },
};

const TIPS = [
  { icon: '💸', title: 'Unrealistic Pay',    desc: 'Promising ₹5L+ with zero experience' },
  { icon: '🔒', title: 'Upfront Fees',       desc: 'Asking for registration or training money' },
  { icon: '🌫️', title: 'Vague Details',      desc: 'No company name, role scope, or contact' },
];

export default function FakeDetector() {
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const resultRef = useRef(null);

  const isUrl = input.trim().startsWith('http');

  const handleDetect = async () => {
    if (!input.trim()) return toast.error('Paste a job description or URL first');
    setLoading(true);
    setResult(null);
    try {
      const payload = isUrl ? { jobUrl: input } : { jobDescription: input };
      const res = await axios.post('/api/jobs/detect', payload);
      setResult(res.data.detection);
      toast.success('Analysis complete');
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Detection failed — check your API key');
    } finally {
      setLoading(false);
    }
  };

  const cfg = result ? (VERDICT_CONFIG[result.verdict] || VERDICT_CONFIG.Suspicious) : null;

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '8px 0 48px' }} className="space-y-6 animate-fade-in">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'linear-gradient(135deg, rgba(79,110,247,0.2), rgba(240,125,26,0.15))',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          border: '1px solid rgba(79,110,247,0.2)'
        }}>
          <Shield size={20} color="#6b8afd" />
        </div>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.2 }}>
            Fake Job Detector
          </h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>
            Paste any job description or URL — AI will flag scams instantly
          </p>
        </div>
      </div>

      {/* Tip chips */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {TIPS.map((t, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 99, padding: '6px 14px', fontSize: 13
          }}>
            <span>{t.icon}</span>
            <span style={{ color: '#e5e7eb', fontWeight: 500 }}>{t.title}</span>
            <span style={{ color: '#6b7280' }}>— {t.desc}</span>
          </div>
        ))}
      </div>

      {/* Input card */}
      <div className="card" style={{ padding: 24 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9ca3af', fontSize: 13, fontWeight: 500, marginBottom: 10 }}>
          <Search size={14} color="#6b8afd" />
          JOB DESCRIPTION OR URL
        </label>

        <textarea
          style={{
            width: '100%', minHeight: 160, background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
            color: '#e5e7eb', fontSize: 14, padding: '12px 14px',
            resize: 'vertical', outline: 'none', fontFamily: 'inherit',
            lineHeight: 1.6, boxSizing: 'border-box', transition: 'border-color 0.2s'
          }}
          onFocus={e => e.target.style.borderColor = 'rgba(107,138,253,0.4)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
          placeholder={`Paste the job posting text here...\n\nOr paste a URL: https://internshala.com/internship/...`}
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={loading}
        />

        {/* URL tip — only shown when user types a URL */}
        {isUrl && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginTop: 8,
            padding: '7px 12px', borderRadius: 8, fontSize: 12,
            background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)', color: '#f59e0b'
          }}>
            <Link size={12} />
            URL detected — we'll scrape the page. For best accuracy, paste the description directly. LinkedIn URLs won't work (they block scraping).
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#4b5563', fontSize: 12 }}>
            <Lock size={12} />
            Your input is never stored
          </div>
          <button
            onClick={handleDetect}
            disabled={loading || !input.trim()}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 22px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: 14, transition: 'all 0.2s',
              background: loading || !input.trim()
                ? 'rgba(79,110,247,0.3)'
                : 'linear-gradient(135deg, #4f6ef7, #6b8afd)',
              color: loading || !input.trim() ? 'rgba(255,255,255,0.4)' : '#fff',
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: 15, height: 15, border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite'
                }} />
                {isUrl ? 'Scraping & Analyzing…' : 'Analyzing…'}
              </>
            ) : (
              <><Shield size={15} /> Analyze Job</>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && cfg && (
        <div ref={resultRef} style={{ display: 'flex', flexDirection: 'column', gap: 14 }} className="animate-slide-up">

          {/* Verdict hero */}
          <div style={{
            borderRadius: 16, padding: '24px 28px',
            background: cfg.bg, border: `1px solid ${cfg.border}`,
            display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap'
          }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: cfg.border, borderRadius: 99, padding: '4px 14px',
                fontSize: 13, fontWeight: 600, color: cfg.color, marginBottom: 10
              }}>
                {cfg.emoji} {cfg.label}
              </div>
              <p style={{ color: '#d1d5db', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                {result.analysis}
              </p>
            </div>

            {/* Score ring */}
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{
                width: 90, height: 90, borderRadius: '50%', margin: '0 auto 6px',
                background: `conic-gradient(${cfg.color} ${result.riskScore * 3.6}deg, rgba(255,255,255,0.05) 0deg)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <div style={{
                  width: 70, height: 70, borderRadius: '50%',
                  background: '#0d1225', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: cfg.color }}>
                    <CountUp target={result.riskScore} />
                  </span>
                </div>
              </div>
              <div style={{ color: '#9ca3af', fontSize: 12, fontWeight: 500 }}>Risk Score</div>
              <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>{result.confidence}% confidence</div>
            </div>
          </div>

          {/* Risk bar */}
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ color: '#9ca3af', fontSize: 13, fontWeight: 500 }}>Risk Level</span>
              <span style={{ color: cfg.color, fontSize: 13, fontWeight: 600 }}>{result.verdict}</span>
            </div>
            <div style={{ position: 'relative', height: 8, borderRadius: 99, overflow: 'visible',
              background: 'linear-gradient(90deg, #22c55e 0%, #f59e0b 50%, #ef4444 100%)' }}>
              <div style={{
                position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)',
                left: `${Math.min(Math.max(result.riskScore, 2), 98)}%`,
                width: 16, height: 16, borderRadius: '50%',
                background: '#fff', border: `3px solid ${cfg.color}`,
                boxShadow: `0 0 10px ${cfg.color}`,
                transition: 'left 1s cubic-bezier(0.4,0,0.2,1)'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              {['Safe', 'Caution', 'Danger'].map(l => (
                <span key={l} style={{ color: '#4b5563', fontSize: 11 }}>{l}</span>
              ))}
            </div>
          </div>

          {/* Flags grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {result.redFlags?.length > 0 && (
              <div className="card" style={{ border: '1px solid rgba(239,68,68,0.12)', padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <XCircle size={16} color="#ef4444" />
                  <span style={{ color: '#ef4444', fontWeight: 600, fontSize: 14 }}>Red Flags</span>
                  <span style={{ marginLeft: 'auto', background: 'rgba(239,68,68,0.12)', color: '#ef4444', borderRadius: 99, padding: '1px 8px', fontSize: 12, fontWeight: 600 }}>
                    {result.redFlags.length}
                  </span>
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {result.redFlags.map((flag, i) => (
                    <li key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#d1d5db', lineHeight: 1.5 }}>
                      <span style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }}>✗</span>{flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.greenFlags?.length > 0 && (
              <div className="card" style={{ border: '1px solid rgba(34,197,94,0.12)', padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <CheckCircle size={16} color="#22c55e" />
                  <span style={{ color: '#22c55e', fontWeight: 600, fontSize: 14 }}>Positive Signs</span>
                  <span style={{ marginLeft: 'auto', background: 'rgba(34,197,94,0.12)', color: '#22c55e', borderRadius: 99, padding: '1px 8px', fontSize: 12, fontWeight: 600 }}>
                    {result.greenFlags.length}
                  </span>
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {result.greenFlags.map((flag, i) => (
                    <li key={i} style={{ display: 'flex', gap: 8, fontSize: 13, color: '#d1d5db', lineHeight: 1.5 }}>
                      <span style={{ color: '#22c55e', flexShrink: 0, marginTop: 1 }}>✓</span>{flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Recommendation */}
          {result.recommendation && (
            <div style={{
              display: 'flex', gap: 14, padding: '18px 20px', borderRadius: 12,
              background: 'rgba(79,110,247,0.05)', border: '1px solid rgba(79,110,247,0.15)'
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                background: 'rgba(79,110,247,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Zap size={16} color="#6b8afd" />
              </div>
              <div>
                <p style={{ color: '#fff', fontWeight: 600, fontSize: 14, margin: '0 0 4px' }}>What you should do</p>
                <p style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{result.recommendation}</p>
              </div>
            </div>
          )}

          {/* Reset */}
          <button
            onClick={() => { setResult(null); setInput(''); }}
            style={{
              alignSelf: 'flex-start', background: 'transparent',
              border: '1px solid rgba(255,255,255,0.08)', color: '#6b7280',
              borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', transition: 'all 0.2s'
            }}
            onMouseOver={e => { e.target.style.color = '#e5e7eb'; e.target.style.borderColor = 'rgba(255,255,255,0.2)'; }}
            onMouseOut={e => { e.target.style.color = '#6b7280'; e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          >
            ← Analyze another job
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}