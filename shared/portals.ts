import { BUILDINGS } from "./world.ts";
export const ROOM_SCALE = 0.5;
export function roomOrigin(lot: number) {
  const b = BUILDINGS[lot],
    side = b.z < 0 ? 1 : -1;
  return { x: b.x, z: b.z + side, rotation: side === 1 ? 0 : Math.PI };
}
export function roomToTown(point: { x: number; z: number }, lot: number) {
  const p = roomOrigin(lot),
    side = lot < 10 ? 1 : -1;
  return {
    x: p.x + point.x * ROOM_SCALE * side,
    z: p.z + point.z * ROOM_SCALE * side,
  };
}
