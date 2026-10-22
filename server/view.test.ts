import { test } from "node:test";
import assert from "node:assert/strict";
import { lookDelta, viewDirection } from "../shared/view.ts";
import { roomOrigin, roomToTown, ROOM_SCALE } from "../shared/portals.ts";
test("FPP mouse look turns right naturally and clamps vertical look before inversion", () => {
  const right = lookDelta(0, 0, 100, 0),
    direction = viewDirection(right.yaw, 0, -1);
  assert.ok(direction.x > 0 && direction.z < 0);
  assert.equal(lookDelta(0, 0, 0, 100000).pitch, -1.35);
  assert.equal(lookDelta(0, 0, 0, -100000).pitch, 1.35);
  assert.ok(Math.abs(Math.hypot(direction.x, direction.z) - 1) < 1e-12);
});
test("FPP movement and room geometry keep the same human scale and heading on both street sides", () => {
  assert.equal(ROOM_SCALE, 1);
  for (const lot of [0, 9, 10, 19])
    for (const yaw of [0, Math.PI / 2, Math.PI]) {
      const world = viewDirection(yaw, 0, -1),
        local = viewDirection(-roomOrigin(lot).rotation, world.x, world.z);
      const start = roomToTown({ x: 0, z: 0 }, lot),
        end = roomToTown(local, lot);
      assert.ok(Math.abs(end.x - start.x - world.x) < 1e-10);
      assert.ok(Math.abs(end.z - start.z - world.z) < 1e-10);
    }
});
