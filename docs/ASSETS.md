# Curated artwork for Kafe Miaw 0.4

The game ships these files in `public/assets/`. Players do not need to download packs or contact third-party asset servers. These are selected free assets, not EXTRA/SOURCE paid pack contents.

| Use | Selected asset | Author / official source | License |
|---|---|---|---|
| Player and customer character, idle/walk animations | `character.glb` | [Kenney — Starter Kit 3D Platformer](https://github.com/KenneyNL/Starter-Kit-3D-Platformer) | CC0 for assets; the author's README explicitly distinguishes assets from the MIT starter code |
| Café table, chairs, counter, bowl | `table_round_A`, `chair_A`, `kitchencounter_straight_A`, `bowl_small` | [KayKit Restaurant Bits](https://github.com/KayKit-Game-Assets/KayKit-Restaurant-Bits-1.0) — Kay Lousberg | CC0 |
| Potted cactus and decorated shelf | `cactus_small_A`, `shelf_B_small_decorated` | [KayKit Furniture Bits](https://github.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0) — Kay Lousberg | CC0 |
| Two town building façades | `building_A_withoutBase`, `building_B_withoutBase` | [KayKit City Builder Bits](https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0) — Kay Lousberg | CC0 |

The nine embedded GLB files total **410,960 bytes (~401 KiB)**. A small shared loader caches source models; characters use skeleton-safe clones with the supplied animations. Placement/scaling matches the authoritative footprint definitions. The machine is an original Kafe Miaw espresso model with an interactive hit target, visible ready cup, and brewing steam. It is not falsely credited to an imported pack.

## Cat designs

No external cat mesh was imported in this increment. Suitable free cat-pack licensing/availability could not be established from the reachable primary sources. Instead, the game uses original modeled cat geometry and eight coat designs in `shared/cat-designs.ts` and `src/online/cat-model.ts`:

1. Orange Tabby — Oyen, orange stripes.
2. Snow — Mochi, pale fluffy coat.
3. Blue Grey — Luna, short grey coat.
4. Tuxedo — Oreo, dark coat with pale chest and muzzle.
5. Calico — Maple, pale coat with orange and dark patches.
6. Pointed Coat — Coco, darker face/ears/paws and blue eyes.
7. Brown Tabby — Hazel, fluffy brown striped coat.
8. Midnight — Pepper, dark coat with green eyes.

These are **coat/design options, not eight pedigree breeds**. Names and numeric coat indices 0–2 remain compatible with existing saved cats. Adoption can choose any of the eight designs; each adopted cat receives a unique persistent ID. Three ownership slots remain the current capacity. This is not a genetics or full cat-AI implementation.

## Provenance and verification

`public/assets/manifest.json` records immutable upstream commit URLs, source hashes, processed hashes and sizes. GLTF/GLB files were losslessly repacked with the upstream binary buffer and PNG textures embedded; no external image URLs remain. The original license texts and Kenney's explicit asset notice are retained under `public/assets/licenses/` and linked from the in-game Credits dialog.

Downloads used verified HTTPS through reachable official GitHub sources. Direct Kenney/Quaternius domains were unavailable in this cloud's network policy; verification was not disabled. No unlicensed community re-upload was substituted. CC0 allows commercial use and modification without mandatory credit; the game still gives voluntary credit. The Kenney starter-code MIT notice is also retained.

Run `npm run test:assets` to check file hashes, GLB structure, embedded resources, pinned source URLs and the selected-pack size budget. This verifies the shipped files against the recorded manifest, not a third-party digital signature or a performance certification.
