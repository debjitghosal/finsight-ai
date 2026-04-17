import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/Upload';
import ReportDetail from './pages/ReportDetail';
import ComparePage from './pages/ComparePage';

import AnalyticsPage from './pages/AnalyticsPage';
import UsernameSetup from './pages/UsernameSetup';
import LandingPage from './pages/LandingPage';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

const PageWrapper = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
};

function AppRoutes() {
  const location = useLocation();
  return (
    <div className="min-h-screen relative overflow-hidden bg-[var(--bg-deep)] transition-colors duration-500 pt-16">
      {/* Global Background Particles/Blur */}
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-indigo-500/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-purple-500/10 blur-[150px] rounded-full" />
      </div>
      <Navbar />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageWrapper><LandingPage /></PageWrapper>} />
          <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
          <Route path="/setup-username" element={<ProtectedRoute><PageWrapper><UsernameSetup /></PageWrapper></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><PageWrapper><Dashboard /></PageWrapper></ProtectedRoute>} />
          <Route path="/upload" element={<ProtectedRoute><PageWrapper><UploadPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/report/:id" element={<ProtectedRoute><PageWrapper><ReportDetail /></PageWrapper></ProtectedRoute>} />
          <Route path="/compare" element={<ProtectedRoute><PageWrapper><ComparePage /></PageWrapper></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><PageWrapper><AnalyticsPage /></PageWrapper></ProtectedRoute>} />
        </Routes>
      </AnimatePresence>
    </div>
  );
}

import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = "995681362096-5oafrith3u3qu7fcu4o3e5c51smcens0.apps.googleusercontent.com";

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}
