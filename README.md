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

For this combined server, `PORT` defaults to `3000`; `HOST` defaults to `0.0.0.0`. Deploy on a persistent Node.js host that supports WebSocket connections. Use one server process: room state is held in memory, and rooms disappear on restart. For a Vercel frontend, use the separate multiplayer server described below. Friends on the internet need the same publicly reachable hosted URL; a localhost invitation works only on your own machine. On a local network, open the server's LAN IP on each device instead.

For a reverse proxy, forward the `/socket.io/` path, HTTP polling, and WebSocket upgrade headers. Terminate HTTPS at the host or reverse proxy.

The server follows the [Next.js custom server guide](https://nextjs.org/docs/pages/guides/custom-server) and uses [Socket.IO](https://socket.io/docs/v4/) for bidirectional events.

## Host the frontend on Vercel and multiplayer on Render

Both hosts deploy from the same repository. Vercel builds the Next.js website; Render runs only `multiplayer-server.ts`. No database, Redis, or API keys are required. The browser connects directly to Render over HTTPS/WebSockets.

1. Push this project, including the updated files and `package-lock.json`, to your GitHub repository. Do not upload `node_modules`, `.next`, or private `.env` files.
2. In Vercel, import that repository. Select the **Next.js** framework preset, use the repository root (the folder containing `package.json`), build with `npm run build -- --webpack`, and leave the output directory at its default. Deploy once and copy the stable production origin, for example `https://your-game.vercel.app`. The UI and solo mode work at this stage; multiplayer needs the following steps.
3. In Render, choose **New → Web Service** and connect the same repository. Use these settings:

   | Setting | Value |
   | --- | --- |
   | Runtime | Node |
   | Root directory | Repository root |
   | Build command | `npm ci --include=dev` |
   | Start command | `npm run start:multiplayer` |
   | Health check path | `/healthz` |
   | Instances | 1 |

   Add these Render environment variables before deploying:

   ```env
   NODE_ENV=production
   NODE_VERSION=24.21.0
   ALLOWED_ORIGINS=https://your-game.vercel.app
   ```

   Replace the example origin with your actual Vercel production origin, with no trailing slash or path. Render supplies `PORT` automatically; the server binds to `0.0.0.0`. `--include=dev` installs `tsx`, which the server's start command needs. A Next.js build is not needed on Render.
4. Deploy Render and copy its public HTTPS origin, for example `https://your-race-server.onrender.com`. Open its `/healthz` URL and confirm it returns `{"status":"ok"}`. The backend root URL intentionally returns 404 because it does not serve the website.
5. In **Vercel → Project Settings → Environment Variables**, add this variable for **Production**:

   ```env
   NEXT_PUBLIC_SOCKET_URL=https://your-race-server.onrender.com
   ```

   Use your actual Render HTTPS origin, with no `/socket.io` suffix. Redeploy Vercel after saving: Next.js embeds `NEXT_PUBLIC_` variables at build time. You do not need to configure `PORT`, `HOST`, or a custom start command on Vercel.
6. Open the Vercel website in two browser tabs or devices. Create a room in one, join using its code in the other, mark both ready, and start a race. Share the Vercel website's invite link with friends.

For a custom domain or a specific preview deployment, add its exact origin to Render's comma-separated `ALLOWED_ORIGINS`, for example `https://your-game.vercel.app,https://race.example.com`. Apply the Render environment change. For Vercel preview deployments, also configure `NEXT_PUBLIC_SOCKET_URL` for the Preview environment and redeploy that preview. An unlisted frontend origin is rejected for both polling and WebSocket connections.

Render's Free service is suitable for testing but sleeps after 15 minutes without inbound traffic; waking takes about a minute. For regular multiplayer use, choose a paid instance that stays running. Keep exactly one instance because rooms are in memory. A restart or backend deployment ends active rooms; browser-local profiles and race history remain on each player's device.

Troubleshooting:

- **Unable to reach the race server:** confirm Render `/healthz` works, `NEXT_PUBLIC_SOCKET_URL` is the Render HTTPS origin, and Vercel was redeployed after the variable was added.
- **Origin/CORS error:** make sure `ALLOWED_ORIGINS` includes the exact website origin you opened, without a trailing slash. Production and preview domains are different origins.
- **Missing `tsx`:** use the Render build command above so runtime TypeScript support is installed.
- **Render startup error:** set `ALLOWED_ORIGINS` in the Render dashboard, not only in a local `.env` file.

Hosting references: [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [Vercel environment variables](https://vercel.com/docs/environment-variables), [Render web services](https://render.com/docs/web-services), and [Render Free service limitations](https://render.com/docs/free).

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
- `multiplayer-server.ts`: standalone Socket.IO entry point for a separately hosted frontend.
- `src/server/socket-server.ts`: HTTP health endpoint and allowed-origin connection checks.
- `src/server/game.ts`: authoritative, ephemeral multiplayer state.
- `src/lib/passages.ts`: independently maintained passage library and bot difficulties.
- `src/lib/typing.ts`: shared typing rules and metrics.
- `src/lib/use-solo.ts`, `src/lib/use-multiplayer.ts`: client race controllers.
- `src/lib/store.ts`: browser-local preferences and race history.
- `src/components/`: landing, garage, profile, lobby, race, and results views.
- `src/app/globals.css`: responsive racing theme and motion.

No API keys, accounts, or database setup are needed.
