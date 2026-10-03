let context: AudioContext | undefined;
export function playTone(type: 'countdown' | 'go' | 'finish') {
  try {
    context ||= new AudioContext();
    void context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(type === 'countdown' ? 440 : type === 'go' ? 880 : 660, context.currentTime);
    if (type === 'finish') oscillator.frequency.exponentialRampToValueAtTime(1320, context.currentTime + .25);
    gain.gain.setValueAtTime(.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .25);
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .3);
  } catch { /* Audio is optional on browsers without Web Audio. */ }
}
