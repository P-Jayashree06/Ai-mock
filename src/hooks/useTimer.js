import { useState, useEffect, useCallback } from 'react';

export function useTimer(initialSeconds = 0, onTimeUp = () => {}) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isActive && seconds > 0) {
      interval = setInterval(() => setSeconds(s => s - 1), 1000);
    } else if (isActive && seconds === 0) {
      setIsActive(false);
      onTimeUp();
    }
    return () => clearInterval(interval);
  }, [isActive, seconds, onTimeUp]);

  const startTimer = useCallback((newSeconds) => {
    if (newSeconds !== undefined) setSeconds(newSeconds);
    setIsActive(true);
  }, []);

  const stopTimer = useCallback(() => setIsActive(false), []);
  
  const resetTimer = useCallback((newSeconds) => {
    setIsActive(false);
    setSeconds(newSeconds !== undefined ? newSeconds : initialSeconds);
  }, [initialSeconds]);

  const formatTime = () => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return { seconds, isActive, startTimer, stopTimer, resetTimer, formatTime };
}
