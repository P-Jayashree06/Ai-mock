import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Play, RotateCcw, Keyboard, Zap, Timer } from 'lucide-react';
import toast from 'react-hot-toast';

const SNIPPETS = [
  { lang: 'JavaScript', code: 'const reverse = str => str.split("").reverse().join("");' },
  { lang: 'Python', code: 'def factorial(n): return 1 if n == 0 else n * factorial(n-1)' },
  { lang: 'JavaScript', code: 'const [state, setState] = useState(initialState);' },
  { lang: 'C++', code: 'for(int i = 0; i < n; i++) { cout << arr[i] << " "; }' },
  { lang: 'Java', code: 'public static void main(String[] args) { System.out.println("Hello World"); }' },
  { lang: 'SQL', code: 'SELECT name, score FROM students WHERE score > 90;' }
];

export default function MiniGames() {
  const [gameState, setGameState] = useState('idle'); // idle, playing, finished
  const [currentSnippet, setCurrentSnippet] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [bestWpm, setBestWpm] = useState(() => localStorage.getItem('bestWpm') || 0);

  const inputRef = useRef(null);

  const startNewGame = () => {
    const randomSnippet = SNIPPETS[Math.floor(Math.random() * SNIPPETS.length)];
    setCurrentSnippet(randomSnippet);
    setUserInput('');
    setGameState('playing');
    setStartTime(Date.now());
    setAccuracy(100);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setUserInput(value);

    // Calculate accuracy
    let mistakes = 0;
    for (let i = 0; i < value.length; i++) {
      if (value[i] !== currentSnippet.code[i]) mistakes++;
    }
    setAccuracy(Math.max(0, Math.round(((value.length - mistakes) / value.length) * 100)) || 100);

    // Check if finished
    if (value === currentSnippet.code) {
      const timeTaken = (Date.now() - startTime) / 1000 / 60; // in minutes
      const words = currentSnippet.code.length / 5;
      const finalWpm = Math.round(words / timeTaken);
      
      setWpm(finalWpm);
      setGameState('finished');
      
      if (finalWpm > bestWpm) {
        setBestWpm(finalWpm);
        localStorage.setItem('bestWpm', finalWpm);
        toast.success('🏆 New Personal Best!');
      }
    }
  };

  return (
    <div className="glass-card p-6 overflow-hidden relative border border-subtle bg-gradient-to-br from-bg-card to-bg-secondary group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
         <Keyboard className="w-24 h-24" />
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent-primary/20 rounded-lg">
            <Zap className="w-5 h-5 text-accent-primary" />
          </div>
          <div>
            <h3 className="text-lg font-display font-bold text-text-primary">Syntax Speedrun</h3>
            <p className="text-xs text-text-muted">Test your developer typing speed</p>
          </div>
        </div>
        {bestWpm > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-bg-primary rounded-full border border-subtle">
            <Trophy className="w-3.5 h-3.5 text-accent-amber" />
            <span className="text-xs font-mono font-bold text-text-muted">Best: {bestWpm} WPM</span>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {gameState === 'idle' && (
          <motion.div 
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-subtle rounded-xl bg-bg-primary/50"
          >
            <p className="text-text-muted text-sm mb-4">Click below to start the challenge</p>
            <button 
              onClick={startNewGame}
              className="flex items-center gap-2 bg-accent-primary text-white px-6 py-2.5 rounded-btn font-bold hover:scale-105 active:scale-95 transition-all shadow-glow"
            >
              <Play className="w-4 h-4 fill-current" /> Start Game
            </button>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <motion.div 
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="flex justify-between items-center px-4">
               <span className="text-xs font-bold text-accent-secondary uppercase tracking-widest">{currentSnippet.lang}</span>
               <div className="flex gap-4 text-xs font-mono text-text-muted">
                 <span>Acc: <span className="text-accent-green">{accuracy}%</span></span>
                 <button 
                   onClick={startNewGame}
                   className="hover:text-accent-primary transition-colors flex items-center gap-1"
                 >
                   <RotateCcw className="w-3 h-3" /> Skip
                 </button>
               </div>
            </div>

            <div 
              onClick={() => inputRef.current?.focus()}
              className="relative font-mono text-lg bg-black/40 p-6 rounded-xl border border-subtle leading-relaxed cursor-text min-h-[120px]"
            >
              <div className="flex flex-wrap">
                {currentSnippet.code.split('').map((char, i) => {
                  let colorClass = 'text-text-primary opacity-30'; // Not typed yet
                  if (i < userInput.length) {
                    colorClass = userInput[i] === char ? 'text-accent-green' : 'text-accent-red';
                  }
                  
                  return (
                    <span key={i} className={`${colorClass} transition-colors whitespace-pre`}>
                      {char}
                      {i === userInput.length && (
                        <motion.span 
                          layoutId="cursor"
                          className="absolute w-[2px] h-[1.2em] bg-accent-primary -ml-[1px]"
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                        />
                      )}
                    </span>
                  );
                })}
              </div>
            </div>

            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={handleInputChange}
              className="opacity-0 absolute pointer-events-none"
              autoFocus
            />
            <p className="text-center text-[10px] text-text-muted uppercase tracking-widest">Type the code exactly as shown above</p>
          </motion.div>
        )}

        {gameState === 'finished' && (
          <motion.div 
            key="finished"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center justify-center h-48 bg-accent-primary/10 rounded-xl border border-accent-primary/20"
          >
            <div className="flex gap-8 mb-6">
              <div className="text-center">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Speed</p>
                <h4 className="text-4xl font-mono font-black text-accent-primary leading-none">{wpm}<span className="text-sm font-normal ml-1">WPM</span></h4>
              </div>
              <div className="w-px h-full bg-subtle" />
              <div className="text-center">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Accuracy</p>
                <h4 className="text-4xl font-mono font-black text-accent-green leading-none">{accuracy}%</h4>
              </div>
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={startNewGame}
                className="flex items-center gap-2 bg-accent-primary text-white px-5 py-2.5 rounded-btn font-bold hover:scale-105 active:scale-95 transition-all shadow-glow"
              >
                <Play className="w-4 h-4 fill-current" /> Next Snippet
              </button>
              <button 
                onClick={() => setGameState('idle')}
                className="flex items-center gap-2 bg-text-primary text-bg-primary px-5 py-2.5 rounded-btn font-bold hover:bg-white transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Reset
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
