import type { Cafe, CafeView } from "../shared/cafe.ts";
import type { PlayerState } from "../shared/protocol.ts";
import { seed, type CatPose } from "../shared/experience.ts";
import { localPoint, servicePoint } from "../shared/furniture.ts";
import { route, roomBlocked, type Point } from "../shared/navigation.ts";
type CatBrain = CatPose & {
  next: number;
  path: Point[];
  destination?: { x: number; z: number; y: number };
  afterPath?: { x: number; z: number; y: number };
  stage: number;
};
/** Transient behaviour is server-owned. Persistent ownership, care and rewards remain in SQLite. */
export class CafeLife {
  private cats = new Map<string, Map<string, CatBrain>>();
  private last = new Map<string, number>();
  private clock = 0;
  sync(
    c: Cafe,
    orders: CafeView["orders"],
    players: PlayerState[],
    now: number,
  ) {
    this.clock = now;
    const dt = Math.min(
      0.25,
      Math.max(0, (now - (this.last.get(c.id) ?? now)) / 1000),
    );
    this.last.set(c.id, now);
    let cats = this.cats.get(c.id);
    if (!cats) this.cats.set(c.id, (cats = new Map()));
    for (const [i, cat] of c.cats.entries()) {
      let brain = cats.get(cat.id);
      if (!brain) {
        const preferred = {
          x: 3.3 + (i % 3) * 0.65,
          z: 0.7 + Math.floor(i / 3) * 0.65,
        };
        const candidates = [preferred];
        for (let z = -2; z <= 3; z += 1)
          for (let x = -4; x <= 4; x += 1) candidates.push({ x, z });
        const p = candidates.find(
          (p) =>
            !roomBlocked(p.x, p.z, c.level, c.layout) &&
            ![...cats.values()].some(
              (other) =>
                other.y < 0.1 &&
                Math.hypot(other.x - p.x, other.z - p.z) < 0.55,
            ),
        ) ?? { x: 0, z: 4 };
        brain = {
          id: cat.id,
          ...p,
          y: 0,
          rotation: -0.8,
          activity: "watching",
          until: now + 1800 + i * 850,
          next: now + 1800 + i * 850,
          path: [],
          stage: 0,
        };
        cats.set(cat.id, brain);
      }
      const carrier = players.find(
        (p) => p.area === c.id && p.connected && p.carriedCatId === cat.id,
      );
      if (carrier) {
        Object.assign(brain, {
          x: carrier.x,
          z: carrier.z,
          y: 1,
          rotation: carrier.rotation,
          activity: "carried",
          path: [],
          until: now + 500,
        });
        brain.next = now + 2200;
        continue;
      }
      if (brain.activity === "carried") {
        brain.activity = "watching";
        brain.y = 0;
        brain.path = [];
      }
      if (brain.destination) {
        // A climb only happens on the cat's own perch or bed; humans never use these paths.
        const d = brain.destination;
        brain.x += (d.x - brain.x) * Math.min(1, dt * 4);
        brain.z += (d.z - brain.z) * Math.min(1, dt * 4);
        brain.y += (d.y - brain.y) * Math.min(1, dt * 4);
        if (
          Math.abs(brain.y - d.y) < 0.04 &&
          Math.hypot(brain.x - d.x, brain.z - d.z) < 0.06
        ) {
          brain.y = d.y;
          brain.destination = undefined;
          brain.activity = d.y > 1 ? "watching" : "sleeping";
          brain.next = now + 5500;
          brain.until = brain.next;
        }
      } else if (brain.path.length) {
        const p = brain.path[0],
          dx = p.x - brain.x,
          dz = p.z - brain.z,
          d = Math.hypot(dx, dz);
        brain.activity = "walking";
        if (d < 0.08) brain.path.shift();
        else {
          const stride = Math.min(d, dt * (0.65 + (seed(cat.id) % 4) * 0.09));
          brain.x += (dx / d) * stride;
          brain.z += (dz / d) * stride;
          brain.rotation = Math.atan2(dx, dz);
        }
        if (!brain.path.length) {
          brain.activity = "watching";
          brain.next = now + 1800;
          brain.until = brain.next;
          if (brain.afterPath) {
            brain.destination = brain.afterPath;
            brain.afterPath = undefined;
            brain.activity = "climbing";
          }
        }
      } else if (now >= brain.next) {
        const n = brain.stage++,
          choice = (seed(cat.id) + n) % 7;
        brain.next = now + 3500 + (seed(cat.id + String(n)) % 3500);
        brain.until = brain.next;
        if (brain.y > 0.05) {
          const landing = { x: brain.x - 0.8, z: brain.z + 0.65 };
          if (!roomBlocked(landing.x, landing.z, c.level, c.layout)) {
            brain.destination = { ...landing, y: 0 };
            brain.activity = "climbing";
          } else {
            brain.destination = { x: 3.3, z: 0.8, y: 0 };
            brain.activity = "climbing";
          }
        } else if (choice === 0 || choice === 1) {
          const f = c.layout.find(
            (f) =>
              f.kind === (choice === 0 ? "tree" : "bed") && f.placed !== false,
          );
          if (!f) {
            brain.activity = "grooming";
            continue;
          }
          const access = localPoint(f, -0.75, 0.55);
          if (Math.hypot(brain.x - access.x, brain.z - access.z) < 0.9) {
            brain.destination = {
              x: f.x,
              z: f.z,
              y: choice === 0 ? 1.74 : 0.43,
            };
            brain.activity = "climbing";
          } else {
            this.walk(brain, access, c);
            if (brain.path.length)
              brain.afterPath = {
                x: f.x,
                z: f.z,
                y: choice === 0 ? 1.74 : 0.43,
              };
          }
        } else if (choice === 2 && orders.length) {
          const point = servicePoint(
            c.layout,
            orders[seed(cat.id) % orders.length].seat,
          );
          this.walk(brain, { x: point.x + 0.65, z: point.z }, c);
        } else if (
          choice === 5 &&
          c.layout.some((f) => f.kind === "toy" && f.placed !== false)
        ) {
          const toy = c.layout.find(
            (f) => f.kind === "toy" && f.placed !== false,
          )!;
          if (Math.hypot(brain.x - toy.x, brain.z - toy.z) < 1)
            brain.activity = "playing";
          else this.walk(brain, localPoint(toy, 0.85, 0), c);
        } else if (choice === 3) brain.activity = "grooming";
        else if (choice === 4) brain.activity = "sleeping";
        else
          this.walk(
            brain,
            {
              x: 2.7 + (seed(cat.id + String(n)) % 20) / 10,
              z: -1 + (seed(cat.id + "z" + n) % 38) / 10,
            },
            c,
          );
      }
    }
  }
  private walk(brain: CatBrain, point: Point, c: Cafe) {
    try {
      brain.path = route(brain, point, true, c.level, c.layout);
      brain.activity = "walking";
    } catch {
      brain.path = [];
      brain.activity = "watching";
    }
  }
  poses(c: Cafe, now = this.clock): CatPose[] {
    if (!this.cats.has(c.id)) this.sync(c, [], [], now);
    return [...this.cats.get(c.id)!.values()].map(
      ({ id, x, y, z, rotation, activity, until }) => ({
        id,
        x,
        y,
        z,
        rotation,
        activity,
        until,
      }),
    );
  }
  hold(
    c: Cafe,
    catId: string,
    now: number,
    activity: CatPose["activity"] = "watching",
  ) {
    const brain = this.cats.get(c.id)?.get(catId);
    if (!brain) return;
    brain.path = [];
    brain.destination = undefined;
    brain.afterPath = undefined;
    brain.activity = activity;
    brain.next = now + 6000;
    brain.until = brain.next;
  }
  reset(id: string) {
    this.cats.delete(id);
    this.last.delete(id);
  }
  repath(id: string) {
    for (const brain of this.cats.get(id)?.values() ?? []) {
      if (brain.path.length) {
        brain.path = [];
        brain.afterPath = undefined;
        brain.activity = "watching";
        brain.next = this.clock + 400;
        brain.until = brain.next;
      }
    }
  }
  drop(c: Cafe, id: string, point: Point, now: number) {
    const brain = this.cats.get(c.id)?.get(id);
    if (!brain) return;
    Object.assign(brain, {
      x: point.x,
      z: point.z,
      y: 0,
      activity: "purring",
      path: [],
      destination: undefined,
      afterPath: undefined,
      next: now + 4000,
      until: now + 4000,
    });
  }
}
