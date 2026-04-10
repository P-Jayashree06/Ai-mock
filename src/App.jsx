import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Loader from './components/shared/Loader';
import { authService } from './lib/authService';
import QuotaErrorBanner from './components/shared/QuotaErrorBanner';

// Pages/Layouts (Lazy loaded for performance and to act as placeholders)
const LoginPage = lazy(() => import('./components/auth/LoginPage'));
const SignupPage = lazy(() => import('./components/auth/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./components/auth/ForgotPasswordPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ResumeUpload = lazy(() => import('./components/interview/ResumeUpload'));
const Round1Technical = lazy(() => import('./components/interview/Round1Technical'));
const Round2TechnicalHR = lazy(() => import('./components/interview/Round2TechnicalHR'));
const Round3PersonalHR = lazy(() => import('./components/interview/Round3PersonalHR'));
const FeedbackPage = lazy(() => import('./components/feedback/FeedbackPage'));

function ProtectedRoute() {
  const user = authService.getSession();
  
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}

function PublicRoute() {
  const user = authService.getSession();
  
  if (user) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

function App() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-body antialiased selection:bg-accent-primary selection:text-white pb-20 sm:pb-0">
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader /></div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/interview/setup" element={<ResumeUpload />} />
            <Route path="/interview/round1" element={<Round1Technical />} />
            <Route path="/interview/round2" element={<Round2TechnicalHR />} />
            <Route path="/interview/round3" element={<Round3PersonalHR />} />
            <Route path="/feedback/:interviewId" element={<FeedbackPage />} />
          </Route>
        </Routes>
      </Suspense>
      <Toaster position="bottom-right" toastOptions={{
        style: {
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-card)',
        }
      }} />
      <QuotaErrorBanner />
    </div>
  );
}

export default App;
