import { useEffect, useState } from 'react';

/**
 * Global banner that appears whenever Gemini API quota is hit.
 * Listens for custom window events emitted by kimiAPI.js.
 */
export default function QuotaErrorBanner() {
  const [state, setState] = useState(null); // { type: 'retrying'|'exceeded', countdown, attempt, maxRetries }

  useEffect(() => {
    let timer = null;

    function onRetry(e) {
      const { delayMs, attempt, maxRetries } = e.detail;
      const seconds = Math.ceil(delayMs / 1000);
      setState({ type: 'retrying', countdown: seconds, attempt, maxRetries });

      clearInterval(timer);
      timer = setInterval(() => {
        setState((prev) => {
          if (!prev || prev.type !== 'retrying') { clearInterval(timer); return prev; }
          const next = prev.countdown - 1;
          if (next <= 0) { clearInterval(timer); return null; }
          return { ...prev, countdown: next };
        });
      }, 1000);
    }

    function onExceeded(e) {
      clearInterval(timer);
      setState({ type: 'exceeded', message: e.detail.message });
      // Auto-dismiss after 12 seconds
      setTimeout(() => setState(null), 12000);
    }

    window.addEventListener('gemini-quota-retry', onRetry);
    window.addEventListener('gemini-quota-exceeded', onExceeded);
    return () => {
      window.removeEventListener('gemini-quota-retry', onRetry);
      window.removeEventListener('gemini-quota-exceeded', onExceeded);
      clearInterval(timer);
    };
  }, []);

  if (!state) return null;

  const isExceeded = state.type === 'exceeded';

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '14px 22px',
      borderRadius: '14px',
      background: isExceeded
        ? 'linear-gradient(135deg, #2d0a0a, #4a1010)'
        : 'linear-gradient(135deg, #0a1a2d, #0d2a4a)',
      border: `1px solid ${isExceeded ? '#e74c3c55' : '#3498db55'}`,
      boxShadow: `0 8px 32px ${isExceeded ? '#e74c3c33' : '#3498db33'}, 0 2px 8px rgba(0,0,0,0.4)`,
      color: '#fff',
      fontSize: '14px',
      fontFamily: 'Inter, system-ui, sans-serif',
      maxWidth: '520px',
      backdropFilter: 'blur(12px)',
      animation: 'quotaBannerIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
    }}>
      {/* Animated icon */}
      <span style={{ fontSize: '22px', flexShrink: 0 }}>
        {isExceeded ? '🚫' : '⏳'}
      </span>

      <div style={{ flex: 1 }}>
        {isExceeded ? (
          <>
            <div style={{ fontWeight: 700, color: '#ff6b6b', marginBottom: '2px' }}>
              Gemini API Quota Exceeded
            </div>
            <div style={{ color: '#ffaaaa', fontSize: '12px', lineHeight: 1.4 }}>
              Your free-tier daily quota is exhausted. Requests will resume tomorrow,
              or add billing at{' '}
              <a
                href="https://ai.dev/rate-limit"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#ff9999', textDecoration: 'underline' }}
              >
                ai.dev/rate-limit
              </a>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 700, color: '#74b9ff', marginBottom: '2px' }}>
              Rate limit hit — retrying automatically
            </div>
            <div style={{ color: '#a0c8ff', fontSize: '12px' }}>
              Attempt {state.attempt}/{state.maxRetries} · waiting{' '}
              <span style={{
                fontWeight: 700,
                color: '#fff',
                background: '#1e3a5f',
                padding: '1px 7px',
                borderRadius: '6px',
              }}>
                {state.countdown}s
              </span>
            </div>
          </>
        )}
      </div>

      {/* Dismiss button */}
      <button
        onClick={() => setState(null)}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#ffffff88',
          cursor: 'pointer',
          fontSize: '18px',
          lineHeight: 1,
          padding: '0 4px',
          flexShrink: 0,
        }}
        title="Dismiss"
      >
        ×
      </button>

      <style>{`
        @keyframes quotaBannerIn {
          from { opacity: 0; transform: translateX(-50%) translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0)    scale(1); }
        }
      `}</style>
    </div>
  );
}
