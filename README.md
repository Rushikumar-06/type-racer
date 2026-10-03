# TypeRacer

A web-based typing car racing game built with Next.js, TypeScript, Tailwind CSS, Framer Motion, Zustand, and Socket.IO. Cars are simple colored icons. There is no database or progression system.

## Run locally

Requires Node.js 22.12+ and npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000. Use a second browser tab or device to join a multiplayer room. Each tab has its own room session. Preferences and the last 100 completed races are stored in browser localStorage.

## Production

```bash
npm run build
npm start
```

`PORT` defaults to `3000`; `HOST` defaults to `0.0.0.0`. Deploy on a persistent Node.js host that supports WebSocket connections. Use one server process: room state is held in memory, and rooms disappear on restart. A static export or serverless-only Next.js deployment cannot run this custom Socket.IO server. Friends on the internet need the same publicly reachable hosted URL; a localhost invitation works only on your own machine. On a local network, open the server's LAN IP on each device instead.

For a reverse proxy, forward the `/socket.io/` path, HTTP polling, and WebSocket upgrade headers. Terminate HTTPS at the host or reverse proxy.

The server follows the [Next.js custom server guide](https://nextjs.org/docs/pages/guides/custom-server) and uses [Socket.IO](https://socket.io/docs/v4/) for bidirectional events.

## Gameplay

- Choose Easy, Medium, Hard, or Expert AI opponents, independently from the passage difficulty.
- Type the complete passage correctly to cross the line. The car follows the correctly typed prefix of the passage. A wrong character stops further progress until corrected with backspace.
- Speed is `(correct-prefix characters / 5) / minutes elapsed`. Accuracy counts correct character attempts divided by all character attempts, including mistakes that were later corrected; backspaces are excluded.
- Copy/paste, drag/drop, and input undo are blocked during a race.
- Bots vary their cadence and pause slightly. You can view your results as soon as you finish; slower AI racers continue to finish the standings.
- Races have a five-minute limit. Unfinished racers are marked DNF.
- Car models, colors, number, and avatar initials are cosmetic.
- Sounds, motion effects, lane speed indicators, and passage text size are configurable. System reduced-motion preferences are respected.

## Multiplayer

Create a room and share its six-character code or invite link. Rooms support 2–8 racers. Everyone must mark themselves ready, then the host starts a synchronized countdown. The host can change passage difficulty before a race; changing it resets readiness. After a race, the host can arrange a rematch and everyone readies up again.

The server chooses the passage and start timestamp, validates typing actions, calculates metrics, and determines finish order. Clients batch insert/backspace actions every 120ms; room snapshots broadcast at up to 10Hz. Sequence numbers make retried batches idempotent. Raw progress, WPM, and finish claims are ignored. Malformed batches and implausible typing bursts are rejected. Private session tokens are never included in public room snapshots.

A disconnected player has 30 seconds to reconnect. Host control transfers to a connected racer. Players who leave or time out during a race remain in its standings, preserving finish order. Idle rooms expire after 30 minutes. The server bounds room size, total rooms, payload size, control-event frequency, and typing action rate.

This prevents trivially forged 100% progress reports. It is not a complete anti-bot system: software that types the known passage at a plausible rate cannot be reliably distinguished from a real person without further defenses. No accounts or competitive rating system are included.

## Verify

```bash
npm run typecheck
npm test
npm run build
```

Integration tests create real Socket.IO server/client connections and cover readiness, passage synchronization, malformed progress claims, rate limits, replayed batches, complete race finish order, departing winners, reconnection, host transfer, deadlines, and rematches.

## Project layout

- `server.ts`: custom Next.js HTTP server with Socket.IO.
- `src/server/game.ts`: authoritative, ephemeral multiplayer state.
- `src/lib/passages.ts`: independently maintained passage library and bot difficulties.
- `src/lib/typing.ts`: shared typing rules and metrics.
- `src/lib/use-solo.ts`, `src/lib/use-multiplayer.ts`: client race controllers.
- `src/lib/store.ts`: browser-local preferences and race history.
- `src/components/`: landing, garage, profile, lobby, race, and results views.
- `src/app/globals.css`: responsive racing theme and motion.

No API keys, accounts, or database setup are needed.
