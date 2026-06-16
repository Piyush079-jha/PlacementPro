import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Preloader from './components/Preloader';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ResumeAnalyzer from './pages/ResumeAnalyzer';
import JobPortal from './pages/JobPortal';
import FakeDetector from './pages/FakeDetector';
import Interview from './pages/Interview';
import Experiences from './pages/Experiences';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-gray-400 font-body">Loading PlacementPro...</p>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/dashboard" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/resume" element={<ProtectedRoute><Layout><ResumeAnalyzer /></Layout></ProtectedRoute>} />
      <Route path="/jobs" element={<ProtectedRoute><Layout><JobPortal /></Layout></ProtectedRoute>} />
      <Route path="/detect" element={<ProtectedRoute><Layout><FakeDetector /></Layout></ProtectedRoute>} />
      <Route path="/interview" element={<ProtectedRoute><Layout><Interview /></Layout></ProtectedRoute>} />
      <Route path="/experiences" element={<ProtectedRoute><Layout><Experiences /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      <Preloader onComplete={() => setLoaded(true)} />
      <div style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease' }}>
        <BrowserRouter>
          <AuthProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                style: { background: '#0d1225', color: '#fff', border: '1px solid rgba(79,110,247,0.2)', borderRadius: '12px', fontFamily: 'DM Sans, sans-serif' },
                success: { iconTheme: { primary: '#4f6ef7', secondary: '#fff' } },
                error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } }
              }}
            />
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </div>
    </>
  );
}
