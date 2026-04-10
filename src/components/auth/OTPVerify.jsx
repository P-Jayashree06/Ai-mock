import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function OTPVerify({ email, onVerify, onBack, isVerifying }) {
  const [code, setCode] = React.useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index, value) => {
    if (value.length > 1) return; // Prevent multiple chars
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-advance
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length === 6) {
      onVerify(fullCode);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="glass-card p-8 w-full max-w-md"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-display font-bold text-text-primary mb-2">Check your email</h2>
        <p className="text-text-secondary text-sm">
          We sent a verification code to <br/>
          <span className="font-medium text-text-primary">{email}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-between gap-2">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={el => inputRefs.current[index] = el}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              placeholder="·"
              onChange={(e) => handleChange(index, e.target.value.replace(/[^0-9]/g, ''))}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-14 text-center text-2xl font-mono font-bold bg-bg-primary border border-subtle rounded-xl focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 outline-none transition-all text-text-primary placeholder:text-text-muted/30 shadow-inner"
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={code.join('').length !== 6 || isVerifying}
          className="w-full h-12 bg-accent-primary hover:bg-accent-secondary disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-btn transition-colors relative overflow-hidden"
        >
          {isVerifying ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          ) : (
            'Verify & Sign In'
          )}
        </button>
      </form>

      <button
        onClick={onBack}
        className="w-full mt-4 text-sm text-text-muted hover:text-text-primary transition-colors"
      >
        Use a different email
      </button>
    </motion.div>
  );
}
