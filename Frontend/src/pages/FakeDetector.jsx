import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Shield, AlertTriangle, CheckCircle, XCircle, Zap } from 'lucide-react';

export default function FakeDetector() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleDetect = async () => {
    if (!input.trim()) return toast.error('Please paste a job description or URL');
    setLoading(true);
    setResult(null);
    try {
      const isUrl = input.trim().startsWith('http');
      const payload = isUrl ? { jobUrl: input } : { jobDescription: input };
      const res = await axios.post('/api/jobs/detect', payload);
      setResult(res.data.detection);
      toast.success('Analysis complete!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Detection failed. Check API key.');
    } finally {
      setLoading(false);
    }
  };

  const getVerdictConfig = (verdict) => {
    if (!verdict) return {};
    const map = {
      'Genuine': { color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/25', icon: CheckCircle, label: '✅ Genuine Job' },
      'Suspicious': { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/25', icon: AlertTriangle, label: '⚠️ Suspicious Job' },
      'Fake': { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/25', icon: XCircle, label: '🚫 Likely Fake/Scam' }
    };
    return map[verdict] || {};
  };

  const verdict = result?.verdict;
  const config = getVerdictConfig(verdict);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-1">Fake Job Detector</h1>
        <p className="text-gray-500">Paste any job description or URL to check if it's genuine or a scam</p>
      </div>

      {/* Info cards */}
      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { title: 'Unrealistic Pay', desc: 'Jobs promising ₹5L+ for no experience', icon: '💸' },
          { title: 'Upfront Payment', desc: 'Any job asking for registration fee', icon: '🚨' },
          { title: 'Vague Details', desc: 'No company name, role, or proper contact', icon: '🔍' }
        ].map((tip, i) => (
          <div key={i} className="glass rounded-xl p-3 flex items-start gap-2.5">
            <span className="text-xl flex-shrink-0">{tip.icon}</span>
            <div>
              <p className="text-sm font-medium text-white">{tip.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{tip.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="card space-y-4">
        <div>
          <label className="label flex items-center gap-2">
            <Shield className="w-4 h-4 text-orange-400" />
            Job Description or URL
          </label>
          <textarea
            className="input-field min-h-40 resize-none"
            placeholder={`Paste the job description here, OR paste the job posting URL...

Example:
"Hiring freshers! Work from home. Earn ₹50,000/month. No experience needed. 
Apply now and pay ₹500 registration fee..."

Or paste: https://some-job-site.com/job/12345`}
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
          />
        </div>

        <button
          onClick={handleDetect}
          disabled={loading || !input.trim()}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analyzing...</>
          ) : (
            <><Shield className="w-4 h-4" /> Detect Fake Job</>
          )}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-4 animate-slide-up">
          {/* Verdict banner */}
          <div className={`glass rounded-2xl p-6 border ${config.bg}`}>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <h2 className={`text-2xl font-display font-bold ${config.color}`}>{config.label}</h2>
                <p className="text-gray-400 text-sm mt-1">{result.analysis}</p>
              </div>
              <div className="text-center">
                <div className={`text-4xl font-display font-bold ${config.color}`}>{result.riskScore}</div>
                <div className="text-xs text-gray-500">Risk Score</div>
                <div className="text-xs text-gray-600 mt-0.5">Confidence: {result.confidence}%</div>
              </div>
            </div>
          </div>

          {/* Risk meter */}
          <div className="card">
            <p className="text-sm font-medium text-gray-400 mb-2">Risk Level</p>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: 'linear-gradient(90deg, #22c55e, #f59e0b, #ef4444)' }}>
              <div className="h-full w-1 bg-white rounded-full transition-all duration-1000 relative shadow-lg"
                style={{ marginLeft: `${Math.min(result.riskScore, 98)}%`, transform: 'translateX(-50%)' }} />
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>Safe</span><span>Suspicious</span><span>Dangerous</span>
            </div>
          </div>

          {/* Flags */}
          <div className="grid md:grid-cols-2 gap-4">
            {result.redFlags?.length > 0 && (
              <div className="card border border-red-500/10">
                <h3 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> Red Flags ({result.redFlags.length})
                </h3>
                <ul className="space-y-2">
                  {result.redFlags.map((flag, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-red-400 flex-shrink-0 mt-0.5">✗</span>
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.greenFlags?.length > 0 && (
              <div className="card border border-green-500/10">
                <h3 className="font-semibold text-green-400 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Positive Signs ({result.greenFlags.length})
                </h3>
                <ul className="space-y-2">
                  {result.greenFlags.map((flag, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-green-400 flex-shrink-0 mt-0.5">✓</span>
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Recommendation */}
          {result.recommendation && (
            <div className="card bg-primary-500/5 border border-primary-500/15">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white text-sm mb-1">Our Recommendation</p>
                  <p className="text-gray-300 text-sm">{result.recommendation}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
