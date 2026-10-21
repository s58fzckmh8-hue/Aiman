export const WORLD = {
  minX: -48,
  maxX: 48,
  minZ: -28,
  maxZ: 28,
  speed: 5,
  radius: 0.38,
};
export const LOTS = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: -40 + (i % 10) * 9,
  z: i < 10 ? -16 : 16,
}));
export const BUILDINGS = LOTS.map((l) => ({
  ...l,
  w: 6.4,
  d: 7,
  color: [0xe8c39c, 0xb8c7a2, 0xd3a8a0, 0xb6cbd0][l.id % 4],
}));
export const OBSTACLES = BUILDINGS.map((b) => ({
  x: b.x,
  z: b.z,
  w: b.w,
  d: b.d,
}));
export function blocked(x: number, z: number) {
  return (
    !Number.isFinite(x) ||
    !Number.isFinite(z) ||
    x < WORLD.minX + WORLD.radius ||
    x > WORLD.maxX - WORLD.radius ||
    z < WORLD.minZ + WORLD.radius ||
    z > WORLD.maxZ - WORLD.radius ||
    OBSTACLES.some(
      (b) =>
        x > b.x - b.w / 2 - WORLD.radius &&
        x < b.x + b.w / 2 + WORLD.radius &&
        z > b.z - b.d / 2 - WORLD.radius &&
        z < b.z + b.d / 2 + WORLD.radius,
    )
  );
}
export function move(
  position: { x: number; z: number },
  dx: number,
  dz: number,
  seconds: number,
) {
  const length = Math.hypot(dx, dz);
  if (length > 1) {
    dx /= length;
    dz /= length;
  }
  const distance = WORLD.speed * Math.min(0.1, Math.max(0, seconds));
  const steps = Math.max(1, Math.ceil(distance / 0.15));
  let { x, z } = position;
  for (let i = 0; i < steps; i++) {
    const nx = x + (dx * distance) / steps;
    if (!blocked(nx, z)) x = nx;
    const nz = z + (dz * distance) / steps;
    if (!blocked(x, nz)) z = nz;
  }
  return { x, z };
}

export function doorway(lot: number) {
  const b = BUILDINGS[lot];
  return { x: b.x, z: b.z + (b.z < 0 ? 5.5 : -5.5) };
}
