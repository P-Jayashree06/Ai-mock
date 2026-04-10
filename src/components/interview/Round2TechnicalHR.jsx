import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Type, Send, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import useInterviewStore from '../../store/interviewStore';
import { saveQuestionResult } from '../../lib/instantdb';
import { evaluateHRAnswer, generateTechnicalHRQuestions } from '../../lib/kimiAPI';
import { useCamera } from '../../hooks/useCamera';
import { useTimer } from '../../hooks/useTimer';
import Loader from '../shared/Loader';
import { getMaleVoice } from '../../lib/voiceUtils';

export default function Round2TechnicalHR() {
  const navigate = useNavigate();
  const { resumeAnalysis, currentInterviewId, techHRQuestions, setTechHRQuestions, currentQuestionIndex, submitTechHRAnswer, nextQuestion, completeRound2 } = useInterviewStore();
  
  const [inputType, setInputType] = useState('voice'); 
  const [answerText, setAnswerText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const { videoRef, isActive, startCamera, stopCamera } = useCamera();
  const { seconds, startTimer, stopTimer, formatTime } = useTimer(0, () => handleTimeUp());
  const recognitionRef = useRef(null);

  // Init Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setAnswerText(prev => prev + (prev.endsWith(' ') || !prev ? '' : ' ') + finalTranscript.trim());
        }
      };

      recognition.onerror = (event) => {
        if (event.error === 'no-speech') return;
        toast.error('Voice recognition error. Please try again or switch to text.');
        setIsRecording(false);
      };

      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
    }
    return () => { if (recognitionRef.current) recognitionRef.current.stop(); };
  }, []);

  // Init Questions & Camera
  useEffect(() => {
    if (!resumeAnalysis || !currentInterviewId) {
      navigate('/dashboard');
      return;
    }

    startCamera();

    if (techHRQuestions.length === 0 && !isGenerating) {
      const generate = async () => {
        setIsGenerating(true);
        try {
          const qs = await generateTechnicalHRQuestions(resumeAnalysis);
          setTechHRQuestions(qs);
        } catch (err) {
          toast.error("Failed to generate questions. Retrying might help depending on the API restrictions.");
        } finally {
          setIsGenerating(false);
        }
      };
      generate();
    }
  }, [resumeAnalysis, currentInterviewId, techHRQuestions, startCamera, setTechHRQuestions, navigate]);

  // TTS Voice Output & Timer Init
  useEffect(() => {
    if (techHRQuestions.length > 0 && !evalResult && !showCompleteModal) {
      const q = techHRQuestions[currentQuestionIndex];
      // 20 MIN PER SOFT-SKILL QUESTION
      startTimer(20 * 60);

      if (q && q.question) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(q.question);
        const preferredVoice = getMaleVoice();
        if (preferredVoice) utterance.voice = preferredVoice;
        utterance.rate = 0.95; 
        
        window.speechSynthesis.speak(utterance);
      }
    }
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [techHRQuestions, currentQuestionIndex, evalResult, startTimer, showCompleteModal]);

  const handleTimeUp = () => {
    toast.error("Time's up!");
    handleSubmit();
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.error("Speech recognition not supported natively in this browser.");
      setInputType('text');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setAnswerText(''); 
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        toast.error('Microphone access blocked or busy.');
      }
    }
  };

  const handleSubmit = async () => {
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
    stopTimer();

    if (!answerText.trim() || answerText.length < 5) {
      toast.error('Please provide a more detailed answer before submitting.');
      return;
    }

    setIsEvaluating(true);
    const q = techHRQuestions[currentQuestionIndex];
    
    try {
      const result = await evaluateHRAnswer(q.question, answerText);
      setEvalResult(result);
      submitTechHRAnswer(q.id, answerText, result);
      
      await saveQuestionResult(currentInterviewId, {
        round: 2,
        questionId: q.id,
        questionText: q.question,
        answerText: answerText,
        score: result.score,
        evaluation: result
      });
      
    } catch (e) {
      console.error('Evaluation Error:', e);
      toast.error('Failed to evaluate: ' + (e.response?.data?.error?.message || e.message || 'Unknown error'));
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleNext = () => {
    setEvalResult(null);
    setAnswerText('');
    setInputType('voice');
    
    if (currentQuestionIndex < techHRQuestions.length - 1) {
      nextQuestion();
    } else {
      stopCamera();
      setShowCompleteModal(true);
    }
  };

  const handleProceedToNextRound = (proceed) => {
    const subs = useInterviewStore.getState().techHRAnswers;
    const avg = Math.round(subs.reduce((acc, sub) => acc + sub.evaluation.score, 0) / subs.length);
    completeRound2(avg);
    
    if (proceed) {
      toast.success(`Proceeding to Round 3! Score: ${avg}%`);
      navigate('/interview/round3');
    } else {
      navigate(`/feedback/${currentInterviewId}`);
    }
  };


  if (isGenerating || techHRQuestions.length === 0) {
    return <div className="min-h-screen bg-bg-primary flex"><Loader variant="Generating" /></div>;
  }

  const question = techHRQuestions[currentQuestionIndex];

  if (showCompleteModal) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-accent-primary/20 text-accent-primary flex items-center justify-center rounded-full mx-auto mb-6">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-display font-bold mb-4">Round 2 Completed!</h2>
          <p className="text-text-secondary leading-relaxed mb-8">
            You've completed the Technical HR round. Would you like to proceed to the final round (Personal HR)? 
          </p>
          <div className="flex flex-col space-y-3">
            <button 
              onClick={() => handleProceedToNextRound(true)}
              className="w-full py-3 bg-accent-primary text-white font-medium rounded-xl hover:bg-indigo-600 transition-colors shadow-glow"
            >
              Yes, proceed to Final Round
            </button>
            <button 
              onClick={() => handleProceedToNextRound(false)}
              className="w-full py-3 bg-bg-secondary text-text-primary border border-subtle font-medium rounded-xl hover:bg-glass transition-colors"
            >
              No, end interview and see feedback
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary py-8 px-4 sm:px-6 lg:px-8 flex flex-col max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-bg-card p-4 rounded-xl border border-subtle">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 bg-bg-secondary hover:bg-glass rounded-lg border border-subtle text-text-muted hover:text-accent-red transition-all group">
             <XCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
          <div>
            <h2 className="text-xl font-display font-bold">Round 2: Technical HR</h2>
            <p className="text-text-secondary text-sm">Question {currentQuestionIndex + 1} of {techHRQuestions.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded bg-bg-primary border ${seconds <= 120 ? 'border-accent-red text-accent-red animate-pulse' : 'border-subtle text-text-primary'}`}>
            <span className="font-mono text-sm font-bold">{formatTime()}</span>
          </div>
          <div className="px-4 py-1.5 rounded-full bg-accent-secondary/20 text-accent-secondary font-bold text-sm tracking-widest uppercase border border-accent-secondary/30">
            {question.type}
          </div>
        </div>
      </div>

      <div className="flex-grow flex flex-col lg:flex-row gap-6 h-[500px]">
        {/* Left: Camera & Question */}
        <div className="w-full lg:w-1/2 flex flex-col gap-6">
          <div className="flex-1 relative rounded-xl overflow-hidden border-2 border-subtle shadow-glow bg-black">
             <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
             {isRecording && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-12 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center space-x-1">
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 bg-accent-secondary rounded-full"
                      animate={{ height: [`10%`, `${Math.random() * 80 + 20}%`, `10%`] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.05 }}
                    />
                  ))}
                </div>
             )}
          </div>
          
          <div className="glass-card p-6 h-auto">
            <h3 className="text-2xl font-body font-medium text-text-primary mb-4 leading-relaxed">
              "{question.question}"
            </h3>
            {question.tip && (
              <div className="bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-sm p-3 rounded-lg">
                <span className="font-semibold block mb-1">Interviewer Tip:</span>
                {question.tip}
              </div>
            )}
          </div>
        </div>

        {/* Right: Answer Input & Evaluation */}
        <div className="w-full lg:w-1/2 flex flex-col relative glass-card overflow-hidden">
          {isEvaluating && (
            <div className="absolute inset-0 bg-bg-card/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
              <Loader variant="Evaluating" />
            </div>
          )}

          <div className="p-4 border-b border-subtle flex justify-between items-center bg-bg-secondary">
            <h4 className="font-medium text-text-primary">Your Response</h4>
            <div className="flex bg-bg-primary p-1 rounded-lg border border-subtle">
              <button
                onClick={() => setInputType('voice')}
                disabled={evalResult}
                className={`p-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${inputType === 'voice' ? 'bg-bg-card text-accent-primary shadow' : 'text-text-muted hover:text-text-primary'}`}
              >
                <Mic className="w-4 h-4" /> Voice
              </button>
              <button
                onClick={() => setInputType('text')}
                disabled={evalResult}
                className={`p-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${inputType === 'text' ? 'bg-bg-card text-accent-primary shadow' : 'text-text-muted hover:text-text-primary'}`}
              >
                <Type className="w-4 h-4" /> Text
              </button>
            </div>
          </div>

          <div className="flex-grow p-6 flex flex-col relative w-full h-[calc(100%-80px)]">
            <AnimatePresence>
              {evalResult ? (
                 <motion.div
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="h-full flex flex-col absolute inset-0 bg-bg-card p-6 overflow-y-auto z-0"
               >
                 <div className="flex items-center justify-between mb-6">
                   <h3 className="text-xl font-display font-bold flex items-center gap-2">
                     Result
                   </h3>
                   <div className="text-3xl font-mono font-bold text-accent-secondary">{evalResult.score}%</div>
                 </div>
 
                 <div className="space-y-4">
                   <div className="grid grid-cols-3 gap-2">
                     <div className="bg-bg-secondary p-3 rounded-lg text-center border border-subtle">
                       <span className="text-xs text-text-muted uppercase block">Clarity</span>
                       <span className="text-lg font-bold text-text-primary">{evalResult.clarityScore}%</span>
                     </div>
                     <div className="bg-bg-secondary p-3 rounded-lg text-center border border-subtle">
                       <span className="text-xs text-text-muted uppercase block">Confidence</span>
                       <span className="text-lg font-bold text-text-primary">{evalResult.confidenceScore}%</span>
                     </div>
                     <div className="bg-bg-secondary p-3 rounded-lg text-center border border-subtle">
                       <span className="text-xs text-text-muted uppercase block">Relevance</span>
                       <span className="text-lg font-bold text-text-primary">{evalResult.relevanceScore}%</span>
                     </div>
                   </div>
 
                   <p className="text-sm text-text-primary leading-relaxed p-4 bg-bg-secondary rounded-lg border border-subtle">
                     {evalResult.feedback}
                   </p>
                 </div>
               </motion.div>
              ) : (
                <div className="h-full flex flex-col">
                  {inputType === 'voice' ? (
                    <div className="flex-grow flex flex-col items-center justify-center">
                      <textarea
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        placeholder="Your transcript will appear here..."
                        className="w-full h-full min-h-[200px] mb-4 p-4 bg-transparent border border-subtle rounded-lg resize-none text-text-primary outline-none focus:border-accent-secondary"
                        disabled={evalResult}
                      />
                      <button
                        onClick={toggleRecording}
                        disabled={evalResult}
                        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-accent-red animate-pulse shadow-[0_0_20px_var(--accent-red)]' : 'bg-bg-secondary border-2 border-subtle hover:border-accent-secondary text-text-muted hover:text-accent-secondary'}`}
                      >
                        <Mic className={`w-8 h-8 ${isRecording ? 'text-white' : ''}`} />
                      </button>
                      <span className="mt-4 text-sm text-text-muted font-medium">
                        {isRecording ? 'Recording... click to stop' : 'Click mic to start answering'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex-grow flex flex-col">
                      <textarea
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        placeholder="Type your structured answer here..."
                        className="w-full h-full flex-grow p-4 bg-bg-secondary border border-subtle rounded-lg resize-none text-text-primary outline-none focus:border-accent-secondary focus:ring-1 focus:ring-accent-secondary"
                        disabled={evalResult}
                      />
                    </div>
                  )}
                </div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-4 border-t border-subtle bg-bg-secondary mt-auto">
            {evalResult ? (
              <button
                onClick={handleNext}
                className="w-full h-12 bg-accent-secondary hover:bg-purple-600 text-white font-medium rounded-btn transition-colors shadow-glow flex items-center justify-center"
              >
                {currentQuestionIndex < techHRQuestions.length - 1 ? 'Next Question' : 'Complete Round 2'} <ChevronRight className="w-5 h-5 ml-2" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!answerText.trim() || isEvaluating}
                className="w-full h-12 bg-accent-primary hover:bg-indigo-600 disabled:opacity-50 text-white font-medium rounded-btn transition-colors shadow-glow flex items-center justify-center"
              >
                <Send className="w-4 h-4 mr-2" /> Submit Answer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
