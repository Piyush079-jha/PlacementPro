import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { LayoutDashboard, FileText, Briefcase, Shield, MessageSquare, Users, LogOut, Menu, X, ChevronRight } from 'lucide-react';
import placementproLogo from '../assets/placementpro.png';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/resume', icon: FileText, label: 'Resume Analyzer' },
  { to: '/jobs', icon: Briefcase, label: 'Job Portal' },
  { to: '/detect', icon: Shield, label: 'Fake Detector' },
  { to: '/interview', icon: MessageSquare, label: 'Interview Prep' },
  { to: '/experiences', icon: Users, label: 'Experiences' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    const handler = (e) => setFocusMode(!!e.detail);
    window.addEventListener('app:focus-mode', handler);
    return () => window.removeEventListener('app:focus-mode', handler);
  }, []);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <img src={placementproLogo} alt="PlacementPro" className="w-9 h-9 object-contain mix-blend-screen" />
          <div>
            <h1 className="font-display font-bold text-white text-lg leading-none">PlacementPro</h1>
            <p className="text-xs text-gray-500 mt-0.5">AI Placement Platform</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="p-4 mx-3 mt-4 rounded-xl bg-white/3 border border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center text-sm font-bold">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name || 'Student'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.college || 'Set your college'}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 mt-2 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to} to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-primary-500/15 text-primary-400 border border-primary-500/25'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (<>
              <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'text-primary-400' : 'text-gray-500 group-hover:text-gray-300'}`} size={18} />
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-primary-400/60" />}
            </>)}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200 group"
        >
          <LogOut className="w-4 h-4 flex-shrink-0 group-hover:text-red-400" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-dark-900">
      {/* Desktop sidebar */}
      {!focusMode && (
      <aside className="hidden lg:flex w-64 flex-col flex-shrink-0 border-r border-white/5 bg-dark-800/50">
        <SidebarContent />
      </aside>
      )}

      {/* Mobile sidebar overlay */}
      {!focusMode && sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-10 w-64 flex flex-col bg-dark-800 border-r border-white/5">
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/5 transition-colors">
              <X className="w-4 h-4 text-gray-400" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        {!focusMode && (
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/5 bg-dark-800/50">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <Menu className="w-5 h-5 text-gray-400" />
          </button>
          <div className="flex items-center gap-2">
            <img src={placementproLogo} alt="PlacementPro" className="w-7 h-7 object-contain mix-blend-screen" />
            <span className="font-display font-bold text-white">PlacementPro</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center text-xs font-bold">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
        </header>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-8 max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
