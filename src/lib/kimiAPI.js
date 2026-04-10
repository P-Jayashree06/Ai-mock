import axios from 'axios';

// ─── Provider config ──────────────────────────────────────────────────────────
const GROQ_KEY    = import.meta.env.VITE_GROQ_API_KEY;
const GEMINI_KEY  = import.meta.env.VITE_GEMINI_API_KEY;

const GROQ_ENDPOINT   = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

// ─── In-memory response cache (10 min TTL) ────────────────────────────────────
const responseCache = new Map();
const CACHE_TTL_MS  = 10 * 60 * 1000;

function getCacheKey(text) { 
  // For dynamic avoidance prompts, we need the full text hash or a longer slice to ensure uniqueness
  // However, simple slice(0, 500) combined with unique data usually works.
  return text.length > 300 ? text.slice(0, 200) + text.slice(-200) : text; 
}

function getFromCache(key) {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) { responseCache.delete(key); return null; }
  console.log('[AI] Cache hit');
  return entry.data;
}

function setCache(key, data) {
  responseCache.set(key, { data, timestamp: Date.now() });
}

// ─── Serial queue (≥500ms between calls to avoid burst) ─────────────────────────
let requestQueue = Promise.resolve();
function enqueue(fn) {
  requestQueue = requestQueue
    .then(() => new Promise(r => setTimeout(r, 500)))
    .then(fn);
  return requestQueue;
}

// ─── JSON extraction helper ───────────────────────────────────────────────────
function extractJSON(text) {
  try {
    const start   = text.search(/[{[]/);
    const lastObj = text.lastIndexOf('}');
    const lastArr = text.lastIndexOf(']');
    const end     = lastObj > lastArr ? lastObj : lastArr;
    
    let jsonStr = text;
    if (start !== -1 && end !== -1) {
      jsonStr = text.substring(start, end + 1);
    }
    
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('[AI] JSON Parse Error:', error);
    console.error('[AI] Raw Text:', text);
    
    // Fallback response for evaluation failures
    return {
      score: 0,
      correctness: "incorrect",
      correctnessScore: 0,
      timeComplexity: "N/A",
      spaceComplexity: "N/A",
      codeQuality: 0,
      clarityScore: 0,
      confidenceScore: 0,
      relevanceScore: 0,
      feedback: "The AI could not properly evaluate your answer. It may be too short, invalid, or unclear.",
      strengths: [],
      improvements: ["Provide a more structured and valid response.", "Ensure your code/answer is complete."],
      optimizedApproach: "N/A"
    };
  }
}

// ─── Groq call ────────────────────────────────────────────────────────────────
async function callGroq(prompt) {
  if (!GROQ_KEY) throw new Error('NO_GROQ_KEY');

  const response = await axios.post(
    GROQ_ENDPOINT,
    {
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are an expert AI interviewer. Always respond with valid, strict JSON only. No markdown, no explanation.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    },
    { headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' } }
  );

  const text = response.data.choices[0].message.content;
  return extractJSON(text);
}

// ─── Gemini call (fallback) ───────────────────────────────────────────────────
async function callGemini(prompt) {
  if (!GEMINI_KEY) throw new Error('NO_GEMINI_KEY');

  const response = await axios.post(GEMINI_ENDPOINT, {
    contents: [{ parts: [{ text: prompt }] }],
  });

  if (!response.data?.candidates?.length) throw new Error('No candidates from Gemini');
  const text = response.data.candidates[0].content.parts[0].text;
  return extractJSON(text);
}

// ─── Unified call with provider cascade ──────────────────────────────────────
function isQuotaError(error) {
  const status = error.response?.status;
  const msg    = (error.response?.data?.error?.message || error.message || '').toLowerCase();
  return status === 429 || msg.includes('quota') || msg.includes('rate limit') || msg.includes('exceeded');
}

async function callAI(prompt) {
  // 1️⃣ Try Groq first (generous free tier)
  if (GROQ_KEY) {
    try {
      console.log('[AI] Using Groq (primary)');
      return await callGroq(prompt);
    } catch (err) {
      if (isQuotaError(err)) {
        console.warn('[AI] Groq quota hit, falling back to Gemini...');
        window.dispatchEvent(new CustomEvent('ai-provider-switch', { detail: { from: 'Groq', to: 'Gemini' } }));
      } else if (err.message !== 'NO_GROQ_KEY') {
        console.error('[AI] Groq error:', err.response?.data || err.message);
        // Still try Gemini as fallback
      }
    }
  }

  // 2️⃣ Fall back to Gemini
  if (GEMINI_KEY) {
    try {
      console.log('[AI] Using Gemini (fallback)');
      return await callGemini(prompt);
    } catch (err) {
      if (isQuotaError(err)) {
        console.error('[AI] Gemini quota also exceeded.');
        window.dispatchEvent(new CustomEvent('gemini-quota-exceeded', {
          detail: { message: 'All AI providers have hit their quota. Please try again later or add a billing method.' },
        }));
        throw new Error('QUOTA_EXCEEDED');
      }
      throw err;
    }
  }

  throw new Error('No AI provider configured. Add VITE_GROQ_API_KEY to your .env file.');
}

// ─── Public wrapper (cache + queue) ──────────────────────────────────────────
async function callGeminiCached(prompt) {
  const key    = getCacheKey(prompt);
  const cached = getFromCache(key);
  if (cached) return cached;

  const result = await enqueue(() => callAI(prompt));
  setCache(key, result);
  return result;
}

// ─── Exported API functions ───────────────────────────────────────────────────

export async function analyzeResume(resumeText) {
  const prompt = `Extract skills, programming languages, and experience level from this resume. Return ONLY a strict JSON object, no markdown.
{
  "skills": ["string"],
  "programmingLanguages": ["string"],
  "projects": [{"name": "string", "description": "string"}],
  "experienceLevel": "junior|mid|senior",
  "yearsOfExperience": 0,
  "summary": "string"
}
Resume: ${resumeText}`;
  return callGeminiCached(prompt);
}

export async function generateMixedTechnicalQuestions(skills, languages, level) {
  const prompt = `Generate exactly 9 interview questions for a ${level} developer skilled in: ${skills?.join(', ')} using ${languages?.join(', ')}.
  Structure:
  - exactly 3 Technical Coding problems (data structures, algorithms, or practical dev tasks). Each must have timeLimit: 45.
  - exactly 3 Aptitude/Logical Reasoning problems (puzzles, math logic, or system thinking). Each must have timeLimit: 20.
  - exactly 3 Soft Skills questions (behavioral, communication, or teamwork). Each must have timeLimit: 20.
  Return ONLY a JSON array, no markdown.
  [{
    "id": 1,
    "title": "string",
    "description": "Full problem description. Explain the logic clearly.",
    "difficulty": "easy|medium|hard",
    "type": "technical|aptitude|soft-skill",
    "expectedTopics": ["string"],
    "timeLimit": 45,
    "testCases": [
      {"input": "Sample input value", "expected": "Calculated output value"}
    ]
  }]
  IMPORTANT: For technical type questions, include 3 to 4 varied testCases covering normal, edge (null/empty), and corner (max/min) cases.
  For aptitude and soft-skill types, testCases can be an empty array [].`;
  return callAI(prompt);
}

export async function evaluateCode(question, code, language) {
  const prompt = `Analyze this code/logic submission. Return ONLY a JSON object, no markdown.
Question: ${question}
Language: ${language}
Code/Answer: ${code}

Requirements:
- Evaluate the submission against standard logic/syntax.
- Provide a score (0-100).
- Identify time and space complexity.
- For each test case, explain why it passed or failed. 
- If a test fails, provide a descriptive 'actual' output (e.g., 'Error: Index out of bounds' or 'Value 15' instead of '10').

{
  "score": 0,
  "correctness": "correct|partial|incorrect",
  "correctnessScore": 0,
  "timeComplexity": "string|N/A",
  "spaceComplexity": "string|N/A",
  "codeQuality": 0,
  "feedback": "string",
  "testResults": [
    {"input": "string", "expected": "string", "actual": "Descriptive error or actual result", "passed": boolean}
  ],
  "strengths": ["string"],
  "improvements": ["string"],
  "optimizedApproach": "string"
}`;
  return callAI(prompt);
}

export async function generateTechnicalHRQuestions(resumeData) {
  const prompt = `Generate 3 Technical HR interview questions based on this resume: ${JSON.stringify(resumeData)}.
  Focus on:
  - Technical project management and teamwork.
  - Problem-solving approach used in their specific projects.
  - Technical soft skills (mentoring, code reviews, architectural decisions).
  Return ONLY a JSON array, no markdown.
  [{
    "id": 1,
    "question": "string",
    "type": "technical-hr",
    "tip": "How to answer professionally"
  }]`;
  return callGeminiCached(prompt);
}

export async function generatePersonalHRQuestions(resumeData) {
  const prompt = `Generate 3 Personal HR / Behavioral interview questions based on this resume: ${JSON.stringify(resumeData)}.
  Focus on:
  - Culture fit and personal goals.
  - Behavioral scenarios (conflict, failure, motivation).
  - Growth mindset and personality.
  Return ONLY a JSON array, no markdown.
  [{
    "id": 1,
    "question": "string",
    "type": "behavioral",
    "tip": "What the HR is looking for"
  }]`;
  return callGeminiCached(prompt);
}

export async function evaluateHRAnswer(question, answer) {
  const prompt = `Evaluate this HR/Behavioral interview answer. Return ONLY a JSON object, no markdown.
Question: ${question}
Answer: ${answer}

{
  "score": 0,
  "clarityScore": 0,
  "confidenceScore": 0,
  "relevanceScore": 0,
  "feedback": "string",
  "strengths": ["string"],
  "improvements": ["string"],
  "betterApproach": "string"
}`;
  return callGeminiCached(prompt);
}

export async function generateTriviaQuestions(skills, languages, level, avoidList = []) {
  const prompt = `Generate exactly 5 multiple-choice technical trivia questions for a ${level || 'junior'} level developer.
  ${skills?.length ? `Focus on skills: ${skills.join(', ')}.` : ''}
  ${languages?.length ? `Focus on languages: ${languages.join(', ')}.` : ''}
  
  CRITICAL: DO NOT include any of these previously asked questions: [${avoidList.join(', ')}].
  
  Return ONLY a JSON array, no markdown.
  [{
    "id": number,
    "question": "string",
    "options": ["string", "string", "string", "string"],
    "answer": "string (one of the options)"
  }]`;
  return callGeminiCached(prompt);
}

export async function generateOverallFeedback({ round1Score, round2Score, round3Score, overallScore, answers }) {
  const summary = answers.map((a, i) => `Q${i+1}: ${a.questionText} — Score: ${a.score}%`).join('\n');
  const prompt = `You are an expert career coach. A candidate just completed a 3-round mock interview with the following scores:
- Round 1 (Technical & Logic): ${round1Score}%
- Round 2 (Technical HR): ${round2Score}%
- Round 3 (Personal HR): ${round3Score}%
- Overall Score: ${overallScore}%

Their question-level breakdown:
${summary}

Generate a personalized overall performance report. Return ONLY a strict JSON object, no markdown.
{
  "overallSummary": "string (2-3 sentences of personal, honest overall feedback)",
  "strengths": ["string", "string", "string"],
  "improvementAreas": [
    { "area": "string", "detail": "string", "stars": number (1-5, where 5 = most urgent to improve) }
  ],
  "nextSteps": ["string", "string", "string"],
  "hirability": "string (one of: 'Ready to hire', 'Almost there', 'Needs more practice', 'Significant gaps')"
}`;
  return callGeminiCached(prompt);
}
