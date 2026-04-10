import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, PlusCircle, Download, Share2, Star, Sparkles, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { useInterviewDetails, saveFinalResult } from '../../lib/instantdb';
import useInterviewStore from '../../store/interviewStore';
import Navbar from '../shared/Navbar';
import Loader from '../shared/Loader';
import { fadeInUp, staggerChildren } from '../../lib/animations';
import toast from 'react-hot-toast';
import { generateOverallFeedback } from '../../lib/kimiAPI';

export default function FeedbackPage() {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useInterviewDetails(interviewId);
  const resetInterview = useInterviewStore(s => s.resetInterview);
  const [aiFeedback, setAiFeedback] = useState(null);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);

  // We should ideally calculate final score once and save to DB
  useEffect(() => {
    if (data?.interviews?.length > 0 && data?.answers?.length > 0 && !data?.results?.length) {
      const round1Answers = data.answers.filter(a => a.round === 1);
      const round2Answers = data.answers.filter(a => a.round === 2);
      const round3Answers = data.answers.filter(a => a.round === 3);
      
      const r1Score = round1Answers.length ? Math.round(round1Answers.reduce((a, b) => a + b.score, 0) / round1Answers.length) : 0;
      const r2Score = round2Answers.length ? Math.round(round2Answers.reduce((a, b) => a + b.score, 0) / round2Answers.length) : 0;
      const r3Score = round3Answers.length ? Math.round(round3Answers.reduce((a, b) => a + b.score, 0) / round3Answers.length) : 0;
      const divisor = [round1Answers.length, round2Answers.length, round3Answers.length].filter(x => x > 0).length || 1;
      const overall = Math.round((r1Score + r2Score + r3Score) / divisor);

      saveFinalResult(interviewId, {
        overallScore: overall,
        round1Score: r1Score,
        round2Score: r2Score,
        round3Score: r3Score
      });
    }
  }, [data, interviewId]);

  // Fetch AI overall feedback once scores + answers are available
  useEffect(() => {
    if (!aiFeedback && !isLoadingFeedback && data?.results?.length > 0 && data?.answers?.length > 0) {
      const r = data.results[0];
      if ((r.overallScore || 0) > 0) {
        setIsLoadingFeedback(true);
        generateOverallFeedback({
          round1Score: r.round1Score || 0,
          round2Score: r.round2Score || 0,
          round3Score: r.round3Score || 0,
          overallScore: r.overallScore || 0,
          answers: data.answers
        })
          .then(setAiFeedback)
          .catch(() => toast.error('Could not generate AI feedback.'))
          .finally(() => setIsLoadingFeedback(false));
      }
    }
  }, [data, aiFeedback, isLoadingFeedback]);

  if (isLoading) return <div className="min-h-screen bg-bg-primary"><Navbar /><div className="mt-20"><Loader /></div></div>;
  if (error || !data?.interviews?.length) return <div className="min-h-screen bg-bg-primary text-text-primary"><Navbar /><div className="p-8">Error loading details.</div></div>;

  const interview = data.interviews[0];
  const answers = data.answers || [];
  const results = data.results?.[0] || { overallScore: 0, round1Score: 0, round2Score: 0, round3Score: 0 };

  const techAnswers = answers.filter(a => a.round === 1);
  const techHRAnswers = answers.filter(a => a.round === 2);
  const personalHRAnswers = answers.filter(a => a.round === 3);

  // InstantDB may store nested objects as strings — parse safely
  const parseEval = (evaluation) => {
    if (!evaluation) return {};
    if (typeof evaluation === 'string') {
      try { return JSON.parse(evaluation); } catch { return {}; }
    }
    return evaluation;
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-accent-green stroke-accent-green';
    if (score >= 60) return 'text-accent-amber stroke-accent-amber';
    return 'text-accent-red stroke-accent-red';
  };

  const CircleGauge = ({ score, label, delay = 0, size = "large" }) => {
    const colorClass = getScoreColor(score);
    const dashArray = 251.2; // 2 * pi * 40
    const strokeDashoffset = dashArray - (dashArray * score) / 100;
    
    return (
      <div className="flex flex-col items-center">
        <div className={`relative ${size === 'large' ? 'w-48 h-48' : 'w-32 h-32'} flex items-center justify-center`}>
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" className="stroke-subtle fill-none" strokeWidth={size === 'large' ? '8' : '6'} />
            <motion.circle
              cx="50" cy="50" r="40"
              className={`${colorClass} fill-none`}
              strokeWidth={size === 'large' ? '8' : '6'}
              strokeLinecap="round"
              strokeDasharray={dashArray}
              initial={{ strokeDashoffset: dashArray }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, delay, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span 
              className={`${size === 'large' ? 'text-5xl' : 'text-3xl'} font-display font-bold ${getScoreColor(score).split(' ')[0]}`}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: delay + 0.5 }}
            >
              {score}%
            </motion.span>
          </div>
        </div>
        <p className={`mt-4 ${size === 'large' ? 'text-lg text-text-primary' : 'text-sm text-text-secondary'} font-medium`}>{label}</p>
      </div>
    );
  };

  const handleNewInterview = () => {
    resetInterview();
    navigate('/interview/setup');
  };

  const handleExportPDF = () => {
    const toastId = toast.loading('Preparing PDF...');
    
    // Inject a print-only stylesheet
    const styleId = 'pdf-print-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        @media print {
          body { background: white !important; color: black !important; }
          nav, .no-print { display: none !important; }
          .glass-card { border: 1px solid #ddd !important; background: white !important; box-shadow: none !important; }
          .bg-bg-primary, .bg-bg-secondary, .bg-bg-card { background: white !important; }
          .text-text-primary, .text-text-secondary, .text-text-muted { color: #333 !important; }
          .text-accent-green { color: #16a34a !important; }
          .text-accent-amber { color: #d97706 !important; }
          .text-accent-red { color: #dc2626 !important; }
          .text-accent-primary { color: #6366f1 !important; }
          .text-accent-secondary { color: #8b5cf6 !important; }
          .border-subtle { border-color: #e5e7eb !important; }
          details { display: block !important; }
          details summary { list-style: none; }
          details > div { display: block !important; }
          @page { margin: 1.5cm; size: A4; }
        }
      `;
      document.head.appendChild(style);
    }

    setTimeout(() => {
      toast.dismiss(toastId);
      window.print();
    }, 600);
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar />
      <motion.main 
        initial="hidden" animate="visible" variants={staggerChildren}
        className="max-w-6xl mx-auto px-4 py-8 space-y-8"
      >
        {/* Header Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-text-primary">Interview Performance</h1>
            <p className="text-text-secondary">Summary and detailed analysis across 3 rounds</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 border border-subtle rounded-lg text-text-muted hover:text-text-primary hover:bg-glass transition-colors">
              <Share2 className="w-5 h-5" />
            </button>
            <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-bg-secondary border border-subtle text-text-primary rounded-lg hover:bg-glass transition-colors">
              <Download className="w-4 h-4" /> Export PDF
            </button>
            <button onClick={handleNewInterview} className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg hover:opacity-90 shadow-glow transition-all">
              <PlusCircle className="w-4 h-4" /> New Interview
            </button>
          </div>
        </div>

        {/* Hero Score */}
        <motion.div variants={fadeInUp} className="glass-card p-10 flex flex-col md:flex-row items-center justify-center gap-12 bg-gradient-card">
          <CircleGauge score={results.overallScore || 0} label="Overall Match Score" size="large" delay={0.2} />
          
          <div className="max-w-xl w-full">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              {results.overallScore >= 80 ? (
                <><Trophy className="text-accent-amber w-6 h-6" /> Outstanding Performance!</>
              ) : results.overallScore >= 60 ? (
                "Solid Effort. Keep improving."
              ) : (
                "More practice needed."
              )}
            </h2>
            <p className="text-text-secondary leading-relaxed mb-6">
              {results.overallScore >= 80 
                ? "Excellent work! You are job-ready and have demonstrated strong proficiency. Very minor polish required." 
                : results.overallScore >= 60 
                ? "Solid effort! You show a great foundation but there is noticeable room for improvement. Focus on refining your speed and behavioral clarity."
                : results.overallScore > 0 
                ? "More practice needed. Core concepts require significant review before your next real interview. Please heavily review the AI feedback below." 
                : "Complete at least one round to receive overall feedback."}
            </p>
            <div className="flex gap-4 w-full">
              <div className="flex-1 bg-bg-secondary p-4 rounded-xl border border-subtle text-center">
                <p className="text-xs text-text-muted mb-1 line-clamp-1">Round 1: Tech & Logic</p>
                <p className={`text-xl font-bold ${getScoreColor(results.round1Score).split(' ')[0]}`}>{results.round1Score || 0}%</p>
              </div>
              <div className="flex-1 bg-bg-secondary p-4 rounded-xl border border-subtle text-center">
                <p className="text-xs text-text-muted mb-1 line-clamp-1">Round 2: Technical HR</p>
                <p className={`text-xl font-bold ${getScoreColor(results.round2Score).split(' ')[0]}`}>{results.round2Score || 0}%</p>
              </div>
              <div className="flex-1 bg-bg-secondary p-4 rounded-xl border border-subtle text-center">
                <p className="text-xs text-text-muted mb-1 line-clamp-1">Round 3: Personal HR</p>
                <p className={`text-xl font-bold ${getScoreColor(results.round3Score).split(' ')[0]}`}>{results.round3Score || 0}%</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Tech Breakdown */}
          <motion.div variants={fadeInUp} className="glass-card p-6">
            <h3 className="text-xl font-display font-medium border-b border-subtle pb-4 mb-4 flex items-center gap-2">
               Round 1: Technical Feedback
            </h3>
            {techAnswers.map((ans, i) => {
              const ev = parseEval(ans.evaluation);
              return (
              <details key={i} className="mb-4 group">
                <summary className="cursor-pointer bg-bg-secondary p-4 rounded-lg flex justify-between items-center text-sm font-medium hover:bg-glass transition-colors">
                  <span className="truncate pr-4 flex-1">Q: {ans.questionText}</span>
                  <span className={`flex-shrink-0 ${getScoreColor(ans.score).split(' ')[0]}`}>{ans.score}%</span>
                </summary>
                <div className="p-4 border-x border-b border-subtle rounded-b-lg -mt-2 pt-4 bg-bg-primary/50 text-sm">
                  <div className="mb-4">
                     <p className="text-text-muted mb-1 uppercase tracking-wider text-xs">Your Code/Logic:</p>
                     <pre className="p-3 bg-bg-secondary rounded text-xs overflow-x-auto text-text-primary font-mono border border-subtle">
                       {ans.answerText}
                     </pre>
                  </div>
                  <div>
                    <p className="text-text-muted mb-1 uppercase tracking-wider text-xs">AI Evaluation:</p>
                    <p className="text-text-secondary">{ev.feedback || 'No feedback recorded.'}</p>
                    {ev.timeComplexity && (
                      <p className="text-xs text-accent-amber mt-1">⏱ Time: {ev.timeComplexity} | Space: {ev.spaceComplexity}</p>
                    )}
                  </div>
                </div>
              </details>
              );
            })}
          </motion.div>

          <div className="space-y-8">
             {/* Tech HR Breakdown */}
             <motion.div variants={fadeInUp} className="glass-card p-6">
               <h3 className="text-xl font-display font-medium border-b border-subtle pb-4 mb-4">Round 2: Technical HR</h3>
               {techHRAnswers.map((ans, i) => {
                 const ev = parseEval(ans.evaluation);
                 return (
                 <details key={i} className="mb-4 group">
                   <summary className="cursor-pointer bg-bg-secondary p-4 rounded-lg flex justify-between items-center text-sm font-medium hover:bg-glass transition-colors">
                     <span className="truncate pr-4 flex-1">Q: {ans.questionText}</span>
                     <span className={`flex-shrink-0 ${getScoreColor(ans.score).split(' ')[0]}`}>{ans.score}%</span>
                   </summary>
                   <div className="p-4 border-x border-b border-subtle rounded-b-lg -mt-2 pt-4 bg-bg-primary/50 text-sm space-y-4">
                     <div>
                       <p className="text-text-muted mb-1 uppercase tracking-wider text-xs flex gap-4 text-accent-secondary">
                         <span>Clarity: {ev.clarityScore ?? 'N/A'}%</span>
                         <span>Confidence: {ev.confidenceScore ?? 'N/A'}%</span>
                       </p>
                       <p className="text-text-secondary italic mt-2">"{ans.answerText}"</p>
                     </div>
                     <div>
                       <p className="text-accent-primary mb-1 uppercase tracking-wider text-xs">AI Evaluation:</p>
                       <p className="text-text-secondary">{ev.feedback || 'No feedback recorded.'}</p>
                     </div>
                   </div>
                 </details>
                 );
               })}
             </motion.div>

             {/* Personal HR Breakdown */}
             <motion.div variants={fadeInUp} className="glass-card p-6">
               <h3 className="text-xl font-display font-medium border-b border-subtle pb-4 mb-4">Round 3: Personal HR</h3>
               {personalHRAnswers.map((ans, i) => {
                 const ev = parseEval(ans.evaluation);
                 return (
                 <details key={i} className="mb-4 group">
                   <summary className="cursor-pointer bg-bg-secondary p-4 rounded-lg flex justify-between items-center text-sm font-medium hover:bg-glass transition-colors">
                     <span className="truncate pr-4 flex-1">Q: {ans.questionText}</span>
                     <span className={`flex-shrink-0 ${getScoreColor(ans.score).split(' ')[0]}`}>{ans.score}%</span>
                   </summary>
                   <div className="p-4 border-x border-b border-subtle rounded-b-lg -mt-2 pt-4 bg-bg-primary/50 text-sm space-y-4">
                     <div>
                       <p className="text-text-muted mb-1 uppercase tracking-wider text-xs flex gap-4 text-accent-secondary">
                         <span>Clarity: {ev.clarityScore ?? 'N/A'}%</span>
                         <span>Confidence: {ev.confidenceScore ?? 'N/A'}%</span>
                       </p>
                       <p className="text-text-secondary italic mt-2">"{ans.answerText}"</p>
                     </div>
                     <div>
                       <p className="text-accent-primary mb-1 uppercase tracking-wider text-xs">AI Evaluation:</p>
                       <p className="text-text-secondary">{ev.feedback || 'No feedback recorded.'}</p>
                     </div>
                   </div>
                 </details>
                 );
               })}
             </motion.div>
          </div>
        </div>

        {/* Round Score Summary */}
        <motion.div variants={fadeInUp} className="glass-card p-8">
          <h3 className="text-xl font-display font-medium mb-6 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-accent-amber" /> Round Score Summary
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Round 1 */}
            <div className="bg-bg-secondary border border-subtle p-6 rounded-xl flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-accent-primary/20 flex items-center justify-center">
                <span className="text-accent-primary font-bold text-lg">1</span>
              </div>
              <h4 className="font-semibold text-text-primary text-center">Technical & Logic</h4>
              <div className={`text-4xl font-mono font-black ${getScoreColor(results.round1Score || 0).split(' ')[0]}`}>
                {results.round1Score || 0}%
              </div>
              <div className="w-full bg-bg-primary rounded-full h-2 border border-subtle overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${results.round1Score >= 80 ? 'bg-accent-green' : results.round1Score >= 60 ? 'bg-accent-amber' : 'bg-accent-red'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${results.round1Score || 0}%` }}
                  transition={{ duration: 1, delay: 0.2 }}
                />
              </div>
              <p className="text-xs text-text-muted text-center">{techAnswers.length} question{techAnswers.length !== 1 ? 's' : ''} answered</p>
            </div>

            {/* Round 2 */}
            <div className="bg-bg-secondary border border-subtle p-6 rounded-xl flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-accent-secondary/20 flex items-center justify-center">
                <span className="text-accent-secondary font-bold text-lg">2</span>
              </div>
              <h4 className="font-semibold text-text-primary text-center">Technical HR</h4>
              <div className={`text-4xl font-mono font-black ${getScoreColor(results.round2Score || 0).split(' ')[0]}`}>
                {results.round2Score || 0}%
              </div>
              <div className="w-full bg-bg-primary rounded-full h-2 border border-subtle overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${results.round2Score >= 80 ? 'bg-accent-green' : results.round2Score >= 60 ? 'bg-accent-amber' : 'bg-accent-red'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${results.round2Score || 0}%` }}
                  transition={{ duration: 1, delay: 0.4 }}
                />
              </div>
              <p className="text-xs text-text-muted text-center">{techHRAnswers.length} question{techHRAnswers.length !== 1 ? 's' : ''} answered</p>
            </div>

            {/* Round 3 */}
            <div className="bg-bg-secondary border border-subtle p-6 rounded-xl flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-accent-amber/20 flex items-center justify-center">
                <span className="text-accent-amber font-bold text-lg">3</span>
              </div>
              <h4 className="font-semibold text-text-primary text-center">Personal HR</h4>
              <div className={`text-4xl font-mono font-black ${getScoreColor(results.round3Score || 0).split(' ')[0]}`}>
                {results.round3Score || 0}%
              </div>
              <div className="w-full bg-bg-primary rounded-full h-2 border border-subtle overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${results.round3Score >= 80 ? 'bg-accent-green' : results.round3Score >= 60 ? 'bg-accent-amber' : 'bg-accent-red'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${results.round3Score || 0}%` }}
                  transition={{ duration: 1, delay: 0.6 }}
                />
              </div>
              <p className="text-xs text-text-muted text-center">{personalHRAnswers.length} question{personalHRAnswers.length !== 1 ? 's' : ''} answered</p>
            </div>
          </div>
        </motion.div>

        {/* AI Overall Feedback */}
        <motion.div variants={fadeInUp} className="glass-card p-8">
          <h3 className="text-xl font-display font-medium mb-6 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent-primary" /> AI Coach Overall Feedback
          </h3>

          {isLoadingFeedback ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
              <p className="text-text-muted text-sm animate-pulse">AI is analyzing your full performance...</p>
            </div>
          ) : aiFeedback ? (
            <div className="space-y-6">
              {/* Hirability Badge */}
              <div className="flex items-center gap-4 p-4 bg-bg-secondary rounded-xl border border-subtle">
                <div className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide border ${
                  aiFeedback.hirability === 'Ready to hire' ? 'bg-accent-green/20 text-accent-green border-accent-green/30' :
                  aiFeedback.hirability === 'Almost there' ? 'bg-accent-amber/20 text-accent-amber border-accent-amber/30' :
                  'bg-accent-red/20 text-accent-red border-accent-red/30'
                }`}>
                  {aiFeedback.hirability}
                </div>
                <p className="text-text-secondary text-sm leading-relaxed flex-1">{aiFeedback.overallSummary}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Strengths */}
                <div className="bg-bg-secondary border border-subtle p-5 rounded-xl">
                  <h4 className="font-semibold text-accent-green mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Key Strengths
                  </h4>
                  <ul className="space-y-2">
                    {aiFeedback.strengths?.map((s, i) => (
                      <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                        <span className="text-accent-green mt-0.5">✓</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Next Steps */}
                <div className="bg-bg-secondary border border-subtle p-5 rounded-xl">
                  <h4 className="font-semibold text-accent-primary mb-3 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" /> Recommended Next Steps
                  </h4>
                  <ul className="space-y-2">
                    {aiFeedback.nextSteps?.map((s, i) => (
                      <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                        <span className="text-accent-primary font-bold">{i + 1}.</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-text-muted text-sm text-center py-8">Complete at least one round to receive overall AI coaching feedback.</p>
          )}
        </motion.div>

        {/* Improvement Areas with Star Ratings */}
        {aiFeedback?.improvementAreas?.length > 0 && (
          <motion.div variants={fadeInUp} className="glass-card p-8">
            <h3 className="text-xl font-display font-medium mb-2 flex items-center gap-2">
              <Star className="w-5 h-5 text-accent-amber" /> Improvement Areas
            </h3>
            <p className="text-text-muted text-xs mb-6 uppercase tracking-wider">⭐⭐⭐⭐⭐ = Most urgent to improve</p>
            <div className="space-y-4">
              {[...aiFeedback.improvementAreas]
                .sort((a, b) => (b.stars || 0) - (a.stars || 0))
                .map((item, i) => (
                <div key={i} className="p-4 bg-bg-secondary border border-subtle rounded-xl flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-text-primary mb-1">{item.area}</h4>
                    <p className="text-sm text-text-secondary">{item.detail}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${star <= (item.stars || 0) ? 'text-accent-amber fill-accent-amber' : 'text-subtle'}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </motion.main>
    </div>
  );
}
