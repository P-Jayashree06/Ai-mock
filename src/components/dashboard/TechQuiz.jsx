import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, CheckCircle2, XCircle, ArrowRight, RotateCcw, Award, Loader2, Code2, Cpu } from 'lucide-react';
import { generateTriviaQuestions } from '../../lib/kimiAPI';
import useInterviewStore from '../../store/interviewStore';
import toast from 'react-hot-toast';

const DRILL_TOPICS = [
  'C++', 'Python', 'JavaScript', 'Java', 'SQL', 'Data Structures', 'Algorithms', 'React', 'Node.js', 'System Design'
];

export default function TechQuiz() {
  const { resumeAnalysis } = useInterviewStore();
  const [questions, setQuestions] = useState([]);
  const [gameState, setGameState] = useState('idle'); // idle, picking, playing, finished, loading
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [askedQuestionTitles, setAskedQuestionTitles] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState(['C++']);
  
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const fetchQuestions = async () => {
    setGameState('loading');
    try {
      const level = resumeAnalysis?.experienceLevel || 'junior';
      
      // Use manually selected topics for the game
      const newQuestions = await generateTriviaQuestions(selectedTopics, [], level, askedQuestionTitles);
      
      if (newQuestions && newQuestions.length > 0) {
        setQuestions(newQuestions);
        setGameState('playing');
        setCurrentQIndex(0);
        setScore(0);
        setSelectedOption(null);
        setIsAnswered(false);
        
        // Track asked titles to avoid next time
        setAskedQuestionTitles(prev => [...prev, ...newQuestions.map(q => q.question)]);
      } else {
        toast.error("Failed to generate questions. Please try again.");
        setGameState('idle');
      }
    } catch (error) {
      console.error("Trivia Fetch Error:", error);
      toast.error("AI service is busy. Try again in a moment.");
      setGameState('idle');
    }
  };

  const startPicking = () => setGameState('picking');

  const startQuiz = () => {
    if (selectedTopics.length === 0) {
      toast.error("Please select at least one topic");
      return;
    }
    fetchQuestions();
  };

  const toggleTopic = (topic) => {
    setSelectedTopics(prev => 
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const nextQuestion = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setGameState('finished');
    }
  };

  const handleOptionSelect = (option) => {
    if (isAnswered) return;
    
    setSelectedOption(option);
    setIsAnswered(true);
    
    if (option === questions[currentQIndex].answer) {
      setScore(prev => prev + 1);
    }

    // Extra speed: Auto-progress after 1 second (faster than before)
    timerRef.current = setTimeout(() => {
      nextQuestion();
    }, 1000);
  };

  const q = questions[currentQIndex];

  return (
    <div className="glass-card p-6 min-h-[350px] flex flex-col relative border border-subtle bg-gradient-to-br from-bg-card to-bg-secondary group overflow-hidden">
      <div className="absolute -top-10 -right-10 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
         <HelpCircle className="w-40 h-40" />
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-accent-secondary/20 rounded-lg">
          <HelpCircle className="w-5 h-5 text-accent-secondary" />
        </div>
        <div>
          <h3 className="text-lg font-display font-bold text-text-primary">Tech Trivia Blitz</h3>
          <p className="text-xs text-text-muted">Test your core technical knowledge</p>
        </div>
      </div>

      <AnimatePresence mode="wait text-white">
        {gameState === 'idle' && (
          <motion.div 
            key="idle"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-grow flex flex-col items-center justify-center border-2 border-dashed border-subtle rounded-xl bg-bg-primary/50 p-6"
          >
            <p className="text-text-muted text-sm mb-4 text-center max-w-[200px]">Quick 5-question blitz to sharpen your skills.</p>
            <button 
              onClick={startPicking}
              className="flex items-center gap-2 bg-accent-secondary text-white px-6 py-2.5 rounded-btn font-bold hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(var(--accent-secondary-rgb),0.3)]"
            >
              <Cpu className="w-4 h-4" /> Customize & Start
            </button>
          </motion.div>
        )}

        {gameState === 'picking' && (
           <motion.div
             key="picking"
             initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}
             transition={{ duration: 0.2 }}
             className="flex-grow flex flex-col"
           >
             <h4 className="text-sm font-semibold text-text-muted mb-3 uppercase tracking-wider flex items-center gap-2">
               <Code2 className="w-4 h-4" /> Select Topics
             </h4>
             <div className="flex flex-wrap gap-2 mb-6">
               {DRILL_TOPICS.map(topic => (
                 <button
                   key={topic}
                   onClick={() => toggleTopic(topic)}
                   className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
                     selectedTopics.includes(topic)
                       ? 'bg-accent-secondary border-accent-secondary text-white shadow-glow'
                       : 'bg-bg-primary border-subtle text-text-muted hover:border-accent-secondary'
                   }`}
                 >
                   {topic}
                 </button>
               ))}
             </div>
             <button 
               onClick={startQuiz}
               className="mt-auto w-full py-3 bg-white text-bg-primary rounded-btn font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors shadow-glow"
             >
               Go! <ArrowRight className="w-4 h-4" />
             </button>
           </motion.div>
        )}

        {gameState === 'loading' && (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-grow flex flex-col items-center justify-center space-y-4"
          >
            <Loader2 className="w-10 h-10 text-accent-secondary animate-spin" />
            <p className="text-text-muted text-sm animate-pulse">Generating C++ questions...</p>
          </motion.div>
        )}

        {gameState === 'playing' && q && (
          <motion.div 
            key="playing"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="flex-grow flex flex-col"
          >
            <div className="flex justify-between items-center mb-4 px-1">
               <span className="text-xs font-bold text-accent-secondary uppercase tracking-widest">Question {currentQIndex + 1}/{questions.length}</span>
               <div className="h-1.5 w-24 bg-bg-primary rounded-full overflow-hidden border border-subtle">
                 <motion.div 
                   className="h-full bg-accent-secondary" 
                   initial={{ width: 0 }}
                   animate={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
                   transition={{ duration: 0.3 }}
                 />
               </div>
            </div>

            <h4 className="text-md font-medium text-text-primary mb-6 leading-relaxed">
              {q.question}
            </h4>

            <div className="grid grid-cols-1 gap-3 mb-4">
              {q.options.map((opt, i) => {
                const isCorrect = opt === q.answer;
                const isSelected = opt === selectedOption;
                
                let btnClass = "bg-bg-primary border-subtle text-text-secondary hover:border-accent-secondary/50 shadow-sm";
                if (isAnswered) {
                  if (isCorrect) btnClass = "bg-emerald-500/20 border-emerald-500 text-emerald-500";
                  else if (isSelected) btnClass = "bg-rose-500/20 border-rose-500 text-rose-500";
                  else btnClass = "bg-bg-primary border-subtle text-text-muted opacity-50";
                }

                return (
                  <button
                    key={i}
                    onClick={() => handleOptionSelect(opt)}
                    disabled={isAnswered}
                    className={`p-2.5 px-4 rounded-xl border text-left text-sm font-medium transition-all flex items-center justify-between ${btnClass}`}
                  >
                    {opt}
                    {isAnswered && isCorrect && <CheckCircle2 className="w-4 h-4" />}
                    {isAnswered && isSelected && !isCorrect && <XCircle className="w-4 h-4" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-auto flex items-center justify-center">
              {isAnswered ? (
                <div className="flex items-center gap-2 text-text-muted text-[10px] uppercase tracking-tighter">
                  <div className="w-1 h-1 bg-accent-secondary rounded-full animate-ping" />
                  <span>Speed Burst: Loading Next...</span>
                </div>
              ) : (
                <div className="h-4" />
              )}
            </div>
          </motion.div>
        )}

        {gameState === 'finished' && (
          <motion.div 
            key="finished"
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="flex-grow flex flex-col items-center justify-center bg-accent-secondary/10 rounded-xl border border-accent-secondary/20 p-6"
          >
            <Award className="w-12 h-12 text-accent-amber mb-4" />
            <h4 className="text-sm font-bold text-text-muted uppercase tracking-widest mb-1 text-white">Blitz Complete!</h4>
            <div className="text-center mb-6">
              <h2 className="text-5xl font-mono font-black text-accent-secondary leading-none mb-2">
                {Math.round((score / questions.length) * 100)}%
              </h2>
              <p className="text-xs text-text-secondary">Accuracy Score</p>
            </div>
            
            <button 
              onClick={startPicking}
              className="flex items-center gap-2 bg-text-primary text-bg-primary px-6 py-2.5 rounded-btn font-bold hover:bg-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> New Blitz
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
