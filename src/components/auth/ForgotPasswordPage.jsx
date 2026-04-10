import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, Eye, EyeOff, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authService } from '../../lib/authService';
import Loader from '../shared/Loader';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1); // 1: Email & New Password, 2: OTP
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email address');
    if (!newPassword || !confirmPassword) return toast.error('Please enter your new password');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');

    setIsSubmitting(true);
    try {
      await authService.sendResetOtp(email);
      setStep(2);
      toast.success('Reset code sent to your email!');
    } catch (err) {
      toast.error(err.message || 'Failed to send reset code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      return toast.error('OTP must be 6 digits');
    }

    setIsSubmitting(true);
    try {
      await authService.verifyResetOtpAndUpdatePassword(email, otp, newPassword);
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 -right-64 w-96 h-96 bg-accent-secondary/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 -left-64 w-96 h-96 bg-accent-primary/20 rounded-full blur-[100px]" />

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div key="step1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-md relative z-10">
            <div className="glass-card p-10 mt-8 rounded-2xl shadow-xl">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-display font-bold text-text-primary mb-2">Reset Password</h1>
                <p className="text-text-secondary">Set a new password and confirm via email</p>
              </div>

              <form onSubmit={handleRequestOtp} className="space-y-6">
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
                      className="w-full pl-12 pr-4 py-3 bg-bg-secondary border border-subtle rounded-xl focus:ring-2 focus:ring-accent-primary focus:border-accent-primary text-text-primary transition-all outline-none"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">New Password</label>
                  <div className="relative">
                    <Lock className="absolute inset-y-0 left-0 pl-3 my-auto h-5 w-8 text-text-muted pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="w-full pl-12 pr-12 py-3 bg-bg-secondary border border-subtle rounded-xl focus:ring-accent-primary focus:border-accent-primary text-text-primary outline-none"
                      placeholder="Create new password"
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

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute inset-y-0 left-0 pl-3 my-auto h-5 w-8 text-text-muted pointer-events-none" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full pl-12 pr-12 py-3 bg-bg-secondary border border-subtle rounded-xl focus:ring-accent-primary focus:border-accent-primary text-text-primary outline-none"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-muted hover:text-accent-primary transition-colors focus:outline-none"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-gradient-primary hover:opacity-90 text-white font-medium rounded-xl transition-all shadow-glow flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? <Loader variant="Evaluating" /> : <span>Send Reset Code</span>}
                  {!isSubmitting && <ArrowRight className="w-5 h-5 ml-2" />}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/login" className="text-sm text-text-muted hover:text-text-primary transition-colors">
                  Back to Login
                </Link>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full max-w-md relative z-10">
            <div className="glass-card p-10 mt-8 rounded-2xl shadow-xl">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-display font-bold text-text-primary mb-2">Verify Reset Code</h1>
                <p className="text-text-secondary">Enter the 6-digit code sent to {email}</p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Reset Code from Email</label>
                  <div className="relative">
                    <KeyRound className="absolute inset-y-0 left-0 pl-3 my-auto h-5 w-8 text-text-muted pointer-events-none" />
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full pl-12 pr-4 py-3 tracking-widest font-mono bg-bg-secondary border border-subtle rounded-xl focus:ring-accent-primary focus:border-accent-primary text-text-primary outline-none"
                      placeholder="000000"
                      required
                    />
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full mt-8 py-3.5 bg-gradient-primary hover:opacity-90 text-white font-medium rounded-xl transition-all shadow-glow flex items-center justify-center space-x-2">
                  {isSubmitting ? <Loader variant="Evaluating" /> : <span>Reset Password</span>}
                  {!isSubmitting && <ArrowRight className="w-5 h-5 ml-2" />}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button onClick={() => setStep(1)} className="text-sm text-text-muted hover:text-text-primary transition-colors">
                  Try a different email
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
