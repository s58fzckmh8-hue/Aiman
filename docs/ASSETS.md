# Curated artwork for Kafe Miaw 0.6

Players do not need to download asset packs. The game ships selected free assets locally in `public/assets/`; paid EXTRA/SOURCE pack contents are excluded.

| Collection | Selected files | Author / official source | License |
|---|---|---|---|
| Café furniture | Round table, chair, counter, bowl | [KayKit Restaurant Bits](https://github.com/KayKit-Game-Assets/KayKit-Restaurant-Bits-1.0) — Kay Lousberg | CC0 |
| Interior collection | Cactus, shelf, couch, single bed, standing lamp, low table | [KayKit Furniture Bits](https://github.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0) — Kay Lousberg | CC0 |
| Neighbourhood collection | Building façades A–H, hatchback, bench, bush, streetlight | [KayKit City Builder Bits](https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0) — Kay Lousberg | CC0 |
| Civilian humans | Male Casual, Male Hoodie, Female Casual, Female Formal; five retained animation clips each | [Quaternius](https://quaternius.com/packs/ultimatemodularcharacters.html), [Women pack](https://quaternius.com/packs/ultimatemodularwomen.html); converted GLB redistribution by [Luan Michel Ducate](https://github.com/LuanDucate/Ducz.CharacterCreator/tree/fcd215b58eec5c9ed97d0ba5f696d0e7dc085e08/public/models) | CC0 |
| Earlier character archive | `kenney-character.glb`, retained for compatibility/reference; not the current player/NPC model | [Kenney — Starter Kit 3D Platformer](https://github.com/KenneyNL/Starter-Kit-3D-Platformer) | CC0 assets; starter code is MIT |

The **27 embedded GLBs total 4,853,624 bytes** (~4.63 MiB). Runtime uses four civilian character models, café furniture, eight building façades, benches, lamps, parked hatchbacks and bush foliage. Home furnishings remain curated for a later stage; cars are scenery with collision, and driving, homes and town shops are not yet implemented. A shared loader caches source models and uses independent clones. Authoritative furniture footprints determine placement dimensions.

## Runtime posing and original cat work

Current humans are Quaternius skinned models with original walk/idle clips, runtime colour variants and Kafe Miaw seated/carrying poses. The four GLBs come from the pinned Ducz archive, whose README explicitly credits the Quaternius CC0 packs; the author's own pack pages also state CC0 and commercial use. No character-creator application source was imported. Unused animations and buffers were removed while retaining geometry, materials, skeleton and five clips. A lightweight original character appears while an imported model loads. `python3 scripts/import-civilians.py` reproduces the verified converted files from their pinned source hashes. The original espresso machine has an interactive target, cup and steam. Cat models, eight coat designs, toys and procedural sounds are original project work.

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

`public/assets/manifest.json` records immutable download URLs, author/redistributor references, source SHA-256, processed SHA-256 and file sizes. GLTF/GLB resources are repacked with original binary data and PNG textures embedded; no external image requests remain. Original license texts and Kenney's explicit asset notice remain under `public/assets/licenses/` and are linked from Credits.

Downloads used verified HTTPS to pinned GitHub files. Direct Quaternius, Itch and Google Drive downloads were unavailable to this environment. Quaternius licence statements were verified through the author's own website-source repository; the civilian files use a pinned, explicitly credited CC0 redistribution. No unlicensed re-upload or paid pack was substituted, and TLS/checksum verification was not disabled. CC0 permits commercial use and modification without mandatory credit; voluntary author credit remains in game. Consult dependency licenses separately.

`npm run test:assets` checks actual file inventory, hashes, GLB structure, embedded resources, pinned source URLs and a 6 MB collection budget. It verifies files against the recorded manifest, not an external signature or device-performance certification.
