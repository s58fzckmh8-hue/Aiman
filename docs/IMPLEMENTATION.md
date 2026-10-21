# Kafe Miaw implementation ledger

## Audit and decision

Baseline commit: 8ded0e4. Vite 6 / Phaser 3, no Three.js, backend, identity, network protocol or durable online data. Existing features: 60-second café shifts; customer patience; payment; cat care; adoption and decoration upgrades; localStorage recovery; responsive UI. Three model tests passed; baseline production build passes with a large Phaser bundle warning. All graphics are original code primitives; Google fonts were optional external assets. The existing UI was Malay.

Phaser remains in the offline practice entry, with its existing save key and economy preserved. New multiplayer rendering uses Three.js because Phaser is a 2D renderer. Separate entries avoid loading both engines. No online currency is stored or awarded by the client. Old local saves are not silently imported into trusted online state.

## Contract for milestone 1

- X east/west, Z north/south, Y height, one unit approximately one meter.
- Shared static world/collision definitions in shared/world.ts. One authoritative Town 001; two connections supported in this milestone, 20 lot locations reserved. Further matchmaking and 20-client capacity are future work.
- Node + TypeScript + ws (purpose-built authoritative WebSocket server) at 20 Hz; nearby state at 10 Hz. Input is normalized direction, never coordinates. Server owns speed, collision, permissions, slot and identity. Client renders ~100 ms behind on interpolation buffers.
- HttpOnly SameSite guest cookie; 256-bit token, SHA-256 hash stored atomically on server disk. Profile ID persists separately from temporary lot. Guest means this browser, not a linked cross-device account. No public chat.
- Reconnect reserves slot for 15 seconds by default. Only the current socket may act for an identity; a second tab replaces the previous connection. On release, player entity disappears. No fake online players.
- Online mode has no economy operations yet. Offline practice is explicitly separate and local, retaining serving, cats, upgrades and progress.
- Local HTTP/WS development; production needs trusted HTTPS/WSS termination, persistent private server storage and explicit allowed origins. Server refuses unsafe origin requests and insecure production configuration. A single server process is supported. PostgreSQL transactions will precede online café economy; filesystem profile storage is not a scalable economy database.

## Staged plan

1. **This change:** guest identity, two-client shared 3D town, authoritative movement/collision, interpolation, join/leave/reconnect, rate limits and functional browser tests.
2. Town expansion: automatic matchmaking, functional building entrances/interiors, owner/visitor permission matrix, camera and touch polish.
3. Durable café: PostgreSQL migrations and atomic/idempotent transactions, server-owned currency/inventory, orders/ingredients/customer lifecycle; retain offline progress separately until an explicit migration policy exists.
4. Cats: unique identities, ownership, needs/AI, adoption and CatBook with server simulation and interaction locks.
5. Life sim: MEOKEA, PawMart, homes, furniture/navigation, employees, quests and progression.
6. CrazyGames: verify current official SDK, lifecycle/ads, secure hosted backend, account-linking, performance and browser/device coverage.
7. Advanced genetics, breeding/consent, moderated social systems. Load tests progress 2→5→10→20 before any corresponding capacity claim.

## Acceptance and evidence

Run `npm test`, `npm run typecheck`, `npm run build`, `npm run test:online` and `npm run test:browser` (requires a Chromium installation; see README). Browser tests use two isolated cookie jars, actual WebSockets and two 3D canvases. Checks cover movement visible to the other client, offline/reconnect same identity/slot, duplicate-session replacement, mobile overflow and no JavaScript errors. Integration tests cover spoofed coordinates, rate limiting, origin checks, collision, stale inputs, reconnect expiration, session isolation and profile restart persistence. Results and limitations are recorded in docs/VALIDATION.md after running.

This milestone is not a complete café life sim or CrazyGames release. Reserved lots do not imply real online owners. No commerce, ads or town shops are shown as functional online features.
