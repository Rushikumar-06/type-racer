import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { io as connect, type Socket } from 'socket.io-client';
import { attachGame } from '../src/server/game';
import type { Ack, Room } from '../src/lib/types';

const emit = <T = Ack>(socket: Socket, event: string, payload: unknown = {}): Promise<T> => new Promise((resolve, reject) => socket.timeout(3000).emit(event, payload, (error: Error | null, response: T) => error ? reject(error) : resolve(response)));
const player = { name: 'Racer', color: '#a8f0d0', car: 'apex', number: '07', avatar: 'R' };

test('rooms enforce readiness, select a shared passage, reject forged completion, and synchronize rematches', async () => {
  const http = createServer();
  const io = new Server(http);
  const dispose = attachGame(io, { countdownMs: 30, raceMs: 500 });
  await new Promise<void>(r => http.listen(0, '127.0.0.1', r));
  const port = (http.address() as { port: number }).port;
  const a = connect(`http://127.0.0.1:${port}`);
  const b = connect(`http://127.0.0.1:${port}`);
  try {
    const created = await emit(a, 'room:create', { player, difficulty: 'easy' });
    assert.ok(created.room?.code);
    const joined = await emit(b, 'room:join', { player: { ...player, name: 'Friend' }, code: created.room.code });
    assert.equal(joined.room?.players.length, 2);
    assert.ok((await emit(a, 'room:start')).error);
    await emit(a, 'room:ready', { ready: true });
    await emit(b, 'room:ready', { ready: true });
    const started = await emit(a, 'room:start');
    assert.equal(started.room?.status, 'countdown');
    assert.ok(started.room?.passage?.text);
    await new Promise(r => setTimeout(r, 60));
    const forged = await emit<{ error?: string }>(a, 'race:type', { progress: 100, wpm: 999, finished: true });
    assert.ok(forged.error);
    const snapshot = await emit(b, 'room:state');
    assert.equal(snapshot.room?.players[0].progress, 0);
    const passage = started.room.passage.text;
    const valid = await emit<{ error?: string }>(a, 'race:type', { seq: 1, actions: [passage[0]] });
    assert.equal(valid.error, undefined);
    const updated = await emit(b, 'room:state');
    assert.ok(Math.abs(updated.room!.players[0].progress - 100 / passage.length) < 1e-9);
    await emit(a, 'race:type', { seq: 1, actions: [passage[0]] });
    assert.ok(Math.abs((await emit(b, 'room:state')).room!.players[0].progress - 100 / passage.length) < 1e-9);
    await new Promise(r => setTimeout(r, 600));
    assert.equal((await emit(a, 'room:state')).room?.status, 'finished');
    assert.ok((await emit(b, 'room:rematch')).error);
    const rematch = await emit(a, 'room:rematch');
    assert.equal(rematch.room?.status, 'lobby');
    assert.ok(rematch.room?.players.every(p => !p.ready && p.progress === 0));
  } finally { a.disconnect(); b.disconnect(); dispose(); await new Promise<void>(r => io.close(() => r())); }
});

test('a host disconnect transfers control and its private token restores the same racer', async () => {
  const http = createServer(); const server = new Server(http); const dispose = attachGame(server);
  await new Promise<void>(r => http.listen(0, '127.0.0.1', r));
  const port = (http.address() as { port: number }).port;
  const a = connect(`http://127.0.0.1:${port}`), b = connect(`http://127.0.0.1:${port}`);
  let restored: Socket | null = null;
  try {
    const created = await emit(a, 'room:create', { player, difficulty: 'easy' });
    await emit(b, 'room:join', { player: { ...player, name: 'Friend' }, code: created.room!.code });
    a.disconnect(); await new Promise(r => setTimeout(r, 50));
    const state = await emit(b, 'room:state');
    assert.equal(state.room!.hostId, state.room!.players[1].id);
    assert.equal(state.room!.players[0].connected, false);
    restored = connect(`http://127.0.0.1:${port}`);
    const rejoin = await emit(restored, 'room:restore', { token: created.token });
    assert.equal(rejoin.playerId, created.playerId);
    assert.equal(rejoin.room!.players.length, 2);
    assert.equal(rejoin.room!.players[0].connected, true);
  } finally { a.disconnect(); b.disconnect(); restored?.disconnect(); dispose(); await new Promise<void>(r => server.close(() => r())); }
});

test('validated typing finishes in server order and a departing winner stays in the results', async () => {
  const http = createServer(); const server = new Server(http); const dispose = attachGame(server, { countdownMs: 20, raceMs: 12000 });
  await new Promise<void>(r => http.listen(0, '127.0.0.1', r));
  const port = (http.address() as { port: number }).port;
  const a = connect(`http://127.0.0.1:${port}`), b = connect(`http://127.0.0.1:${port}`);
  try {
    const created = await emit(a, 'room:create', { player, difficulty: 'easy' });
    await emit(b, 'room:join', { player: { ...player, name: 'Friend' }, code: created.room!.code });
    await emit(a, 'room:ready', { ready: true }); await emit(b, 'room:ready', { ready: true });
    const race = await emit(a, 'room:start'); const passage = race.room!.passage!.text;
    const fakeBurst = await emit<{ error?: string }>(a, 'race:type', { seq: 1, actions: passage.slice(0, 60).split('') });
    assert.ok(fakeBurst.error);
    let seq = 0;
    for (let i = 0; i < passage.length; i += 10) {
      await new Promise(r => setTimeout(r, 400));
      seq++;
      const actions = passage.slice(i, i + 10).split('');
      await emit(a, 'race:type', { seq, actions });
      if (i + 10 < passage.length) await emit(b, 'race:type', { seq, actions });
    }
    const winner = (await emit(a, 'room:state')).room!.players[0];
    assert.equal(winner.place, 1); assert.equal(winner.progress, 100); assert.equal(winner.accuracy, 100);
    assert.ok(winner.finishTime! > 0 && winner.wpm > 0 && winner.wpm <= 360);
    await emit(a, 'room:leave');
    await emit(b, 'race:type', { seq, actions: passage.slice((seq - 1) * 10).split('') });
    const final = (await emit(b, 'room:state')).room!;
    assert.equal(final.status, 'finished'); assert.equal(final.players.length, 2);
    assert.equal(final.players[0].place, 1); assert.equal(final.players[1].place, 2);
  } finally { a.disconnect(); b.disconnect(); dispose(); await new Promise<void>(r => server.close(() => r())); }
});
