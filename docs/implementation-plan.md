# TypeRacer implementation

A complete typing car racing app using Next.js, TypeScript, Tailwind CSS, Framer Motion, Zustand, and Socket.IO. No progression system or database.

## Visual direction
Night-circuit cockpit: midnight #0c111a, panel #141c28, mint #a8f0d0, muted #8996aa, warm gold #f6c778. Wide italic racing headlines, readable sans body, monospaced passage. Simple colored car icons and horizontal tracks make the core mechanic visible. Compact top navigation connects Race, Garage, and Profile; settings open in a dialog.

## Delivery sequence
1. Scaffold Next.js and custom Node server; separate passages and shared typing logic.
2. Verify correct-prefix movement, keystroke accuracy, and malicious progress rejection.
3. Implement authoritative in-memory Socket.IO rooms, ready/start/countdown, validated batches, disconnects, deadlines, and rematches.
4. Build landing, mode/setup dialogs, room lobby, countdown/race, live stats and final results.
5. Add car color garage, browser-local profile/history and settings; respect reduced motion and keyboard access.
6. Run type checks, game/server tests, production build, and browser checks on desktop and mobile.

## Multiplayer contract
The server picks the passage and start time. Clients send ordered batches of insert/backspace actions at most once per 120ms, and only during a race. The server replays and rate-limits these actions, computes the correct prefix, WPM, accuracy, errors and finish order. Raw progress/WPM/finish claims are never accepted. This blocks trivial fake 100% reports, but cannot distinguish a sophisticated human-speed typing bot from a real human.

Rooms are ephemeral and limited to 2–8 participants. Host transfer, disconnect grace/rejoin, ready reset on rematch, a five-minute race timeout, and idle-room cleanup keep state bounded. Race history and preferences are local to the browser; rooms are lost on server restart. No accounts, database, XP, levels, or unlocks.
