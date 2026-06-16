import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Rocket, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const roles = ['Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Data Scientist', 'Data Analyst', 'DevOps Engineer', 'ML Engineer', 'Android Developer', 'iOS Developer', 'Product Manager'];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', college: '', branch: '', graduationYear: '', targetRole: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleNext = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return toast.error('Please fill all required fields');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register({ ...form, graduationYear: form.graduationYear ? parseInt(form.graduationYear) : undefined });
      toast.success('Account created! Welcome to PlacementPro 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative animate-slide-up">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="glass-strong rounded-2xl p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-white text-xl">Create Account</h1>
              <p className="text-gray-500 text-sm">Step {step} of 2</p>
            </div>
          </div>

          {/* Progress */}
          <div className="flex gap-1.5 mb-8 mt-4">
            <div className="h-1 flex-1 rounded-full bg-primary-500 transition-all" />
            <div className={`h-1 flex-1 rounded-full transition-all ${step === 2 ? 'bg-primary-500' : 'bg-white/10'}`} />
          </div>

          {step === 1 ? (
            <form onSubmit={handleNext} className="space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input type="text" className="input-field" placeholder="Rahul Sharma" value={form.name} onChange={set('name')} />
              </div>
              <div>
                <label className="label">Email Address *</label>
                <input type="email" className="input-field" placeholder="rahul@example.com" value={form.email} onChange={set('email')} />
              </div>
              <div>
                <label className="label">Password *</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} className="input-field pr-11" placeholder="Minimum 6 characters" value={form.password} onChange={set('password')} />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn-primary w-full py-3 mt-2">Continue →</button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">College Name</label>
                <input type="text" className="input-field" placeholder="IIT Delhi, NIT Trichy..." value={form.college} onChange={set('college')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Branch</label>
                  <input type="text" className="input-field" placeholder="CSE, IT, ECE..." value={form.branch} onChange={set('branch')} />
                </div>
                <div>
                  <label className="label">Grad Year</label>
                  <input type="number" className="input-field" placeholder="2025" value={form.graduationYear} onChange={set('graduationYear')} min="2024" max="2030" />
                </div>
              </div>
              <div>
                <label className="label">Target Role</label>
                <select className="input-field" value={form.targetRole} onChange={set('targetRole')}>
                  <option value="">Select a role</option>
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setStep(1)} className="btn-ghost flex-1 py-3">← Back</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Account 🚀'}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
