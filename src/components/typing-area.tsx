'use client';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, CornerDownLeft, LockKeyhole } from 'lucide-react';
import type { Passage } from '@/lib/types';
export function TypingArea({ passage, typed, active, finished, onActions, large = false }: { passage: Passage; typed: string; active: boolean; finished: boolean; onActions: (actions: string[]) => void; large?: boolean }) {
  const input = useRef<HTMLTextAreaElement>(null);
  const cursor = useRef<HTMLSpanElement>(null);
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (active && !finished) input.current?.focus(); }, [active, finished]);
  useEffect(() => { cursor.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' }); }, [typed.length]);
  function change(value: string) {
    let prefix = 0;
    while (prefix < typed.length && prefix < value.length && typed[prefix] === value[prefix]) prefix++;
    const added = value.slice(prefix);
    if (added.length > 8 || value.length > passage.text.length) return;
    const actions = Array(typed.length - prefix).fill('BACKSPACE').concat(added.split(''));
    if (actions.length) onActions(actions);
  }
  return <section className={`typing-panel panel ${focused ? 'typing-focused' : ''} ${large ? 'typing-large' : ''}`}>
    <div className="panel-heading"><div className="heading-label"><Keyboard size={18}/><h3>The words are your fuel.</h3></div><span className="subtle-tag">{passage.difficulty} passage <span className="tag-dot"/> {passage.text.length} characters</span></div>
    <div className="passage" onClick={() => input.current?.focus()} aria-hidden="true">{passage.text.split('').map((char, i) => <span key={i} ref={i === typed.length ? cursor : undefined} className={`${i < typed.length ? typed[i] === char ? 'char-correct' : 'char-wrong' : 'char-pending'} ${i === typed.length ? 'char-current' : ''}`}>{char}</span>)}</div>
    <label className="sr-only" htmlFor="race-input">Type this passage: {passage.text}</label>
    <div className="typing-input-wrap"><textarea ref={input} id="race-input" className="typing-input" rows={2} value={typed} placeholder={finished ? 'Finish line crossed. Nice driving!' : active ? 'Click here or just start typing…' : 'Get ready. The race starts soon…'} disabled={!active || finished} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onChange={e => change(e.target.value)} onPaste={e => e.preventDefault()} onDrop={e => e.preventDefault()} onKeyDown={e => { if (e.key === 'Enter' || (e.ctrlKey || e.metaKey) && ['v', 'z', 'y'].includes(e.key.toLowerCase())) e.preventDefault(); }} onSelect={e => { const element = e.currentTarget; if (element.selectionStart !== typed.length || element.selectionEnd !== typed.length) element.setSelectionRange(typed.length, typed.length); }} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}/><CornerDownLeft size={18}/></div>
    <div className="typing-footer"><span><span className="legend-dot correct-dot"/>Correct</span><span><span className="legend-dot incorrect-dot"/>Incorrect</span><span><span className="legend-dot current-dot"/>Current character</span><span className="paste-notice"><LockKeyhole size={12}/> Paste disabled · skill enabled</span></div>
  </section>;
}
