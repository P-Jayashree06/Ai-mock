import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowRight, ShieldCheck, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../../lib/authService';
import Loader from '../shared/Loader';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Aggressive fix: Force the stored email and block browser autofill of 'Name'
  React.useEffect(() => {
    const getStoredEmail = () => {
      // Check 1: Most recent signup in this browser
      const local = localStorage.getItem('last_signup_email');
      if (local) return local;

      // Check 2: Recent auth attempt in this session
      try {
        const pending = JSON.parse(sessionStorage.getItem('pending_auth') || '{}');
        if (pending.email) return pending.email;
      } catch (e) {}

      return '';
    };

    // Immediate check
    const initialEmail = getStoredEmail();
    if (initialEmail) setEmail(initialEmail);

    // Delayed check to beat the browser's "late" autofill
    const timer = setTimeout(() => {
      const refreshedEmail = getStoredEmail();
      if (refreshedEmail) {
        setEmail(refreshedEmail);
      } else {
        setEmail(''); // Specifically clear it if nothing is stored
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleGreet = (name) => {
    if ('speechSynthesis' in window) {
      const greeting = `${name || 'User'}, Welcome back to AI Mock Interview`;
      const utterance = new SpeechSynthesisUtterance(greeting);
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(v => v.name.toLowerCase().includes('female') || v.name.includes('Google India') || v.name.includes('Samantha') || v.name.includes('Zira'));
      if (femaleVoice) utterance.voice = femaleVoice;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    setIsSubmitting(true);
    try {
      // Fetch offline user if available
      const mockUsers = JSON.parse(localStorage.getItem('interview_ai_mock_users') || '[]');
      const existingUser = mockUsers.find(u => u.email === email);

      // Enforce the requirement: Registration is mandatory before login
      if (!existingUser) {
        throw new Error("Account not found. Please create an account first.");
      }

      // Verify password if the user was created offline
      if (existingUser.password && existingUser.password !== password) {
        throw new Error("Invalid password");
      }

      // Bypassing auth "on this page only" as requested 
      // by setting a mock session instead of calling authService.login
      const mockUser = {
        id: existingUser ? existingUser.id : "mock-id-12345",
        email: email,
        name: existingUser ? existingUser.name : email.split('@')[0]
      };
      localStorage.setItem('interview_ai_session', JSON.stringify(mockUser));
      
      // Trigger personalized voice greeting
      handleGreet(mockUser.name);

      toast.success('Login Successful!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-1/4 -left-64 w-96 h-96 bg-accent-primary/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 -right-64 w-96 h-96 bg-accent-secondary/20 rounded-full blur-[100px]" />

      <AnimatePresence mode="wait">
        <motion.div 
          key="login-form"
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="glass-card p-10 mt-8 rounded-2xl shadow-xl border border-subtle">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-primary/10 mb-4 border border-accent-primary/20">
                <ShieldCheck className="w-8 h-8 text-accent-primary" />
              </div>
              <h1 className="text-3xl font-display font-bold text-text-primary mb-2">Welcome Back</h1>
              <p className="text-text-secondary">Sign in to AI Mock Interview</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-6">
              {/* Dummy input to catch browser autofill 'Name' */}
              <input type="text" style={{ display: 'none' }} tabIndex="-1" autoComplete="name" />
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-text-muted" />
                  </div>
                  <input
                    type="email"
                    id="interview_ai_v3_secure_email"
                    name="interview_ai_v3_secure_email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-bg-secondary border border-subtle rounded-xl focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary text-text-primary transition-all outline-none"
                    placeholder="you@example.com"
                    autoComplete="off"
                    required
                  />
                </div>
                <p className="mt-2 text-xs text-text-muted font-medium px-1">
                  Use the email address you registered with during signup.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-text-muted" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 bg-bg-secondary border border-subtle rounded-xl focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary text-text-primary transition-all outline-none"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-muted hover:text-accent-primary transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end text-sm">
                <Link to="/forgot-password" className="text-text-muted hover:text-accent-primary transition-colors">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-primary hover:opacity-95 text-white font-bold rounded-xl transition-all shadow-glow flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <Loader variant="Evaluating" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-subtle">
              <p className="text-center text-sm text-text-secondary">
                Don't have an account? <Link to="/signup" className="text-accent-primary font-bold hover:underline">Create Account</Link>
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
