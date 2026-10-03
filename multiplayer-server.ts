import { createRaceServer } from './src/server/socket-server';

const port = Number(process.env.PORT || 3001);
const hostname = process.env.HOST || '0.0.0.0';
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(origin => origin.trim()).filter(Boolean);
if (!allowedOrigins.length) throw new Error('Set ALLOWED_ORIGINS to your frontend origin, e.g. https://your-game.vercel.app');
for (const origin of allowedOrigins) {
  const url = new URL(origin);
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
    throw new Error(`ALLOWED_ORIGINS must contain exact HTTP(S) origins without paths or trailing slashes: ${origin}`);
  }
}
const { server, io, dispose } = createRaceServer(allowedOrigins);
server.listen(port, hostname, () => console.log(`Multiplayer server listening on ${hostname}:${port}`));
function stop() { dispose(); io.close(); }
process.once('SIGTERM', stop);
process.once('SIGINT', stop);
