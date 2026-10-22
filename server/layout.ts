import { ENTRY, STATION, roomBounds, type Cafe } from "../shared/cafe.ts";
import {
  footprints,
  servicePoint,
  chair,
  type Furniture,
} from "../shared/furniture.ts";
import { route, roomBlocked } from "../shared/navigation.ts";
export function changedLayout(c: Cafe, target: string): Furniture[] {
  let change: any;
  try {
    change = JSON.parse(target);
  } catch {
    throw Error("Choose a furniture item and a floor position.");
  }
  if (
    !change ||
    typeof change.id !== "string" ||
    ![change.x, change.z, change.rotation].every(Number.isFinite) ||
    Object.keys(change).some(
      (k) => !["id", "x", "z", "rotation", "placed"].includes(k),
    ) ||
    (change.placed !== undefined && typeof change.placed !== "boolean") ||
    !Number.isInteger(change.rotation) ||
    change.rotation < 0 ||
    change.rotation > 3
  )
    throw Error("Choose a valid furniture position and quarter-turn rotation.");
  const f = c.layout.find((f) => f.id === change.id && f.level <= c.level);
  if (!f) throw Error("This furniture is not available.");
  if (
    Math.abs(change.x * 2 - Math.round(change.x * 2)) > 0.001 ||
    Math.abs(change.z * 2 - Math.round(change.z * 2)) > 0.001
  )
    throw Error("Furniture snaps to the half-metre grid.");
  const layout = c.layout.map((item) =>
    item.id === f.id
      ? {
          ...item,
          x: change.x,
          z: change.z,
          rotation: change.rotation,
          placed: change.placed ?? true,
        }
      : { ...item },
  );
  if (!layout.some((f) => f.kind === "bowl" && f.placed !== false))
    throw Error("Keep a food bowl in the café for your cats.");
  const boxes = footprints(layout, c.level);
  const bounds = roomBounds(c.level);
  for (const a of boxes) {
    if (
      a.x - a.w / 2 < bounds.minX + 0.15 ||
      a.x + a.w / 2 > bounds.maxX - 0.15 ||
      a.z - a.d / 2 < bounds.minZ + 0.15 ||
      a.z + a.d / 2 > bounds.maxZ - 0.15
    )
      throw Error("Keep every part of the furniture inside the room.");
    for (const b of boxes)
      if (
        a.id !== b.id &&
        Math.abs(a.x - b.x) < (a.w + b.w) / 2 + 0.08 &&
        Math.abs(a.z - b.z) < (a.d + b.d) / 2 + 0.08
      )
        throw Error(
          "Furniture would overlap another object. Leave a little space.",
        );
  }
  if (roomBlocked(ENTRY.x, ENTRY.z, c.level, layout))
    throw Error("Keep the entrance clear.");
  for (const point of [
    STATION,
    ...[0, 1]
      .filter(
        (seat) =>
          layout.find((f) => f.id === `table-${seat}`)?.placed !== false,
      )
      .flatMap((seat) => [
        servicePoint(layout, seat),
        chair(layout, `table-${seat}:back`)!.approach,
      ]),
  ])
    route(ENTRY, point, true, c.level, layout);
  return layout;
}
