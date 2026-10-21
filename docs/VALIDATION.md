# Validation ledger

## V0.3 — online café slice

Validated in the same Node 24 / Linux Chromium environment. Tests use temporary server databases and isolated guest cookies.

- Original offline model tests: 3 passed.
- Online unit/integration tests: 19 passed, including the original nine, ownership/private entry, complete order/payment lifecycle, purchase idempotency, insufficient funds, unique cats/capacity, decoration limits, database restart/refunds, café isolation, no passive income, pathfinding around furniture and rollback after an injected DB failure following a debit, and slow-connection handling that reconnects rather than silently dropping transaction acknowledgements, and separation of client request IDs from automatic server-payment IDs.
- Café browser test: two actual browser guests join, the owner walks to and enters a 3D café, a visitor walks into the same café, both appear together, the owner prepares and serves a coffee, and only the owner's wallet is credited. Cat food consumption, decoration purchase, reload persistence, mobile overflow and walking back to town pass with no JavaScript errors.
- Production build and production smoke test pass. Separate online and offline entries work; the preserved Phaser bundle and Three.js entry retain Vite's size advisory.
- Original two-client movement/reconnect/offline regression suite passed after the new area and action protocol integration.

During test development, a maximum-upgrade fixture ran out of its 12 starter beans. It was corrected to buy supplies and earn the additional required currency through actual order completions. No gameplay assertion was disabled. The legacy browser reload check timed out waiting for the broad page `load` event on the software-rendering cloud browser; it now waits for DOM readiness and verifies the actual canvas, serving/feeding behavior and restored balance.

New screenshots: `test-results/cafe-online-desktop.png` and `test-results/cafe-online-mobile.png`; a recorded desktop example is committed in `docs/images/online-cafe.png`.

This remains a **partially implemented master spec**. No new 5/10/20-player, physical-device, Firefox/Safari, long-duration soak or hosted Internet/CrazyGames test has been performed. Customer path presentation is not the full future NPC lifecycle; cats do not yet have full needs/AI/genetics. No free build mode, functional town shops, employees, quests, account linking or ads are claimed. PostgreSQL was replaced by transactional SQLite for this single-process local slice; multi-process coordination and production scaling remain unimplemented.


---

## V0.2 — historical multiplayer foundation

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

## Windows startup follow-up

A user's Windows run installed dependencies successfully but could not start Vite because port 5173 was already occupied. The old launcher also emitted Node DEP0190 because it used a shell to run npm.cmd. The launcher now starts the Node executables directly, supports `--port` and `--server-port`, and synchronizes the proxy and default allowed origins. Windows cleanup targets only its own child process trees. Type checking and the production build pass. A real development launch on 5174/3002 passed proxied health, guest cookie authentication and a WebSocket welcome. Native Windows process-tree cleanup remains untested in this Linux workspace; the user's Windows startup is the next platform check.
