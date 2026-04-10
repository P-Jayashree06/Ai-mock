import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, BrainCircuit, ArrowRight, Code2, Briefcase } from 'lucide-react';
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
        ) : (
          <motion.div
            key="analysis"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="glass-card p-8">
              <div className="flex items-center justify-between mb-6 border-b border-subtle pb-4">
                <h2 className="text-2xl font-display font-bold">Profile Analysis</h2>
                <div className="px-4 py-1.5 rounded-full bg-accent-primary/20 text-accent-primary font-bold text-sm tracking-widest uppercase border border-accent-primary/30 shadow-glow">
                  {analysis.experienceLevel} Level
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-semibold text-text-muted mb-3 uppercase tracking-wider flex items-center gap-2">
                    <Code2 className="w-4 h-4" /> Programming Languages
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-4">
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
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all border ${
                            isSelected 
                              ? 'bg-accent-primary border-accent-primary text-white shadow-glow' 
                              : 'bg-bg-secondary border-subtle text-text-muted hover:border-text-primary hover:text-text-primary'
                          }`}
                        >
                          {lang}
                        </button>
                      );
                    })}
                  </div>

                  <h3 className="text-sm font-semibold text-text-muted mt-6 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4" /> Relevant Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.skills?.map(skill => (
                      <span key={skill} className="px-3 py-1 bg-accent-secondary/10 border border-accent-secondary/30 rounded-full text-xs font-medium tracking-wide text-accent-secondary">{skill}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-text-muted mb-3 uppercase tracking-wider flex items-center gap-2">
                    <Briefcase className="w-4 h-4" /> Key Projects
                  </h3>
                  <div className="space-y-3">
                    {analysis.projects?.slice(0,2).map((proj, i) => (
                      <div key={i} className="p-3 rounded-lg bg-bg-secondary border border-subtle">
                        <strong className="block text-sm text-text-primary mb-1">{proj.name}</strong>
                        <p className="text-xs text-text-secondary line-clamp-2">{proj.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end pt-6 border-t border-subtle">
                <button
                  onClick={handleStartInterview}
                  className="px-8 py-3 bg-white text-bg-primary hover:bg-gray-200 transition-colors rounded-btn font-bold flex items-center space-x-2 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                >
                  <span>Start Mock Interview</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
