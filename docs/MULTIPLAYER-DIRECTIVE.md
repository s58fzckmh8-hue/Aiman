# KAFE MIAW — ONLINE MULTIPLAYER MASTER DIRECTIVE

## 1. Fundamental Project Decision

Kafe Miaw is a **3D ONLINE MULTIPLAYER CAT CAFÉ AND LIFE SIMULATION GAME**.

Real-time multiplayer is the primary gameplay architecture, not an optional feature added after the single-player game is completed.

The game is designed for browser-based distribution, primarily through CrazyGames.

**All player-facing content must be 100% English.**

Preserve all existing design requirements from the previous Kafe Miaw Master Specification, including café management, cats, genetics, town architecture, furniture, shops, player homes, progression, economy, UI, advertisements and visual quality.

This directive replaces any previous requirement that treats multiplayer as a distant, optional expansion.

Do not, however, attempt to deliver a massive untested multiplayer game in one implementation step.

Build an authoritative, multiplayer-compatible foundation first, then expand its functionality in independently testable stages.

---

## 2. Multiplayer World Design

### Target World Capacity

- Maximum target: 20 concurrent real players per town instance.
- Each town contains 20 player café lots.
- Each connected player can occupy one assigned lot.
- Every player controls their own character.
- Each player owns independent persistent café, home, inventory, cats and currency.
- All connected players can see nearby players moving in real time.
- Player movement must be smoothly interpolated on remote clients.
- Town instances must support automatic creation when existing instances reach capacity.

The server must never report nonexistent users as real online players.

### Multiple Town Instances

Town 001: Up to 20 players.
Town 002: Up to 20 players.
Town 003: Up to 20 players.

Each instance is an independent real-time simulation.

A town instance is a temporary multiplayer session, not the permanent identity of a player's café.

Player-owned progress is stored independently from the temporary town instance.

### Lot Assignment

When a player joins:

1. Authenticate or initialize a valid guest session using a supported identity flow.
2. Load the player's existing profile.
3. Find an available compatible town instance.
4. Reserve an available property slot.
5. Load the player's café and home configuration into that slot.
6. Validate all loaded objects.
7. Spawn the player's character at an appropriate location.
8. Replicate the required state to nearby players.
9. Activate interaction permissions.
10. Confirm successful loading.

Do not permanently link the player's café to a temporary room slot number.

When the player leaves, their property configuration remains saved and can be instantiated again in a future town instance.

A temporarily disconnected player should have a short configurable reconnect grace period before the active room slot is released.

---

## 3. Multiplayer Technical Architecture

### Frontend

Use the existing Vite application.

Preserve working functionality.

Use the current 3D engine if suitable; otherwise evaluate Three.js for rendering.

The client handles:

- 3D rendering.
- Camera controls.
- Input collection.
- User interface.
- Client-side prediction where appropriate.
- Smooth remote-player interpolation.
- Animation.
- Audio.
- Visual feedback.
- Local presentation state.

### Backend

Recommended initial stack:

- Node.js.
- TypeScript.
- Colyseus for multiplayer rooms, or an equivalent suitable authoritative networking framework.
- PostgreSQL for durable player data.
- An appropriate persistence layer.
- Secure HTTPS and WSS deployment.

Redis may be introduced when needed for distributed presence, coordination and scaling. Do not add complex infrastructure without a real requirement.

### Authority Model

The server is authoritative for:

- Player ownership.
- Currency.
- Purchases.
- Inventory changes.
- Cat adoption.
- Cat genetics and breeding results.
- Furniture ownership.
- Café transactions.
- Order completion.
- Quest rewards.
- Employee hiring.
- Progression.
- Multiplayer permissions.
- Shared-world state transitions.

Clients may predict or animate permitted actions but cannot authoritatively award themselves currency or items.

Never trust client-submitted transaction results.

---

## 4. Real-Time Synchronization

### Player Movement

Each player must have:

- Unique session ID.
- Persistent player ID.
- Position.
- Rotation.
- Movement state.
- Current animation.
- Relevant appearance data.
- Current interaction target.

The client sends input or appropriately validated movement commands.

The server validates:

- Maximum speed.
- Movement boundaries.
- Collision constraints.
- Invalid teleportation.
- Movement permissions.

Remote clients interpolate received positions.

Movement must not visually snap excessively under normal network conditions.

### Network Simulation Targets

Start with configurable simulation rates.

For example:

- Server simulation: 20 updates per second.
- Player state replication: approximately 10–20 updates per second, adjusted to actual testing.
- Rendering: independent from network update rate.

Implement interpolation buffers, rate limits and visibility filtering.

Do not broadcast all environmental objects at full frequency.

Use interest management so clients only receive necessary updates for their current surroundings.

---

## 5. Shared Town Behavior

Players must be able to:

- See other real players.
- Walk around the same public streets.
- Visit MEOKEA.
- Visit PawMart.
- Visit the Adoption Centre.
- Enter their own café.
- Enter another player's café when permitted.
- Observe cats in the visited café.
- Interact with permitted public furniture.
- Participate in supported shared activities.

The town must contain genuine functional pathways.

Players cannot walk through walls, shops or other solid world geometry.

Doors must respect ownership and access permissions.

### Player Visibility

A player's character appears to nearby clients.

Players outside relevant areas should use distance-based visibility or other suitable interest management.

### Player Disconnect

When a player disconnects:

1. Stop accepting new commands from that session.
2. Mark the connection as interrupted.
3. Preserve the player's persistent state.
4. Hold their room slot for the allowed reconnect window.
5. Support secure reconnection.
6. Release the slot when the reconnect window expires.
7. Notify other players of departure when appropriate.

Avoid player duplication after reconnection.

---

## 6. Café Ownership and Permissions

Every café must have exactly one authoritative owner in the initial implementation.

Define permissions for:

- Owner.
- Visitor.
- Future invited helper.
- Server administrator.

### Owner Permissions

The owner may:

- Purchase furniture.
- Place and remove furniture.
- Upgrade equipment.
- Open and close the café.
- Manage employees.
- Adjust menus.
- Manage their cats.
- Access financial reports.
- Modify café settings.

### Visitor Permissions

Visitors may:

- Enter public areas.
- View café decorations.
- View publicly visible cats.
- Sit on available guest seats.
- Perform allowed social interactions.
- Participate in explicitly supported minigames.

Visitors must not:

- Spend the owner's currency.
- Sell the owner's items.
- Remove the owner's furniture.
- Adopt the owner's cats.
- Change the owner's prices.
- Manage the owner's employees.
- Modify restricted data.

Every sensitive action must be authorized server-side.

---

## 7. Multiplayer Cat Simulation

Each cat has one authoritative state in its active simulation environment.

Replicate:

- Cat identity.
- Position and orientation.
- Animation state.
- Current activity.
- Relevant visible appearance.
- Ownership information.
- Important interaction events.

Do not send unnecessary private or internal records to unrelated visitors.

### Cat AI

The authoritative simulation controls important state transitions.

Clients display smooth movement and animations.

Cats can:

- Walk.
- Sit.
- Sleep.
- Eat.
- Drink.
- Play.
- Approach their owner.
- Respond to permitted visitor interactions.

### Interaction Conflicts

If two players attempt to interact with the same cat:

- Validate the interaction permissions.
- Validate distance.
- Validate the cat's current state.
- Prevent conflicting exclusive interactions.
- Resolve simultaneous requests consistently.
- Inform players when an interaction is unavailable.

### Future Cross-Player Breeding

Both cat owners must explicitly agree.

The server validates:

- Cat ownership.
- Adult eligibility.
- Family relationships.
- Cooldowns.
- Health requirements.
- Capacity.
- Currency.
- Event uniqueness.

Only the server generates and saves offspring.

Every kitten must have a globally unique ID.

---

## 8. Multiplayer Café and Customer Simulation

Each café has independent operating state.

Customers belong to a specific café.

One café's customer orders must never enter another café's financial records.

### Café Authority

The server manages:

- Customer order creation.
- Valid station availability.
- Ingredient consumption.
- Staff assignments.
- Order processing.
- Payment.
- Currency rewards.
- Reputation changes.
- Business progression.

### Simulation Optimization

Do not simulate 20 full cafés at maximum NPC complexity continuously.

Use simulation tiers:

**Active Café:** Full simulation when the owner or visitors are present.

**Nearby Café:** Reduced frequency for nonessential updates.

**Inactive Café:** Safe persistence and simplified simulation, without displaying nonexistent real-time customers.

Use an explicit policy for partially completed orders when a café becomes inactive.

Do not pay players unlimited passive money merely because a server remains running.

---

## 9. Multiplayer Economy and Database

The database must store durable records for:

- Player profiles.
- Identities and linked platform accounts.
- Player currency.
- Transaction history.
- Café ownership and configuration.
- Furniture inventory and placement.
- Cats.
- Cat genetics and lineage.
- Adoption records.
- Employee records.
- Recipe unlocks.
- Quests.
- Achievements.
- Inventory.
- Progression.
- Relevant timestamps.

### Transaction Integrity

All purchases and rewards must be:

- Validated.
- Authorized.
- Atomic where necessary.
- Recorded.
- Idempotent.

Use unique transaction identifiers.

Use database transactions and appropriate consistency controls.

A duplicate network request must never produce duplicate coins, items, offspring or purchases.

### Account Safety

A temporary guest identity must not be described as a durable cross-device account.

Provide a supported account-linking path before promising cross-device restoration.

Use approved platform identity mechanisms where available and compatible.

---

## 10. Friends and Social Features

Plan for:

- Friends list.
- Online/offline presence.
- Join Friend functionality.
- Private room invitations.
- Public town matchmaking.
- Friend café visits.
- Player blocking and reporting.
- Safe social interaction.

Before launching text chat, design moderation, anti-abuse and privacy controls.

Do not implement unrestricted public chat by default.

Support suitable age-related safety policies and the requirements of the distribution platform.

---

## 11. CrazyGames Advertisement Integration

CrazyGames publishes the browser game.

The separate multiplayer backend operates the real-time game simulation.

The frontend must connect securely to the backend using supported cross-origin and WebSocket deployment configurations.

Advertisements must use the supported CrazyGames SDK.

### Multiplayer Advertising Behavior

When one player watches an advertisement:

- Pause or suspend only the relevant local interaction.
- Do not pause the entire town instance.
- Keep the player's server session alive where feasible.
- Prevent timed gameplay obligations from unfairly penalizing the player.
- Avoid disconnecting the user unnecessarily.
- Restore normal controls after the advertisement ends.

Rewarded ad completion must be processed safely.

Do not trust arbitrary client messages claiming ad completion.

Use platform-supported verification capabilities where available. Where no authoritative reward verification is provided, explicitly document the limitation and apply suitable risk controls rather than claiming fraud-proof rewards.

Never award the same reward twice for the same completed offer.

Never require players to watch advertisements to enter a town or interact with their cats.

---

## 12. Multiplayer UI

All UI must be in English.

### Main Menu

- Play Online
- Quick Join
- Join Friend
- Private Town
- My Café
- My Cats
- Settings
- How to Play

Only expose actions that are actually functional in the current build.

### Online HUD

Display:

- Current Town.
- Connected Players: X/20.
- Connection Status.
- Café Level.
- PawCoins.
- Cat Status.
- Quest Progress.
- Relevant Notifications.

### Network Status Messages

"Connecting to Town..."
"Finding an Available Town..."
"Loading Your Café..."
"Connected Successfully!"
"Connection Interrupted. Attempting to Reconnect..."
"Town Is Full."
"Unable to Join This Town."
"Connection Restored."
"Your Progress Has Been Saved."

Messages must represent real connection states.

---

## 13. Performance and Load Management

Target 20 real concurrent players per town after testing.

Each town may contain:

- 20 player avatars.
- Up to 20 active café properties.
- Multiple visible cats.
- Customer NPCs.
- Employee NPCs.
- Dynamic furniture.
- Public environment entities.

Implement:

- Area-of-interest replication.
- Entity update prioritization.
- Movement interpolation.
- Adaptive NPC simulation.
- Resource caching.
- Object pooling.
- Appropriate levels of detail.
- Occlusion and frustum culling where suitable.
- Network bandwidth monitoring.
- Server CPU profiling.
- Client frame-time profiling.

Avoid sending an entire café's furniture or inventory state repeatedly when nothing has changed.

### Load Testing

Test progressively:

2 players → 5 players → 10 players → 20 players.

Measure:

- Frame rate.
- Client memory.
- Server CPU and memory.
- Bandwidth.
- Latency.
- Packet/message rate.
- Reconnection behavior.
- Database performance.
- Entity synchronization errors.

Do not claim 20-player support until the relevant tests pass.

---

## 14. Development Order

### Stage 1 — Multiplayer Foundation

- Audit existing Vite project.
- Add backend structure.
- Establish server-authoritative shared game state.
- Implement safe player identity.
- Implement one multiplayer room.
- Connect two real browser clients.
- Synchronize player movement.
- Handle joining and leaving.
- Handle reconnection.
- Confirm basic stability.

### Stage 2 — Shared Town

- Town scene.
- Navigation.
- Player avatars.
- Property slots.
- Room matchmaking.
- Multiple real players.
- Building entrances.
- Ownership permissions.

### Stage 3 — Persistent Café

- Player-owned café data.
- Persistent furniture.
- Café loading.
- Customer management.
- Orders.
- Currency.
- Secure purchases.
- Server-authoritative transactions.

### Stage 4 — Online Cat System

- Persistent cat ownership.
- Cat AI.
- Network synchronization.
- Cat interaction permissions.
- Adoption.
- CatBook.

### Stage 5 — Complete Life Simulation

- MEOKEA.
- PawMart.
- Veterinary Clinic.
- Home decoration.
- Employees.
- Quests.
- Progression.
- Shared activities.

### Stage 6 — Monetization and Polish

- CrazyGames SDK.
- Advertisement lifecycle.
- Reward logic.
- Responsive interface.
- Audio.
- Animation polish.
- Asset optimization.
- Browser testing.

### Stage 7 — Advanced Systems

- Genetics.
- Breeding.
- Friends.
- Invitations.
- Advanced player visits.
- Social features with appropriate safety controls.

---

## 15. Absolute Quality Requirements

Never simulate fake online players and label them as real players.

Never use browser localStorage as the authoritative online currency database.

Never let one player modify another player's café without permission.

Never duplicate cats when a player reconnects.

Never lose persistent property ownership when a town instance closes.

Never teleport remote players continuously instead of using proper network interpolation.

Never allow invalid transactions caused by lag, refreshes or repeated clicks.

Never implement decorative buttons that appear functional but do nothing.

Never show fake advertisement earnings.

Never implement critical multiplayer state solely on the client.

Never start advertising the game as stable 20-player multiplayer before actual load testing.

## Immediate Instruction

Inspect the existing Kafe Miaw repository.

Preserve all existing working functionality.

Develop an implementation plan for converting the project to an authoritative online multiplayer architecture.

Then implement the first milestone: **two real browser clients connected to the same authoritative multiplayer town, able to see each other move, disconnect and reconnect correctly.**

Verify the result before expanding to the 20-player target.

**KAFE MIAW IS AN ONLINE MULTIPLAYER GAME FIRST, WITH A COZY LIVING WORLD, REAL CAFÉ OPERATIONS, PERSISTENT PLAYER PROPERTIES AND HIGH-QUALITY CAT SIMULATION.**
