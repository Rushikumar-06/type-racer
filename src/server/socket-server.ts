import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { attachGame } from './game';

export function createRaceServer(allowedOrigins: string[]) {
  const server = createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/healthz') {
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({ status: 'ok' }));
      return;
    }
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('Not found');
  });
  const io = new Server(server, {
    maxHttpBufferSize: 8192,
    serveClient: false,
    transports: ['websocket', 'polling'],
    cors: { origin: allowedOrigins },
    // CORS covers polling; also check the browser Origin on WebSocket upgrades.
    allowRequest: (request, callback) => callback(null, !request.headers.origin || allowedOrigins.includes(request.headers.origin)),
  });
  const dispose = attachGame(io);
  return { server, io, dispose };
}
