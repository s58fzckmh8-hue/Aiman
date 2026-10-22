# Kafe Miaw: small living world

This records the accepted direction from the development conversation. It is a scope ledger, not a claim that every feature below is complete. The multiplayer directive's requirement for independently tested stages remains in effect.

## Play experience

First-person at human eye height is the default, following the supplied The Roast Coffee Shop Simulator screenshots. The world fills the screen. Movement and interactions happen in the scene; management is an in-game phone. WASD walks, Shift sprints with empty hands, E interacts, O opens/closes the café, C opens the phone, V selects first-person/overview, and B/R arrange/rotate furniture. Design mode uses overview and restores the selected play view. Mouse capture, right-drag and touch-drag support looking around. A doorway crossing must visibly follow the correct building entrance, with a continuous camera, rather than cutting between unrelated maps.

The implemented foundation includes physical coffee brewing, carrying and delivery; articulated human characters; occupied chairs; owned-cat pickup and put-down; server-owned cat routines, perches and toys; furniture inventory and validated placement; paid cat slots; capped rarity bonuses; visitor care using the visitor's own supplies; progression goals and a saved economy. The living-café browser checks cover real pointer/keyboard interactions and reload persistence; see VALIDATION.md for the current full verification record.

## Cat collection

- Begin with Oyen, a Basic cat, and one café slot. Buy slots with earned currency, separately from buying cats. An expanded café supports up to ten active cats.
- Coat options have Basic, Common, Rare, Epic or Legendary tiers. Happiness is required for a tier's café bonus. Attraction and tips are capped; rare cats must not invalidate the starter cat or normal service work.
- A cat lounge at the player's house is the intended home for resting cats. Cats are living entities with persistent IDs; they are not furniture items stacked in a backpack. Moving a cat between house, café and park must preserve its identity and ownership.
- Visitors may pet cats and share food from their own supplies. They cannot sell, move, adopt, or spend the owner's money.
- Rewarded ads are optional alternatives to currency purchases. A proposed slot schedule is 2, 3, 3, 4, 4, 5, 5, 6, 6 completed ads for slots 2–10. Do not show this as a working purchase method until a real provider and trustworthy reward verification are connected. Never simulate a completed ad or trust an arbitrary client reward message.

## Neighbourhood destinations to implement

| Destination | Purpose and real consequence |
|---|---|
| Owned café | Physical food/drink service, customers, progression and expansion |
| Owned home | Resting cats, furnishings, clothing and a personal space |
| Neighbour's property | Real visits and positive cat care with explicit ownership restrictions |
| MEOKEA | Buy furniture into inventory, then place and rotate it safely |
| PawMart / adoption centre | Buy supplies, toys, cat slots and specific cats with visible prices and tiers |
| Meowcar | Buy an owned vehicle, enter it nearby, drive and park with server collision |
| Boutique | Choose a persistent appearance; varied player and NPC silhouettes |
| Park | Walk with an owned cat, sit, explore paths and play with actual pet toys |

The terrain should form a compact walkable neighbourhood: cafés on one side, homes on the other, a connected park and shopping street, with distant hills as scenery. Physical footprints, entrances and navigation must match visible buildings. Do not label decorative empty buildings as completed shops.

## Café depth to implement

Coffee recipes unlock from actual service progress. Paid dessert/menu additions need their own workstation, ingredients, preparation time, carried food model and delivery. Expansion increases usable floor area and placement space. A hired barista or cat carer must visibly travel and perform tasks, consume real supplies and have an explicit wage; staff are NPCs and never count as online players. No offline income is implied by the current single-server simulation.

## Artwork

The project has 27 local CC0 GLBs (4,853,624 bytes): the original 23 Kenney/KayKit files plus four Quaternius civilian humans from an explicitly credited, pinned Ducz redistribution. Source licences were verified on the author's own website source as well as the redistribution notice. Runtime uses four civilian styles and their walk/idle clips, eight façade styles, parked hatchbacks, benches, lamp posts and adapted bush foliage. Cat geometry, hands, coffee machine, seated/carrying poses and sound remain Kafe Miaw work. The catalogue includes home furniture reserved for later gameplay. Source hashes, processed hashes, author links, licences and a repeatable verified import script are included.

## Release limits

The saved project is still a developing game, not a finished Sims-scale product or an approved CrazyGames release. Keep two-real-client multiplayer, economy/restart checks, actual pointer/touch interactions, mobile layout and production build checks passing as each connected system is added. A full release also needs hosted HTTPS/WSS service, platform ad integration, real-device performance testing and appropriate concurrency testing. Do not replace those requirements with a "100% complete" label.
