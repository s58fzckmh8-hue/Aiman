# KAFE MIAW
## ULTIMATE GAME DEVELOPMENT MASTER SPECIFICATION
**Project:** Kafe Miaw
**Version:** Master Design Specification 1.0
**Game Language:** 100% English
**Genre:** Cozy 3D Cat Café Tycoon, Life Simulation, Building and Management
**Primary Platform:** Web Browser / CrazyGames
**Future Platforms:** Android, iOS, other compatible web portals
**Development Environment:** Existing Vite project, JavaScript or TypeScript, Three.js where appropriate
**Primary Objective:** Build a genuinely playable, highly polished, commercially viable browser game with logical interconnected systems and long-term progression.

---

# 1. YOUR ROLE AND ABSOLUTE INSTRUCTIONS

You are acting as an experienced AAA game systems architect, senior gameplay engineer, technical artist, UI/UX designer, economy designer, simulation programmer, quality assurance engineer, and browser-game optimization specialist.

Your task is to transform the existing Kafe Miaw project into a complete and exceptionally polished game.

Do not deliver a static mockup, disconnected prototype, fake simulation, or collection of decorative buttons.

Every system must work as described. Every visible action must have a meaningful consequence. Every object must possess the appropriate physical, visual, economic, interactive and gameplay properties.

## Non-negotiable development rules

1. The entire player-facing game must use natural, professional English.
2. Preserve the Kafe Miaw name and existing branded names.
3. Audit the existing project before making changes.
4. Preserve functional systems unless replacing them with demonstrably better implementations.
5. Never silently remove existing functionality.
6. Avoid unnecessary changes to the working build configuration.
7. Use modular architecture rather than placing the entire game into one massive file.
8. Never use fake buttons that merely display "Coming Soon" for features described as completed.
9. Never show fabricated player statistics, revenue, transactions or multiplayer users.
10. Do not claim a feature is functional without testing it.
11. Prevent duplication bugs, negative balances, corrupted saves and irreversible state inconsistencies.
12. Optimize performance for desktop and mobile browsers.
13. Design systems to support future expansion without major rewrites.
14. Use original or appropriately licensed assets.
15. Never assume a backend exists when it has not been configured.
16. Never pretend to implement online multiplayer using local NPCs.
17. Never use unverified ad callbacks to grant rewards.
18. Every interactive element must support the appropriate loading, success, unavailable and failure states.
19. The game must remain playable without optional advertisements.
20. Prioritize a fully working game over unnecessary visual complexity.

## First assignment: Repository audit

Before modifying code:

- Examine package.json, package-lock.json and all existing source folders.
- Identify the current game engine, rendering implementation and application lifecycle.
- Locate existing save systems, gameplay mechanics, UI components, assets and configuration.
- Determine which systems already work, which are incomplete and which are missing.
- Locate broken imports, unused components, duplicated state and inefficient rendering.
- Identify whether existing code supports desktop and mobile interactions.
- Examine the current Vite build configuration.
- Inspect licensing information for existing assets.
- Create a baseline audit report.
- Create a safe implementation plan.
- Preserve the existing project and use version control checkpoints.

Do not rebuild the project from scratch unless the existing architecture genuinely prevents the required implementation. Explain and justify major architectural replacements.

---

# 2. GAME IDENTITY AND DESIGN PHILOSOPHY

## Game overview

Kafe Miaw is a cozy but strategically deep cat café simulation game set in a lively miniature town.

Players begin as the owner of a small, modest café with limited furniture, a starter cat and minimal funds.

They gradually transform their property into a highly successful café, adopt and raise cats, decorate their home, unlock recipes, hire employees, interact with townspeople, manage resources and develop their reputation.

The world should feel alive even when the player is not actively clicking.

Customers move with purpose. Cats behave naturally. Workers fulfill actual tasks. Shops have inventories. Objects occupy real spaces. The economy behaves consistently.

## Core experience pillars

**A. Ownership:** Players feel genuine ownership of their café, house, furniture and cats.

**B. Living simulation:** NPCs, employees and cats interact naturally with the environment.

**C. Meaningful progression:** Money, upgrades, achievements and unlocks lead to visible improvement.

**D. Creativity:** Players can personalize their café and surroundings.

**E. Emotional attachment:** Cats develop personalities and relationships with their owners.

**F. Accessibility:** Easy to understand within the first 30 seconds, but sufficiently deep for longer sessions.

**G. Replayability:** Varied customers, events, unlocks, quests and decorating possibilities.

**H. Commercial sustainability:** Good retention, optional advertisements and responsible monetization.

## Desired art direction

- Stylized 3D with a soft, warm, cozy aesthetic.
- Rounded shapes with believable proportions.
- Detailed environments without photorealistic complexity.
- Pleasant color harmony.
- Soft shadows and warm indirect lighting.
- High-quality textures without unnecessary large downloads.
- Expressive character and cat animations.
- Carefully designed silhouettes.
- Clear spatial separation between interactive objects.
- Attractive but readable user interfaces.
- Smooth transitions without excessive animation.
- A visually recognizable identity distinct from generic tycoon templates.

Use an aesthetically coherent environment with warm cream, soft caramel, muted brown, natural green, dusty rose and selected pastel accents.

Avoid overly saturated rainbow environments, excessively bright UI, giant text labels, flat empty spaces and inconsistent asset styles.

---

# 3. CAMERA, VIEWPORT AND PLAYER CONTROLS

## Camera model

Use a hybrid isometric 3D camera.

Default camera settings:

- Perspective camera with a comfortable field of view of approximately 45 degrees.
- Initial camera pitch around 40–50 degrees.
- Isometric-style presentation with true 3D perspective.
- Camera focus follows the selected gameplay target when appropriate.
- Allow zoom within configured limits.
- Support controlled camera rotation.
- Prevent clipping into roofs, walls or objects.
- Apply smooth interpolation for camera movement.
- Avoid abrupt jumps during normal camera transitions.

Camera presets:

1. Town View
2. Café Interior View
3. Home Interior View
4. Cat Interaction View
5. Build Mode View
6. Customer Observation View

Each preset should smoothly transition to the correct position and target.

## Desktop controls

- Left mouse click: select and interact.
- Left mouse drag: select, reposition or manipulate an object in build mode.
- Right mouse drag: rotate camera where appropriate.
- Mouse wheel: zoom.
- WASD: camera or character movement depending on the selected control mode.
- Q / E: rotate the camera or a selected object, depending on context.
- Escape: close the current modal or open the pause menu.
- Tab: toggle relevant gameplay panels.
- M: open town map.
- I: open inventory.
- C: open cat management.
- B: toggle build mode.
- Space: pause gameplay when supported.

Context-specific controls must take priority without producing conflicts.

## Mobile controls

- Single tap: select.
- Double tap: focus or perform a context-appropriate action.
- One-finger drag: pan camera.
- Two-finger pinch: zoom.
- Two-finger rotate: rotate camera when supported.
- Tap-and-hold: pick up or manipulate furniture.
- Large, accessible tap targets.
- No hover-only essential interactions.
- No keyboard dependency.

Provide a touch-friendly control tutorial.

## Camera safety

The camera must never:

- Pass underneath the map.
- Lose its active target.
- Rotate upside down.
- Move outside valid world bounds.
- Become trapped inside a building.
- Obscure essential dialogue permanently.
- Produce uncontrolled zoom after opening menus.

Provide a Reset Camera action.

---

# 4. WORLD STRUCTURE AND COORDINATE SYSTEM

The world must be designed with consistent spatial measurements, reliable collision geometry, navigation networks and meaningful architectural layouts.

## World coordinate standard

Use a clearly documented coordinate system:

- X: east/west horizontal axis.
- Z: north/south horizontal axis.
- Y: vertical height.
- Ground level: Y = 0.
- One world unit approximately equals one meter for gameplay planning.

All building positions, collision shapes, interaction points, camera targets and navigation coordinates must follow the same coordinate system.

Never mix coordinate conventions between systems.

## Town concept

Create a compact, attractive and walkable neighborhood.

Initial target footprint: approximately 200 × 160 world units, adjustable after playtesting and asset measurements.

This is a planning target, not permission to stretch poorly scaled assets.

The town should include:

- Central plaza.
- A main boulevard.
- Pedestrian sidewalks.
- A neighborhood park.
- Player café properties.
- Player residential properties.
- Furniture stores.
- Pet supplies store.
- Adoption center.
- Veterinary clinic.
- Boutique.
- Registry building.
- Decorative street amenities.
- Ambient NPC activity.

No location should exist merely as an oversized decorative empty area.

## Main boulevard

- A central traversable road.
- Sidewalks on both sides.
- Marked pedestrian crossings at logical locations.
- Streetlights facing the sidewalks.
- Benches positioned away from walking paths.
- Trees and planters that do not block doors.
- Logical connection points between public buildings.
- Road edges and intersections aligned precisely.

Where vehicles exist, keep vehicle lanes separated from pedestrians.

Never place cars, furniture or decorative objects in the middle of walkable routes unless intentional.

## Initial player lots

The overall town design should reserve 20 potential player properties.

Use 10 properties along one side of the main boulevard and 10 properties along the opposite side.

The initial release does not need 20 online players.

For single-player mode:

- One property is owned by the player.
- Other properties may appear as neighboring NPC cafés or non-interactive facades where justified.
- Their appearance should contribute to the atmosphere.
- Do not fabricate online ownership.
- Do not show false player counts.

Future multiplayer:

- Each property can be assigned a server-authoritative owner.
- Ownership persists across sessions.
- Each player has clearly defined property access permissions.
- Visitors can only interact with objects according to those permissions.

## Building orientation rules

Every building must have:

- A defined front side.
- A front entrance.
- An accessible approach path.
- A collision boundary.
- An interior or an appropriate transition.
- An interaction trigger.
- A camera focus point.
- A designated signage location.
- A safe NPC spawn point where required.

Buildings on opposite sides of the boulevard must face towards the street rather than face away from it.

Door orientation and camera transitions must respect actual building rotation.

## Suggested initial district arrangement

**Northwest:** Player Café + Home
**Northeast:** MEOKEA Furniture
**Southwest:** Cat Park + Garden
**Southeast:** Central Plaza
**West Commercial Zone:** Adoption Centre + Paw Registry
**East Commercial Zone:** PawMart + Veterinary Clinic
**Secondary District:** PURRÉ Boutique + future expansion buildings

The final position of each building must be adjusted to fit real asset dimensions and preserve navigable paths.

---

# 5. BUILDING ARCHITECTURE AND INTERIORS

Every major building must have a purposeful interior.

Do not create an external model with a floating UI pretending that the interior is functional.

## Exterior building requirements

- Building footprint follows architectural scale.
- Doors visibly connect to walkable ground.
- Stairs and ramps align with the terrain.
- Windows do not float outside walls.
- Roofs align with supporting structures.
- Signage is legible.
- Entrance decorations do not obstruct access.
- Shadow direction remains consistent.
- Windows and doors have sensible dimensions.

## Interior transitions

When a player enters a building:

1. Validate the interaction.
2. Identify the target building.
3. Check whether access is permitted.
4. Save the previous camera and player context.
5. Begin a brief transition.
6. Load or reveal the correct interior.
7. Spawn the player at the entrance marker.
8. Set the correct camera preset.
9. Update the building-specific UI.
10. Confirm the interior is fully available.

When exiting, restore the appropriate town position and camera settings.

If the interior fails to load, recover safely without teleporting the player into empty space.

## Door behavior

A door should:

- Detect interaction within a reasonable distance.
- Open in a believable direction.
- Avoid rotating through walls.
- Play an appropriate animation and sound.
- Allow NPCs through when unlocked.
- Close after passage if designed to do so.
- Never close directly through an occupied character.
- Support locked and unlocked states where necessary.

Doors must have interaction prompts such as:

"Enter Café"
"Enter Home"
"Shop at MEOKEA"
"Visit Adoption Centre"

---

# 6. PLAYER CHARACTER SYSTEM

The player should feel physically present in the world rather than function as an invisible mouse cursor.

## Character creation

Initial customization:

- Body preset.
- Skin tone.
- Hair style.
- Hair color.
- Outfit.
- Shoes.
- Accessories.
- Display name.

All character customization options must use appropriately licensed assets.

## Character movement

Create a proper character controller with:

- Idle.
- Walking.
- Running where appropriate.
- Turning.
- Interacting.
- Picking up small objects.
- Petting cats.
- Carrying food.
- Serving customers.
- Sitting.
- Using furniture.

Character animations should transition smoothly.

The character cannot:

- Walk through closed doors.
- Pass through walls.
- Walk across occupied furniture footprints.
- Walk through restricted counters.
- Teleport during normal navigation.
- Interact with distant objects without moving within range.

## Interaction system

Every interactable object defines:

- Unique object ID.
- Interaction type.
- Interaction range.
- Required conditions.
- Available actions.
- Animation.
- Resulting game-state change.
- Error condition.
- Cooldown if applicable.

Clicking an unavailable interaction should explain the actual reason.

Example:

"The coffee machine is currently being used."

Not:

"Error."

---

# 7. CAFÉ ARCHITECTURE — COMPLETE INTERIOR LAYOUT

The café is the central gameplay location.

## Initial café floor plan

Suggested initial usable space: approximately 12 × 10 world units.

Divide the café into functional zones:

1. Entrance and greeting zone.
2. Customer waiting area.
3. Dining and seating area.
4. Ordering counter.
5. Beverage preparation station.
6. Food preparation station.
7. Storage area.
8. Cat interaction zone.
9. Staff movement corridor.
10. Decoration and expansion space.

## Entrance zone

Position the entrance on the front wall.

Requirements:

- Clear walking access.
- No mandatory furniture placed in front of the doorway.
- A visible entrance mat.
- Customer arrival trigger.
- Optional welcome sign.
- A defined queue origin.
- Adequate room for customers to enter and exit.

## Ordering counter

Place the counter where arriving customers can access it without walking through staff-only areas.

The counter must have:

- A customer-facing interaction point.
- A staff-facing interaction point.
- A service surface.
- A clear queue direction.
- A cash register or ordering terminal.
- A transaction workflow.

The customer and employee cannot occupy exactly the same interaction coordinate.

## Kitchen and preparation

Separate preparation stations:

- Coffee machine.
- Tea station.
- Blender or beverage equipment.
- Food preparation counter.
- Refrigerator.
- Ingredient storage.
- Sink.
- Waste bin.

Each station requires:

- Occupied and available states.
- A staff approach point.
- Processing duration.
- Required ingredients.
- Valid output products.
- Equipment condition.
- Optional upgrades.
- Animation and sound effects.

## Dining zone

Initially provide:

- Two usable tables.
- Four usable chairs.
- Clear pathways.
- At least one decoration area.
- Space for expansion.

Each chair needs a valid sitting position and facing direction.

Each table needs valid chair attachment points.

A table without an accessible chair must not be treated as a fully usable dining table.

## Cat zone

Include:

- Cat beds.
- Scratching post.
- Water bowl.
- Food bowl.
- Toys.
- Cat tree.
- Quiet resting area.

The cat zone should be visually connected to the café but separated from active food preparation surfaces.

Cats should not wander across food preparation counters.

---

# 8. CUSTOMER SIMULATION AND NPC BEHAVIOR

Customers are autonomous actors with intentions, needs and state-based behavior.

## Customer lifecycle

Implement the following state machine:

SPAWNING
→ APPROACHING_CAFE
→ ENTERING
→ CHOOSING_SERVICE
→ QUEUING or FINDING_SEAT
→ ORDERING
→ WAITING_FOR_PREPARATION
→ WAITING_FOR_SERVICE
→ EATING_OR_DRINKING
→ PAYING
→ RATING_EXPERIENCE
→ LEAVING
→ DESPAWNED

Allow alternate states:

CANCELLED
ANGRY
BLOCKED
NO_AVAILABLE_SEATS
STOCK_UNAVAILABLE
SERVICE_FAILED

Each state transition must occur only when its conditions are satisfied.

## Customer spawning

Customer spawning depends on:

- Café opening status.
- Café reputation.
- Current game time.
- Seating capacity.
- Staffing level.
- Event modifiers.
- Existing customer population.
- Maximum NPC limit.

Do not generate unlimited customers.

Do not spawn customers inside walls, tables or other NPCs.

Spawn customers at dedicated valid entrance points.

## Customer personalities

Examples:

**Patient Customer**
- Higher waiting tolerance.
- Standard spending behavior.

**Busy Customer**
- Lower waiting tolerance.
- Prefers quick orders.

**Cat Lover**
- Enjoys cat interaction.
- More likely to give a positive rating when cat welfare is good.

**Food Enthusiast**
- Evaluates food quality strongly.

**Regular Customer**
- Remembers previous visits and can have preferred orders.

**VIP Customer**
- Arrives less frequently.
- Higher potential reward.
- More demanding experience requirements.

## Customer decision-making

A customer must evaluate:

- Whether the café is open.
- Whether space is available.
- Whether the queue is acceptable.
- Whether required items are available.
- Whether service is functioning.

When the café is full, the customer may queue or leave according to their patience.

Customers must not sit on nonexistent chairs.

A customer must not order food from a disabled menu item.

A customer should not be charged twice for the same order.

## Customer satisfaction

Calculate satisfaction using weighted factors:

- Waiting time.
- Order accuracy.
- Food quality.
- Café cleanliness.
- Environment comfort.
- Cat interaction.
- Staff efficiency.

Normalize the final rating to a clearly defined scale.

Never allow a rating greater than the maximum or less than the minimum.

Provide understandable visual feedback:

"Excellent Service!"
"Order Took Too Long"
"Lovely Atmosphere!"
"Customers Want More Seating"

---

# 9. ORDER MANAGEMENT AND TRANSACTIONS

An order must be a real data object.

## Order data

Each order should contain:

- Order ID.
- Customer ID.
- Café ID.
- Menu item IDs.
- Quantity.
- Item prices.
- Total price.
- Required ingredients.
- Status.
- Creation timestamp.
- Assigned staff ID.
- Preparation station ID.
- Completion timestamp.
- Delivery timestamp.
- Payment status.
- Failure reason where applicable.

## Order status

CREATED
VALIDATED
QUEUED
PREPARING
READY
SERVING
DELIVERED
PAID
COMPLETED

Alternative terminal states:

CANCELLED
FAILED
REFUNDED where applicable

No order may jump from CREATED directly to COMPLETED without the required gameplay process.

## Example: Cappuccino

A customer orders one cappuccino.

The system must:

1. Confirm the café is open.
2. Confirm the drink is unlocked and available.
3. Check whether sufficient ingredients exist.
4. Create an order with a unique ID.
5. Reserve ingredients or validate their availability through a consistent stock policy.
6. Assign an available qualified worker.
7. Check that the coffee station is accessible.
8. Move the worker to the station.
9. Begin preparation animation.
10. Deduct or commit ingredients exactly once.
11. Complete preparation after the appropriate duration.
12. Create the prepared item.
13. Mark the order READY.
14. Assign delivery to an available worker.
15. Navigate to the correct customer.
16. Complete delivery.
17. Allow the customer to consume the product.
18. Process the payment according to the chosen order/payment model.
19. Credit the café balance exactly once.
20. Record the transaction.
21. Update XP and customer satisfaction.
22. Remove the completed order from the active queue.
23. Preserve an appropriate transaction record.

Handle failures such as:

- Ingredients become unavailable.
- The worker becomes unavailable.
- The customer leaves.
- The machine becomes unusable.
- The path is blocked.
- An animation is interrupted.
- The game is saved halfway through preparation.

A failed order must not silently generate profit.

---

# 10. RECIPE, INVENTORY AND INGREDIENT SYSTEM

## Recipe structure

Every recipe defines:

- Recipe ID.
- Display name.
- Category.
- Required ingredients.
- Quantity per ingredient.
- Equipment requirement.
- Preparation duration.
- Base selling price.
- Food quality modifier.
- Unlock condition.
- XP reward.
- Visual asset.
- Audio asset.

Example starter recipes:

| Recipe | Preparation | Unlock |
|---|---|---|
| Black Coffee | Coffee Machine | Starter |
| Milk Tea | Tea Station | Starter |
| Butter Toast | Food Counter | Starter |
| Cappuccino | Coffee Machine | Level 3 |
| Strawberry Smoothie | Blender | Level 5 |
| Chocolate Muffin | Baking Station | Level 7 |
| Cat Paw Pancakes | Cooking Station | Level 10 |

Values must be defined centrally for future balancing.

## Inventory requirements

For every item:

- Unique item ID.
- Item type.
- Quantity.
- Maximum stack size.
- Acquisition source.
- Purchase price.
- Selling value.
- Storage location.
- Expiration rules if applicable.
- Ownership.
- Usage restrictions.

Stock cannot drop below zero.

Inventory cannot exceed capacity without a defined overflow policy.

Items must not duplicate during:

- Moving.
- Selling.
- Storing.
- Loading saves.
- Interrupted purchases.
- Rapid button clicking.
- Changing scenes.

## Stock shortage

If milk is unavailable:

- Recipes requiring milk become unavailable.
- Customers cannot successfully order unavailable recipes.
- The player receives a clear notification.
- The restocking UI identifies the missing resource.
- Already accepted orders follow a consistent reservation/refund policy.

Example:

"Out of Milk — Restock at PawMart."

---

# 11. EMPLOYEE MANAGEMENT SYSTEM

Employees must function as autonomous workers with real jobs.

## Employee roles

**Cashier**
- Takes and processes orders.
- Manages the counter.
- Handles valid transactions.

**Barista**
- Prepares beverages.
- Uses coffee and tea equipment.

**Chef**
- Prepares food.
- Uses appropriate kitchen stations.

**Waiter**
- Delivers orders.
- Clears used tables.

**Cleaner**
- Cleans floors and tables.
- Maintains cleanliness.

**Manager**
- Provides advanced efficiency modifiers.
- Becomes available in later progression.

## Employee attributes

- Employee ID.
- Display name.
- Role.
- Skill level.
- Movement speed.
- Task efficiency.
- Wage.
- Current state.
- Assigned workstation.
- Scheduled shift.
- Current task ID.
- Stamina or fatigue, if enabled.

## Employee states

IDLE
SEEKING_TASK
MOVING_TO_TASK
WORKING
WAITING
BREAK
BLOCKED
OFF_DUTY

## Task priority

Use a configurable priority scheduler.

Example:

1. Deliver prepared items before quality deteriorates.
2. Resolve time-sensitive accepted orders.
3. Serve waiting customers.
4. Prepare queued orders.
5. Clean occupied service areas.
6. Perform background maintenance.

Avoid assigning the same task to multiple workers unless explicitly supported.

Workers must not receive wages for nonexistent work cycles.

Workers must not teleport to perform tasks.

If navigation fails, retry intelligently and then report an actionable failure.

---

# 12. COMPLETE CAT OWNERSHIP SYSTEM

Cats are the emotional centerpiece of Kafe Miaw.

They are not decorative models moving randomly.

## Cat profile

Each cat must have:

- Unique Cat ID.
- Name.
- Breed.
- Sex.
- Age category.
- Date of adoption or birth.
- Parent IDs where relevant.
- Genetic profile.
- Coat color.
- Coat pattern.
- Eye color.
- Personality.
- Hunger.
- Thirst.
- Energy.
- Hygiene.
- Happiness.
- Health.
- Bond level.
- Experience.
- Current location.
- Current activity.
- Ownership record.
- Relevant cooldowns.
- Animation state.

## Starting cats

The player begins with one starter cat.

The player receives three total cat slots initially.

Extra cats require available capacity.

Adopting a cat when all slots are full must show a clear explanation.

Example:

"Your Cat Home Is Full. Upgrade Your Cat Capacity to Adopt More Cats."

No payment or currency deduction should occur until the action can be completed.

## Initial cat breeds

Include visually distinct examples:

- Domestic Shorthair.
- British Shorthair.
- Ragdoll.
- Siamese.
- Persian.
- Maine Coon.
- Scottish Fold-inspired fictional variants only if animal welfare considerations are addressed.
- Bengal.
- Russian Blue.
- Orange Tabby coat variation.

Breed and coat pattern must be separate properties.

An orange tabby is a coat pattern rather than a distinct pedigree breed.

## Cat needs

Represent needs on a normalized scale from 0 to 100.

Hunger:
- Decreases over time.
- Increases after eating.

Thirst:
- Decreases over time.
- Increases after drinking.

Energy:
- Decreases during active play.
- Increases during rest.

Hygiene:
- Decreases through normal activities.
- Increases through care.

Happiness:
- Changes according to care, environment and play.

Health:
- Depends on long-term care and valid game events.

Cats must not suddenly die because a player leaves the browser closed.

Use a gentle, non-punitive care system.

## Cat AI states

IDLE
WANDERING
EXPLORING
SEEKING_FOOD
EATING
SEEKING_WATER
DRINKING
PLAYING
RESTING
SLEEPING
GROOMING
SEEKING_OWNER
RECEIVING_AFFECTION
USING_CAT_TREE
INTERACTING_WITH_CUSTOMER
HIDING
BLOCKED

## Behavioral logic

A hungry cat should prefer seeking food.

A tired cat should prefer finding a suitable resting area.

A playful cat should select available toys more frequently.

A shy cat should avoid overly crowded areas.

An affectionate cat should approach its owner when conditions are suitable.

A sleeping cat should not simultaneously play, walk or eat.

A cat must not access restricted surfaces or travel through walls.

## Cat animations

- Idle breathing.
- Sitting.
- Walking.
- Trotting.
- Sleeping.
- Stretching.
- Scratching.
- Grooming.
- Eating.
- Drinking.
- Playing.
- Tail movement.
- Ear movement.
- Blinking.
- Purring reaction.
- Petting reaction.
- Jumping onto valid furniture.

Provide appropriate transition animations.

Never play incompatible animations simultaneously.

## Bond system

Bond XP increases through:

- Feeding.
- Petting.
- Playing.
- Completing care activities.
- Spending time together.

Bond level unlocks:

- Additional animations.
- Unique affectionate interactions.
- Cosmetic badges.
- Cat profile decorations.
- Selected gameplay bonuses.

Bond rewards should emphasize attachment and personalization instead of forcing constant maintenance.

---

# 13. CAT GENETICS, BREEDING AND FAMILY RECORDS

Breeding is an advanced progression feature, not a required monetization feature.

## Eligibility checks

Before a breeding attempt:

- Both cats must exist.
- Both cats must have valid ownership or consent permissions.
- Both must be adults.
- They must satisfy health and welfare requirements.
- Neither may be within an active breeding cooldown.
- There must be adequate kitten capacity.
- Close family relationships must be checked and prohibited according to the game's defined rules.
- Any breeding cost must be affordable.
- The action must be confirmed.

## Genetics model

Represent inherited appearance with configurable trait definitions.

Potential traits:

- Fur color.
- Fur pattern.
- Fur length.
- Eye color.
- Ear shape.
- Body shape.
- Size.
- Rare cosmetic markings.

Use a simplified, internally consistent Mendelian-inspired system with documented probabilities.

Do not claim that the simplified game genetics are scientifically exact.

## Breeding transaction

1. Validate both parents.
2. Check eligibility.
3. Confirm available kitten slots.
4. Display the breeding cost and possible outcome category.
5. Receive confirmation.
6. Reserve the required resources.
7. Generate a deterministic breeding event record.
8. Commit the transaction once.
9. Start the breeding timer.
10. Save the event.
11. Produce offspring when the event completes.
12. Generate unique offspring IDs.
13. Record parent IDs.
14. Apply the correct cooldown.
15. Update CatBook.
16. Show a completion notification.

If the game closes during the event, the process must resume consistently.

## CatBook

Implement a comprehensive cat collection interface.

Fields:

- Cat portrait.
- Name.
- Unique ID.
- Breed.
- Genetics.
- Age.
- Gender.
- Parent records.
- Generation.
- Bond level.
- Achievements.
- Collection status.
- Family tree.
- Ownership history where relevant.

If siblings inherit similar appearances, their unique IDs and family records must remain separate.

## Future cross-player breeding

Online cross-player breeding must use a secure backend with explicit permission from both owners.

Do not implement this as fake local multiplayer.

Prevent:

- Duplicate offspring.
- Ownership theft.
- Unauthorized breeding.
- Repeated transaction requests.
- Expired invitation reuse.
- Client-authoritative currency or genetics manipulation.

---

# 14. HOME OWNERSHIP AND INTERIOR DECORATION

The player owns a personal residential space in addition to the café.

## Home areas

- Living room.
- Bedroom.
- Cat resting area.
- Furniture storage.
- Decoration area.
- Optional future garden expansion.

## Home interactions

The player may:

- Enter and exit.
- Place furniture.
- Rearrange furniture.
- Select wallpaper.
- Change flooring.
- Manage cat beds.
- Interact with cats.
- Sit and rest.
- Inspect decorations.
- Save preferred layouts.

Home customization must persist after closing and reopening the game.

## Interior safety

Furniture must not:

- Block mandatory exits.
- Overlap structural walls.
- Float unsupported.
- Intersect other furniture illegally.
- Obstruct required navigation corridors.
- Prevent the player from reaching essential objects.

---

# 15. MEOKEA FURNITURE SYSTEM

MEOKEA is the primary furniture and interior design store.

## Store departments

- Tables.
- Chairs.
- Countertops.
- Shelving.
- Cabinets.
- Lighting.
- Wall decorations.
- Floor decorations.
- Cat furniture.
- Beds and sofas.
- Kitchen equipment.
- Decorative plants.
- Premium cosmetic collections.

## Product card

Every product card includes:

- Preview image.
- Product name.
- Price.
- Category.
- Description.
- Dimensions.
- Placement requirements.
- Ownership status.
- Quantity owned.
- Purchase button.
- Optional preview function.

## Buying flow

1. Player opens MEOKEA.
2. Selects an item.
3. Reviews details.
4. Confirms sufficient currency.
5. Chooses quantity.
6. Confirms purchase.
7. Currency decreases exactly once.
8. Item enters inventory.
9. Purchase history updates.
10. The UI displays a success confirmation.

If inventory is full or the player has insufficient funds, the transaction must not proceed.

## Build mode

Support:

- Selecting furniture.
- Previewing placement.
- Moving furniture.
- Rotating furniture.
- Confirming placement.
- Cancelling placement.
- Storing furniture.
- Selling permitted furniture.
- Removing decorations.
- Editing walls and flooring where allowed.

Use logical object dimensions and collision footprints.

Display:

Green placement preview = valid.

Red placement preview = invalid.

Optional yellow preview = warning or restricted placement.

Rotation must also rotate the object's collision footprint and interaction points.

## Object placement rules

For each object:

- Validate ownership.
- Validate zone.
- Validate footprint.
- Validate rotation.
- Validate surface support.
- Validate collision.
- Validate navmesh accessibility.
- Validate entrance clearance.
- Validate important interaction points.
- Commit only after successful validation.

Do not deduct currency again when repositioning an already owned object.

---

# 16. OTHER TOWN SHOPS AND FACILITIES

## PawMart

Purpose: Pet supplies and café ingredients.

Departments:

- Cat food.
- Cat treats.
- Toys.
- Cat care products.
- Ingredient supplies.
- Limited seasonal products.

PawMart items must update the correct inventory type.

## Adoption Centre

Features:

- Available cats.
- Breed information.
- Appearance preview.
- Personality preview.
- Adoption requirements.
- Adoption costs.
- Slot availability checks.

A cat must not be adopted twice through repeated clicking.

## Veterinary Clinic

Features:

- Cat health checkups.
- Welfare status.
- Recovery interactions.
- Care guidance.
- Health-related events.
- Relevant service fees.

Health systems must remain cozy and not become overly punishing.

## Paw Registry

Features:

- CatBook records.
- Family tree.
- Breeding records.
- Collection achievements.
- Official fictional cat certificates.

## PURRÉ Boutique

Features:

- Cat accessories.
- Player outfits.
- Seasonal cosmetic collections.
- Decorative wearable items.

Cosmetics should generally not create unfair competitive advantages.

## Car Dealer — future optional expansion

The original town concept includes vehicles and a car dealer.

Vehicles should only become interactable after the movement system, roads and town scale genuinely justify driving.

Do not prioritize vehicle ownership over the core café and cat simulation.

---

# 17. ECONOMY AND BALANCING

The game must have a coherent economy with understandable sources and spending opportunities.

## Currencies

**PawCoins**
- Primary earnable currency.
- Earned by operating the café and completing gameplay tasks.
- Used for ingredients, furniture, equipment, cats and upgrades.

**Gems**
- Optional secondary currency.
- Primarily for cosmetic content or special rewards.
- Must not imply a real-money purchase feature before approved payment integration exists.

**Café XP**
- Determines player progression.
- Unlocks equipment, recipes and expansion opportunities.

**Cat XP**
- Reflects individual cat progression.

## Suggested starting state

- PawCoins: 1,500.
- Gems: 0.
- Café Level: 1.
- Café Reputation: 1 star.
- One starter cat.
- Three maximum cat slots.
- Two customer tables.
- Four chairs.
- One ordering counter.
- One coffee station.
- Small initial ingredient inventory.

These are starting balance proposals and must be adjusted through playtesting.

## Economic transaction principles

Every balance change needs:

- Unique transaction ID.
- Transaction type.
- Amount.
- Currency.
- Source.
- Timestamp.
- Relevant object ID.
- Previous balance.
- Resulting balance.

Example transaction types:

CUSTOMER_PAYMENT
INGREDIENT_PURCHASE
FURNITURE_PURCHASE
EMPLOYEE_WAGE
QUEST_REWARD
CAT_ADOPTION
UPGRADE_PURCHASE
AD_REWARD

Currency must never:

- Become negative without an explicitly supported debt system.
- Duplicate after repeated clicks.
- Be granted repeatedly by refreshing the page.
- Be deducted for a failed purchase.
- Be credited multiple times for one order.

## Example economic targets

Early café:

- Simple orders are affordable to produce.
- Every completed service provides a meaningful but balanced profit.
- Basic furniture upgrades are reachable through regular play.
- Better equipment improves efficiency.
- Higher-level recipes offer higher potential earnings with appropriate ingredient costs.

Avoid a system where players must watch advertisements to afford ordinary gameplay progression.

## Operational expenses

Include configurable costs:

- Ingredient purchases.
- Employee wages.
- Equipment maintenance.
- Cosmetic expenses.
- Optional expansion expenses.

Do not introduce excessive recurring expenses that make the game frustrating.

## Daily accounting

Provide a clear café report:

- Total revenue.
- Ingredient expenses.
- Wage expenses.
- Other expenses.
- Net profit.
- Customers served.
- Customer satisfaction.
- Most popular menu item.
- Café reputation change.

Use consistent time periods and avoid displaying revenue from one period alongside expenses from another.

---

# 18. TIME, WEATHER AND WORLD SIMULATION

## In-game clock

Use a configurable simulated time system.

Suggested baseline:

- One complete in-game day: 24 real minutes.
- One in-game hour: 60 real seconds.
- Time progression pauses during modal states that explicitly pause gameplay.

These timings may be balanced later.

## Day and night

Implement:

- Sunrise.
- Daytime.
- Sunset.
- Nighttime.
- Smooth lighting transitions.
- Appropriate street lighting.
- Building lighting.
- Ambient sound changes.

Do not instantly switch from bright daylight to pitch-black night.

## Weather

Possible weather:

- Sunny.
- Cloudy.
- Light rain.
- Heavy rain.
- Mist.

Weather affects:

- Environmental visuals.
- Ambient sound.
- Outdoor NPC behavior.
- Optional customer arrival modifiers.

Weather must not create extreme performance costs on low-end hardware.

## Café opening hours

Players can open or close the café.

When closed:

- No new customers enter.
- Existing customers may finish according to a documented closing policy.
- Employees complete or cancel appropriate tasks.
- The player can restock, build and reorganize.

When opened:

- Validate minimum functional equipment.
- Validate accessible entrance.
- Validate at least one valid service route.
- Begin customer simulation.

If the café cannot open, show the exact blocking reason.

---

# 19. QUESTS, EVENTS AND ACHIEVEMENTS

Quests should guide players through meaningful gameplay.

## Tutorial quests

1. Welcome to Kafe Miaw.
2. Meet Your First Cat.
3. Feed Your Cat.
4. Open Your Café.
5. Serve Your First Customer.
6. Earn Your First PawCoins.
7. Purchase New Ingredients.
8. Place Your First Decoration.
9. Complete Your First Upgrade.

Each quest must be achievable with the starting state.

## Daily quests

Examples:

- Serve 10 Customers.
- Prepare 5 Coffees.
- Feed Your Cat 3 Times.
- Earn 500 PawCoins.
- Keep Your Café Clean.
- Complete 3 Customer Orders Without Mistakes.

## Weekly challenges

Examples:

- Serve 100 Customers.
- Reach a Customer Satisfaction Target.
- Unlock a New Recipe.
- Complete a Café Decoration Challenge.

## Events

Possible events:

- Cat Appreciation Day.
- Weekend Market.
- Rainy Café Festival.
- Autumn Decoration Event.
- Holiday Café Celebration.

Events must have actual gameplay content.

Do not display a countdown to an event that does not exist.

## Achievement tracking

Every achievement includes:

- ID.
- Name.
- Description.
- Unlock requirements.
- Progress.
- Reward.
- Completion state.
- Completion timestamp.

Achievement rewards must only be claimed once.

---

# 20. GAME UI/UX DESIGN

The interface must be professional, responsive, attractive and extremely easy to understand.

## Visual design principles

- Cozy premium presentation.
- Consistent typography.
- Clear visual hierarchy.
- Rounded but restrained component shapes.
- Readable icons.
- Smooth hover and pressed states.
- Consistent shadows.
- Appropriate spacing.
- Clean information density.
- No overlapping panels.
- No clipped tables or labels.
- No useless decorative UI elements.

## Main menu

Include:

- Kafe Miaw logo.
- Play / Continue.
- New Game.
- Settings.
- How to Play.
- Credits.
- Privacy information where necessary.

Do not provide clickable buttons without implemented functionality.

## Desktop gameplay layout

**Top-left**
- Game logo.
- Café level.
- Café reputation.

**Top-center**
- PawCoins.
- Gems.
- Current day and time.

**Top-right**
- Settings.
- Notifications.
- Event icon when active.

**Left sidebar**
- Café Management.
- Cats.
- Inventory.
- Build Mode.
- Town Map.
- Quests.
- Achievements.

**Right contextual panel**
- Selected customer, cat, furniture or employee.
- Relevant actions and information.

**Bottom**
- Contextual actions.
- Progress indicators.
- Optional quick-access buttons.

The screen should prioritize the 3D world.

## Mobile layout

Use a responsive layout appropriate for both portrait and landscape.

- Compact top HUD.
- Bottom navigation.
- Collapsible drawers.
- Fullscreen modal views for complex management screens.
- Touch-friendly sliders and controls.
- Adequate safe-area padding.
- No permanent desktop sidebar blocking gameplay.

## Modal behavior

Every modal must:

- Have an appropriate title.
- Have a visible close mechanism.
- Support keyboard Escape where appropriate.
- Avoid opening duplicate instances.
- Avoid losing a pending transaction unexpectedly.
- Clearly distinguish confirmation from cancellation.
- Trap focus correctly for accessibility where applicable.

## Search and filtering

Inventory, CatBook, shops and employee rosters should support contextual search and filters.

Examples:

- Cat name.
- Cat ID.
- Breed.
- Furniture category.
- Item name.
- Employee role.

Search must be responsive and must not include inaccessible or nonexistent items.

## Sample interface messages

Successful purchase:
"Purchase Complete! Your item has been added to your inventory."

Insufficient funds:
"Not Enough PawCoins."

Full cat capacity:
"Your Cat Home Is Full."

Completed order:
"Order Served Successfully!"

Save completed:
"Progress Saved."

Network problem:
"Connection Lost. Some Online Features Are Temporarily Unavailable."

Unavailable advertisement:
"No Ad Available Right Now. Please Try Again Later."

All messages, including error states and debug-exposed player messages, must be in English.

---

# 21. ANIMATION, AUDIO AND FEEDBACK

The game must not feel static.

## Visual feedback

- Button hover feedback.
- Button press feedback.
- Purchase confirmation animation.
- Currency gain animation.
- Level-up celebration.
- Customer satisfaction feedback.
- Cat happiness reaction.
- Furniture placement confirmation.
- Subtle environment animations.

## Audio categories

- Main menu music.
- Café ambient music.
- Town ambience.
- Day and night ambience.
- Light rain ambience.
- Cat meows.
- Cat purring.
- Footsteps.
- Door opening.
- Coffee machine.
- Cash register.
- Customer conversation ambience.
- UI confirmation sound.
- Achievement sound.

Use original or licensed audio.

## Audio settings

Include:

- Master Volume.
- Music Volume.
- Sound Effects Volume.
- Ambient Volume.
- Mute All.

Respect browser autoplay restrictions.

Do not force audio to start before valid user interaction.

Pause or mute the required audio during advertisements according to the current platform SDK rules.

---

# 22. CRAZYGAMES INTEGRATION AND AD MONETIZATION

CrazyGames is the primary intended commercial distribution platform.

Before implementation, review the latest official CrazyGames SDK and publishing documentation.

Use the currently recommended supported SDK version and methods.

Do not invent API function names.

## SDK architecture

Build an isolated platform integration layer.

Suggested responsibilities:

- SDK initialization.
- Environment detection.
- Gameplay lifecycle events.
- Advertisement requests.
- Advertisement completion handling.
- Advertisement failure handling.
- Supported cloud save functionality.
- User identity where supported.
- Platform-specific functionality.

The core game must not depend directly on SDK globals throughout unrelated modules.

## Local development

On localhost, advertisements should be simulated or handled according to the SDK's official local development mode.

Do not display real monetization revenue during local testing.

Never promise the player that local test advertisements generate money.

## Rewarded ads

Rewarded ads must be voluntary.

Example opportunities:

- A bonus reward after completing a café milestone.
- A limited extra reward chest.
- A special cosmetic bonus.
- An optional resource bonus.
- A carefully balanced occasional progression boost.

Never require an advertisement to complete a basic quest.

Never chain multiple advertisements for one reward.

## Rewarded ad workflow

1. Validate that the SDK environment supports the request.
2. Validate that the offer is currently eligible.
3. Confirm the player selected the offer.
4. Prepare a pending ad transaction with a unique ID.
5. Pause appropriate game systems.
6. Request the advertisement.
7. Handle advertisement lifecycle callbacks.
8. Only grant the reward after confirmed successful completion.
9. Mark the reward transaction as completed.
10. Prevent duplicate grants.
11. Restore audio and game state.
12. Update the UI.

If an ad is unavailable:

- Restore gameplay.
- Do not grant an unearned ad reward.
- Show a clear English message.
- Allow the player to continue normally.

## Midgame advertisements

Only request at natural gameplay breaks.

Possible placement:

- After completing a significant café shift.
- Between distinct challenge rounds.
- After completing a special event stage.

Do not request midgame advertisements when:

- A player is actively preparing an order.
- A customer is being served.
- The player is navigating settings.
- The player is moving furniture.
- A player opens or closes an ordinary menu.
- A time-sensitive animation is still in progress.

Follow the current CrazyGames rules on ad frequency, initial gameplay experience and SDK pacing.

## Revenue and monetization

Never invent revenue statistics.

Never display fake ad earnings.

Never assume that Basic Launch produces monetization income.

Ads must be integrated only through approved CrazyGames mechanisms.

In-game purchases are a separate, restricted platform feature and must not be implemented as live payments without eligibility and approved integration.

---

# 23. SAVE DATA, CLOUD PROGRESS AND RECOVERY

Save reliability is essential.

Players must not lose hours of progress.

## Save content

Save:

- Player profile.
- Currency.
- Café level.
- Reputation.
- Inventory.
- Furniture ownership.
- Furniture placement.
- Café configuration.
- Home layout.
- Cat records.
- Cat genetics.
- Cat needs.
- Employee roster.
- Employee assignments.
- Orders and their valid persistent states.
- Completed quests.
- Achievements.
- Unlocks.
- World progression.
- Settings.
- Relevant timers.
- Pending transaction references.

## Save system

Use IndexedDB for the initial local save implementation unless a suitable existing save layer is already available.

Support:

- Save data versioning.
- Schema migration.
- Atomic or effectively atomic save commits.
- Data validation.
- Recovery from interrupted writes.
- Backup snapshots where feasible.
- Clear corruption handling.
- Non-destructive migration.

Avoid relying solely on localStorage for a complex expanding game.

## Autosave

Suggested autosave behavior:

- Every 30–60 seconds when appropriate.
- After major purchases.
- After adoption.
- After completed progression milestones.
- After furniture layout confirmation.
- Before certain scene transitions.

Do not autosave incomplete invalid states.

## Offline progress

Calculate any permitted offline progress using elapsed timestamps with a defined maximum cap.

Prevent:

- Unlimited passive money generation.
- Negative elapsed time.
- Extreme rewards from clock manipulation.
- Duplicate offline rewards.
- Repeated replay of an already collected offline reward.

An offline session should not cause cats to die or create unmanageable debt.

## Cloud saves

When supported by the approved CrazyGames SDK:

- Provide suitable authenticated cloud persistence.
- Resolve save conflicts carefully.
- Preserve the most appropriate valid progress.
- Avoid overwriting newer progress with stale local data.
- Do not promise account-linked saves until the integration works.

---

# 24. TECHNICAL ARCHITECTURE

Use a clear modular architecture.

Suggested code organization:

```text
src/
  app/
    bootstrap/
    configuration/
    lifecycle/
  core/
    events/
    state/
    time/
    persistence/
    transactions/
    validation/
  game/
    world/
    camera/
    navigation/
    characters/
    customers/
    cafe/
    orders/
    recipes/
    inventory/
    employees/
    cats/
    genetics/
    adoption/
    furniture/
    construction/
    economy/
    quests/
    achievements/
    weather/
  platform/
    crazygames/
    ads/
    cloud/
  ui/
    components/
    screens/
    modals/
    hud/
    responsive/
  assets/
    models/
    textures/
    audio/
    fonts/
    configuration/
  tests/
    unit/
    integration/
    gameplay/
    performance/
```

Adapt this structure intelligently to the existing repository rather than forcing unnecessary migrations.

## System boundaries

World rendering is not responsible for banking transactions.

UI components must not independently invent business logic.

Economy must not depend on how a button is visually styled.

Cat AI must not directly manipulate unrelated customer order records.

Use centralized domain services for important state transitions.

## Entity architecture

Every important entity has:

- Stable unique ID.
- Entity type.
- Transform where applicable.
- Persistent state where applicable.
- Current state.
- Configuration data.
- Relevant components.
- Valid actions.
- Serialization rules.

## Event system

Useful event examples:

- CUSTOMER_ARRIVED
- CUSTOMER_ORDER_CREATED
- ORDER_PREPARATION_STARTED
- ORDER_READY
- ORDER_COMPLETED
- PAYMENT_COMPLETED
- CAT_ADOPTED
- CAT_FED
- CAT_BOND_INCREASED
- FURNITURE_PLACED
- ITEM_PURCHASED
- LEVEL_UNLOCKED
- QUEST_COMPLETED
- SAVE_COMPLETED
- AD_REWARD_CONFIRMED

Events must not accidentally trigger recursive loops or duplicate economic effects.

## Business transactions

Important economic operations must be idempotent.

Repeated processing of the same transaction ID must not produce additional currency, additional purchases or duplicate items.

## Asynchronous operations

Handle:

- Loading.
- Cancellation.
- Timeouts.
- Race conditions.
- Retry rules.
- Failure recovery.
- Scene changes during async operations.
- Game tab becoming inactive.

Avoid unhandled promise rejections.

---

# 25. PATHFINDING, COLLISION AND INTERACTION SAFETY

Use a robust navigation approach appropriate for a 3D browser simulation.

Potential implementation:

- A navigation mesh or equivalent traversable-region system.
- Static obstacle definitions.
- Dynamic obstacle avoidance.
- Navigation target validation.
- Defined interaction approach positions.
- Separation between customer and staff access zones.

## Required behavior

NPCs must not walk through walls.

Cats must not pass through furniture.

Employees must approach stations from appropriate sides.

Customers must use accessible seating.

Characters must not become permanently trapped.

## When furniture moves

1. Recalculate affected local navigation accessibility.
2. Check connected paths.
3. Prevent placements that block required routes.
4. Reassign invalid routes.
5. Notify the player when placement is impossible.

## When navigation fails

- Attempt a reasonable alternate route.
- Release reserved destinations if appropriate.
- Avoid infinite loops.
- Cancel or retry the affected task safely.
- Show actionable feedback for persistent failures.

Do not silently teleport a character as a general fix for broken pathfinding.

---

# 26. PERFORMANCE AND OPTIMIZATION

The game must feel smooth, not merely look attractive in screenshots.

## Target performance

Recommended targets:

- Desktop: approximately 60 FPS on supported hardware.
- Midrange mobile: approximately 30 FPS or better.
- No long frame freezes during ordinary gameplay.
- Smooth camera controls.
- Responsive UI.
- Minimal unnecessary memory growth.

## Rendering requirements

- Use instancing for repeated compatible meshes.
- Reduce unnecessary draw calls.
- Use appropriate mesh detail levels.
- Apply frustum culling.
- Use optimized textures.
- Avoid excessive transparency.
- Limit expensive dynamic shadows.
- Reduce active NPC AI calculations outside relevant zones.
- Avoid per-frame object allocation where possible.
- Dispose of unused GPU resources.

## Asset loading

- Load core gameplay assets first.
- Load secondary environments on demand.
- Provide visible loading progress.
- Handle missing assets.
- Use fallbacks only where appropriate.
- Cache reusable models and materials.
- Avoid downloading all future expansion assets at startup.

## Browser compatibility

Test:

- Chrome.
- Edge.
- Firefox where supported.
- Safari on supported Apple devices.
- Android mobile browsers.
- iPhone Safari.

Where features are unsupported, provide graceful recovery instead of a blank screen.

## CrazyGames size targets

Respect the latest platform requirements.

Design the first playable experience to download quickly.

Keep the initial download particularly small for mobile eligibility.

Do not fill the initial build with unused high-resolution assets.

---

# 27. SECURITY, FAIR PLAY AND DATA INTEGRITY

The initial offline single-player game may use local save data.

However, local game state must never be described as tamper-proof.

For future online functionality:

- Store authoritative currency on the server.
- Validate all purchases server-side.
- Validate item ownership server-side.
- Validate breeding eligibility server-side.
- Prevent duplicate requests.
- Authenticate users through approved platform methods.
- Apply access-control checks.
- Rate-limit sensitive actions.
- Never trust client-submitted rewards without validation.

Do not store API secrets or private server credentials inside the browser bundle.

Do not collect unnecessary personal information.

Avoid exposing sensitive debugging information to players.

---

# 28. MULTIPLAYER EXPANSION DESIGN

Multiplayer is part of the long-term Kafe Miaw vision.

It is not required for the first release.

## Target experience

- Shared town instances.
- Up to 20 player property lots where technically feasible.
- Players can visit one another.
- Friends can inspect café decorations.
- Authorized visitors can interact with permitted objects.
- Shared public spaces.
- Appropriate player presence synchronization.
- Cross-player social activities.
- Future breeding invitations.

## Multiplayer architecture

Before implementation, select a suitable authoritative multiplayer backend.

Potential approaches include a purpose-built authoritative WebSocket server or an appropriate multiplayer game framework.

Do not synchronize an entire complex world by broadcasting every object state every frame.

Synchronize only relevant state using area of interest, event-based updates and appropriate interpolation.

## Access permissions

Each property must define:

- Owner.
- Visitor access settings.
- Edit permissions.
- Interaction permissions.
- Allowed shared activities.

Visitors cannot sell the owner's furniture, spend the owner's currency or adopt the owner's cats.

## Social safety

For future social features:

- Provide player reporting and blocking where appropriate.
- Respect platform policies.
- Avoid unmoderated public chat by default.
- Support required privacy and parental protections.
- Disable chat where required by the platform.

---

# 29. QUALITY ASSURANCE AND EDGE-CASE TESTING

Every implemented feature must have a test plan.

## Economy tests

- Buy item with sufficient currency.
- Attempt purchase with insufficient currency.
- Double-click purchase rapidly.
- Refresh during purchase.
- Save during transaction.
- Load after purchase.
- Attempt selling the same object twice.
- Attempt moving furniture and selling simultaneously.
- Validate no negative currency.
- Validate no duplicate item creation.

## Café tests

- Café opens successfully.
- Café refuses to open with critical equipment missing.
- Customers cannot enter a closed café.
- Customers queue correctly.
- Customers leave when patience runs out.
- Orders cannot use unavailable recipes.
- Machines can process only supported recipes.
- Multiple workers do not duplicate the same order.
- Customers occupy valid chairs.
- Revenue is credited exactly once.

## Cat tests

- Cat adoption creates a unique ID.
- Cat capacity is enforced.
- Feeding consumes appropriate inventory.
- Needs remain within allowed bounds.
- Cats cannot play while sleeping.
- Cats cannot walk through walls.
- Cat profiles survive reload.
- Genetics remains stable after save/load.
- Family relationships remain correctly linked.
- Breeding cannot generate duplicate offspring.

## Furniture tests

- Valid furniture placement succeeds.
- Placement outside permitted areas fails.
- Placement overlapping walls fails.
- Door-blocking placement fails.
- Rotated furniture updates collision correctly.
- Stored furniture returns to inventory.
- Repositioning does not charge the player twice.
- Layout persists after restarting.

## Ad tests

- SDK unavailable.
- Ad blocked.
- Ad unavailable.
- Ad loading timeout.
- Ad successfully completed.
- Ad interrupted.
- Browser tab loses focus.
- Repeated ad callback.
- Reward granted exactly once.
- No reward after unsuccessful completion.
- Audio restored correctly.
- Gameplay resumes on all supported end states.

## Save tests

- First-time player.
- Existing save.
- Missing save.
- Older save version.
- Corrupted save.
- Interrupted write.
- Storage quota exceeded.
- Offline reload.
- Browser refresh.
- Scene transition during autosave.

## UI tests

- 1920 × 1080 desktop.
- 1366 × 768 laptop.
- Tablet landscape.
- Tablet portrait.
- Mobile portrait.
- Mobile landscape.
- Browser zoom.
- Long item names.
- Empty data.
- Large inventory.
- Modal stacking.
- Keyboard navigation.
- Touch interaction.
- Safe-area margins.

Do not mark a feature complete until its critical acceptance tests pass.

---

# 30. FIRST-TIME PLAYER EXPERIENCE

The first session is critical.

A player should understand the game quickly without reading a massive manual.

## First 30 seconds

- Game loads smoothly.
- Kafe Miaw identity is immediately visible.
- Player sees an attractive café.
- Starter cat appears.
- A friendly guide provides a short introduction.
- One clear action is available.

Sample dialogue:

"Welcome to Kafe Miaw! Your very own cat café adventure starts here."

"First, let's meet your new furry friend."

## First 2 minutes

The player:

- Names their starter cat.
- Learns basic movement.
- Pets the cat.
- Opens the café.
- Receives the first customer.

## First 5 minutes

The player:

- Completes the first customer order.
- Earns PawCoins.
- Learns about ingredients.
- Buys a useful upgrade.
- Receives a small achievement.

## First 10 minutes

The player:

- Unlocks a new recipe.
- Meets a town NPC.
- Visits one useful town shop.
- Decorates part of the café.
- Understands the next progression objective.

Avoid lengthy unskippable dialogue.

A returning player must not be forced to repeat the tutorial.

---

# 31. RETENTION AND PLAYER MOTIVATION

The game must provide reasons to return.

## Short-term goals

- Serve the next customer.
- Finish an order.
- Earn enough coins for a small purchase.
- Feed a cat.
- Complete a quest.

## Medium-term goals

- Unlock new recipes.
- Upgrade equipment.
- Adopt another cat.
- Improve café reputation.
- Expand seating capacity.

## Long-term goals

- Expand the café.
- Complete CatBook collections.
- Unlock rare cosmetic patterns.
- Decorate an impressive home.
- Complete major achievements.
- Participate in special events.
- Explore future social features.

## Retention design principles

- Reward meaningful action.
- Introduce new mechanics gradually.
- Keep progress understandable.
- Avoid excessive waiting.
- Avoid repetitive grinding.
- Avoid manipulative advertisements.
- Respect returning players.
- Provide varied activities.
- Maintain realistic goals for casual users.

---

# 32. DEVELOPMENT PHASES

Implement the game in controlled phases.

## Phase 0 — Audit and foundation

Deliverables:

- Repository audit.
- Architecture proposal.
- Existing feature inventory.
- Working development environment.
- Build verification.
- Asset and dependency review.
- Baseline smoke tests.

## Phase 1 — Playable 3D world

Deliverables:

- Working camera.
- Ground.
- Main street.
- Core buildings.
- Café entrance.
- Interior transition.
- Collision.
- Player movement or equivalent interaction system.
- One functioning cat.
- Basic save system.

## Phase 2 — Functional café

Deliverables:

- Customer spawning.
- Customer navigation.
- Café opening and closing.
- Seating.
- Orders.
- Ingredient inventory.
- Drink preparation.
- Payments.
- PawCoins.
- Basic reputation.
- Service feedback.

## Phase 3 — Cat life system

Deliverables:

- Cat profile.
- Hunger.
- Thirst.
- Energy.
- Happiness.
- Cat AI.
- Animations.
- Petting and feeding.
- Adoption.
- Cat capacity.
- CatBook basics.

## Phase 4 — Furniture and town shops

Deliverables:

- MEOKEA.
- PawMart.
- Adoption Centre.
- Inventory.
- Build Mode.
- Furniture placement.
- Object collision.
- Placement persistence.
- Home customization.

## Phase 5 — Progression

Deliverables:

- Employee management.
- Additional recipes.
- Café upgrades.
- Quests.
- Achievements.
- Reputation milestones.
- Events.
- Economy balancing.

## Phase 6 — CrazyGames readiness

Deliverables:

- Current SDK integration.
- Correct gameplay lifecycle events.
- Ad-safe implementation.
- Optional rewarded advertising.
- Save reliability.
- Performance optimization.
- Responsive input.
- Production build.
- Submission metadata.
- Submission testing.

## Phase 7 — Expansion

Deliverables:

- Advanced genetics.
- Full CatBook lineage.
- Breeding.
- More buildings.
- Advanced weather.
- Additional events.
- Additional cosmetics.

## Phase 8 — Online multiplayer

Deliverables:

- Authoritative backend.
- User identity integration.
- Shared town.
- Property ownership.
- Visits.
- Permission system.
- State synchronization.
- Cross-player activities.
- Multiplayer testing.

Do not skip foundation work to show superficial progress.

---

# 33. DELIVERY AND COMMUNICATION RULES

Work in small, verifiable increments.

After every meaningful implementation step, report:

1. What was changed.
2. Which files changed.
3. Which gameplay behavior now works.
4. How to test the feature.
5. Which tests passed.
6. Which tests failed.
7. Known limitations.
8. What should be implemented next.

Do not respond with statements such as:

"Everything is finished."

unless the implemented behavior has been independently verified against the acceptance criteria.

Never confuse a visually attractive scene with a functional game.

Never replace unfinished features with deceptive fake interfaces.

Maintain a clear distinction between:

- IMPLEMENTED
- TESTED
- PARTIALLY IMPLEMENTED
- PLANNED
- BLOCKED

## Definition of done

A gameplay feature is complete only when:

- It has real functionality.
- It has appropriate user feedback.
- It survives expected errors.
- It integrates with relevant game systems.
- It saves correctly where necessary.
- It behaves correctly on desktop.
- It behaves correctly on mobile where supported.
- It does not introduce major performance regressions.
- Its critical tests pass.

---

# 34. FINAL PRODUCT STANDARD

The final Kafe Miaw experience must feel like a coherent commercial simulation game.

The world should be attractive.

The café should actually operate.

Customers should behave intelligently.

Cats should feel alive.

Workers should perform real duties.

Furniture should be physically placed.

Inventory should be reliable.

The economy should make sense.

The UI should be beautifully organized.

Progress should persist.

Advertisements should be optional where rewarded, compliant with platform rules and never deceptive.

Every action should produce believable consequences.

Every visual component should exist for a reason.

The player should feel their café growing from a modest shop into a thriving destination.

The ultimate objective is a game that people genuinely enjoy playing repeatedly—not merely a technical demonstration of game mechanics.

---

# 35. IMMEDIATE EXECUTION ORDER

Start now by inspecting the existing Kafe Miaw repository.

Do not attempt to implement all phases in one uncontrolled coding operation.

First:

1. Audit the project.
2. Identify the current playable features.
3. Verify the existing Vite development and production builds.
4. Evaluate whether the project already has a suitable Three.js implementation.
5. Design the modular architecture.
6. Establish the initial world and game-state contracts.
7. Implement one complete playable gameplay loop.
8. Add automated tests for critical state transitions.
9. Validate the result in a real browser.
10. Continue phase by phase without breaking existing functionality.

Do not stop after producing an explanation or implementation plan. Once the audit is complete, begin Phase 1 implementation within the repository, preserving version control checkpoints and performing verification before each major next step.

**THE ENTIRE PLAYER-FACING GAME MUST BE 100% ENGLISH.**

**KAFE MIAW MUST BE A REAL, LOGICAL, BEAUTIFUL AND FULLY PLAYABLE GAME.**
