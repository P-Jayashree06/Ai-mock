import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { Mic, Type, Send, ChevronRight, ChevronLeft, CheckCircle, XCircle, Clock, Play, Beaker, Trophy, Award } from 'lucide-react';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import useInterviewStore from '../../store/interviewStore';
import { saveQuestionResult } from '../../lib/instantdb';
import { evaluateCode, evaluateHRAnswer, generateMixedTechnicalQuestions } from '../../lib/kimiAPI';
import { useCamera } from '../../hooks/useCamera';
import { useTimer } from '../../hooks/useTimer';
import CameraMonitor from './CameraMonitor';
import Loader from '../shared/Loader';
import { getMaleVoice } from '../../lib/voiceUtils';

const THEME = 'vs-dark';

const LANGUAGE_BOILERPLATES = {
  javascript: `function solution(input) {\n    // Write your code here\n    return input;\n}`,
  python: `def solution(input_data):\n    # Write your code here\n    return input_data`,
  java: `public class Solution {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}`,
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}`,
  go: `package main\nimport "fmt"\n\nfunc main() {\n    // Write your code here\n}`
};

export default function Round1Technical() {
  const navigate = useNavigate();
  const { resumeAnalysis, currentInterviewId, codingQuestions, setCodingQuestions, currentQuestionIndex, submitCodeAnswer, nextQuestion, completeRound1 } = useInterviewStore();
  
  // Code Editor State
  const [code, setCode] = useState('// Write your solution here...\n');
  const [selectedLang, setSelectedLang] = useState('javascript');
  
  // Voice/Text State
  const [inputType, setInputType] = useState('voice'); 
  const [answerText, setAnswerText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  // Common State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [evalResult, setEvalResult] = useState(null);
  const [runResult, setRunResult] = useState(null);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const { videoRef, isActive, error, startCamera, stopCamera } = useCamera();
  const { seconds, startTimer, stopTimer, formatTime } = useTimer(0, () => handleTimeUp());

  // Init Speech Recognition (remains same)
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
        toast.error('Voice recognition error.');
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

    if (codingQuestions.length === 0 && !isGenerating) {
      const generate = async () => {
        setIsGenerating(true);
        try {
          const qs = await generateMixedTechnicalQuestions(
            resumeAnalysis.skills, 
            resumeAnalysis.programmingLanguages, 
            resumeAnalysis.experienceLevel
          );
          setCodingQuestions(qs);
        } catch (err) {
          toast.error("Failed to generate questions.");
        } finally {
          setIsGenerating(false);
        }
      };
      generate();
    }
  }, [resumeAnalysis, currentInterviewId, codingQuestions, startCamera, setCodingQuestions, navigate]);

  // Start timer & speak question when it changes
  useEffect(() => {
    if (codingQuestions.length > 0 && !evalResult && !showCompleteModal) {
      const q = codingQuestions[currentQuestionIndex];
      // TECHNICAL QUESTIONS = 45 MIN, OTHERS (APTITUDE/SOFT-SKILLS) = 20 MIN
      const limit = (q.type === 'technical' || !q.type) ? 45 : (q.timeLimit || 20);
      startTimer(limit * 60);

      // Set Boilerplate if it's a technical question
      if (q.type === 'technical' || !q.type) {
        setCode(LANGUAGE_BOILERPLATES[selectedLang] || '// Write your solution here...');
      }

      if (q && q.description) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(q.description);
        const preferredVoice = getMaleVoice();
        if (preferredVoice) utterance.voice = preferredVoice;
        utterance.rate = 1; 
        window.speechSynthesis.speak(utterance);
      }
    }
    return () => window.speechSynthesis.cancel();
  }, [codingQuestions, currentQuestionIndex, evalResult, startTimer, showCompleteModal, selectedLang]);

  const handleTimeUp = () => {
    toast.error("Time's up!");
    handleSubmit();
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.error("Speech recognition not supported in this browser.");
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
        toast.error('Microphone blocked.');
      }
    }
  };

  const handleRunCode = async () => {
    const q = codingQuestions[currentQuestionIndex];
    if (!code || code.trim() === '// Write your solution here...' || code.trim() === '') {
      toast.error('Please provide a code solution.');
      return;
    }

    setIsRunning(true);
    try {
      const result = await evaluateCode(q.description, code, selectedLang);
      setRunResult(result);
      
      // If all test cases passed, trigger confetti
      const allPassed = result.testResults?.every(tr => tr.passed);
      if (allPassed) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#10b981', '#f59e0b']
        });
        toast.success("Perfect! All test cases passed.");
      } else {
        toast.error("Some test cases failed. Keep debugging!");
      }
    } catch (e) {
      toast.error("Failed to run code.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
    stopTimer();

    const q = codingQuestions[currentQuestionIndex];
    const isTech = q.type === 'technical' || !q.type;

    if (isTech && (!code || code.trim() === '// Write your solution here...')) {
      toast.error('Please provide a code solution.');
      startTimer(seconds);
      return;
    }
    if (!isTech && (!answerText.trim() || answerText.length < 5)) {
      toast.error('Please provide a detailed answer.');
      startTimer(seconds);
      return;
    }

    setIsEvaluating(true);
    
    try {
      let result;
      let finalAnswerText = '';

      if (isTech) {
        result = await evaluateCode(q.description, code, selectedLang);
        finalAnswerText = code;
      } else {
        result = await evaluateHRAnswer(q.description, answerText);
        finalAnswerText = answerText;
      }
      
      setEvalResult(result);
      submitCodeAnswer(q.id, finalAnswerText, result);
      
      await saveQuestionResult(currentInterviewId, {
        round: 1,
        questionId: q.id,
        questionText: q.description,
        answerText: finalAnswerText,
        score: result.score,
        evaluation: result
      });
      
    } catch (e) {
      console.error('Evaluation Error:', e);
      toast.error('Failed to evaluate: ' + (e.response?.data?.error?.message || e.message || 'Unknown error'));
      startTimer(seconds);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleNext = () => {
    setEvalResult(null);
    setRunResult(null);
    setCode('// Write your solution here...\n');
    setAnswerText('');
    setInputType('voice');
    
    if (currentQuestionIndex < codingQuestions.length - 1) {
      nextQuestion();
    } else {
      stopCamera();
      setShowCompleteModal(true);
    }
  };

  const handleProceedToNextRound = (proceed) => {
    const subs = useInterviewStore.getState().codeSubmissions;
    const avg = Math.round(subs.reduce((acc, sub) => acc + sub.evaluation.score, 0) / subs.length);
    completeRound1(avg);

    if (proceed) {
      toast.success(`Proceeding to Round 2! Score: ${avg}%`);
      navigate('/interview/round2');
    } else {
      navigate(`/feedback/${currentInterviewId}`);
    }
  };

  if (isGenerating || codingQuestions.length === 0) {
    return <div className="min-h-screen bg-bg-primary flex"><Loader variant="Generating" /></div>;
  }

  const question = codingQuestions[currentQuestionIndex];
  const isTimeLow = seconds <= 120;
  const isTech = question.type === 'technical' || !question.type;

  if (showCompleteModal) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-accent-primary/20 text-accent-primary flex items-center justify-center rounded-full mx-auto mb-6">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-display font-bold mb-4">Round 1 Completed!</h2>
          <p className="text-text-secondary leading-relaxed mb-8">
            You've completed the Technical & Aptitude round. Would you like to proceed to Round 2 (Technical HR)? 
          </p>
          <div className="flex flex-col space-y-3">
            <button 
              onClick={() => handleProceedToNextRound(true)}
              className="w-full py-3 bg-accent-primary text-white font-medium rounded-xl hover:bg-indigo-600 transition-colors shadow-glow"
            >
              Yes, proceed to Next Round
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
    <div className="h-screen flex flex-col md:flex-row bg-bg-primary overflow-hidden">
      <div className="w-full md:w-[40%] flex flex-col border-r border-subtle relative bg-bg-secondary h-full">
        <div className="flex-grow p-6 overflow-y-auto scrollbar-hide">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
               <button 
                  onClick={() => navigate('/dashboard')} 
                  className="group flex items-center gap-1.5 px-3 py-1.5 bg-bg-primary hover:bg-glass rounded-lg border border-subtle text-text-muted hover:text-text-primary transition-all cursor-pointer text-xs font-medium"
               >
                 <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                 Back to Dashboard
               </button>
               <div className="px-3 py-1 bg-accent-primary/20 text-accent-primary text-[10px] font-bold rounded uppercase tracking-wider border border-accent-primary/20">
                 {question.type || 'technical'} · {question.difficulty}
               </div>
            </div>
            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded bg-bg-card border ${isTimeLow ? 'border-accent-red text-accent-red animate-pulse shadow-[0_0_10px_var(--accent-red)]' : 'border-subtle text-text-primary'}`}>
              <Clock className="w-4 h-4" />
              <span className="font-mono font-medium">{formatTime()}</span>
            </div>
          </div>

          <h2 className="text-xl font-display font-bold text-text-primary mb-4 pr-10">
            Question {currentQuestionIndex + 1}/{codingQuestions.length}: {question.title || 'Challenge'}
          </h2>
          
          <div className="prose prose-invert prose-sm text-text-secondary whitespace-pre-wrap flex-grow pr-4">
            {question.description}
          </div>

          {isTech && question.testCases && (
            <div className="mt-8">
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                <Beaker className="w-3 h-3 text-accent-amber" /> Example Test Cases
              </h3>
              <div className="space-y-3">
                {question.testCases.slice(0, 2).map((tc, idx) => (
                  <div key={idx} className="bg-black/30 rounded-xl p-4 border border-subtle/30">
                    <div className="flex flex-col gap-3 text-[11px] font-mono">
                      <div className="w-full">
                        <span className="text-text-muted block mb-1 uppercase tracking-tighter text-[9px] opacity-70">Input</span>
                        <code className="block w-full text-text-primary bg-bg-secondary/50 px-3 py-2 rounded-lg border border-subtle/20 overflow-x-auto whitespace-pre-wrap break-all scrollbar-hide">
                          {tc.input}
                        </code>
                      </div>
                      <div className="w-full">
                        <span className="text-text-muted block mb-1 uppercase tracking-tighter text-[9px] opacity-70">Expected Output</span>
                        <code className="block w-full text-accent-green bg-accent-green/5 px-3 py-2 rounded-lg border border-accent-green/10 overflow-x-auto whitespace-pre-wrap break-all scrollbar-hide">
                          {tc.expected}
                        </code>
                      </div>
                    </div>
                  </div>
                ))}
                {question.testCases.length > 2 && <p className="text-[10px] text-text-muted italic">+ {question.testCases.length - 2} more hidden test cases</p>}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 pt-0 mt-auto shrink-0 border-t border-subtle bg-bg-secondary">
          <div className="mt-4 h-48 rounded-xl overflow-hidden shadow-glow bg-black relative">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
            {isRecording && !isTech && (
               <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md rounded-full px-4 py-1 flex items-center justify-center space-x-1">
                 <div className="w-2 h-2 bg-accent-red rounded-full animate-pulse" />
                 <span className="text-xs font-medium text-white">Recording...</span>
               </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-full md:w-[60%] flex flex-col relative bg-[#1e1e1e]">
        {isTech && (
          <div className="h-14 border-b border-[#333] flex items-center justify-between px-4 bg-[#252526]">
            <select 
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              disabled={evalResult || isEvaluating}
              className="bg-[#333] text-white text-sm rounded px-3 py-1.5 border border-[#444] outline-none"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="go">Go</option>
            </select>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={handleRunCode}
                disabled={evalResult || isEvaluating || isRunning}
                className="flex items-center space-x-2 px-4 py-1.5 rounded font-medium bg-bg-primary hover:bg-glass text-text-primary border border-subtle transition-all"
              >
                {isRunning ? <Loader variant="Running" size="xs" /> : <Play className="w-4 h-4" />}
                <span>Run Code</span>
              </button>
              <button 
                onClick={handleSubmit}
                disabled={evalResult || isEvaluating}
                className={`flex items-center space-x-2 px-4 py-1.5 rounded font-medium transition-colors ${
                  (evalResult || isEvaluating) ? 'bg-gray-600 text-gray-400' : 'bg-accent-green hover:bg-emerald-600 text-white shadow-glow'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>Submit Solution</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex-grow relative flex flex-col bg-bg-card">
          {isTech ? (
            <div className="flex flex-col h-full overflow-hidden">
              <div className={runResult ? "h-[55%]" : "h-full"}>
                <Editor
                  height="100%"
                  language={selectedLang}
                  theme={THEME}
                  value={code}
                  onChange={(v) => setCode(v || '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    padding: { top: 16 },
                    readOnly: !!evalResult || isEvaluating
                  }}
                />
              </div>
              {runResult && (
                <div className="flex-grow bg-[#1e1e1e] border-t border-[#333] p-4 overflow-y-auto min-h-0 custom-scrollbar">
                   <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-accent-amber uppercase tracking-wider">
                        <Beaker className="w-4 h-4" /> Test Results
                      </div>
                      {runResult.testResults?.every(tr => tr.passed) && (
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 px-3 py-1 bg-accent-green/20 text-accent-green rounded-full border border-accent-green/20">
                             <Trophy className="w-4 h-4" />
                             <span className="text-xs font-bold uppercase tracking-tight">You finished this code!</span>
                          </div>
                          <button 
                            onClick={handleSubmit}
                            disabled={isEvaluating}
                            className="flex items-center gap-1.5 px-4 py-1 bg-accent-primary hover:bg-indigo-600 text-white rounded-full font-bold text-xs uppercase tracking-wide shadow-[0_0_15px_rgba(var(--accent-primary-rgb),0.5)] transition-all animate-pulse"
                          >
                            Submit to Proceed <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                   </div>
                   <div className="space-y-3">
                     {runResult.testResults?.map((test, i) => (
                       <div key={i} className={`p-3 bg-[#252526] rounded border transition-all ${test.passed ? 'border-accent-green/20' : 'border-accent-red/20'} flex flex-col gap-2`}>
                         <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-text-muted">Test Case {i+1}</span>
                            {test.passed ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-accent-green uppercase tracking-tighter bg-accent-green/10 px-2 py-0.5 rounded">
                                <CheckCircle className="w-3 h-3" /> Passed
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-accent-red uppercase tracking-tighter bg-accent-red/10 px-2 py-0.5 rounded">
                                <XCircle className="w-3 h-3" /> Failed
                              </span>
                            )}
                         </div>
                         <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                           <div>
                             <span className="text-text-muted block text-[10px] uppercase mb-1">Input</span>
                             <pre className="bg-black/30 p-2 rounded whitespace-pre-wrap overflow-x-auto">{test.input}</pre>
                           </div>
                           <div>
                             <span className="text-text-muted block text-[10px] uppercase mb-1">Expected Output</span>
                             <pre className="bg-black/30 p-2 rounded whitespace-pre-wrap overflow-x-auto text-accent-green/80">{test.expected}</pre>
                           </div>
                         </div>
                         {!test.passed && (
                           <div className="mt-2 pt-2 border-t border-accent-red/10">
                             <div className="flex items-center justify-between mb-1">
                               <span className="text-accent-red block text-[10px] uppercase font-bold">Your Error Output</span>
                             </div>
                             <pre className="bg-rose-900/10 p-2 rounded text-rose-200 border border-rose-900/20 text-[11px] font-mono leading-relaxed whitespace-pre-wrap italic">
                               {test.actual || "No output returned or execution error"}
                             </pre>
                           </div>
                         )}
                       </div>
                     ))}
                   </div>
                   {!runResult.testResults?.every(tr => tr.passed) && (
                     <div className="mt-4 pt-4 border-t border-[#333] flex justify-end">
                       <button
                         onClick={handleSubmit}
                         disabled={isEvaluating}
                         className="flex items-center gap-2 px-4 py-2 bg-[#252526] hover:bg-[#333] text-text-secondary hover:text-white rounded border border-[#444] transition-all text-sm font-medium shadow-sm hover:shadow-glow"
                       >
                         Submit Code Anyway <ChevronRight className="w-4 h-4" />
                       </button>
                     </div>
                   )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-grow flex flex-col h-full bg-bg-primary">
              <div className="p-4 border-b border-subtle flex justify-between items-center bg-bg-secondary">
                <h4 className="font-medium text-text-primary">Your Response</h4>
                <div className="flex bg-bg-primary p-1 rounded-lg border border-subtle">
                  <button onClick={() => setInputType('voice')} disabled={evalResult} className={`p-2 text-sm font-medium transition-colors rounded-md flex items-center gap-2 ${inputType === 'voice' ? 'bg-bg-card text-accent-primary shadow' : 'text-text-muted hover:text-text-primary'}`}><Mic className="w-4 h-4" /> Voice</button>
                  <button onClick={() => setInputType('text')} disabled={evalResult} className={`p-2 text-sm font-medium transition-colors rounded-md flex items-center gap-2 ${inputType === 'text' ? 'bg-bg-card text-accent-primary shadow' : 'text-text-muted hover:text-text-primary'}`}><Type className="w-4 h-4" /> Text</button>
                </div>
              </div>
              <div className="flex-grow p-6 flex flex-col relative w-full h-[calc(100%-80px)]">
                  {inputType === 'voice' ? (
                    <div className="flex-grow flex flex-col items-center justify-center">
                      <textarea value={answerText} onChange={(e) => setAnswerText(e.target.value)} placeholder="Your transcript will appear here..." className="w-full h-full min-h-[200px] mb-4 p-4 bg-transparent border border-subtle rounded-lg resize-none text-text-primary outline-none focus:border-accent-secondary" disabled={evalResult} />
                      <button onClick={toggleRecording} disabled={evalResult} className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-accent-red animate-pulse shadow-[0_0_20px_var(--accent-red)]' : 'bg-bg-secondary border-2 border-subtle hover:border-accent-secondary text-text-muted hover:text-accent-secondary'}`}><Mic className={`w-8 h-8 ${isRecording ? 'text-white' : ''}`} /></button>
                      <span className="mt-4 text-sm text-text-muted font-medium">{isRecording ? 'Recording... click to stop' : 'Click mic to start answering'}</span>
                    </div>
                  ) : (
                    <div className="flex-grow flex flex-col">
                      <textarea value={answerText} onChange={(e) => setAnswerText(e.target.value)} placeholder="Type your answer here..." className="w-full h-full flex-grow p-4 bg-bg-secondary border border-subtle rounded-lg resize-none text-text-primary outline-none focus:border-accent-secondary" disabled={evalResult} />
                    </div>
                  )}
              </div>
              {!evalResult && (
                <div className="p-4 border-t border-subtle bg-bg-secondary mt-auto">
                  <button onClick={handleSubmit} disabled={!answerText.trim() || isEvaluating} className="w-full py-3 bg-accent-primary hover:bg-indigo-600 disabled:opacity-50 text-white font-medium rounded-btn transition-colors shadow-glow flex items-center justify-center"><Send className="w-4 h-4 mr-2" /> Submit Answer</button>
                </div>
              )}
            </div>
          )}
          
          {(isEvaluating || isRunning) && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
              <Loader variant={isRunning ? "Running" : "Evaluating"} />
            </div>
          )}

          <AnimatePresence>
            {evalResult && (
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="absolute inset-y-0 right-0 w-full sm:w-[500px] bg-bg-card border-l border-subtle shadow-2xl flex flex-col z-50">
                
                {/* Header - Fixed at Top */}
                <div className="p-6 border-b border-subtle bg-bg-secondary flex items-center justify-between sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setEvalResult(null)}
                      className="p-2 bg-bg-primary hover:bg-glass rounded-full transition-colors border border-subtle text-text-muted hover:text-text-primary shadow-sm"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h3 className="text-xl font-display font-bold flex items-center gap-2">
                       {evalResult.score >= 70 ? <CheckCircle className="text-accent-green w-6 h-6"/> : <XCircle className="text-accent-red w-6 h-6"/>} Result
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-mono font-bold text-accent-primary">{evalResult.score}%</div>
                    <button 
                      onClick={handleNext} 
                      className="px-4 py-2 bg-gradient-primary text-white rounded-lg font-bold flex items-center gap-1.5 hover:opacity-90 shadow-glow transition-all text-xs uppercase tracking-wide cursor-pointer"
                    >
                      {currentQuestionIndex < codingQuestions.length - 1 ? 'Next Que' : 'Finish'} <ChevronRight className="w-4 h-4"/>
                    </button>
                  </div>
                </div>

                {/* Scrollable Body */}
                <div className="flex-grow overflow-y-auto p-6 md:p-8 custom-scrollbar pb-32">
                  <div className="space-y-6">
                    {evalResult.timeComplexity && (
                      <div>
                        <p className="text-sm text-text-muted uppercase tracking-wider mb-2">Complexity</p>
                        <div className="flex gap-4">
                          <span className="px-3 py-1 bg-bg-secondary rounded font-mono text-sm border border-subtle shadow-sm">Time: <span className="text-accent-amber">{evalResult.timeComplexity}</span></span>
                          <span className="px-3 py-1 bg-bg-secondary rounded font-mono text-sm border border-subtle shadow-sm">Space: <span className="text-accent-amber">{evalResult.spaceComplexity}</span></span>
                        </div>
                      </div>
                    )}
                    
                    {evalResult.clarityScore !== undefined && (
                      <div className="grid grid-cols-3 gap-2">
                         <div className="bg-bg-secondary p-3 rounded-lg text-center border border-subtle shadow-sm"><span className="text-xs text-text-muted uppercase block">Clarity</span><span className="text-lg font-bold text-text-primary">{evalResult.clarityScore}%</span></div>
                         <div className="bg-bg-secondary p-3 rounded-lg text-center border border-subtle shadow-sm"><span className="text-xs text-text-muted uppercase block">Confidence</span><span className="text-lg font-bold text-text-primary">{evalResult.confidenceScore}%</span></div>
                         <div className="bg-bg-secondary p-3 rounded-lg text-center border border-subtle shadow-sm"><span className="text-xs text-text-muted uppercase block">Relevance</span><span className="text-lg font-bold text-text-primary">{evalResult.relevanceScore}%</span></div>
                       </div>
                    )}

                    <div className="bg-bg-secondary p-5 rounded-xl border border-subtle shadow-sm relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent-primary"></div>
                      <p className="text-sm text-text-muted uppercase tracking-wider mb-3">Feedback</p>
                      <p className="text-text-primary leading-relaxed text-sm">{evalResult.feedback}</p>
                    </div>
                    
                    {evalResult.improvements?.length > 0 && (
                      <div className="bg-bg-primary/50 p-5 rounded-xl border border-subtle border-dashed">
                        <p className="text-sm text-accent-amber uppercase tracking-wider mb-3 font-bold flex items-center gap-2">
                           Improvements Areas
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                          {evalResult.improvements.map((imp, i) => (
                            <li key={i} className="text-sm text-text-secondary leading-relaxed">{imp}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer - Absolute Fixed at Bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-5 border-t border-subtle grid grid-cols-2 gap-4 bg-[#1e1e1e] shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-20">
                  <button 
                    onClick={() => setEvalResult(null)}
                    className="py-3.5 bg-bg-secondary text-text-primary rounded-btn font-bold flex items-center justify-center gap-2 border border-subtle hover:bg-glass transition-all shadow-sm"
                  >
                    <ChevronLeft className="w-5 h-5"/> Review Code
                  </button>
                  <button 
                    onClick={handleNext} 
                    className="py-3.5 bg-accent-primary text-white rounded-btn font-bold flex items-center justify-center gap-2 hover:bg-indigo-600 shadow-glow transition-all"
                  >
                    {currentQuestionIndex < codingQuestions.length - 1 ? 'Next Question' : 'Complete Round'} <ChevronRight className="w-5 h-5"/>
                  </button>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

