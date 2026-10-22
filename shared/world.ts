export const WORLD = {
  minX: -96,
  maxX: 96,
  minZ: -44,
  maxZ: 44,
  speed: 5,
  radius: 0.38,
};
export const LOTS = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: -81 + (i % 10) * 18,
  z: i < 10 ? -20 : 20,
}));
export const BUILDINGS = LOTS.map((l) => ({
  ...l,
  w: 12.8,
  d: 14,
  color: [0xe8c39c, 0xb8c7a2, 0xd3a8a0, 0xb6cbd0][l.id % 4],
}));
export const STREET_PROPS = [
  ...[-72, -36, 0, 36, 72].flatMap((x) =>
    [-1, 1].map((side) => ({
      kind: "bench" as const,
      x,
      z: side * 9,
      w: 2.1,
      d: 0.65,
      rotation: side < 0 ? 0 : Math.PI,
    })),
  ),
  ...[-63, -9, 45].flatMap((x) =>
    [-1, 1].map((side) => ({
      kind: "car" as const,
      x,
      z: side * 5.5,
      w: 4.4,
      d: 2.1,
      rotation: side < 0 ? Math.PI / 2 : -Math.PI / 2,
    })),
  ),
  ...[-90, -54, -18, 18, 54, 90].flatMap((x) =>
    [-1, 1].map((side) => ({
      kind: "tree" as const,
      x,
      z: side * 33,
      w: 0.7,
      d: 0.7,
      rotation: 0,
    })),
  ),
  ...[-90, -54, -18, 18, 54, 90].flatMap((x) =>
    [-1, 1].map((side) => ({
      kind: "lamp" as const,
      x,
      z: side * 7.7,
      w: 0.25,
      d: 0.25,
      rotation: side < 0 ? 0 : Math.PI,
    })),
  ),
];
export const OBSTACLES = [...BUILDINGS, ...STREET_PROPS].map((b) => ({
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
  speedMultiplier = 1,
) {
  const length = Math.hypot(dx, dz);
  if (length > 1) {
    dx /= length;
    dz /= length;
  }
  const distance =
    WORLD.speed * speedMultiplier * Math.min(0.1, Math.max(0, seconds));
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
  return { x: b.x, z: b.z + (b.z < 0 ? 8.5 : -8.5) };
}
