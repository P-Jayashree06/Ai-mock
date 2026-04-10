import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowRight, Target, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../../lib/authService';
import Loader from '../shared/Loader';
import OTPVerify from './OTPVerify';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const navigate = useNavigate();

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

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.sendLoginMagicCode(email);
      toast.success('Magic code sent to your email!');
      setShowOTP(true);
    } catch (err) {
      toast.error(err.message || 'Failed to send magic code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOTPVerify = async (code) => {
    setIsSubmitting(true);
    try {
      const user = await authService.verifyLoginMagicCode(email, code, name);
      
      // Trigger personalized voice greeting
      handleGreet(user.name);

      toast.success('Login Successful!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Invalid code. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-1/4 -left-64 w-96 h-96 bg-accent-primary/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 -right-64 w-96 h-96 bg-accent-secondary/20 rounded-full blur-[100px]" />

      <AnimatePresence mode="wait">
        {!showOTP ? (
          <motion.div 
            key="login-form"
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md relative z-10"
          >
            <div className="glass-card p-10 mt-8 rounded-2xl shadow-xl border border-subtle">
              <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-primary/10 mb-4 border border-accent-primary/20">
                  <ShieldCheck className="w-8 h-8 text-accent-primary" />
                </div>
                <h1 className="text-3xl font-display font-bold text-text-primary mb-2">Welcome Back</h1>
                <p className="text-text-secondary">Sign in via Magic Code to continue</p>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Target className="h-5 w-5 text-text-muted" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-bg-secondary border border-subtle rounded-xl focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary text-text-primary transition-all outline-none"
                      placeholder="Your full name"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-text-muted" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-bg-secondary border border-subtle rounded-xl focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary text-text-primary transition-all outline-none"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
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
                      <span>Send Magic Code</span>
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
        ) : (
          <motion.div 
            key="otp-verify"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md relative z-10"
          >
            <OTPVerify 
              email={email} 
              onVerify={handleOTPVerify} 
              onBack={() => setShowOTP(false)} 
              isVerifying={isSubmitting} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
