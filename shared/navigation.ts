import { blocked, move, WORLD } from "./world.ts";
import { ROOM, ROOM_OBSTACLES } from "./cafe.ts";
export type Point = { x: number; z: number };
const plantObstacles = [-5, 5].map((x) => ({ x, z: 3.5, w: 0.65, d: 0.65 }));
const layouts = [
  ROOM_OBSTACLES,
  [...ROOM_OBSTACLES, ...plantObstacles],
  [...ROOM_OBSTACLES, ...plantObstacles, { x: 5.3, z: -3.7, w: 0.6, d: 1.4 }],
];
export function roomBlocked(x: number, z: number, level = 1) {
  return (
    !Number.isFinite(x) ||
    !Number.isFinite(z) ||
    x < ROOM.minX + 0.38 ||
    x > ROOM.maxX - 0.38 ||
    z < ROOM.minZ + 0.38 ||
    z > ROOM.maxZ - 0.38 ||
    layouts[Math.max(0, Math.min(2, level - 1))].some(
      (b) =>
        x > b.x - b.w / 2 - 0.38 &&
        x < b.x + b.w / 2 + 0.38 &&
        z > b.z - b.d / 2 - 0.38 &&
        z < b.z + b.d / 2 + 0.38,
    )
  );
}
export function step(
  p: Point,
  dx: number,
  dz: number,
  dt: number,
  inside = false,
  level = 1,
) {
  if (!inside) return move(p, dx, dz, dt);
  const length = Math.max(1, Math.hypot(dx, dz));
  const d = WORLD.speed * Math.min(0.1, Math.max(0, dt));
  let { x, z } = p;
  for (let i = 0; i < 4; i++) {
    const nx = x + ((dx / length) * d) / 4;
    if (!roomBlocked(nx, z, level)) x = nx;
    const nz = z + ((dz / length) * d) / 4;
    if (!roomBlocked(x, nz, level)) z = nz;
  }
  return { x, z };
}
/** Bounded grid A*: server generated walking routes, never instant teleports. */
export function route(
  from: Point,
  to: Point,
  inside = false,
  level = 1,
): Point[] {
  const cell = inside ? 0.5 : 1;
  const isBlocked = inside
    ? (x: number, z: number) => roomBlocked(x, z, level)
    : blocked;
  if (isBlocked(to.x, to.z)) throw Error("That destination is blocked.");
  const key = (x: number, z: number) => `${x},${z}`;
  const sx = Math.round(from.x / cell),
    sz = Math.round(from.z / cell),
    tx = Math.round(to.x / cell),
    tz = Math.round(to.z / cell);
  const start = key(sx, sz),
    end = key(tx, tz);
  const open = [{ x: sx, z: sz, g: 0, f: 0 }],
    best = new Map([[start, 0]]),
    parents = new Map<string, string>();
  let found = false;
  for (let count = 0; open.length && count < 14000; count++) {
    open.sort((a, b) => a.f - b.f);
    const p = open.shift()!,
      k = key(p.x, p.z);
    if (k === end) {
      found = true;
      break;
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const x = p.x + dx,
        z = p.z + dz,
        nk = key(x, z),
        g = p.g + 1;
      if (isBlocked(x * cell, z * cell) || g >= (best.get(nk) ?? Infinity))
        continue;
      best.set(nk, g);
      parents.set(nk, k);
      open.push({ x, z, g, f: g + Math.abs(tx - x) + Math.abs(tz - z) });
    }
  }
  if (!found) throw Error("No safe walking route is available.");
  const path: Point[] = [];
  let k = end;
  while (k !== start) {
    const [x, z] = k.split(",").map(Number);
    path.push({ x: x * cell, z: z * cell });
    k = parents.get(k)!;
  }
  path.reverse();
  path.push(to);
  return path;
}
