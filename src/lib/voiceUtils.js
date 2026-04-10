export function getMaleVoice() {
  const voices = window.speechSynthesis.getVoices();
  // Filter heuristics for male voices
  const prefers = ['male', 'mark', 'david', 'brian', 'guy'];
  
  let selectedVoice = null;
  
  for (const voice of voices) {
    const vName = voice.name.toLowerCase();
    // Prioritize explicitly male English voices
    if (voice.lang.includes('en-') && prefers.some(p => vName.includes(p))) {
      selectedVoice = voice;
      break;
    }
  }

  // Fallback to Google UK/US if no explicit 'male' keyword works, or defaults
  if (!selectedVoice) {
    selectedVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) 
                    || voices.find(v => v.lang === 'en-GB') 
                    || voices[0];
  }

  return selectedVoice;
}
