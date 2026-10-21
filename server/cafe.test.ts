import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GameStore } from "./game-store.ts";
import { Cafes, type Actor } from "./cafes.ts";
import { doorway } from "../shared/world.ts";
import { route, roomBlocked, step } from "../shared/navigation.ts";
const actor = (id: string): Actor => ({
  state: {
    id,
    sessionId: id,
    name: id,
    lot: id === "a" ? 0 : 1,
    x: 0,
    z: 3,
    rotation: 0,
    moving: false,
    connected: true,
    color: 0,
    area: "town",
  },
});
const action = (action: any, requestId: string, target?: string) => ({
  type: "action" as const,
  action,
  requestId,
  target,
});
test("building entrance, private access and interior owner permissions", () => {
  const store = new GameStore(":memory:"),
    cafes = new Cafes(store),
    a = actor("a"),
    b = actor("b");
  const ca = cafes.join("a");
  cafes.join("b");
  const players = [a.state, b.state];
  try {
    assert.throws(
      () =>
        cafes.request(a, action("enter", "entrance-1", ca.id), players, 1000),
      /entrance/,
    );
    Object.assign(a.state, doorway(0));
    cafes.request(a, action("enter", "entrance-2", ca.id), players, 1000);
    assert.equal(a.state.area, ca.id);
    Object.assign(b.state, doorway(0));
    cafes.request(b, action("enter", "entrance-3", ca.id), players, 1000);
    assert.throws(
      () => cafes.request(b, action("beans", "visitor-buy"), players, 1000),
      /own café/,
    );
    assert.equal(store.byOwner("a").coins, 150);
    cafes.request(a, action("privacy", "privacy-1"), players, 1000);
    b.state.area = "town";
    assert.throws(
      () =>
        cafes.request(b, action("enter", "entrance-4", ca.id), players, 1000),
      /private/,
    );
    assert.equal(store.byOwner("b").coins, 150);
  } finally {
    cafes.shutdown();
  }
});
test("complete order lifecycle consumes one bean and credits exactly one payment", () => {
  const s = new GameStore(":memory:");
  try {
    const c = s.ensure("a");
    const id = s.createOrder(c.id, 1000)!;
    s.prepare("a", "prepare-1", id, 1000);
    s.prepare("a", "prepare-1", id, 1000);
    assert.equal(s.byOwner("a").beans, 11);
    assert.throws(() => s.serve("a", "serve-tooearly", id, 2000), /not ready/);
    s.advance(c.id, 5001);
    assert.equal(s.orders(c.id)[0].status, "READY");
    s.pickup("a", "pickup-1", id);
    s.serve("a", "serve-1", id, 5100);
    s.serve("a", "serve-1", id, 5100);
    assert.equal(s.byOwner("a").coins, 150);
    s.advance(c.id, 8101);
    s.advance(c.id, 8200);
    assert.equal(s.byOwner("a").coins, 178);
    assert.equal(s.byOwner("a").served, 1);
    assert.equal(s.byOwner("a").revenue, 28);
    assert.equal(s.orders(c.id).length, 0);
  } finally {
    s.close();
  }
});
test("purchases are atomic, idempotent, capacity checked and cannot overspend", () => {
  const s = new GameStore(":memory:");
  try {
    s.ensure("a");
    s.purchase("a", "purchase-1", "beans");
    s.purchase("a", "purchase-1", "beans");
    assert.equal(s.byOwner("a").coins, 110);
    assert.equal(s.byOwner("a").beans, 22);
    assert.throws(
      () => s.purchase("a", "purchase-1", "food"),
      /another action/,
    );
    s.purchase("a", "purchase-2", "adopt");
    assert.equal(s.byOwner("a").cats.length, 2);
    assert.equal(new Set(s.byOwner("a").cats.map((c) => c.id)).size, 2);
    assert.throws(() => s.purchase("a", "purchase-3", "decor"), /Not enough/);
    assert.equal(s.byOwner("a").coins, 10);
    assert.equal(s.byOwner("a").level, 1);
    s.care("a", "feed-0001", true);
    s.care("a", "feed-0001", true);
    assert.equal(s.byOwner("a").food, 4);
    assert.ok(s.byOwner("a").cats.every((c) => c.happiness === 100));
  } finally {
    s.close();
  }
});
test("database restart preserves progress and cancels/refunds unfinished orders once", () => {
  const dir = mkdtempSync(join(tmpdir(), "miaw-sql-"));
  const path = join(dir, "game.sqlite");
  let s = new GameStore(path);
  try {
    const c = s.ensure("a");
    s.purchase("a", "purchase-1", "beans");
    const order = s.createOrder(c.id, 1000)!;
    s.prepare("a", "prepare-1", order, 1000);
    assert.equal(s.byOwner("a").beans, 21);
    s.close();
    s = new GameStore(path);
    assert.equal(s.byOwner("a").id, c.id);
    assert.equal(s.byOwner("a").coins, 110);
    assert.equal(s.byOwner("a").beans, 22);
    assert.equal(s.orders(c.id).length, 0);
    s.close();
    s = new GameStore(path);
    assert.equal(s.byOwner("a").beans, 22);
  } finally {
    s.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("cafés are isolated and closing or disconnecting cannot generate passive money", () => {
  const s = new GameStore(":memory:"),
    cafes = new Cafes(s),
    a = actor("a"),
    b = actor("b");
  const ca = cafes.join("a"),
    cb = cafes.join("b");
  a.state.area = ca.id;
  b.state.area = cb.id;
  try {
    cafes.request(a, action("open", "open-0001"), [a.state, b.state], 1000);
    const order = s.orders(ca.id)[0];
    assert.throws(
      () => s.prepare("b", "steal-001", order.id, 1000),
      /no longer/,
    );
    s.prepare("a", "prepare-1", order.id, 1000);
    cafes.disconnect("a");
    cafes.tick([a.state, b.state], 999999);
    assert.equal(s.orders(ca.id).length, 0);
    assert.equal(s.byOwner("a").coins, 150);
    assert.equal(s.byOwner("a").beans, 12);
    assert.equal(s.byOwner("b").coins, 150);
  } finally {
    cafes.shutdown();
  }
});
test("server pathfinding routes around walls and interior furniture", () => {
  const path = route({ x: 0, z: 3 }, doorway(0));
  assert.ok(path.length > 40);
  let p = { x: 0, z: 4 };
  const roomPath = route(p, { x: -3.5, z: -2.2 }, true);
  for (const target of roomPath) {
    for (
      let i = 0;
      i < 100 && Math.hypot(p.x - target.x, p.z - target.z) > 0.15;
      i++
    ) {
      const d = Math.hypot(target.x - p.x, target.z - p.z);
      p = step(p, (target.x - p.x) / d, (target.z - p.z) / d, 0.05, true);
      assert.equal(roomBlocked(p.x, p.z), false);
    }
  }
  assert.ok(Math.hypot(p.x + 3.5, p.z + 2.2) < 0.2);
  assert.throws(() => route(p, { x: -1.6, z: 0.3 }, true), /blocked/);
});

test("database failure after a debit rolls back coins, adoption and ledger together", () => {
  const s = new GameStore(":memory:");
  try {
    s.ensure("a");
    (s as any).db.exec(
      "CREATE TRIGGER fail_adoption BEFORE INSERT ON cats BEGIN SELECT RAISE(ABORT,'test database failure'); END;",
    );
    assert.throws(
      () => s.purchase("a", "rollback-1", "adopt"),
      /test database failure/,
    );
    assert.equal(s.byOwner("a").coins, 150);
    assert.equal(s.byOwner("a").cats.length, 1);
    assert.equal(
      (s as any).db.prepare("SELECT COUNT(*) AS n FROM ledger").get().n,
      0,
    );
  } finally {
    s.close();
  }
});

test("three unique cats and maximum decorations enforce capacity before charging", () => {
  const s = new GameStore(":memory:");
  try {
    const c = s.ensure("a");
    let seq = 0;
    const sale = () => {
      const n = seq++,
        time = 1000 + n * 10000,
        id = s.createOrder(c.id, time)!;
      s.prepare("a", "prepare-" + n, id, time);
      s.advance(c.id, time + 4001);
      s.pickup("a", "pickup-" + n, id);
      s.serve("a", "serve-" + n, id, time + 4100);
      s.advance(c.id, time + 7101);
    };
    for (let i = 0; i < 12; i++) sale();
    s.purchase("a", "restock-001", "beans");
    s.purchase("a", "adoption-a", "adopt");
    s.purchase("a", "adoption-b", "adopt");
    assert.equal(s.byOwner("a").cats.length, 3);
    assert.equal(new Set(s.byOwner("a").cats.map((c) => c.id)).size, 3);
    let before = s.byOwner("a").coins;
    assert.throws(() => s.purchase("a", "adoption-c", "adopt"), /home is full/);
    assert.equal(s.byOwner("a").coins, before);
    s.purchase("a", "decorate-a", "decor");
    for (let i = 0; i < 4; i++) sale();
    s.purchase("a", "decorate-b", "decor");
    before = s.byOwner("a").coins;
    assert.equal(s.byOwner("a").level, 3);
    assert.throws(
      () => s.purchase("a", "decorate-c", "decor"),
      /fully decorated/,
    );
    assert.equal(s.byOwner("a").coins, before);
  } finally {
    s.close();
  }
});

test("a client cannot poison the automatic payment transaction namespace", () => {
  const s = new GameStore(":memory:");
  try {
    const c = s.ensure("a"),
      id = s.createOrder(c.id, 1000)!;
    s.purchase("a", "payment:" + id, "food");
    s.prepare("a", "prepare-1", id, 1000);
    s.advance(c.id, 5001);
    s.pickup("a", "pickup-1", id);
    s.serve("a", "serve-1", id, 5100);
    s.advance(c.id, 8101);
    s.advance(c.id, 8200);
    assert.equal(s.byOwner("a").coins, 163);
    assert.equal(s.byOwner("a").served, 1);
  } finally {
    s.close();
  }
});
