import React from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, ScanSearch, CheckCircle2, Loader2 } from 'lucide-react';

export default function Loader({ variant = 'default' }) {
  if (variant === 'AIThinking') {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-accent-primary animate-pulse"></div>
            <div className="w-3 h-3 rounded-full bg-accent-secondary animate-pulse animation-delay-200"></div>
            <div className="w-3 h-3 rounded-full bg-accent-primary animate-pulse animation-delay-400"></div>
          </div>
        </motion.div>
        <p className="text-text-secondary font-medium tracking-wide">AI is analyzing...</p>
      </div>
    );
  }

  if (variant === 'ResumeScanning') {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="relative w-16 h-16 text-accent-primary">
          <ScanSearch className="w-full h-full opacity-50" />
          <motion.div 
            className="absolute top-0 left-0 w-full h-1 bg-accent-primary shadow-[0_0_10px_var(--accent-primary)]"
            animate={{ y: [0, 64, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          />
        </div>
        <p className="text-text-secondary font-medium">Scanning document...</p>
      </div>
    );
  }

  if (variant === 'Evaluating') {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
        >
          <BrainCircuit className="w-12 h-12 text-accent-secondary" />
        </motion.div>
        <p className="text-text-secondary font-medium">Evaluating your answer...</p>
      </div>
    );
  }

  if (variant === 'Generating') {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
        <p className="text-text-secondary font-medium typing-effect">Generating questions...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4">
      <Loader2 className="w-6 h-6 text-accent-primary animate-spin" />
    </div>
  );
}
