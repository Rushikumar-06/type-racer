export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type PassageDifficulty = 'easy' | 'medium' | 'hard';
export type CarModel = 'apex' | 'phantom' | 'rally' | 'formula';
export type RaceStatus = 'lobby' | 'countdown' | 'racing' | 'finished';
export type TypingAction = string;
export interface Customization { name: string; car: CarModel; color: string; number: string; avatar: string }
export interface Racer extends Customization {
  id: string; ready: boolean; connected: boolean; progress: number; wpm: number;
  accuracy: number; mistakes: number; finishTime: number | null; place: number | null;
  dnf?: boolean; bot?: boolean;
}
export interface Passage { id: string; difficulty: PassageDifficulty; title: string; text: string }
export interface Room {
  code: string; hostId: string; status: RaceStatus; players: Racer[];
  difficulty: PassageDifficulty; passage: Passage | null; startAt: number | null;
  deadline: number | null; raceId: string; serverTime: number;
}
export interface RaceRecord {
  id: string; date: string; wpm: number; accuracy: number; mistakes: number;
  time: number; place: number; players: number; mode: 'solo' | 'multiplayer';
}
export interface Ack { error?: string; room?: Room; token?: string; playerId?: string }
