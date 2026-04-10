import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function InterviewHistory({ interviews }) {
  // If we have real data, map it properly; else fallback to dummy
  const displayData = interviews.map((inv) => {
     const dateObj = inv.createdAt ? new Date(inv.createdAt) : new Date();
     const options = { year: 'numeric', month: 'short', day: 'numeric' };
     
     return {
         id: inv.id,
         date: dateObj.toLocaleDateString(undefined, options),
         role: inv.resumeData?.experienceLevel 
                ? `${inv.resumeData.experienceLevel.charAt(0).toUpperCase() + inv.resumeData.experienceLevel.slice(1)} Developer` 
                : 'Interview Session',
         round: 'Mock Interview',
         score: inv.score !== undefined ? inv.score : (inv.technicalScore || 0), 
         status: (inv.score > 70 || inv.technicalScore > 70) ? 'pass' : 'fail'
     }
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left whitespace-nowrap">
        <thead>
          <tr className="text-text-muted text-sm border-b border-subtle">
            <th className="pb-3 font-medium">Date</th>
            <th className="pb-3 font-medium">Role</th>
            <th className="pb-3 font-medium">Round</th>
            <th className="pb-3 font-medium text-center">Score</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3"></th>
          </tr>
        </thead>
        <tbody>
          {displayData.map((item, index) => (
            <motion.tr 
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border-b border-subtle/50 hover:bg-glass transition-colors group"
            >
              <td className="py-4 text-text-secondary text-sm">{item.date}</td>
              <td className="py-4 font-medium text-text-primary">{item.role}</td>
              <td className="py-4 text-text-secondary text-sm">{item.round}</td>
              <td className="py-4 text-center font-mono text-text-primary">{item.score}%</td>
              <td className="py-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                  ${item.status === 'pass' ? 'border-accent-green text-accent-green' : 'border-accent-red text-accent-red'}
                `}>
                  {item.status === 'pass' ? 'Passed' : 'Failed'}
                </span>
              </td>
              <td className="py-4 text-right">
                <Link to={`/feedback/${item.id}`} className="inline-flex items-center text-text-muted hover:text-accent-primary transition-colors">
                  Details <ChevronRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                </Link>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
      {displayData.length === 0 && (
        <div className="text-center py-12 text-text-muted">
          No interviews completed yet.
        </div>
      )}
    </div>
  );
}
