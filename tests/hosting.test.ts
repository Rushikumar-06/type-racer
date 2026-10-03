import test from 'node:test';
import assert from 'node:assert/strict';
import { io as connect, type Socket } from 'socket.io-client';
import { createRaceServer } from '../src/server/socket-server';
import type { Ack } from '../src/lib/types';

test('standalone race server serves health and shares rooms across allowed frontend origins', async () => {
  const { server, io, dispose } = createRaceServer(['https://race.vercel.app', 'https://race.example.com']);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const clients: Socket[] = [];
  try {
    const health = await fetch(`${url}/healthz`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok' });
    for (const origin of ['https://race.vercel.app', 'https://race.example.com']) {
      const socket = connect(url, { transports: ['websocket'], extraHeaders: { Origin: origin }, reconnection: false });
      clients.push(socket);
      await new Promise<void>((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
    }
    const emit = (socket: Socket, event: string, payload: unknown): Promise<Ack> => new Promise((resolve, reject) => {
      socket.timeout(3000).emit(event, payload, (error: Error | null, ack: Ack) => error ? reject(error) : resolve(ack));
    });
    const player = { name: 'Hosted racer', color: '#a8f0d0', car: 'apex', number: '07', avatar: 'H' };
    const created = await emit(clients[0], 'room:create', { player, difficulty: 'easy' });
    assert.ok(created.room?.code);
    const joined = await emit(clients[1], 'room:join', { player, code: created.room.code });
    assert.equal(joined.room?.players.length, 2);
    const polling = await fetch(`${url}/socket.io/?EIO=4&transport=polling`, { headers: { Origin: 'https://race.vercel.app' } });
    assert.equal(polling.status, 200);
    assert.equal(polling.headers.get('access-control-allow-origin'), 'https://race.vercel.app');
    const denied = await fetch(`${url}/socket.io/?EIO=4&transport=polling`, { headers: { Origin: 'https://unrelated.example.com' } });
    assert.equal(denied.status, 403);
    const stranger = connect(url, { transports: ['websocket'], extraHeaders: { Origin: 'https://unrelated.example.com' }, reconnection: false, timeout: 2000 });
    clients.push(stranger);
    await new Promise<void>((resolve, reject) => {
      stranger.once('connect_error', () => resolve());
      stranger.once('connect', () => reject(new Error('Unlisted origin connected')));
    });
  } finally {
    clients.forEach(client => client.disconnect());
    dispose();
    await new Promise<void>(resolve => io.close(() => resolve()));
  }
});
