export interface TypingState { typed: string; progress: number; strokes: number; correctStrokes: number; mistakes: number }
export function createTypingState(): TypingState { return { typed: '', progress: 0, strokes: 0, correctStrokes: 0, mistakes: 0 }; }
export function applyActions(state: TypingState, passage: string, actions: string[]) {
  for (const action of actions) {
    if (action === 'BACKSPACE') { state.typed = state.typed.slice(0, -1); continue; }
    if (action.length !== 1 || state.typed.length >= passage.length) continue;
    const index = state.typed.length;
    state.strokes++;
    if (action === passage[index]) state.correctStrokes++; else state.mistakes++;
    state.typed += action;
  }
  let prefix = 0;
  while (prefix < state.typed.length && state.typed[prefix] === passage[prefix]) prefix++;
  state.progress = prefix;
  return state;
}
export function metrics(state: TypingState, elapsedMs: number, length: number) {
  return {
    wpm: elapsedMs > 0 ? Math.round((state.progress / 5) / (elapsedMs / 60000)) : 0,
    accuracy: state.strokes ? Math.round(state.correctStrokes / state.strokes * 1000) / 10 : 100,
    percent: length ? Math.min(100, state.progress / length * 100) : 0,
    mistakes: state.mistakes,
  };
}
export function validateBatch(value: unknown): value is { seq: number; actions: string[] } {
  if (!value || typeof value !== 'object') return false;
  const batch = value as { seq?: unknown; actions?: unknown };
  return Number.isSafeInteger(batch.seq) && Number(batch.seq) > 0 && Array.isArray(batch.actions)
    && batch.actions.length > 0 && batch.actions.length <= 64
    && batch.actions.every(a => typeof a === 'string' && (a === 'BACKSPACE' || (a.length === 1 && a.charCodeAt(0) >= 32 && a.charCodeAt(0) <= 126)));
}
export function ordinal(n: number) { return `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`; }
export function formatTime(ms: number) { const seconds = Math.floor(Math.max(0, ms) / 1000); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }
