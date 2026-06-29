import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Shield, AlertTriangle, CheckCircle, XCircle, Zap, Search, Lock, Link, ChevronRight } from 'lucide-react';

/* ─── Animated SVG score ring ─── */
function ScoreRing({ score, color, size = 96 }) {
  const [animated, setAnimated] = useState(0);
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimated(score));
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const dash = circ * (1 - animated / 100);

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={8} />
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={dash}
        style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 6px ${color})` }}
      />
    </svg>
  );
}

/* ─── Count-up number ─── */
function CountUp({ target, duration = 1100 }) {
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

/* ─── Staggered pill tag ─── */
function FlagPill({ text, type, index }) {
  const isRed = type === 'red';
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      padding: '8px 12px', borderRadius: 8, fontSize: 13,
      background: isRed ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.06)',
      border: `1px solid ${isRed ? 'rgba(239,68,68,0.14)' : 'rgba(34,197,94,0.14)'}`,
      color: '#d1d5db', lineHeight: 1.5,
      animation: `fadeSlideIn 0.35s ease both`,
      animationDelay: `${index * 60}ms`,
    }}>
      <span style={{ color: isRed ? '#ef4444' : '#22c55e', fontSize: 11, marginTop: 2, flexShrink: 0 }}>
        {isRed ? '✗' : '✓'}
      </span>
      {text}
    </div>
  );
}

const VERDICT_CONFIG = {
  Genuine:    { color: '#22c55e', bg: 'rgba(34,197,94,0.06)',  border: 'rgba(34,197,94,0.18)',  label: 'Genuine Job',        emoji: '✅', glow: '0 0 40px rgba(34,197,94,0.15)' },
  Suspicious: { color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.18)', label: 'Suspicious Posting',  emoji: '⚠️', glow: '0 0 40px rgba(245,158,11,0.15)' },
  Fake:       { color: '#ef4444', bg: 'rgba(239,68,68,0.06)',  border: 'rgba(239,68,68,0.18)',  label: 'Likely a Scam',       emoji: '🚫', glow: '0 0 40px rgba(239,68,68,0.15)' },
};

const TIPS = [
  { icon: '💸', title: 'Unrealistic Pay',  desc: 'Promising ₹5L+ with zero experience' },
  { icon: '🔒', title: 'Upfront Fees',     desc: 'Asking for registration or training money' },
  { icon: '🌫️', title: 'Vague Details',   desc: 'No company name, role scope, or contact' },
];

export default function FakeDetector() {
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [focused, setFocused]   = useState(false);
  const resultRef               = useRef(null);

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
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '8px 0 48px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(79,110,247,0.22) 0%, rgba(107,138,253,0.12) 100%)',
          border: '1px solid rgba(107,138,253,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 24px rgba(79,110,247,0.15)',
        }}>
          <Shield size={22} color="#6b8afd" />
        </div>
        <div>
          <h1 style={{ fontSize: 27, fontWeight: 700, color: '#f9fafb', margin: '0 0 4px', letterSpacing: '-0.4px' }}>
            Fake Job Detector
          </h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
            Paste any job description or URL — AI flags scams in seconds
          </p>
        </div>
      </div>

      {/* ── Tip chips ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {TIPS.map((t, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 99, padding: '5px 13px', fontSize: 12.5,
          }}>
            <span style={{ fontSize: 13 }}>{t.icon}</span>
            <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{t.title}</span>
            <span style={{ color: '#5b6370' }}>— {t.desc}</span>
          </div>
        ))}
      </div>

      {/* ── Input card ── */}
      <div style={{
        borderRadius: 16, padding: 24,
        background: 'rgba(255,255,255,0.025)',
        border: `1.5px solid ${focused ? 'rgba(107,138,253,0.35)' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: focused ? '0 0 0 3px rgba(107,138,253,0.08), 0 8px 32px rgba(0,0,0,0.25)' : '0 4px 20px rgba(0,0,0,0.2)',
        transition: 'border-color 0.25s, box-shadow 0.25s',
        marginBottom: 20,
      }}>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 6,
          color: '#6b7280', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', marginBottom: 12,
        }}>
          <Search size={13} color="#6b8afd" />
          Job Description or URL
        </label>

        <textarea
          style={{
            width: '100%', minHeight: 164,
            background: 'rgba(0,0,0,0.18)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, color: '#e5e7eb', fontSize: 14,
            padding: '13px 15px', resize: 'vertical', outline: 'none',
            fontFamily: 'inherit', lineHeight: 1.65, boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={`Paste the job posting text here…\n\nOr paste a URL: https://internshala.com/internship/...`}
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={loading}
        />

        {/* URL notice */}
        {isUrl && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7, marginTop: 10,
            padding: '7px 13px', borderRadius: 8, fontSize: 12.5,
            background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)',
            color: '#d9a84e',
          }}>
            <Link size={12} />
            URL detected — we'll scrape the page. For best results, paste the description directly. LinkedIn URLs won't work (they block scraping).
          </div>
        )}

        {/* Footer row */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginTop: 16, flexWrap: 'wrap', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#4b5563', fontSize: 12 }}>
            <Lock size={11} />
            Your input is never stored
          </div>

          <button
            onClick={handleDetect}
            disabled={loading || !input.trim()}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 22px', borderRadius: 9, border: 'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              fontWeight: 700, fontSize: 14, letterSpacing: '0.01em',
              transition: 'all 0.2s, transform 0.1s',
              background: loading || !input.trim()
                ? 'rgba(79,110,247,0.25)'
                : 'linear-gradient(135deg, #4f6ef7 0%, #7c9aff 100%)',
              color: loading || !input.trim() ? 'rgba(255,255,255,0.35)' : '#fff',
              boxShadow: loading || !input.trim() ? 'none' : '0 4px 18px rgba(79,110,247,0.35)',
            }}
            onMouseOver={e => { if (!loading && input.trim()) e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {loading ? (
              <>
                <div style={{
                  width: 15, height: 15, border: '2px solid rgba(255,255,255,0.25)',
                  borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                }} />
                {isUrl ? 'Scraping & Analyzing…' : 'Analyzing…'}
              </>
            ) : (
              <><Shield size={15} />Analyze Job</>
            )}
          </button>
        </div>
      </div>

      {/* ── Results ── */}
      {result && cfg && (
        <div ref={resultRef} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Verdict hero */}
          <div style={{
            borderRadius: 18, padding: '26px 28px',
            background: cfg.bg,
            border: `1.5px solid ${cfg.border}`,
            boxShadow: cfg.glow,
            display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap',
            animation: 'fadeSlideIn 0.4s ease both',
          }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 12,
                background: `${cfg.border}`, borderRadius: 99, padding: '5px 15px',
                fontSize: 12.5, fontWeight: 700, color: cfg.color, letterSpacing: '0.04em',
              }}>
                {cfg.emoji} {cfg.label.toUpperCase()}
              </div>
              <p style={{ color: '#d1d5db', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                {result.analysis}
              </p>
            </div>

            {/* Score ring */}
            <div style={{ textAlign: 'center', flexShrink: 0, position: 'relative' }}>
              <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto' }}>
                <ScoreRing score={result.riskScore} color={cfg.color} size={96} />
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 24, fontWeight: 800, color: cfg.color, lineHeight: 1 }}>
                    <CountUp target={result.riskScore} />
                  </span>
                </div>
              </div>
              <div style={{ color: '#9ca3af', fontSize: 12, fontWeight: 600, marginTop: 7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Risk Score</div>
              <div style={{ color: '#5b6370', fontSize: 11, marginTop: 2 }}>{result.confidence}% confidence</div>
            </div>
          </div>

          {/* Risk bar */}
          <div style={{
            borderRadius: 14, padding: '18px 22px',
            background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
            animation: 'fadeSlideIn 0.4s ease 0.08s both',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ color: '#6b7280', fontSize: 12.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Risk Level</span>
              <span style={{
                color: cfg.color, fontSize: 12.5, fontWeight: 700, letterSpacing: '0.06em',
                background: cfg.bg, border: `1px solid ${cfg.border}`,
                borderRadius: 99, padding: '2px 12px',
              }}>{result.verdict}</span>
            </div>
            <div style={{ position: 'relative', height: 7, borderRadius: 99,
              background: 'linear-gradient(90deg, #22c55e 0%, #f59e0b 50%, #ef4444 100%)' }}>
              <div style={{
                position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)',
                left: `${Math.min(Math.max(result.riskScore, 2), 98)}%`,
                width: 18, height: 18, borderRadius: '50%',
                background: '#111827', border: `3px solid ${cfg.color}`,
                boxShadow: `0 0 0 3px ${cfg.bg}, 0 0 12px ${cfg.color}`,
                transition: 'left 1.1s cubic-bezier(0.4,0,0.2,1)',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              {['Safe', 'Caution', 'Danger'].map(l => (
                <span key={l} style={{ color: '#4b5563', fontSize: 11, fontWeight: 500 }}>{l}</span>
              ))}
            </div>
          </div>

          {/* Flags grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 14,
            animation: 'fadeSlideIn 0.4s ease 0.16s both',
          }}>
            {result.redFlags?.length > 0 && (
              <div style={{
                borderRadius: 14, padding: 20,
                background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.13)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <XCircle size={15} color="#ef4444" />
                  <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 13.5, letterSpacing: '0.01em' }}>Red Flags</span>
                  <span style={{
                    marginLeft: 'auto', background: 'rgba(239,68,68,0.12)',
                    color: '#ef4444', borderRadius: 99, padding: '1px 9px',
                    fontSize: 12, fontWeight: 700,
                  }}>{result.redFlags.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {result.redFlags.map((flag, i) => <FlagPill key={i} text={flag} type="red" index={i} />)}
                </div>
              </div>
            )}

            {result.greenFlags?.length > 0 && (
              <div style={{
                borderRadius: 14, padding: 20,
                background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.13)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <CheckCircle size={15} color="#22c55e" />
                  <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 13.5, letterSpacing: '0.01em' }}>Positive Signs</span>
                  <span style={{
                    marginLeft: 'auto', background: 'rgba(34,197,94,0.12)',
                    color: '#22c55e', borderRadius: 99, padding: '1px 9px',
                    fontSize: 12, fontWeight: 700,
                  }}>{result.greenFlags.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {result.greenFlags.map((flag, i) => <FlagPill key={i} text={flag} type="green" index={i} />)}
                </div>
              </div>
            )}
          </div>

          {/* Recommendation */}
          {result.recommendation && (
            <div style={{
              display: 'flex', gap: 16, padding: '20px 22px', borderRadius: 14,
              background: 'rgba(79,110,247,0.05)', border: '1.5px solid rgba(79,110,247,0.16)',
              animation: 'fadeSlideIn 0.4s ease 0.24s both',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'rgba(79,110,247,0.14)', border: '1px solid rgba(107,138,253,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Zap size={16} color="#6b8afd" />
              </div>
              <div>
                <p style={{ color: '#c7d2fe', fontWeight: 700, fontSize: 13.5, margin: '0 0 5px', letterSpacing: '0.01em' }}>
                  What you should do
                </p>
                <p style={{ color: '#9ca3af', fontSize: 13.5, lineHeight: 1.7, margin: 0 }}>
                  {result.recommendation}
                </p>
              </div>
            </div>
          )}

          {/* Reset */}
          <button
            onClick={() => { setResult(null); setInput(''); }}
            style={{
              alignSelf: 'flex-start', background: 'transparent',
              border: '1px solid rgba(255,255,255,0.08)', color: '#6b7280',
              borderRadius: 8, padding: '8px 16px', fontSize: 13,
              cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: 6,
              animation: 'fadeSlideIn 0.4s ease 0.3s both',
            }}
            onMouseOver={e => { e.currentTarget.style.color = '#e5e7eb'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
            onMouseOut={e => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          >
            ← Analyze another job
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}