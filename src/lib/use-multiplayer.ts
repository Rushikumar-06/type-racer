'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Ack, Customization, PassageDifficulty, Room } from './types';
import { applyActions, createTypingState } from './typing';
interface BatchAck { error?: string; typed?: string; seq?: number }
export function useMultiplayer() {
  const socket = useRef<Socket | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState('');
  const [typed, setTyped] = useState('');
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const roomRef = useRef<Room | null>(null);
  const localTyping = useRef(createTypingState());
  const queue = useRef<string[]>([]), seq = useRef(0), pending = useRef(false), raceId = useRef('');
  const update = useCallback((value: Room) => {
    if (value.raceId !== raceId.current && value.status !== 'lobby') {
      raceId.current = value.raceId; localTyping.current = createTypingState(); queue.current = []; seq.current = 0; pending.current = false; setTyped('');
    }
    setOffset(value.serverTime - Date.now()); roomRef.current = value; setRoom(value);
  }, []);
  const request = useCallback(<T = Ack,>(event: string, payload: unknown = {}): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (!socket.current?.connected) { reject(new Error('Connection lost. Waiting to reconnect…')); return; }
      socket.current.timeout(5000).emit(event, payload, (timeout: Error | null, result: T) => {
        if (timeout) { reject(new Error('The server did not respond. Please try again.')); return; }
        const ack = result as Ack;
        if (ack.error) { reject(new Error(ack.error)); return; }
        if (ack.room) update(ack.room);
        resolve(result);
      });
    });
  }, [update]);
  useEffect(() => {
    const client = io(process.env.NEXT_PUBLIC_SOCKET_URL || undefined, { transports: ['websocket', 'polling'], autoConnect: true }); socket.current = client;
    client.on('connect', () => {
      setConnected(true); setError('');
      const token = sessionStorage.getItem('typeracer-room-token');
      if (token) client.timeout(5000).emit('room:restore', { token }, (timeout: Error | null, ack: Ack & BatchAck) => {
        if (timeout) return;
        if (ack.error) { sessionStorage.removeItem('typeracer-room-token'); setRoom(null); roomRef.current = null; setError(ack.error); return; }
        if (ack.room && ack.playerId) { update(ack.room); setPlayerId(ack.playerId); localTyping.current.typed = ack.typed || ''; seq.current = ack.seq || 0; queue.current = []; pending.current = false; setTyped(localTyping.current.typed); }
      });
    });
    client.on('disconnect', () => setConnected(false));
    client.on('connect_error', () => setError('Unable to reach the race server. Retrying…'));
    client.on('room:update', update);
    client.on('room:expired', () => { setRoom(null); roomRef.current = null; sessionStorage.removeItem('typeracer-room-token'); setError('This room expired. Create a fresh room to race again.'); });
    const timer = setInterval(() => {
      if (!client.connected || pending.current || !queue.current.length || roomRef.current?.status !== 'racing') return;
      const actions = queue.current.splice(0, 60);
      const nextSeq = seq.current + 1;
      const currentRace = raceId.current;
      pending.current = true;
      client.timeout(3000).emit('race:type', { seq: nextSeq, actions }, (timeout: Error | null, ack: BatchAck) => {
        if (currentRace !== raceId.current) return;
        pending.current = false;
        if (timeout) { queue.current.unshift(...actions); return; }
        if (ack.error) {
          setError(ack.error); queue.current = [];
          if (ack.typed !== undefined) { localTyping.current.typed = ack.typed; setTyped(ack.typed); }
          seq.current = ack.seq ?? seq.current; return;
        }
        seq.current = ack.seq ?? nextSeq;
      });
    }, 120);
    return () => { clearInterval(timer); client.disconnect(); socket.current = null; };
  }, [update]);
  const enter = useCallback(async (event: 'room:create' | 'room:join', player: Customization, codeOrDifficulty: string) => {
    setError('');
    const ack = await request<Ack>(event, { player, ...(event === 'room:create' ? { difficulty: codeOrDifficulty } : { code: codeOrDifficulty }) });
    if (ack.token && ack.playerId) { sessionStorage.setItem('typeracer-room-token', ack.token); setPlayerId(ack.playerId); }
    return ack;
  }, [request]);
  const leave = useCallback(async () => {
    try { await request('room:leave'); } finally { setRoom(null); roomRef.current = null; queue.current = []; sessionStorage.removeItem('typeracer-room-token'); setTyped(''); }
  }, [request]);
  const type = useCallback((actions: string[]) => {
    const r = roomRef.current;
    if (r?.status !== 'racing' || !r.passage || !socket.current?.connected) return;
    applyActions(localTyping.current, r.passage.text, actions);
    queue.current.push(...actions); setTyped(localTyping.current.typed);
  }, []);
  return { room, playerId, typed, connected, error, setError, offset, request, enter, leave, type };
}
