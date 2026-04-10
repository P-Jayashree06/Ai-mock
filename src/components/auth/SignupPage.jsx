import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, User, UserPlus, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../../lib/authService';
import OTPVerify from './OTPVerify';
import Loader from '../shared/Loader';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  
  const navigate = useNavigate();

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) return toast.error("Please fill all fields.");

    setIsSubmitting(true);
    try {
      await authService.signup(email, password, name);
      setShowOTP(true);
      toast.success('Magic code sent to your email!');
    } catch (err) {
      toast.error(err.message || "Signup failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOTPVerify = async (code) => {
    setIsSubmitting(true);
    try {
      await authService.verifyOtp(email, code);
      toast.success('Account Created! Welcome.');
      navigate('/dashboard');
    } catch (err) {
      toast.error('Invalid OTP. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 -right-64 w-96 h-96 bg-accent-secondary/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 -left-64 w-96 h-96 bg-accent-primary/20 rounded-full blur-[100px]" />

      <AnimatePresence mode="wait">
        {!showOTP ? (
          <motion.div key="signup" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md relative z-10">
            <div className="glass-card p-10 mt-8 rounded-2xl shadow-xl">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-display font-bold text-text-primary mb-2">Create Account</h1>
                <p className="text-text-secondary">Start your journey to interview success</p>
              </div>

              <form onSubmit={handleSignupSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Name</label>
                  <div className="relative">
                    <User className="absolute inset-y-0 left-0 pl-3 my-auto h-5 w-8 text-text-muted pointer-events-none" />
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full pl-12 pr-4 py-3 bg-bg-secondary border border-subtle rounded-xl focus:ring-accent-primary focus:border-accent-primary text-text-primary outline-none" placeholder="Your full name" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute inset-y-0 left-0 pl-3 my-auto h-5 w-8 text-text-muted pointer-events-none" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full pl-12 pr-4 py-3 bg-bg-secondary border border-subtle rounded-xl focus:ring-accent-primary focus:border-accent-primary text-text-primary outline-none" placeholder="you@example.com" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute inset-y-0 left-0 pl-3 my-auto h-5 w-8 text-text-muted pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-12 pr-12 py-3 bg-bg-secondary border border-subtle rounded-xl focus:ring-accent-primary focus:border-accent-primary text-text-primary outline-none"
                      placeholder="Create a password"
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

                <button type="submit" disabled={isSubmitting} className="w-full mt-8 py-3.5 bg-gradient-primary hover:opacity-90 text-white font-medium rounded-xl transition-all shadow-glow flex items-center justify-center space-x-2">
                  {isSubmitting ? <Loader variant="Evaluating" /> : <><UserPlus className="w-5 h-5" /> <span>Sign Up</span></>}
                </button>
              </form>
              
              <p className="text-center mt-6 text-sm text-text-secondary">
                 Already have an account? <Link to="/login" className="text-accent-primary font-medium hover:underline">Log in</Link>
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <OTPVerify email={email} onVerify={handleOTPVerify} onBack={() => setShowOTP(false)} isVerifying={isSubmitting} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
