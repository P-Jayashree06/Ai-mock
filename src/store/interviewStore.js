import { create } from 'zustand';

const useInterviewStore = create((set, get) => ({
  // Resume data
  resumeText: null,
  resumeAnalysis: null,
  
  // Interview session
  currentInterviewId: null,
  currentRound: 1,
  
  // Round 1 (Technical & Aptitude)
  codingQuestions: [],
  currentQuestionIndex: 0,
  codeSubmissions: [],
  round1Score: null,
  
  // Round 2 (Technical HR)
  techHRQuestions: [],
  techHRAnswers: [],
  round2Score: null,
  
  // Round 3 (Personal HR)
  personalHRQuestions: [],
  personalHRAnswers: [],
  round3Score: null,
  
  // Final
  isInterviewComplete: false,
  finalResults: null,
  
  // Actions
  setResumeData: (text) => set({ resumeText: text }),
  setResumeAnalysis: (analysis) => set({ resumeAnalysis: analysis }),
  
  startInterview: (interviewId) => set({ 
    currentInterviewId: interviewId, 
    currentRound: 1, 
    currentQuestionIndex: 0,
    isInterviewComplete: false
  }),

  setCodingQuestions: (questions) => set({ codingQuestions: questions, currentQuestionIndex: 0 }),
  
  submitCodeAnswer: (questionId, code, evaluation) => set((state) => {
    const filtered = state.codeSubmissions.filter(sub => sub.questionId !== questionId);
    return {
      codeSubmissions: [...filtered, { questionId, code, evaluation }]
    };
  }),

  nextQuestion: () => set((state) => ({ currentQuestionIndex: state.currentQuestionIndex + 1 })),
  
  completeRound1: (averageScore) => set({ 
    round1Score: averageScore,
    currentRound: averageScore >= 70 ? 2 : 'failed', // Relaxed passing threshold for testing
    currentQuestionIndex: 0
  }),

  setTechHRQuestions: (questions) => set({ techHRQuestions: questions, currentQuestionIndex: 0 }),
  
  submitTechHRAnswer: (questionId, answer, evaluation) => set((state) => {
    const filtered = state.techHRAnswers.filter(ans => ans.questionId !== questionId);
    return {
      techHRAnswers: [...filtered, { questionId, answer, evaluation }]
    };
  }),

  completeRound2: (averageScore) => set({
    round2Score: averageScore,
    currentRound: averageScore >= 70 ? 3 : 'failed',
    currentQuestionIndex: 0
  }),

  setPersonalHRQuestions: (questions) => set({ personalHRQuestions: questions, currentQuestionIndex: 0 }),
  
  submitPersonalHRAnswer: (questionId, answer, evaluation) => set((state) => {
    const filtered = state.personalHRAnswers.filter(ans => ans.questionId !== questionId);
    return {
      personalHRAnswers: [...filtered, { questionId, answer, evaluation }]
    };
  }),

  completeRound3: (averageScore) => set({
    round3Score: averageScore,
    isInterviewComplete: true,
    currentRound: 'completed'
  }),

  setFinalResults: (results) => set({ finalResults: results }),

  resetInterview: () => set({
    resumeText: null,
    resumeAnalysis: null,
    currentInterviewId: null,
    currentRound: 1,
    codingQuestions: [],
    currentQuestionIndex: 0,
    codeSubmissions: [],
    round1Score: null,
    techHRQuestions: [],
    techHRAnswers: [],
    round2Score: null,
    personalHRQuestions: [],
    personalHRAnswers: [],
    round3Score: null,
    isInterviewComplete: false,
    finalResults: null,
  })
}));

export default useInterviewStore;
