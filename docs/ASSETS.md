# Curated artwork for Kafe Miaw 0.5

Players do not need to download asset packs. The game ships selected free assets locally in `public/assets/`; paid EXTRA/SOURCE pack contents are excluded.

| Collection | Selected files | Author / official source | License |
|---|---|---|---|
| Café furniture | Round table, chair, counter, bowl | [KayKit Restaurant Bits](https://github.com/KayKit-Game-Assets/KayKit-Restaurant-Bits-1.0) — Kay Lousberg | CC0 |
| Interior collection | Cactus, shelf, couch, single bed, standing lamp, low table | [KayKit Furniture Bits](https://github.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0) — Kay Lousberg | CC0 |
| Neighbourhood collection | Building façades A–H, hatchback, bench, bush, streetlight | [KayKit City Builder Bits](https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0) — Kay Lousberg | CC0 |
| Earlier character archive | `character.glb`, retained for compatibility/reference; not the current player/NPC model | [Kenney — Starter Kit 3D Platformer](https://github.com/KenneyNL/Starter-Kit-3D-Platformer) | CC0 assets; starter code is MIT |

The **23 embedded GLBs total 1,223,728 bytes** (~1.17 MiB). Runtime uses selected café furniture and building façades. The additional home/car/neighbourhood models are curated assets for the next world stage; their inclusion does not mean driving, homes or shops work yet. A shared loader caches source models and uses independent clones. Authoritative furniture footprints determine placement dimensions.

## Original character and cat work

Current humans are original rounded, articulated meshes with varied skin, hair and clothes; walk, seated-leg, carrying and brewing poses are code-driven. The original espresso machine has an interactive target, cup and steam. Cat models, eight coat designs, toys and procedural sounds are original project work.

| Coat / default name | Tier | Adoption price |
|---|---|---|
| Orange Tabby / Oyen | Basic | 60 |
| Snow / Mochi | Common | 90 |
| Blue Grey / Luna | Common | 90 |
| Tuxedo / Oreo | Rare | 160 |
| Calico / Maple | Rare | 160 |
| Pointed Coat / Coco | Epic | 260 |
| Brown Tabby / Hazel | Epic | 260 |
| Midnight / Pepper | Legendary | 500 |

These are coat/design options, not pedigree breeds. Existing numeric coat indices and persistent cat IDs remain compatible. Start with one Basic cat and one purchased slot. Expansion supports up to ten slots, bought separately with earned coins. Happiness activates capped bonuses. Cat routines include walking, sleeping, grooming, playing, approaching customers and climbing; full needs/genetics and an outdoor cat lounge are not implemented.

## Provenance and verification

`public/assets/manifest.json` records immutable official upstream URLs, source SHA-256, processed SHA-256 and file sizes. GLTF/GLB resources are repacked with original binary data and PNG textures embedded; no external image requests remain. Original license texts and Kenney's explicit asset notice remain under `public/assets/licenses/` and are linked from Credits.

Downloads used verified HTTPS through official GitHub sources. Direct Kenney/Quaternius domains were unavailable to this environment. No unlicensed re-upload or paid pack was substituted, and TLS/checksum verification was not disabled. CC0 permits commercial use and modification without mandatory credit; voluntary author credit remains in game. Consult dependency licenses separately.

`npm run test:assets` checks actual file inventory, hashes, GLB structure, embedded resources, pinned source URLs and a 2 MB collection budget. It verifies files against the recorded manifest, not an external signature or device-performance certification.
