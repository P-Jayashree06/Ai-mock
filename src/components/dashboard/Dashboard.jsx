import React from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, staggerChildren } from '../../lib/animations';
import { useInterviewHistory } from '../../lib/instantdb';
import { LogOut, Calendar, TrendingUp, Trophy, ArrowRight, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import PerformanceChart from './PerformanceChart';
import InterviewHistory from './InterviewHistory';
import SkillRadar from './SkillRadar';
import Loader from '../shared/Loader';
import MiniGames from './MiniGames';
import TechQuiz from './TechQuiz';

import { authService } from '../../lib/authService';

export default function DashboardContent() {
  const user = authService.getSession();
  const { isLoading, data, error } = useInterviewHistory(user?.id);

  if (isLoading) return <Loader variant="default" />;
  if (error) return <div className="text-accent-red">Error loading dashboard</div>;

  const interviews = data?.interviews || [];
  const completed = interviews.filter(i => i.status === 'completed');
  
  const total = completed.length;
  let avgScore = 0;
  let bestScore = 0;
  
  if (total > 0) {
     const scores = completed.map(i => i.score || 0);
     avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / total);
     bestScore = Math.max(...scores);
  }

  const stats = [
    { label: 'Total Interviews', value: total, icon: Target, trend: 'All time' },
    { label: 'Avg Score', value: `${avgScore}%`, icon: TrendingUp, trend: 'Performance' },
    { label: 'Best Score', value: `${bestScore}%`, icon: Trophy, trend: 'Highest' },
    { label: 'Streak', value: total > 0 ? 'Active' : 'None', icon: Calendar, trend: 'Activity' },
  ];

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={staggerChildren}
      className="space-y-6"
    >
      {/* Welcome Banner */}
      <motion.div variants={fadeInUp} className="relative overflow-hidden rounded-card p-8 bg-gradient-card border border-subtle shadow-glow">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-primary/10 rounded-full blur-[80px]" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-display font-bold text-text-primary mb-2">
              Welcome back, {user?.name || 'User'}!
            </h1>
            <p className="text-text-secondary">Ready to crush your next interview? You've got this.</p>
          </div>
          <Link 
            to="/interview/setup"
            className="flex items-center gap-2 bg-gradient-primary hover:opacity-90 text-white px-6 py-3 rounded-btn font-medium transition-all shadow-glow"
          >
            Start New Interview <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={i} variants={fadeInUp} className="glass-card p-6 flex flex-col gap-4 group hover:-translate-y-1 transition-transform cursor-default">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-bg-secondary rounded-lg group-hover:scale-110 transition-transform">
                <stat.icon className="w-5 h-5 text-accent-primary" />
              </div>
              <span className="text-xs font-semibold text-accent-green bg-accent-green/10 px-2 py-1 rounded">
                {stat.trend}
              </span>
            </div>
            <div>
              <p className="text-sm text-text-muted mb-1">{stat.label}</p>
              <h3 className="text-2xl font-bold text-text-primary font-mono group-hover:text-accent-primary transition-colors">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      {completed.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={fadeInUp} className="lg:col-span-2 glass-card p-6">
            <h3 className="text-lg font-semibold mb-4 text-text-primary">Performance Trend</h3>
            <div className="h-80 w-full">
              <PerformanceChart data={completed} />
            </div>
          </motion.div>
          <motion.div variants={fadeInUp} className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4 text-text-primary">Skills Analysis</h3>
            <div className="h-80 w-full">
              <SkillRadar data={completed} />
            </div>
          </motion.div>
        </div>
      ) : (
        <motion.div variants={fadeInUp} className="glass-card p-12 text-center flex flex-col items-center justify-center border border-dashed border-subtle">
           <div className="w-16 h-16 bg-accent-primary/10 rounded-full flex items-center justify-center mb-4">
             <Target className="w-8 h-8 text-accent-primary" />
           </div>
           <h3 className="text-xl font-display font-bold text-text-primary mb-2">No interviews yet</h3>
           <p className="text-text-secondary mb-6">Start your first AI mock interview to generate your performance metrics.</p>
           <Link to="/interview/setup" className="bg-accent-primary text-white px-6 py-2.5 rounded-btn hover:bg-accent-secondary transition-colors font-medium">
             Take Mock Interview
           </Link>
        </motion.div>
      )}

      {/* Mini Games Section (LinkedIn Style) */}
      <motion.div variants={fadeInUp} className="mt-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1.5 h-6 bg-accent-secondary rounded-full" />
          <h3 className="text-xl font-display font-bold text-text-primary">Knowledge & Fun</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <MiniGames />
           <TechQuiz />
        </div>
      </motion.div>

      {/* Recent History */}
      {completed.length > 0 && (
        <motion.div variants={fadeInUp} className="glass-card p-6 mt-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center justify-between text-text-primary">
            <span>Recent Interviews</span>
            <button className="text-sm text-accent-primary font-medium hover:underline">View All</button>
          </h3>
          <InterviewHistory interviews={completed} />
        </motion.div>
      )}
    </motion.div>
  );
}
