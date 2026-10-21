# Milestone 1 validation

Validated on 21 October 2026 in the cloud workspace, Node.js v24.19.0, Linux Chromium headless. This is current-instance validation, not proof of a published/hosted service or physical mobile device compatibility.

| Check | Outcome |
|---|---|
| Baseline audit | Phaser 2D only, no backend/Three.js; original 3 model tests and production build passed |
| `npm test` | **3 passed**, 0 failed/skipped: original offline economy and save tests |
| `npm run typecheck` | Passed, including frontend, backend, protocol and test scripts |
| `npm run test:online` | **9 passed**, 0 failed/skipped |
| `npm run test:browser` | Passed: two isolated browser guests with actual WebSockets and WebGL canvases |
| `npm run build` | Passed: separate online and offline entries; large-bundle advisory remains |
| `npm run test:production` | Passed: built online entry connects to a real backend; built offline entry serves a customer; no JavaScript errors |
| `npm run dev` | Both Node backend and Vite started successfully; proxied health endpoint returned expected JSON |

## Backend and protocol evidence

- Two independently authenticated guest profiles are distinct; the same HttpOnly cookie restores the same profile.
- Real socket movement appears in the second client's replicated state.
- Input containing fabricated currency or position fields is rejected. Movement speed is normalized, bounded and collision-checked. Stale input stops movement.
- Old input sequences cannot replay movement; excessive messages close the connection.
- Missing guest authentication is rejected; unapproved HTTP origins are rejected. Raw bearer tokens are absent from profile storage.
- Same-identity replacement cannot be disconnected/controlled by its old socket. Reconnection within grace retains the session and lot, without a duplicate entity.
- Grace expiry releases the entity and lot. Held disconnected reservations count against capacity, but not the connected-player HUD.
- Interest management omits distant players from snapshots while retaining the real town-wide connection count.
- Guest identity survives restarting the backend with the same profile store. Corrupt storage fails closed and remains unchanged.

## Real browser evidence

Two isolated Chromium cookie jars join Town 001; the HUD shows two real connected guests. Each client's movement is visible to the other. The observing client's 3D canvas changes while the other guest moves. Automatic reconnect preserves the same identity/session/lot. A same-cookie tab replaces the prior connection; after its departure, grace expiry removes the resident, and the returning browser keeps its persistent guest identity. The 390 × 844 layout has no horizontal overflow; emulated touch controls move the server-owned player. The English offline practice entry still serves, feeds cats and restores its local progress after reload. No JavaScript page errors occurred. Desktop/mobile viewport screenshots are generated in ignored `test-results/`.

An initial browser run timed out loading the legacy offline page because of its external Google Fonts dependency. The optional external font import was removed, retaining system-font fallbacks. The full browser suite then passed. The online scene was subsequently checked in the production smoke test after minor layout/lighting refinements.

## Explicit limitations / unrun checks

- Capacity is deliberately **2**, not 20. No 5/10/20-player load tests, performance benchmark, long-duration soak, multi-process or matchmaking validation has been performed.
- Chrome-compatible headless browser checked; Edge, Firefox, Safari, physical phones and real Internet latency remain untested. Mobile coverage here is viewport/pointer testing, not a physical-device certification.
- Only guest profiles are persisted online. No PostgreSQL economy, online café inventory, customer order processing, online cat AI, home/furniture permissions, functional shops, employees, quests, genetics, account linking or CrazyGames SDK/ads yet.
- This backend is a local single-process foundation. Internet deployment, HTTPS/WSS termination, backups, resource quotas and CrazyGames-compatible identity/cross-origin behavior remain deployment work.
- The original offline save is preserved separately and is client-editable. It is never treated as an authoritative online balance.
- Game rendering uses original primitive models/animations, not final commercial character/cat assets.

Next implementation increment: functional building entrances and café ownership/visitor permissions, followed by PostgreSQL-backed idempotent café transactions. Do not jump to a 20-player claim based on these two-client results.
