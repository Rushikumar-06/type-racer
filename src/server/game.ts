import { randomBytes, randomUUID } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import type { Ack, Customization, PassageDifficulty, Racer, Room } from '../lib/types';
import { selectPassage } from '../lib/passages';
import { applyActions, createTypingState, metrics, validateBatch, type TypingState } from '../lib/typing';

type Member = Racer & { token: string; socketId: string; typing: TypingState; seq: number; bucket: number; lastActionAt: number; disconnectedAt: number | null };
type InternalRoom = Omit<Room, 'players' | 'serverTime'> & { players: Member[]; touched: number; dirty: boolean };
const allowedCars = ['apex', 'phantom', 'rally', 'formula'];
function customization(value: unknown): Customization | null {
  if (!value || typeof value !== 'object') return null;
  const p = value as Record<string, unknown>;
  if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > 20) return null;
  return {
    name: p.name.trim().replace(/[\x00-\x1f]/g, ''),
    car: allowedCars.includes(String(p.car)) ? p.car as Customization['car'] : 'apex',
    color: typeof p.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(p.color) ? p.color : '#a8f0d0',
    number: String(p.number || '07').replace(/\D/g, '').slice(0, 2).padStart(2, '0'),
    avatar: typeof p.avatar === 'string' ? p.avatar.slice(0, 2) : 'R',
  };
}
export function attachGame(io: Server, options: { countdownMs?: number; raceMs?: number } = {}) {
  const countdownMs = options.countdownMs ?? 3500;
  const raceMs = options.raceMs ?? 300000;
  const rooms = new Map<string, InternalRoom>();
  const sessions = new Map<string, string>();
  function snapshot(room: InternalRoom): Room {
    return {
      code: room.code, hostId: room.hostId, status: room.status, difficulty: room.difficulty,
      passage: room.passage, startAt: room.startAt, deadline: room.deadline, raceId: room.raceId,
      serverTime: Date.now(), players: room.players.map(({ token, socketId, typing, seq, bucket, lastActionAt, disconnectedAt, ...p }) => p),
    };
  }
  function broadcast(room: InternalRoom) { io.to(room.code).emit('room:update', snapshot(room)); room.dirty = false; }
  function lookup(socket: Socket) {
    const room = rooms.get(socket.data.roomCode);
    const member = room?.players.find(p => p.id === socket.data.playerId);
    return { room, member };
  }
  function remove(socket: Socket) {
    const { room, member } = lookup(socket);
    if (!room || !member) return;
    sessions.delete(member.token);
    if (room.status === 'lobby' || room.status === 'countdown') {
      room.players = room.players.filter(p => p.id !== member.id);
    } else {
      member.connected = false; member.ready = false; member.disconnectedAt = Date.now();
      if (member.finishTime === null) member.dnf = true;
    }
    socket.leave(room.code);
    socket.data.roomCode = undefined;
    socket.data.playerId = undefined;
    if (!room.players.length) { rooms.delete(room.code); return; }
    if (room.hostId === member.id) room.hostId = room.players.find(p => p.connected)?.id || room.players[0].id;
    if (room.status === 'countdown') { room.status = 'lobby'; room.startAt = null; room.players.forEach(p => p.ready = false); }
    if (room.status === 'racing' && room.players.every(p => p.finishTime !== null || p.dnf)) room.status = 'finished';
    room.touched = Date.now(); broadcast(room);
  }
  function add(socket: Socket, room: InternalRoom, profile: Customization, ack: (a: Ack) => void) {
    const token = randomBytes(32).toString('hex');
    const member: Member = { ...profile, id: randomUUID(), token, socketId: socket.id, ready: false, connected: true, progress: 0, wpm: 0, accuracy: 100, mistakes: 0, finishTime: null, place: null, typing: createTypingState(), seq: 0, bucket: 4, lastActionAt: Date.now(), disconnectedAt: null };
    // Keep participants visually distinct even when friends select the same color.
    const colors = ['#a8f0d0', '#a5b4fc', '#f6c778', '#f69baf', '#7dd3fc', '#fb923c', '#d8b4fe', '#f0e6ca'];
    if (room.players.some(p => p.color === member.color)) member.color = colors.find(c => !room.players.some(p => p.color === c)) || member.color;
    room.players.push(member);
    if (!room.hostId) room.hostId = member.id;
    sessions.set(token, room.code);
    socket.data.roomCode = room.code; socket.data.playerId = member.id;
    socket.join(room.code); room.touched = Date.now();
    ack({ room: snapshot(room), token, playerId: member.id }); broadcast(room);
  }
  io.on('connection', socket => {
    let controlWindow = Date.now(), controls = 0;
    function on(event: string, handler: (payload: any, ack: (a: any) => void) => void) {
      socket.on(event, (payload = {}, callback) => {
        const ack = typeof callback === 'function' ? callback : () => {};
        if (Date.now() - controlWindow > 1000) { controlWindow = Date.now(); controls = 0; }
        if (++controls > 50) { ack({ error: 'Too many requests. Please slow down.' }); return; }
        try { handler(payload || {}, ack); } catch { ack({ error: 'Invalid request.' }); }
      });
    }
    on('room:create', (payload, ack) => {
      if (lookup(socket).room) return ack({ error: 'Leave your current room before creating another.' });
      const profile = customization(payload.player);
      if (!profile) return ack({ error: 'Enter a username between 1 and 20 characters.' });
      if (rooms.size >= 500) return ack({ error: 'The circuit is full. Try again shortly.' });
      let code: string; do { code = randomBytes(3).toString('hex').toUpperCase(); } while (rooms.has(code));
      const difficulty: PassageDifficulty = ['easy', 'medium', 'hard'].includes(payload.difficulty) ? payload.difficulty : 'medium';
      const room: InternalRoom = { code, hostId: '', status: 'lobby', players: [], difficulty, passage: null, startAt: null, deadline: null, raceId: randomUUID(), touched: Date.now(), dirty: false };
      rooms.set(code, room); add(socket, room, profile, ack);
    });
    on('room:join', (payload, ack) => {
      if (lookup(socket).room) return ack({ error: 'You are already in a room.' });
      const profile = customization(payload.player);
      if (!profile) return ack({ error: 'Enter a username between 1 and 20 characters.' });
      const room = rooms.get(String(payload.code).trim().toUpperCase());
      if (!room) return ack({ error: 'Room not found. Double-check the six-character code.' });
      if (room.status !== 'lobby') return ack({ error: 'This race has started. Join after the next rematch.' });
      if (room.players.length >= 8) return ack({ error: 'This room is full (8 racers).' });
      add(socket, room, profile, ack);
    });
    on('room:restore', (payload, ack) => {
      const code = sessions.get(payload.token);
      const room = code ? rooms.get(code) : undefined;
      const member = room?.players.find(p => p.token === payload.token);
      if (!room || !member) return ack({ error: 'Your room session has expired.' });
      if (member.connected && member.socketId !== socket.id) return ack({ error: 'This racer is already connected in another window.' });
      member.connected = true; member.disconnectedAt = null; member.socketId = socket.id;
      socket.data.roomCode = room.code; socket.data.playerId = member.id; socket.join(room.code);
      room.touched = Date.now(); ack({ room: snapshot(room), token: member.token, playerId: member.id, typed: member.typing.typed, seq: member.seq }); broadcast(room);
    });
    on('room:state', (_, ack) => { const { room } = lookup(socket); ack(room ? { room: snapshot(room) } : { error: 'No active room.' }); });
    on('room:leave', (_, ack) => { remove(socket); ack({}); });
    on('room:ready', (payload, ack) => {
      const { room, member } = lookup(socket);
      if (!room || !member || room.status !== 'lobby') return ack({ error: 'Readiness can only change in the lobby.' });
      member.ready = Boolean(payload.ready); room.touched = Date.now(); ack({ room: snapshot(room) }); broadcast(room);
    });
    on('room:difficulty', (payload, ack) => {
      const { room, member } = lookup(socket);
      if (!room || room.hostId !== member?.id || room.status !== 'lobby') return ack({ error: 'Only the host can change the passage in the lobby.' });
      if (!['easy', 'medium', 'hard'].includes(payload.difficulty)) return ack({ error: 'Choose a valid passage difficulty.' });
      room.difficulty = payload.difficulty; room.players.forEach(p => p.ready = false); room.touched = Date.now(); ack({ room: snapshot(room) }); broadcast(room);
    });
    on('room:start', (_, ack) => {
      const { room, member } = lookup(socket);
      if (!room || room.hostId !== member?.id || room.status !== 'lobby') return ack({ error: 'Only the host can start a race from the lobby.' });
      if (room.players.length < 2 || room.players.some(p => !p.ready || !p.connected)) return ack({ error: 'At least two connected racers must all be ready.' });
      room.passage = selectPassage(room.difficulty, room.passage?.id);
      room.startAt = Date.now() + countdownMs; room.deadline = room.startAt + raceMs;
      room.status = 'countdown'; room.raceId = randomUUID(); room.touched = Date.now();
      room.players.forEach(p => { p.typing = createTypingState(); p.seq = 0; p.bucket = 4; p.lastActionAt = room.startAt!; p.progress = 0; p.wpm = 0; p.accuracy = 100; p.mistakes = 0; p.finishTime = null; p.place = null; p.dnf = false; });
      ack({ room: snapshot(room) }); broadcast(room);
    });
    on('race:type', (payload, ack) => {
      const { room, member } = lookup(socket);
      if (!room || !member || !room.passage || !room.startAt || Date.now() < room.startAt || (room.status !== 'racing' && room.status !== 'countdown') || member.finishTime !== null || member.dnf) return ack({ error: 'Typing is only accepted during an active race.' });
      if (!validateBatch(payload)) return ack({ error: 'Send a valid ordered batch of typing actions.' });
      if (payload.seq <= member.seq) return ack({ seq: member.seq, typed: member.typing.typed });
      if (payload.seq !== member.seq + 1) return ack({ error: 'Typing sequence is out of order.', seq: member.seq, typed: member.typing.typed });
      const now = Date.now();
      if (now > (room.deadline || Infinity)) return ack({ error: 'The race time limit has been reached.' });
      member.bucket = Math.min(60, member.bucket + Math.max(0, now - member.lastActionAt) / 1000 * 30);
      member.lastActionAt = now;
      if (payload.actions.length > member.bucket) return ack({ error: 'Typing burst is too large. Continue at a steady pace.', seq: member.seq, typed: member.typing.typed });
      member.bucket -= payload.actions.length;
      applyActions(member.typing, room.passage.text, payload.actions); member.seq = payload.seq;
      const data = metrics(member.typing, now - room.startAt, room.passage.text.length);
      member.progress = data.percent; member.wpm = data.wpm; member.accuracy = data.accuracy; member.mistakes = data.mistakes;
      if (member.typing.progress === room.passage.text.length) {
        member.finishTime = now - room.startAt;
        member.place = Math.max(0, ...room.players.map(p => p.place || 0)) + 1;
      }
      room.status = room.players.every(p => p.finishTime !== null || p.dnf) ? 'finished' : 'racing';
      room.dirty = true; room.touched = now; ack({ seq: member.seq, typed: member.typing.typed });
    });
    on('room:rematch', (_, ack) => {
      const { room, member } = lookup(socket);
      if (!room || room.hostId !== member?.id || room.status !== 'finished') return ack({ error: 'Only the host can arrange a rematch after the race.' });
      room.status = 'lobby'; room.startAt = null; room.deadline = null;
      room.players.filter(p => !p.connected).forEach(p => sessions.delete(p.token));
      room.players = room.players.filter(p => p.connected);
      room.players.forEach(p => { p.ready = false; p.progress = 0; p.wpm = 0; p.accuracy = 100; p.mistakes = 0; p.finishTime = null; p.place = null; p.dnf = false; p.typing = createTypingState(); });
      room.touched = Date.now(); ack({ room: snapshot(room) }); broadcast(room);
    });
    socket.on('disconnect', () => {
      const { room, member } = lookup(socket);
      if (!room || !member) return;
      member.connected = false; member.disconnectedAt = Date.now(); member.ready = false;
      if (room.hostId === member.id) room.hostId = room.players.find(p => p.connected)?.id || member.id;
      if (room.status === 'countdown') { room.status = 'lobby'; room.startAt = null; room.players.forEach(p => p.ready = false); }
      broadcast(room);
    });
  });
  const ticker = setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms) {
      if (now - room.touched > 30 * 60000 || !room.players.some(p => p.connected) && room.players.every(p => p.disconnectedAt && now - p.disconnectedAt > 30000)) {
        room.players.forEach(p => sessions.delete(p.token)); io.to(code).emit('room:expired'); rooms.delete(code); continue;
      }
      if (room.status === 'countdown' && room.startAt && now >= room.startAt) { room.status = 'racing'; room.dirty = true; }
      const expired = room.players.filter(p => p.disconnectedAt && now - p.disconnectedAt > 30000);
      if (room.status === 'lobby') {
        expired.forEach(p => sessions.delete(p.token)); room.players = room.players.filter(p => !expired.includes(p));
        if (expired.length) room.dirty = true;
      } else if (room.status === 'racing') {
        expired.forEach(p => { if (p.finishTime === null && !p.dnf) { p.dnf = true; room.dirty = true; } });
        if (room.deadline && now >= room.deadline) { room.players.forEach(p => { if (p.finishTime === null) p.dnf = true; }); room.dirty = true; }
        if (room.players.every(p => p.finishTime !== null || p.dnf)) { room.status = 'finished'; room.dirty = true; }
      }
      if (room.dirty) broadcast(room);
    }
  }, 100);
  return () => { clearInterval(ticker); io.removeAllListeners('connection'); rooms.clear(); sessions.clear(); };
}
