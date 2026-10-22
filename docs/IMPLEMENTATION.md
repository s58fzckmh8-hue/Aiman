# Kafe Miaw implementation ledger

## V0.6 — first-person street and imported civilians

First-person is the default: eye height follows the interpolated player through town and doorways, lowers to 1.4 when sitting, and hides the owner's head. Mouse capture, Escape release, right-drag and touch-drag provide look controls. Aim/E and held-machine interactions retain server authority. Phone/dialog opening releases the mouse and pauses look; the phone blocks walking. Cups and carried cats have camera-relative hand models. V selects overview; design mode temporarily uses overview and restores the selected view.

Town and room rendering now share scale 1. Buildings and lots were resized consistently, with clear door approaches. Eight imported building façades, parked cars, benches, lamps, foliage, distant hills and ten ambient pedestrian NPCs form the street. Shared car/bench/lamp/tree footprints enforce server collision. Pedestrians are presentation NPCs and never contribute to the online count; two actual clients remain the supported capacity. The café adds FPP front/right walls, glass frontage, an open doorway and a ceiling. Hidden shell geometry is excluded from pointer hits in overview, and background terrain sits below the floor to avoid coplanar flicker.

Four Quaternius skinned civilian models replace generated humans in normal play, with idle/walk clips and runtime colour variants. Kafe Miaw adds seated-leg and independent foot-controller poses, carried objects and a loading fallback. Character meshes render on a separate camera layer; simple customer hit volumes support interactions without raycasting every skinned triangle. FPP hides large speech sprites and uses the existing HUD feedback. A lower counter/machine fits eye-level service. The imported KayKit couch now renders in furniture design. Original cats have a smaller floor scale.

The local collection totals 27 CC0 GLBs / 4,853,624 bytes. Quaternius's author pages verify commercial CC0 use; the actual GLBs come from the pinned, attributed Ducz archive. Geometry and five animation clips are preserved while unused clips/buffers are removed. `scripts/import-civilians.py` reproduces the processed hashes without importing application source. Credits and original notices identify both the artist and redistribution. No gameplay dependency changed from v0.5; private player saves use the existing schema.

## V0.5 — living café and safe design mode

The 3D world fills the viewport. Business management lives in an in-game phone; physical service remains in the scene. C/E/O/B/R/Shift and on-screen equivalents expose phone, interaction, open/close, design, rotation and sprint. Original articulated human characters replace the earlier robot model. Chairs reserve actual seats, movement/E stands, and owned cats can be approached, carried and put down without changing identity. Server-owned cat routines include wandering, rest, grooming, perches and toys. Visitors may sit and care for cats using their own supplies.

Recipe choice is persisted per order and unlocked from completed service. Reputation derives from served count; five goals have atomic one-time claims. Customers have names, appearance variants, dialogue and patience. Shift counters show actual service, earnings and missed orders. Original procedural sound is gesture-unlocked and optional.

Furniture is persistent owned inventory with half-metre position and quarter-turn rotation. Server validation rejects overlaps, out-of-room placement, blocked entrances/work routes and moving occupied perches. The final food bowl cannot be stored. Queued walkers replan or explicitly cancel when a new object blocks their route. Building upgrades increase actual floor area. One starter slot grows through explicit paid slot purchases, up to ten in the largest room. Adoption prices and capped happiness-dependent bonuses follow eight coat tiers.

Schema v2 adds persisted furniture, owned cat slots, order recipes and goal claims. Migration preserves prior identities, balances, cats and layouts; existing cats receive enough owned slots. Interrupted orders are refunded once. No client currency is trusted. Doorway presentation uses the building's world coordinates and a continuous camera; area authority/interest filtering still applies on the backend.

Twenty-three CC0 GLBs are locally archived with hashes and original notices. Additional car/home/shop art is reserved, not evidence of completed destinations. Functional shops, homes, cars, staff, desserts, outdoor cats and verified rewarded ads remain future stages; see [WORLD-DIRECTION.md](WORLD-DIRECTION.md). Two real clients remain the tested capacity. See [VALIDATION.md](VALIDATION.md) for executed checks.

## V0.4 — physical café interaction and curated artwork

The coffee sidebar now displays orders and manages the business; it cannot prepare or serve drinks. Click the floor to send an authoritative walking route. Click the machine to approach, then hold it (or hold E nearby) for four continuous seconds. Server-timed work requires fresh heartbeats and proximity. Release, movement, disconnection or a missed heartbeat cancels the work and refunds its bean exactly once. A ready coffee must be picked up at the machine, carried, and delivered near its matching customer. Visitors cannot operate the owner's machine or economy.

Nine pinned CC0 GLB assets provide an animated Kenney character and KayKit buildings/furniture. All files and licenses ship locally; sources, conversion and checksums are in `public/assets/manifest.json` and `docs/ASSETS.md`. Cats use original geometry with eight selectable coat designs, preserving existing saved coat indices and three ownership slots. This does not implement breeding, a new account system or expanded multiplayer capacity.

## Audit and decision

Baseline commit: 8ded0e4. Vite 6 / Phaser 3, no Three.js, backend, identity, network protocol or durable online data. Existing features: 60-second café shifts; customer patience; payment; cat care; adoption and decoration upgrades; localStorage recovery; responsive UI. Three model tests passed; baseline production build passes with a large Phaser bundle warning. All graphics are original code primitives; Google fonts were optional external assets. The existing UI was Malay.

Phaser remains in the offline practice entry, with its existing save key and economy preserved. New multiplayer rendering uses Three.js because Phaser is a 2D renderer. Separate entries avoid loading both engines. No online currency is stored or awarded by the client. Old local saves are not silently imported into trusted online state.

## Historical contract for milestone 1 (v0.2)

- X east/west, Z north/south, Y height, one unit approximately one meter.
- Shared static world/collision definitions in shared/world.ts. One authoritative Town 001; two connections supported in this milestone, 20 lot locations reserved. Further matchmaking and 20-client capacity are future work.
- Node + TypeScript + ws (purpose-built authoritative WebSocket server) at 20 Hz; nearby state at 10 Hz. Input is normalized direction, never coordinates. Server owns speed, collision, permissions, slot and identity. Client renders ~100 ms behind on interpolation buffers.
- HttpOnly SameSite guest cookie; 256-bit token, SHA-256 hash stored atomically on server disk. Profile ID persists separately from temporary lot. Guest means this browser, not a linked cross-device account. No public chat.
- Reconnect reserves slot for 15 seconds by default. Only the current socket may act for an identity; a second tab replaces the previous connection. On release, player entity disappears. No fake online players.
- Online mode has no economy operations yet. Offline practice is explicitly separate and local, retaining serving, cats, upgrades and progress.
- Local HTTP/WS development; production needs trusted HTTPS/WSS termination, persistent private server storage and explicit allowed origins. Server refuses unsafe origin requests and insecure production configuration. A single server process is supported. The initial plan proposed PostgreSQL before economy. The v0.3 decision below supersedes that implementation choice; the identity JSON file is still not an economy database.

## Staged plan

1. **Completed in v0.2:** guest identity, two-client shared 3D town, authoritative movement/collision, interpolation, join/leave/reconnect, rate limits and functional browser tests.
2. Town expansion: automatic matchmaking, functional building entrances/interiors, owner/visitor permission matrix, camera and touch polish.
3. Durable café: transactional persistence (SQLite for the current single-server build; PostgreSQL remains a distributed-deployment option), schema migration and atomic/idempotent transactions, server-owned currency/inventory, orders/ingredients/customer lifecycle; retain offline progress separately until an explicit migration policy exists.
4. Cats: unique identities, ownership, needs/AI, adoption and CatBook with server simulation and interaction locks.
5. Life sim: MEOKEA, PawMart, homes, furniture/navigation, employees, quests and progression.
6. CrazyGames: verify current official SDK, lifecycle/ads, secure hosted backend, account-linking, performance and browser/device coverage.
7. Advanced genetics, breeding/consent, moderated social systems. Load tests progress 2→5→10→20 before any corresponding capacity claim.

## Acceptance and evidence

Run `npm test`, `npm run typecheck`, `npm run build`, `npm run test:online` and `npm run test:browser` (requires a Chromium installation; see README). Browser tests use two isolated cookie jars, actual WebSockets and two 3D canvases. Checks cover movement visible to the other client, offline/reconnect same identity/slot, duplicate-session replacement, mobile overflow and no JavaScript errors. Integration tests cover spoofed coordinates, rate limiting, origin checks, collision, stale inputs, reconnect expiration, session isolation and profile restart persistence. Results and limitations are recorded in docs/VALIDATION.md after running.

This milestone is not a complete café life sim or CrazyGames release. Reserved lots do not imply real online owners. The v0.2 milestone had no online commerce. V0.3 adds real café purchases/orders below; ads and functional town shops remain unimplemented.


## V0.3 — online café vertical slice

**Implemented and browser-tested:** server-generated walking routes to owned/neighbor café doors; interior/exit transitions; area-based visibility; owner-only business actions; visitor access settings; private independent balances, ingredients, stable café and cat IDs; black-coffee order preparation/delivery/payment; pet/feed actions; three cat slots; fixed decoration upgrades and supply purchases.

`server/game-store.ts` provides SQLite persistence through Node 24's built-in `node:sqlite`, with WAL, foreign keys, nonnegative checks, schema version protection, atomic operations and request-ID/fingerprint transaction records. The initial PostgreSQL-first proposal was deliberately revised to keep local Windows development self-contained. This supports one authoritative backend process. It does not implement distributed persistence or room coordination. A production scaling decision is still outstanding.

Guest identity remains in the existing JSON store. The game DB is a separate private file alongside it. No local browser economy is imported. Anonymous guest identities are not durable linked platform accounts.

Orders: WAITING → PREPARING (one bean consumed; four seconds) → READY → DRINKING (three seconds) → PAID. A unique server payment transaction credits the owner once. Each café has two customer places. Timeouts, closure, disconnection and process restart cancel/refund unfinished orders; no passive revenue accrues while inactive. Important transitions and financial mutations are persisted; client NPC walking is presentation along valid shared routes.

World collision now includes tables, chairs, the service counter, cat furniture and bowls. Staff approach points differ from customer seats. Automatic interactions walk through the navigation grid and validate actor ownership/location before committing. Movement input cancels a pending walking action. Town lots remain temporary; owned café IDs persist separately.

**Still partial:** café operations have one recipe and no staff/XP; cat care has fixed presentation and a happiness stat, not a complete needs/AI/genetics simulation; decorating has three fixed layouts, not free furniture placement. Shops, homes, quests, account linking, CrazyGames and 20-player support remain future work.

Next required development gates: richer cat states and profiles; café recipes/staff/progression; furniture ownership/build-mode navigation validation and real town shop interiors. Each needs independent acceptance tests before expanding matchmaking, capacity or deployment claims.
