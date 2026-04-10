import React, { useEffect, useRef } from 'react';
import { Camera, CameraOff, Mic } from 'lucide-react';

export default function CameraMonitor({ videoRef, isActive, error }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isActive || !videoRef.current?.srcObject) return;
    
    // Simulate audio visualizer for effect
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bars = 10;
      const width = canvas.width / bars;
      
      for (let i = 0; i < bars; i++) {
        const height = Math.random() * canvas.height * 0.8 + 2;
        ctx.fillStyle = 'var(--accent-primary)';
        // Center vertically
        const y = (canvas.height - height) / 2;
        ctx.fillRect(i * width + 1, y, width - 2, height);
      }
      animationId = requestAnimationFrame(draw);
    };
    
    draw();
    return () => cancelAnimationFrame(animationId);
  }, [isActive, videoRef]);

  return (
    <div className={`relative w-40 h-32 bg-black rounded-lg overflow-hidden border-2 transition-colors ${isActive ? 'border-accent-green' : 'border-accent-red'} shadow-glow`}>
      {isActive ? (
        <>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover transform scale-x-[-1]" 
          />
          {/* Recording indicator */}
          <div className="absolute top-2 right-2 w-2 h-2 bg-accent-red rounded-full animate-pulse" />
          
          {/* Mic Visualizer */}
          <div className="absolute bottom-2 left-2 right-2 h-6 bg-black/50 backdrop-blur-sm rounded px-1 flex items-center justify-between">
            <Mic className="w-3 h-3 text-accent-green" />
            <canvas ref={canvasRef} className="w-20 h-4" width="80" height="16" />
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full text-text-muted">
          {error ? <CameraOff className="w-8 h-8 mb-2" /> : <Camera className="w-8 h-8 mb-2" />}
          <span className="text-[10px] uppercase tracking-wider font-semibold">
            {error ? 'Camera Blocked' : 'Initializing...'}
          </span>
        </div>
      )}
    </div>
  );
}
