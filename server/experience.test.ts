import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GameStore } from "./game-store.ts";
import { Cafes, type Actor } from "./cafes.ts";
import { CafeLife } from "./life.ts";
import { changedLayout } from "./layout.ts";
import { chair } from "../shared/furniture.ts";
import { slotLimit, CAT_PRICES } from "../shared/cat-collection.ts";
import { recipe } from "../shared/experience.ts";
import { roomBlocked } from "../shared/navigation.ts";
import { Town } from "./town.ts";
import { WebSocket } from "ws";
import type { Action } from "../shared/cafe.ts";
const action = (action: Action["action"], target?: string): Action => ({
  type: "action",
  requestId: crypto.randomUUID(),
  action,
  target,
});
function setup() {
  const store = new GameStore(":memory:"),
    cafes = new Cafes(store),
    c = cafes.join("a");
  const actor: Actor = {
    state: {
      id: "a",
      sessionId: "a",
      name: "A",
      lot: 0,
      x: 0,
      z: 4,
      rotation: 0,
      moving: false,
      connected: true,
      color: 0,
      area: c.id,
    },
  };
  return { store, cafes, c, actor };
}
function sale(store: GameStore, cafeId: string, n: number) {
  const now = 1000 + n * 11000,
    id = store.createOrder(cafeId, now)!;
  const order = store.orders(cafeId).find((o) => o.id === id)!;
  const brew = recipe(order.recipe).brewMs;
  store.prepare("a", `brew-${n}`, id, now);
  store.advance(cafeId, now + brew + 1);
  store.pickup("a", `pickup-${n}`, id);
  store.serve("a", `serve-${n}`, id, now + brew + 2);
  store.advance(cafeId, now + brew + 3003);
  return order;
}
test("recipe unlocks follow earned service count and use their own brew time and payout", () => {
  const { store, cafes, c } = setup();
  try {
    const seen = new Set<string>();
    for (let i = 0; i < 10; i++) {
      if (i === 9) store.purchase("a", "restock-1", "beans");
      const order = sale(store, c.id, i);
      if (i < 3) assert.equal(order.recipe, "black");
      seen.add(order.recipe);
    }
    assert.equal(store.get(c.id).served, 10);
    // A broad deterministic hash sample checks selection only among unlocked recipes.
    for (let i = 10; i < 50; i++) {
      const id = store.createOrder(c.id, 1000 + i * 11000)!;
      seen.add(store.orders(c.id).find((o) => o.id === id)!.recipe);
      store.cancel(c.id);
    }
    assert.deepEqual([...seen].sort(), ["black", "latte", "mocha"]);
  } finally {
    cafes.shutdown();
  }
});
test("goal reward cannot be claimed early, twice, or with a substituted request", () => {
  const { store, cafes, c } = setup();
  try {
    assert.throws(
      () => store.claim("a", "early-claim", "first-three"),
      /Complete/,
    );
    for (let i = 0; i < 3; i++) sale(store, c.id, i);
    const before = store.get(c.id).coins;
    store.claim("a", "claim-three", "first-three");
    store.claim("a", "claim-three", "first-three");
    assert.equal(store.get(c.id).coins, before + 40);
    assert.throws(
      () => store.claim("a", "another-claim", "first-three"),
      /already/,
    );
    assert.throws(
      () => store.claim("a", "claim-three", "happy-cat"),
      /another action/,
    );
    assert.deepEqual(store.get(c.id).claimed, ["first-three"]);
  } finally {
    cafes.shutdown();
  }
});
test("version-one save migrates without losing identity, balances, cats or unfinished bean refunds", () => {
  const dir = mkdtempSync(join(tmpdir(), "miaw-migration-")),
    path = join(dir, "game.sqlite");
  let store = new GameStore(path);
  try {
    const c = store.ensure("a"),
      cat = c.cats[0].id,
      id = store.createOrder(c.id, 1000)!;
    store.prepare("a", "old-brew", id, 1000);
    // Represent a v0.4 owner with three existing cats before paid slots existed.
    (store as any).db
      .prepare("INSERT INTO cats VALUES (?,?,?,?,?)")
      .run("legacy-cat-2", c.id, "Mochi", 1, 80);
    (store as any).db
      .prepare("INSERT INTO cats VALUES (?,?,?,?,?)")
      .run("legacy-cat-3", c.id, "Luna", 2, 75);
    (store as any).db.exec(
      "ALTER TABLE orders DROP COLUMN recipe; ALTER TABLE cafes DROP COLUMN layout; ALTER TABLE cafes DROP COLUMN cat_slots; DROP TABLE goal_claims; PRAGMA user_version=1;",
    );
    store.close();
    store = new GameStore(path);
    assert.equal(store.get(c.id).coins, 150);
    assert.equal(store.get(c.id).beans, 12);
    assert.equal(store.get(c.id).cats[0].id, cat);
    assert.equal(store.get(c.id).cats.length, 3);
    assert.equal(store.get(c.id).catSlots, 3);
    assert.equal(store.get(c.id).layout.length, 8);
    assert.equal(store.orders(c.id).length, 0);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("opening the café respects a player already sitting at a customer chair", () => {
  const { store, cafes, c, actor } = setup();
  try {
    const front = chair(c.layout, "table-0:front")!;
    Object.assign(actor.state, front.approach);
    cafes.request(actor, action("sit", "table-0:front"), [actor.state], 1000);
    const owner: Actor = {
      state: { ...actor.state, id: "a", sitting: undefined, x: 0, z: 4 },
    };
    // The seated guest has their own identity, while the owner opens the café.
    actor.state.id = "guest";
    store.ensure("guest");
    cafes.request(owner, action("open"), [owner.state, actor.state], 1200);
    assert.deepEqual(
      store.orders(c.id).map((o) => o.seat),
      [1],
    );
    cafes.tick([owner.state, actor.state], 10000);
    assert.deepEqual(
      store.orders(c.id).map((o) => o.seat),
      [1],
    );
  } finally {
    cafes.shutdown();
  }
});
test("ten cats initialize on clear floor positions even around their furniture", () => {
  const { cafes, c } = setup();
  try {
    c.cats = Array.from({ length: 10 }, (_, i) => ({
      ...c.cats[0],
      id: `pose-cat-${i}`,
    }));
    const life = new CafeLife();
    life.sync(c, [], [], 1000);
    const poses = life.poses(c);
    assert.equal(poses.length, 10);
    for (const p of poses) {
      assert.equal(roomBlocked(p.x, p.z, c.level, c.layout), false);
      for (const other of poses)
        if (other.id !== p.id)
          assert.ok(Math.hypot(p.x - other.x, p.z - other.z) >= 0.55);
    }
  } finally {
    cafes.shutdown();
  }
});
test("a chair reserves one real seat, supports a visitor, and standing returns to a clear approach", () => {
  const { store, cafes, c, actor } = setup();
  try {
    const seat = chair(c.layout, "table-0:back")!;
    Object.assign(actor.state, seat.approach);
    cafes.request(actor, action("sit", "table-0:back"), [actor.state], 1000);
    assert.equal(actor.state.sitting?.id, "table-0:back");
    assert.equal(actor.state.x, seat.x);
    assert.equal(actor.state.z, seat.z);
    const visitor: Actor = {
      state: { ...actor.state, id: "b", sitting: undefined, ...seat.approach },
    };
    store.ensure("b");
    assert.throws(
      () =>
        cafes.request(
          visitor,
          action("sit", "table-0:back"),
          [actor.state, visitor.state],
          1100,
        ),
      /using/,
    );
    cafes.stand(actor);
    assert.equal(actor.state.sitting, undefined);
    assert.equal(roomBlocked(actor.state.x, actor.state.z, 1, c.layout), false);
    cafes.request(
      visitor,
      action("sit", "table-0:back"),
      [actor.state, visitor.state],
      1200,
    );
    assert.ok(visitor.state.sitting);
  } finally {
    cafes.shutdown();
  }
});
test("carrying a real owned cat excludes coffee work and putting it down restores a floor pose", () => {
  const { store, cafes, c, actor } = setup();
  try {
    cafes.life.sync(c, [], [actor.state], 1000);
    const pose = cafes.life.poses(c)[0];
    Object.assign(actor.state, { x: pose.x, z: pose.z });
    cafes.request(actor, action("pickCat", c.cats[0].id), [actor.state], 1100);
    assert.equal(actor.state.carriedCatId, c.cats[0].id);
    cafes.life.sync(c, [], [actor.state], 1200);
    assert.equal(cafes.life.poses(c)[0].activity, "carried");
    cafes.request(actor, action("open"), [actor.state], 1300);
    assert.throws(
      () => cafes.request(actor, action("workStart"), [actor.state], 1400),
      /Put your cat down/,
    );
    cafes.request(actor, action("putCat"), [actor.state], 1500);
    assert.equal(actor.state.carriedCatId, undefined);
    assert.equal(cafes.life.poses(c)[0].y, 0);
    assert.equal(cafes.life.poses(c)[0].id, c.cats[0].id);
    assert.throws(
      () =>
        cafes.request(
          actor,
          action("pickCat", "someone-elses-cat"),
          [actor.state],
          1600,
        ),
      /Choose one/,
    );
  } finally {
    cafes.shutdown();
  }
});
test("furniture rejects walls, overlap, entrance blockage and unsafe ownership without changing a save", () => {
  const { store, cafes, c, actor } = setup();
  try {
    const target = (id: string, x: number, z: number, rotation = 0) =>
      JSON.stringify({ id, x, z, rotation });
    for (const invalid of [
      target("table-0", 0, 4),
      target("table-0", 1.5, 0.5),
      target("bed", 8, 0),
      target("tree", 4, 0, 4),
    ])
      assert.throws(() => changedLayout(c, invalid));
    const valid = target("table-1", 0.5, 0.5),
      next = changedLayout(c, valid);
    assert.equal(roomBlocked(1.3, -0.85, 1, c.layout), true);
    assert.equal(roomBlocked(1.3, -0.85, 1, next), false);
    cafes.request(actor, action("moveFurniture", valid), [actor.state], 1000);
    assert.equal(
      store.get(c.id).layout.find((f) => f.id === "table-1")!.x,
      0.5,
    );
    cafes.request(actor, action("open"), [actor.state], 1100);
    assert.throws(
      () =>
        cafes.request(
          actor,
          action("moveFurniture", valid),
          [actor.state],
          1200,
        ),
      /Close/,
    );
    const visitor: Actor = { state: { ...actor.state, id: "b" } };
    store.ensure("b");
    assert.throws(
      () =>
        cafes.request(
          visitor,
          action("moveFurniture", valid),
          [actor.state, visitor.state],
          1300,
        ),
      /own café/,
    );
  } finally {
    cafes.shutdown();
  }
});
test("server cat routines include walking, resting, grooming and a real elevated perch", () => {
  const { cafes, c, actor } = setup();
  try {
    const life = new CafeLife(),
      states = new Set<string>();
    let high = false;
    for (let now = 1000; now < 181000; now += 100) {
      life.sync(c, [], [actor.state], now);
      for (const pose of life.poses(c)) {
        states.add(pose.activity);
        high ||= pose.y > 1.4;
        assert.ok(Math.abs(pose.x) < 6 && Math.abs(pose.z) < 5);
      }
    }
    for (const state of ["walking", "sleeping", "grooming", "climbing"])
      assert.ok(states.has(state), state);
    assert.ok(high, "cat reaches its elevated perch");
  } finally {
    cafes.shutdown();
  }
});
test("decor improvements expand real cat capacity while every adoption still costs coins", () => {
  const { store, cafes, c } = setup();
  try {
    for (let i = 0; i < 10; i++) sale(store, c.id, i);
    store.purchase("a", "decor-up", "decor");
    assert.equal(slotLimit(store.get(c.id).level), 6);
    assert.equal(slotLimit(1), 3);
    assert.equal(slotLimit(3), 10);
    store.buyCatSlot("a", "owned-slot");
    const before = store.get(c.id).coins;
    store.purchase("a", "adopt-design", "adopt", 4);
    assert.equal(store.get(c.id).coins, before - CAT_PRICES[4]);
    assert.equal(store.get(c.id).cats[1].coat, 4);
  } finally {
    cafes.shutdown();
  }
});
test("cat slots cost money once, expand with the building, and stop at ten", () => {
  const { store, cafes, c } = setup();
  try {
    assert.equal(store.get(c.id).catSlots, 1);
    assert.throws(
      () => store.purchase("a", "too-many-cats", "adopt", 0),
      /slot/,
    );
    for (let i = 0; i < 200; i++) {
      if (store.get(c.id).beans === 0)
        store.purchase("a", `supply-${i}`, "beans");
      sale(store, c.id, i);
    }
    store.purchase("a", "expand-two", "decor");
    store.purchase("a", "expand-three", "decor");
    for (let i = 1; i < 10; i++) {
      const before = store.get(c.id).coins;
      store.buyCatSlot("a", `slot-${i}`);
      store.buyCatSlot("a", `slot-${i}`);
      assert.equal(store.get(c.id).coins, before - i * 50);
    }
    const before = store.get(c.id).coins;
    assert.equal(store.get(c.id).catSlots, 10);
    assert.throws(() => store.buyCatSlot("a", "eleventh-slot"), /10 cat/);
    assert.equal(store.get(c.id).coins, before);
    for (let i = 0; i < 8; i++)
      store.purchase("a", `fill-slot-${i}`, "adopt", 0);
    const lastCatBalance = store.get(c.id).coins;
    store.purchase("a", "default-tenth-cat", "adopt");
    assert.equal(store.get(c.id).cats.length, 10);
    assert.equal(store.get(c.id).cats[9].coat, 7);
    assert.equal(store.get(c.id).coins, lastCatBalance - CAT_PRICES[7]);
    assert.throws(
      () => store.purchase("a", "eleventh-cat", "adopt", 0),
      /slot/,
    );
  } finally {
    cafes.shutdown();
  }
});
test("a visitor spends their own food to help a neighbour's cats without touching the owner's wallet", () => {
  const { store, cafes, c } = setup();
  try {
    const visitor = store.ensure("visitor");
    store.visitorCare("visitor", "visit-feed-1", c.id, true);
    store.visitorCare("visitor", "visit-feed-1", c.id, true);
    assert.equal(store.byOwner("visitor").food, visitor.food - 1);
    assert.equal(store.get(c.id).food, 5);
    assert.equal(store.get(c.id).cats[0].happiness, 100);
    assert.equal(store.byOwner("visitor").cats[0].happiness, 80);
    assert.equal(store.get(c.id).coins, 150);
    assert.equal(store.byOwner("visitor").coins, 150);
    assert.throws(
      () => store.visitorCare("visitor", "missing-cat", c.id, true, "missing"),
      /does not live/,
    );
    assert.equal(store.byOwner("visitor").food, 4);
  } finally {
    cafes.shutdown();
  }
});
test("furniture belongs to inventory until safely placed, can be stored again, and payment is idempotent", () => {
  const { store, cafes, c } = setup();
  try {
    store.buyFurniture("a", "buy-toy", "toy");
    store.buyFurniture("a", "buy-toy", "toy");
    let current = store.get(c.id);
    assert.equal(current.coins, 105);
    const toy = current.layout.find((f) => f.kind === "toy")!;
    assert.equal(toy.placed, false);
    const place = JSON.stringify({
      id: toy.id,
      x: -4,
      z: 1,
      rotation: 0,
      placed: true,
    });
    store.moveFurniture("a", "place-toy", changedLayout(current, place), place);
    current = store.get(c.id);
    assert.equal(roomBlocked(-4, 1, 1, current.layout), true);
    const putAway = JSON.stringify({
      id: toy.id,
      x: -4,
      z: 1,
      rotation: 0,
      placed: false,
    });
    store.moveFurniture(
      "a",
      "store-toy",
      changedLayout(current, putAway),
      putAway,
    );
    assert.equal(roomBlocked(-4, 1, 1, store.get(c.id).layout), false);
    assert.equal(store.get(c.id).coins, 105);
  } finally {
    cafes.shutdown();
  }
});
test("sprint is a bounded server speed choice, rejects injected speeds, and slows when hands are occupied", () => {
  const town = new Town(),
    socket = {
      readyState: WebSocket.OPEN,
      bufferedAmount: 0,
      send() {},
      close() {},
    } as unknown as WebSocket;
  const actor = town.join(
    { id: "runner", name: "Runner" } as any,
    socket,
    1000,
  )!;
  const start = actor.state.x;
  town.command(
    "runner",
    socket,
    JSON.stringify({ type: "input", seq: 1, x: 1, z: 0, sprint: true }),
    1000,
  );
  town.tick(0.05, 1000);
  assert.ok(Math.abs(actor.state.x - start - 0.4) < 1e-8);
  const next = actor.state.x;
  town.command(
    "runner",
    socket,
    JSON.stringify({ type: "input", seq: 2, x: 1, z: 0, sprint: 999 }),
    1400,
  );
  town.tick(0.05, 1400);
  assert.equal(actor.state.x, next);
  actor.state.carriedCatId = "owned-cat";
  town.command(
    "runner",
    socket,
    JSON.stringify({ type: "input", seq: 3, x: 1, z: 0, sprint: true }),
    1500,
  );
  town.tick(0.05, 1500);
  assert.ok(Math.abs(actor.state.x - next - 0.25) < 1e-8);
});
test("storing the final food bowl is rejected, but a placed replacement allows it", () => {
  const { store, cafes, c } = setup();
  try {
    const putAway = JSON.stringify({
      id: "bowl",
      x: 5,
      z: 2,
      rotation: 0,
      placed: false,
    });
    assert.throws(() => changedLayout(c, putAway), /Keep a food bowl/);
    store.buyFurniture("a", "replacement-bowl", "bowl");
    let current = store.get(c.id);
    const bowl = current.layout.find(
      (f) => f.kind === "bowl" && f.id !== "bowl",
    )!;
    const place = JSON.stringify({ id: bowl.id, x: -4, z: 1, rotation: 0 });
    store.moveFurniture(
      "a",
      "place-new-bowl",
      changedLayout(current, place),
      place,
    );
    current = store.get(c.id);
    assert.equal(
      changedLayout(current, putAway).find((f) => f.id === "bowl")!.placed,
      false,
    );
  } finally {
    cafes.shutdown();
  }
});
test("furniture blocking a queued destination cancels the route instead of trapping the walker", () => {
  const { store, cafes, c } = setup();
  try {
    const messages: any[] = [];
    const socket = {
      readyState: WebSocket.OPEN,
      bufferedAmount: 0,
      send(raw: string) {
        messages.push(JSON.parse(raw));
      },
      close() {},
    } as unknown as WebSocket;
    const town = new Town(2, 15000, 42, 2, cafes);
    const walker = town.join({ id: "a", name: "A" } as any, socket, 1000)!;
    Object.assign(walker.state, { area: c.id, x: -4, z: 2 });
    walker.path = [
      { x: -4, z: 1.5 },
      { x: -4, z: 1 },
    ];
    walker.pending = action("walk", JSON.stringify({ x: -4, z: 1 }));
    store.buyFurniture("a", "blocking-toy", "toy");
    const current = store.get(c.id),
      toy = current.layout.find((f) => f.kind === "toy")!;
    const place = JSON.stringify({ id: toy.id, x: -4, z: 1, rotation: 0 });
    store.moveFurniture(
      "a",
      "block-route",
      changedLayout(current, place),
      place,
    );
    town.tick(0.05, 1100);
    assert.deepEqual(walker.path, []);
    assert.equal(walker.pending, undefined);
    assert.equal(walker.state.x, -4);
    assert.equal(walker.state.z, 2);
    assert.ok(
      messages.some(
        (m) => m.type === "result" && !m.ok && /space changed/.test(m.message),
      ),
    );
  } finally {
    cafes.shutdown();
  }
});
