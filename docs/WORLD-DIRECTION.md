# Kafe Miaw: small living world

This records the accepted direction from the development conversation. It is a scope ledger, not a claim that every feature below is complete. The multiplayer directive's requirement for independently tested stages remains in effect.

## Play experience

The world fills the screen. Movement and interactions happen in the scene; management is an in-game phone. WASD walks, Shift sprints with empty hands, E interacts, O opens/closes the café, C opens the phone, and B/R arrange/rotate furniture. A doorway crossing must visibly follow the correct building entrance, with a continuous camera, rather than cutting between unrelated maps.

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

The project now has a curated local collection of 23 CC0 GLBs (1,223,728 bytes) from pinned official Kenney/KayKit sources, with license texts and hashes in `public/assets/`. The new selection includes a hatchback, six additional building façades, a couch, bed, low table, lamp, benches, bushes and streetlights. Their presence in the asset archive does not establish that driving, houses or shops have been implemented. Runtime integration and gameplay validation are separate steps. Original human/cat animation and toy geometry remain credited to Kafe Miaw.

## Release limits

The saved project is still a developing game, not a finished Sims-scale product or an approved CrazyGames release. Keep two-real-client multiplayer, economy/restart checks, actual pointer/touch interactions, mobile layout and production build checks passing as each connected system is added. A full release also needs hosted HTTPS/WSS service, platform ad integration, real-device performance testing and appropriate concurrency testing. Do not replace those requirements with a "100% complete" label.
