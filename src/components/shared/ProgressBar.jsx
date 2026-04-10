import React from 'react';
import { motion } from 'framer-motion';

export default function ProgressBar({ progress, color = 'bg-accent-primary' }) {
  return (
    <div className="w-full h-2 bg-glass rounded-full overflow-hidden border border-subtle">
      <motion.div
        className={`h-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  );
}
