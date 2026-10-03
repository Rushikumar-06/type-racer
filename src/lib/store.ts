'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Customization, RaceRecord } from './types';
export const carColors = [
  { name: 'Seafoam', hex: '#a8f0d0' }, { name: 'Lavender', hex: '#a5b4fc' },
  { name: 'Sunburst', hex: '#f6c778' }, { name: 'Coral', hex: '#f69baf' },
  { name: 'Ice blue', hex: '#7dd3fc' }, { name: 'Tangerine', hex: '#fb923c' },
  { name: 'Orchid', hex: '#d8b4fe' }, { name: 'Pearl', hex: '#f0e6ca' },
];
interface PlayerStore {
  player: Customization;
  settings: { sound: boolean; animations: boolean; showLiveWpm: boolean; fontSize: 'normal' | 'large' };
  history: RaceRecord[];
  setPlayer: (value: Partial<Customization>) => void;
  setSettings: (value: Partial<PlayerStore['settings']>) => void;
  recordRace: (value: RaceRecord) => void;
  clearHistory: () => void;
}
export const usePlayerStore = create<PlayerStore>()(persist((set) => ({
  player: { name: 'Rookie', car: 'apex', color: '#a8f0d0', number: '07', avatar: 'R' },
  settings: { sound: false, animations: true, showLiveWpm: true, fontSize: 'normal' },
  history: [],
  setPlayer: value => set(state => ({ player: { ...state.player, ...value } })),
  setSettings: value => set(state => ({ settings: { ...state.settings, ...value } })),
  recordRace: value => set(state => ({ history: state.history.some(r => r.id === value.id) ? state.history : [value, ...state.history].slice(0, 100) })),
  clearHistory: () => set({ history: [] }),
}), { name: 'typeracer-player-v1', skipHydration: true }));
