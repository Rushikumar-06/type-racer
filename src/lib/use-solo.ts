'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { selectPassage, difficultyInfo } from './passages';
import { applyActions, createTypingState, metrics, type TypingState } from './typing';
import type { Customization, Difficulty, PassageDifficulty, Racer, Room } from './types';
interface SoloState { room: Room; typing: TypingState; speeds: number[] }
export function useSoloRace() {
  const runtime = useRef<SoloState | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [typed, setTyped] = useState('');
  const [now, setNow] = useState(Date.now());
  const refresh = useCallback(() => {
    if (!runtime.current) return;
    const state = runtime.current;
    setRoom({ ...state.room, players: state.room.players.map(p => ({ ...p })), serverTime: Date.now() });
    setTyped(state.typing.typed); setNow(Date.now());
  }, []);
  const start = useCallback((player: Customization, difficulty: Difficulty, textDifficulty: PassageDifficulty) => {
    const [low, high] = difficultyInfo[difficulty].speeds;
    const speeds = [0, .15, .5, .85].map((p, i) => i === 0 ? 0 : low + (high - low) * p + Math.random() * 3);
    const names = ['You', 'Nova', 'Blaze', 'Ghost'];
    const colors = [player.color, '#a5b4fc', '#f6c778', '#f69baf'];
    if (colors.slice(1).includes(player.color)) colors[colors.indexOf(player.color, 1)] = '#7dd3fc';
    const players: Racer[] = names.map((name, i) => ({ ...player, name: i === 0 ? player.name : name, id: i === 0 ? 'you' : `bot-${i}`, color: colors[i], number: i === 0 ? player.number : ['23', '88', '11'][i - 1], bot: i > 0, ready: true, connected: true, progress: 0, wpm: 0, accuracy: 100, mistakes: 0, finishTime: null, place: null }));
    const startAt = Date.now() + 3500;
    runtime.current = { typing: createTypingState(), speeds, room: { code: 'solo', hostId: 'you', status: 'countdown', players, difficulty: textDifficulty, passage: selectPassage(textDifficulty, runtime.current?.room.passage?.id), startAt, deadline: startAt + 300000, raceId: crypto.randomUUID(), serverTime: Date.now() } };
    refresh();
  }, [refresh]);
  useEffect(() => {
    const timer = setInterval(() => {
      const state = runtime.current;
      if (!state || !state.room.startAt || !state.room.passage || state.room.status === 'finished') return;
      const current = Date.now(), elapsed = current - state.room.startAt;
      if (elapsed < 0) { setNow(current); return; }
      state.room.status = 'racing';
      const length = state.room.passage.text.length;
      state.room.players.forEach((p, i) => {
        if (p.finishTime !== null || p.dnf) return;
        if (i === 0) {
          const m = metrics(state.typing, elapsed, length);
          p.progress = m.percent; p.wpm = m.wpm; p.accuracy = m.accuracy; p.mistakes = m.mistakes;
        } else {
          // A varying cadence with brief pauses simulates human typing without jittering the car.
          const speed = state.speeds[i];
          const chars = Math.max(0, elapsed / 60000 * speed * 5 + Math.sin(elapsed / 2500 + i) * 1.2 - .5);
          p.progress = Math.min(100, chars / length * 100);
          p.wpm = Math.round(chars / 5 / (elapsed / 60000));
          p.mistakes = Math.floor(chars / (42 + i * 12));
          p.accuracy = Math.round(100 - p.mistakes / Math.max(chars, 1) * 100);
          if (p.progress === 100) p.finishTime = elapsed;
        }
        if (current >= state.room.deadline! && p.finishTime === null) p.dnf = true;
      });
      state.room.players.filter(p => p.finishTime !== null).sort((a, b) => a.finishTime! - b.finishTime!).forEach((p, index) => p.place = index + 1);
      if (state.room.players.every(p => p.finishTime !== null || p.dnf)) state.room.status = 'finished';
      refresh();
    }, 80);
    return () => clearInterval(timer);
  }, [refresh]);
  const type = useCallback((actions: string[]) => {
    const state = runtime.current;
    if (!state || state.room.status !== 'racing' || state.room.players[0].finishTime !== null || !state.room.passage || !state.room.startAt) return;
    applyActions(state.typing, state.room.passage.text, actions);
    const p = state.room.players[0], elapsed = Date.now() - state.room.startAt;
    const m = metrics(state.typing, elapsed, state.room.passage.text.length);
    p.progress = m.percent; p.wpm = m.wpm; p.accuracy = m.accuracy; p.mistakes = m.mistakes;
    if (p.progress === 100) { p.finishTime = elapsed; p.place = state.room.players.filter(r => r.finishTime !== null).length; }
    refresh();
  }, [refresh]);
  const stop = useCallback(() => { runtime.current = null; setRoom(null); setTyped(''); }, []);
  return { room, typed, now, start, type, stop };
}
