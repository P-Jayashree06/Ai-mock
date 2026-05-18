import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, BrainCircuit, ArrowRight, Code2, Briefcase, Check, X, ChevronDown, CheckCircle2, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import * as pdfjsLib from 'pdfjs-dist';
import { analyzeResume } from '../../lib/kimiAPI';
import useInterviewStore from '../../store/interviewStore';
import { createInterview, db } from '../../lib/instantdb';
import { authService } from '../../lib/authService';
import Loader from '../shared/Loader';

// Setup PDF worker using local bundled version instead of CDN to avoid load errors
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export default function ResumeUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const navigate = useNavigate();
  const user = authService.getSession();
  
  const setResumeData = useInterviewStore(s => s.setResumeData);
  const setResumeAnalysis = useInterviewStore(s => s.setResumeAnalysis);
  const startInterview = useInterviewStore(s => s.startInterview);
  
  const analysis = useInterviewStore(s => s.resumeAnalysis);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [showScore, setShowScore] = useState(false);

  // Common languages for selection
  const COMMON_LANGS = ['Python', 'Java', 'C', 'C++', 'SQL', 'JavaScript', 'TypeScript', 'Go', 'PHP', 'Ruby', 'Swift'];

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragging(true);
    else if (e.type === 'dragleave' || e.type === 'drop') setIsDragging(false);
  }, []);

  const extractTextFromPDF = async (fileData) => {
    try {
      const arrayBuffer = await fileData.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + ' \n';
      }
      return fullText;
    } catch (e) {
      console.error("PDF Parsing error", e);
      throw new Error("Could not parse PDF. Ensure it is a valid text-based PDF.");
    }
  };

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    let droppedFile = e.dataTransfer ? e.dataTransfer.files[0] : e.target.files[0];
    if (droppedFile?.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }
    
    setFile(droppedFile);
  }, []);

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    
    try {
      const text = await extractTextFromPDF(file);
      setResumeData(text);
      
      const result = await analyzeResume(text);
      setResumeAnalysis(result);
      // Auto-select languages from resume analysis
      setSelectedLanguages(result.programmingLanguages || []);
      toast.success('Resume analyzed successfully!');
    } catch (err) {
      toast.error(err.message || 'Analysis failed. Try again.');
      setFile(null); // reset file on error sometimes
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartInterview = async () => {
    if (!analysis) return;
    try {
      // Create a modified analysis with the user's manual language selection
      const modifiedAnalysis = {
        ...analysis,
        programmingLanguages: selectedLanguages.length > 0 ? selectedLanguages : analysis.programmingLanguages
      };
      const interviewId = await createInterview(user.id, modifiedAnalysis);
      startInterview(interviewId);
      // Update global state with the selection for the AI to pick it up
      setResumeAnalysis(modifiedAnalysis);
      navigate('/interview/round1');
    } catch (err) {
      console.error(err);
      toast.error("Failed to start interview");
    }
  };

  if (isAnalyzing) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader variant="ResumeScanning" />
      </div>
    );
  }

  // Calculate dynamic scores safely
  const atsScore = analysis?.atsScore || 75;
  const issuesCount = analysis?.issuesCount || 3;
  const atsParseRate = analysis?.metrics?.atsParseRate || { score: 100, issues: 0 };
  const quantifyingImpact = analysis?.metrics?.quantifyingImpact || { score: 80, issues: 1 };
  const repetition = analysis?.metrics?.repetition || { score: 90, issues: 0 };
  const spellingAndGrammar = analysis?.metrics?.spellingAndGrammar || { score: 85, issues: 2 };
  
  const sections = analysis?.categories?.sections || 100;
  const atsEssentials = analysis?.categories?.atsEssentials || 83;
  const tailoring = analysis?.categories?.tailoring || 70;
  
  const contentScore = Math.round(((atsParseRate.score || 100) + (quantifyingImpact.score || 80) + (repetition.score || 90) + (spellingAndGrammar.score || 85)) / 4);

  const renderIssueIcon = (issues) => issues === 0 ? <Check className="w-4 h-4 text-emerald-500 stroke-[3]" /> : <X className="w-4 h-4 text-red-500 stroke-[3]" />;
  const renderIssueBadge = (issues) => issues === 0 
    ? <span className="text-[10px] uppercase tracking-wider font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">No issues</span>
    : <span className="text-[10px] uppercase tracking-wider font-bold border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">{issues} issue{issues > 1 ? 's' : ''}</span>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="absolute top-8 left-8">
        <button onClick={() => navigate('/dashboard')} className="flex items-center text-text-muted hover:text-text-primary transition-colors text-sm font-medium">
          <ArrowRight className="w-4 h-4 mr-2 transform rotate-180" /> Back to Dashboard
        </button>
      </div>

      <div className="text-center mb-12">
        <h1 className="text-4xl font-display font-bold mb-4">Let's setup your interview</h1>
        <p className="text-text-secondary">Upload your resume to generate a personalized technical and behavioral interview.</p>
        
        <div className="mt-8 p-5 bg-accent-primary/10 border border-accent-primary/20 rounded-xl max-w-2xl mx-auto text-left shadow-glow">
          <p className="text-sm text-accent-primary font-semibold mb-2 flex items-center gap-2">
            <BrainCircuit className="w-4 h-4" /> Tip: Add this project to your resume
          </p>
          <p className="text-sm text-text-secondary italic leading-relaxed">
            "Developed an AI-powered ATS Resume Analyzer that evaluates resume compatibility, calculates ATS scores, detects missing keywords, and provides intelligent improvement suggestions using NLP and Azure OpenAI."
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!analysis ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
            className="glass-card p-8 text-center"
          >
            <div
              onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-12 transition-colors duration-300 relative ${
                isDragging ? 'border-accent-primary bg-accent-primary/10' : 'border-subtle hover:border-text-muted hover:bg-bg-secondary'
              }`}
            >
              <input type="file" accept=".pdf" onChange={handleDrop} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
                <div className={`p-4 rounded-full ${isDragging ? 'bg-accent-primary text-white shadow-glow' : 'bg-bg-primary text-text-muted'}`}>
                  {file ? <FileText className="w-8 h-8 text-accent-primary" /> : <UploadCloud className="w-8 h-8" />}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-text-primary mb-1">
                    {file ? file.name : 'Drag & Drop your resume here'}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {file ? 'Click below to analyze' : 'or click to browse (.pdf only)'}
                  </p>
                </div>
              </div>
            </div>

            {file && (
              <motion.button
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                onClick={handleAnalyze}
                className="mt-8 px-8 py-3 bg-gradient-primary hover:opacity-90 transition-opacity text-white rounded-btn font-medium shadow-glow flex items-center justify-center mx-auto space-x-2"
              >
                <BrainCircuit className="w-5 h-5" />
                <span>Analyze Resume with AI</span>
              </motion.button>
            )}
          </motion.div>
        ) : !showScore ? (
          <motion.div
            key="prep"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl mx-auto mt-12"
          >
              <div className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-10 border border-gray-100">
                 <h2 className="text-2xl font-bold text-indigo-900 tracking-wider mb-2 flex items-center gap-3">
                    <Code2 className="w-6 h-6 text-indigo-600" /> Interview Preparation
                 </h2>
                 <p className="text-gray-500 mb-8">Confirm your core languages before we generate your mock interview.</p>
                 <div className="flex flex-wrap gap-3 mb-12">
                    {[...new Set([...(analysis.programmingLanguages || []), ...COMMON_LANGS])].map(lang => {
                      const isSelected = selectedLanguages.includes(lang);
                      return (
                        <button
                          key={lang}
                          onClick={() => {
                            setSelectedLanguages(prev => 
                              isSelected ? prev.filter(l => l !== lang) : [...prev, lang]
                            );
                          }}
                          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                            isSelected 
                              ? 'bg-[#6b3deb] border-[#6b3deb] text-white shadow-md hover:bg-[#5b32cd]' 
                              : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200 hover:text-[#6b3deb]'
                          }`}
                        >
                          {lang}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex justify-end pt-8 border-t border-gray-100">
                    <button
                      onClick={() => setShowScore(true)}
                      className="px-8 py-4 bg-[#8b5cf6] text-white hover:bg-[#7c3aed] transition-colors rounded-xl font-bold flex items-center space-x-2 shadow-lg"
                    >
                      <span>Proceed to Interview</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
              </div>
          </motion.div>
        ) : (
          <motion.div
            key="analysis"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="grid md:grid-cols-12 gap-6 items-start max-w-6xl mx-auto mt-8"
          >
            {/* LEFT SIDEBAR: SCORE & ISSUES */}
            <div className="md:col-span-4 space-y-6">
              <div className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-6 text-center text-bg-primary border border-gray-100">
                <h3 className="text-xl font-bold mb-2">Your Score</h3>
                <div className="text-5xl font-display font-bold text-orange-400 mb-1">
                  {atsScore}<span className="text-2xl text-gray-400 font-medium">/100</span>
                </div>
                <p className="text-sm text-gray-500 mb-8">{issuesCount} Issues</p>

                <div className="space-y-4 text-left">
                  {/* Content Section */}
                  <div className="border-b border-gray-100 pb-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-bold text-gray-500 tracking-widest">CONTENT</span>
                      <span className="text-xs font-bold text-orange-500 bg-orange-100 px-2 py-0.5 rounded-full">{contentScore}%</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2 text-gray-700 font-medium">
                          {renderIssueIcon(atsParseRate.issues)} ATS Parse Rate
                        </div>
                        {renderIssueBadge(atsParseRate.issues)}
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2 text-gray-700 font-medium">
                          {renderIssueIcon(quantifyingImpact.issues)} Quantifying Impact
                        </div>
                        {renderIssueBadge(quantifyingImpact.issues)}
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2 text-gray-700 font-medium">
                          {renderIssueIcon(repetition.issues)} Repetition
                        </div>
                        {renderIssueBadge(repetition.issues)}
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2 text-gray-700 font-medium">
                          {renderIssueIcon(spellingAndGrammar.issues)} Spelling & Grammar
                        </div>
                        {renderIssueBadge(spellingAndGrammar.issues)}
                      </div>
                    </div>
                  </div>

                  {/* Other Sections */}
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-xs font-bold text-gray-500 tracking-widest">SECTIONS</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">{sections}%</span>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-xs font-bold text-gray-500 tracking-widest">ATS ESSENTIALS</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-orange-500 bg-orange-100 px-2 py-0.5 rounded-full">{atsEssentials}%</span>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs font-bold text-gray-500 tracking-widest">TAILORING</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{tailoring}%</span>
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>

                <button onClick={handleStartInterview} className="w-full mt-6 py-3 bg-[#2cb474] hover:bg-[#259b63] text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-lg">
                  Unlock Full Report <BrainCircuit className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* RIGHT MAIN CONTENT */}
            <div className="md:col-span-8 space-y-6 text-bg-primary text-left">
              <div className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-8 border border-gray-100">
                <div className="flex items-center gap-3 mb-6 text-[#4a5568]">
                  <div className="bg-indigo-100 p-2 rounded-lg">
                    <FileText className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h2 className="text-lg font-bold tracking-widest uppercase">CONTENT</h2>
                </div>

                <div className="border border-gray-100 rounded-xl p-6">
                  <div className="flex justify-between items-center mb-6 cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      <h3 className="text-lg font-bold text-gray-800">ATS PARSE RATE</h3>
                    </div>
                    <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>

                  <p className="text-[15px] text-gray-600 leading-relaxed mb-4">
                    An <strong className="text-gray-900 font-semibold">Applicant Tracking System</strong> commonly referred to as <strong className="text-gray-900 font-semibold">ATS</strong> is a system used by employers and recruiters to quickly scan a large number of job applications.
                  </p>
                  <p className="text-[15px] text-gray-600 leading-relaxed mb-8">
                    A high parse rate of your resume ensures that the ATS can read your resume, experience, and skills. This increases the chance of getting your resume seen by recruiters.
                  </p>

                  <div className="bg-[#f8fafc] rounded-2xl p-8 border border-gray-100 text-center relative overflow-hidden mt-4">
                    <div className="w-[80%] mx-auto h-3 bg-gray-200 rounded-full mb-8 relative">
                      <div className="absolute top-0 left-0 h-full bg-[#2cb474] rounded-full w-full"></div>
                      <div className="absolute -top-[1.1rem] -right-2 text-[#2cb474]">
                        <MapPin className="w-7 h-7 fill-current stroke-white stroke-[2px]" />
                      </div>
                    </div>
                    <h4 className="text-2xl font-bold text-gray-800 mb-3">Great!</h4>
                    <p className="text-gray-600 text-lg px-8">
                      We parsed 100% of your resume successfully using an industry-leading ATS.
                    </p>
                  </div>
                </div>
              </div>

              {/* Start Interview final prompt */}
              <div className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-8 border border-gray-100 text-center">
                 <h2 className="text-xl font-bold text-gray-800 tracking-wider mb-2">
                    Ready for your Mock Interview?
                 </h2>
                 <p className="text-sm text-gray-500 mb-6">Your customized technical and HR interview is ready based on your resume and selected languages.</p>
                 <div className="flex justify-center">
                    <button
                      onClick={handleStartInterview}
                      className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90 transition-opacity rounded-xl font-bold flex items-center space-x-2 shadow-lg"
                    >
                      <BrainCircuit className="w-5 h-5" />
                      <span>Start Interview Now</span>
                    </button>
                  </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
