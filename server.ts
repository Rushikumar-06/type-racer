import { createServer } from 'node:http';
import next from 'next';
import { Server } from 'socket.io';
import { attachGame } from './src/server/game';

const dev = process.env.NODE_ENV !== 'production';
const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOST || '0.0.0.0';
const app = next({ dev, hostname, port });
async function main() {
  await app.prepare();
  const handler = app.getRequestHandler();
  const server = createServer((req, res) => handler(req, res));
  const io = new Server(server, { maxHttpBufferSize: 8192, serveClient: false, transports: ['websocket', 'polling'] });
  const dispose = attachGame(io);
  server.listen(port, hostname, () => console.log(`TypeRacer ready at http://localhost:${port}`));
  function stop() { dispose(); io.close(); server.close(); process.exit(0); }
  process.once('SIGTERM', stop); process.once('SIGINT', stop);
}
main().catch(error => { console.error(error); process.exit(1); });
