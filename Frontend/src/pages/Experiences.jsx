import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Users, ThumbsUp, Plus, X, ChevronDown, ChevronUp, Award, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// color coding for verdict badges - green/red/yellow for selected/rejected/pending
const verdictColors = {
  Selected: 'bg-green-500/10 text-green-400 border-green-500/20',
  Rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  'On Hold': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
};

// single card for one experience, owns its own expand/collapse state
const ExperienceCard = ({ exp, onUpvote }) => {
  const [expanded, setExpanded] = useState(false); // each card expands independently
  return (
    <div className="card hover:scale-[1.005] transition-all duration-200">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          {/* fallback to first letter of company name if no logo exists */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-700/20 border border-primary-500/20 flex items-center justify-center text-sm font-bold text-primary-300">
            {exp.company?.[0] || 'C'}
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">{exp.company}</h3>
            <p className="text-gray-500 text-xs">{exp.role}</p>
          </div>
        </div>
        {/* default to green styling if verdict somehow doesn't match the map */}
        <span className={`badge border ${verdictColors[exp.verdict] || verdictColors.Selected}`}>{exp.verdict}</span>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
        {exp.college && <span>🎓 {exp.college}</span>}
        <span>📅 {exp.year}</span>
        {exp.package && <span>💰 {exp.package}</span>}
        <span className="badge bg-white/5 text-gray-400">{exp.type}</span>
      </div>

      {exp.rounds?.length > 0 && (
        <div className="mb-3">
          {/* collapsed by default so the list view doesn't get huge */}
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 transition-colors">
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {exp.rounds.length} Interview Round{exp.rounds.length > 1 ? 's' : ''}
          </button>
          {expanded && (
            <div className="mt-3 space-y-2">
              {exp.rounds.map((r, i) => (
                <div key={i} className="p-3 bg-white/3 rounded-xl border border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-white">{r.name}</p>
                    {/* red/yellow/green tag based on how hard the round was */}
                    {r.difficulty && <span className={`text-xs px-2 py-0.5 rounded-full ${r.difficulty === 'Hard' ? 'text-red-400 bg-red-500/10' : r.difficulty === 'Medium' ? 'text-yellow-400 bg-yellow-500/10' : 'text-green-400 bg-green-500/10'}`}>{r.difficulty}</span>}
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{r.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {exp.tips && (
        <div className="p-3 bg-primary-500/5 border border-primary-500/10 rounded-xl mb-3">
          <p className="text-xs text-primary-300/80 leading-relaxed">💡 <strong>Tips:</strong> {exp.tips}</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <p className="text-xs text-gray-600">by {exp.authorName}{exp.college ? ` · ${exp.college}` : ''}</p>
        <button onClick={() => onUpvote(exp._id)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary-400 transition-colors group">
          <ThumbsUp className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          <span>{exp.upvotes || 0}</span>
        </button>
      </div>
    </div>
  );
};

export default function Experiences() {
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [search, setSearch] = useState('');
  // form state for the share-experience panel, start with one empty round so the form isn't blank
  const [form, setForm] = useState({
    company: '', role: '', type: 'On-Campus', year: new Date().getFullYear(),
    package: '', tips: '', verdict: 'Selected', isAnonymous: false,
    rounds: [{ name: '', description: '', difficulty: 'Medium' }]
  });
  const [submitting, setSubmitting] = useState(false);

  // pulls experiences from backend, optionally filtered by company search
  const fetchExperiences = async () => {
    setLoading(true);
    try {
      const params = search ? `?company=${search}` : '';
      const res = await axios.get(`/api/experiences${params}`);
      setExperiences(res.data.experiences);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // refetch whenever search changes - no debounce yet, fine for now
  useEffect(() => { fetchExperiences(); }, [search]);

  const handleUpvote = async (id) => {
    try {
      const res = await axios.patch(`/api/experiences/${id}/upvote`);
      // patch just the upvote count locally instead of refetching the whole list
      setExperiences(prev => prev.map(e => e._id === id ? { ...e, upvotes: res.data.upvotes } : e));
    } catch (err) {
      // 401 most likely means they're not logged in
      toast.error('Login to upvote');
    }
  };

  // dev/demo helper so the page isn't empty when testing or for new users
  const seedExperiences = async () => {
    setSeeding(true);
    try {
      await axios.post('/api/experiences/seed');
      toast.success('Sample experiences loaded!');
      fetchExperiences();
    } catch { toast.error('Failed'); } finally { setSeeding(false); }
  };

  // helpers for the dynamic rounds array inside the share form
  const addRound = () => setForm(p => ({ ...p, rounds: [...p.rounds, { name: '', description: '', difficulty: 'Medium' }] }));
  const removeRound = (i) => setForm(p => ({ ...p, rounds: p.rounds.filter((_, idx) => idx !== i) }));
  const updateRound = (i, field, val) => setForm(p => ({ ...p, rounds: p.rounds.map((r, idx) => idx === i ? { ...r, [field]: val } : r) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    // quick required-field check before bothering the api
    if (!form.company || !form.role) return toast.error('Company and role are required');
    setSubmitting(true);
    try {
      await axios.post('/api/experiences', form);
      toast.success('Experience shared! Thank you 🙏');
      setShowForm(false);
      fetchExperiences();
      // reset back to defaults so the form's clean next time someone opens it
      setForm({ company: '', role: '', type: 'On-Campus', year: new Date().getFullYear(), package: '', tips: '', verdict: 'Selected', isAnonymous: false, rounds: [{ name: '', description: '', difficulty: 'Medium' }] });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-1">Interview Experiences</h1>
          <p className="text-gray-500">Real experiences shared by students from top colleges</p>
        </div>
        <div className="flex gap-2">
          <button onClick={seedExperiences} disabled={seeding} className="btn-ghost text-sm py-2 px-4 disabled:opacity-50">
            {seeding ? 'Loading...' : '+ Load Samples'}
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Share Experience
          </button>
        </div>
      </div>

      {/* triggers the useEffect refetch above on every keystroke */}
      <input type="text" className="input-field max-w-sm" placeholder="Search by company..." value={search} onChange={e => setSearch(e.target.value)} />

      {/* share form, toggled by the button up top */}
      {showForm && (
        <div className="card border border-primary-500/20 animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-semibold text-white flex items-center gap-2"><Award className="w-4 h-4 text-primary-400" /> Share Your Experience</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Company *</label>
                <input type="text" className="input-field" placeholder="Amazon, Google..." value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} />
              </div>
              <div>
                <label className="label">Role *</label>
                <input type="text" className="input-field" placeholder="SDE-1, Data Analyst..." value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} />
              </div>
              <div>
                <label className="label">Type</label>
                <select className="input-field" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                  {['On-Campus', 'Off-Campus', 'Referral', 'Walk-in'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Year</label>
                <input type="number" className="input-field" value={form.year} onChange={e => setForm(p => ({ ...p, year: parseInt(e.target.value) }))} min="2020" max="2030" />
              </div>
              <div>
                <label className="label">Package Offered</label>
                <input type="text" className="input-field" placeholder="18 LPA, 25000/month..." value={form.package} onChange={e => setForm(p => ({ ...p, package: e.target.value }))} />
              </div>
              <div>
                <label className="label">Verdict</label>
                <select className="input-field" value={form.verdict} onChange={e => setForm(p => ({ ...p, verdict: e.target.value }))}>
                  {['Selected', 'Rejected', 'On Hold'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
            </div>

            {/* dynamic rounds list - add/remove as many as the interview actually had */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Interview Rounds</label>
                <button type="button" onClick={addRound} className="text-xs text-primary-400 hover:text-primary-300">+ Add Round</button>
              </div>
              <div className="space-y-3">
                {form.rounds.map((r, i) => (
                  <div key={i} className="p-3 bg-white/3 rounded-xl border border-white/5 space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="text" className="input-field py-2 text-sm flex-1" placeholder={`Round ${i + 1} name (e.g. Technical)`} value={r.name} onChange={e => updateRound(i, 'name', e.target.value)} />
                      <select className="input-field py-2 text-sm w-28" value={r.difficulty} onChange={e => updateRound(i, 'difficulty', e.target.value)}>
                        {['Easy', 'Medium', 'Hard'].map(d => <option key={d}>{d}</option>)}
                      </select>
                      {/* don't let the rounds list go all the way to zero */}
                      {form.rounds.length > 1 && <button type="button" onClick={() => removeRound(i)} className="text-gray-600 hover:text-red-400 transition-colors"><X className="w-4 h-4" /></button>}
                    </div>
                    <textarea className="input-field py-2 text-sm resize-none min-h-16" placeholder="Describe what was asked in this round..." value={r.description} onChange={e => updateRound(i, 'description', e.target.value)} />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Tips for Future Students</label>
              <textarea className="input-field resize-none min-h-20" placeholder="What would you advise students preparing for this company?" value={form.tips} onChange={e => setForm(p => ({ ...p, tips: e.target.value }))} />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="anon" checked={form.isAnonymous} onChange={e => setForm(p => ({ ...p, isAnonymous: e.target.checked }))} className="accent-primary-500" />
              <label htmlFor="anon" className="text-sm text-gray-400 cursor-pointer">Post anonymously</label>
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                {submitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</> : 'Share Experience'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* skeleton while loading, real cards once data's in, empty state if there's nothing yet */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-48 rounded-2xl bg-white/3 animate-pulse" />)}
        </div>
      ) : experiences.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {experiences.map(exp => <ExperienceCard key={exp._id} exp={exp} onUpvote={handleUpvote} />)}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-600">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No experiences yet</p>
          <p className="text-sm mt-1 mb-4">Be the first to share or load sample data</p>
          <div className="flex gap-3 justify-center">
            <button onClick={seedExperiences} className="btn-ghost text-sm py-2 px-4">Load Samples</button>
            <button onClick={() => setShowForm(true)} className="btn-primary text-sm py-2 px-4">Share Yours</button>
          </div>
        </div>
      )}
    </div>
  );
}