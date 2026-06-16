import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FileText, Shield, MessageSquare, Briefcase, Users, ArrowRight, CheckCircle, Zap } from 'lucide-react';
import placementproLogo from '../assets/placementpro.png';

const features = [
  { icon: FileText, title: 'Resume Analyzer', desc: 'AI-powered resume review with ATS score, improvement tips, and skill gap analysis', color: 'from-blue-500 to-cyan-500', route: '/resume' },
  { icon: Shield, title: 'Fake Job Detector', desc: 'Paste any job description to instantly detect if it\'s genuine or a scam', color: 'from-red-500 to-orange-500', route: '/detect' },
  { icon: Briefcase, title: 'Job Portal', desc: 'Curated, verified fresher-friendly jobs from top Indian companies', color: 'from-green-500 to-emerald-500', route: '/jobs' },
  { icon: MessageSquare, title: 'Interview Prep', desc: 'Role-based AI mock interviews with real-time evaluation and detailed feedback', color: 'from-purple-500 to-pink-500', route: '/interview' },
  { icon: Users, title: 'Interview Experiences', desc: 'Real experiences shared by students from top colleges across India', color: 'from-yellow-500 to-orange-500', route: '/experiences' },
  { icon: Zap, title: 'Skill Gap Analysis', desc: 'Know exactly what skills you need for your dream company and role', color: 'from-primary-400 to-primary-600', route: '/resume' },
];

const stats = [
  { value: '50K+', label: 'Students Helped' },
  { value: '200+', label: 'Companies Listed' },
  { value: '95%', label: 'Satisfaction Rate' },
  { value: '10K+', label: 'Interviews Practiced' },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-dark-900 overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between border-b border-white/5 bg-dark-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center p-1">
            <img src={placementproLogo} alt="PlacementPro" className="w-full h-full object-contain" />
          </div>
          <span className="font-display font-bold text-white text-lg">PlacementPro</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <button onClick={() => navigate('/dashboard')} className="btn-primary text-sm py-2 px-4">
              Go to Dashboard
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/login')} className="btn-ghost text-sm py-2 px-4">
                Sign In
              </button>
              <button onClick={() => navigate('/register')} className="btn-primary text-sm py-2 px-4">
                Get Started Free
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary-500/5 rounded-full blur-[120px]" />
          <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-accent-500/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary-700/8 rounded-full blur-[80px]" />
          {/* Grid */}
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(79,110,247,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(79,110,247,0.04) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 rounded-full px-4 py-1.5 text-sm text-primary-400 font-medium mb-8 animate-fade-in">
            <Zap className="w-3.5 h-3.5" />
            India's Most Complete Placement Platform
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-[1.1] tracking-[-0.03em] animate-slide-up" style={{ fontFamily: "'Clash Display', sans-serif" }}>
            <span className="text-white">Land Your Dream</span>
            <br />
            <span className="text-gradient" style={{ WebkitBoxDecorationBreak: 'clone', paddingBottom: '0.15em', display: 'inline-block' }}>Tech Job Faster</span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed" style={{ animationDelay: '0.1s' }}>
            AI-powered resume analysis, fake job detection, mock interviews, and real company experiences — everything you need to crack placements.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap mb-16">
            <button onClick={() => navigate('/register')} className="btn-primary text-base py-3.5 px-8 flex items-center gap-2 animate-glow">
              Start Preparing Free
              <ArrowRight className="w-4 h-4" />
            </button>
            {user && (
              <button onClick={() => navigate('/dashboard')} className="btn-ghost text-base py-3.5 px-8">
                Go to Dashboard
              </button>
            )}
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <div className="flex -space-x-1.5">
              {['R', 'P', 'A', 'S'].map((l, i) => (
                <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-primary-700 border-2 border-dark-900 flex items-center justify-center text-xs font-bold text-white">{l}</div>
              ))}
            </div>
            <span>Joined by <strong className="text-white">50,000+</strong> students from IITs, NITs & top colleges</span>
          </div>
        </div>

        {/* Stats */}
        <div className="relative max-w-4xl mx-auto mt-20 grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="card text-center hover:scale-105 transition-transform duration-300" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="text-3xl font-display font-bold text-gradient-blue">{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
              Everything in <span className="text-gradient" style={{ WebkitBoxDecorationBreak: 'clone', paddingBottom: '0.1em', display: 'inline-block' }}>One Place</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">No more switching between 5 different apps. PlacementPro has everything you need to get hired.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div key={i} onClick={() => navigate(f.route)} className="card group cursor-pointer hover:scale-[1.02] transition-all duration-300">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.color} p-0.5 mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <div className="w-full h-full bg-dark-800 rounded-[10px] flex items-center justify-center">
                    <f.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <h3 className="font-display font-semibold text-white text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why PlacementPro */}
      <section className="py-20 px-6 relative">
        <div className="absolute inset-0 bg-primary-500/3 pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-display font-bold text-white mb-12">
            Why students <span className="text-gradient" style={{ WebkitBoxDecorationBreak: 'clone', paddingBottom: '0.1em', display: 'inline-block' }}>love us</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'Built for India', desc: 'Tailored for Indian companies, campuses, and the unique challenges of Indian placements', icon: '🏆' },
              { title: 'Actually Free', desc: 'Core features are completely free. No hidden charges, no premium paywalls for essentials', icon: '✨' },
              { title: 'AI-Powered', desc: 'Latest Claude AI for resume analysis, fake detection, and personalized interview coaching', icon: '🤖' }
            ].map((item, i) => (
              <div key={i} className="glass rounded-2xl p-6 text-left">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-display font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="glass-strong rounded-3xl p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent pointer-events-none" />
            <div className="relative">
              <h2 className="text-4xl font-display font-bold text-white mb-4">Ready to get placed?</h2>
              <p className="text-gray-400 mb-8">Join thousands of students who landed their dream jobs using PlacementPro.</p>
              <button onClick={() => navigate('/register')} className="btn-primary text-lg py-4 px-10 flex items-center gap-2 mx-auto animate-glow">
                Create Free Account
                <ArrowRight className="w-5 h-5" />
              </button>
              <div className="flex items-center justify-center gap-4 mt-6 text-sm text-gray-500">
                {['No credit card needed', 'Free forever plan', 'Cancel anytime'].map((t, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
<div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center p-1">
            <img src={placementproLogo} alt="PlacementPro" className="w-full h-full object-contain" />
          </div>
            <span className="font-display font-semibold text-white">PlacementPro</span>
          </div>
          <p className="text-gray-600 text-sm">© 2025 PlacementPro. Built for Indian students, with ❤️</p>
        </div>
      </footer>
    </div>
  );
}
