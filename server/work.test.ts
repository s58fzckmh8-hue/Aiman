import { test } from "node:test";
import assert from "node:assert/strict";
import { Cafes, type Actor } from "./cafes.ts";
import { GameStore } from "./game-store.ts";
import { STATION, SERVICE_POINTS, type Action } from "../shared/cafe.ts";
const request = (
  action: Action["action"],
  requestId: string,
  target?: string,
): Action => ({ type: "action", action, requestId, target });
function fixture() {
  const store = new GameStore(":memory:"),
    cafes = new Cafes(store),
    c = cafes.join("a"),
    actor: Actor = {
      state: {
        id: "a",
        sessionId: "session-a",
        name: "A",
        lot: 0,
        x: STATION.x,
        z: STATION.z,
        rotation: 0,
        moving: false,
        connected: true,
        color: 0,
        area: c.id,
      },
    };
  cafes.request(actor, request("open", "open-0001"), [actor.state], 1000);
  const order = store.orders(c.id)[0];
  return { store, cafes, c, actor, order };
}
test("release and lost heartbeat reset brewing, refund exactly once and create no ready coffee", () => {
  const f = fixture();
  try {
    const { cafes, store, c, actor, order } = f;
    cafes.request(
      actor,
      request("workStart", "work-0001", order.id),
      [actor.state],
      1000,
    );
    assert.equal(store.byOwner("a").beans, 11);
    cafes.cancelWork(actor);
    cafes.cancelWork(actor);
    assert.equal(store.byOwner("a").beans, 12);
    assert.equal(store.orders(c.id)[0].status, "WAITING");
    cafes.request(
      actor,
      request("workStart", "work-0002", order.id),
      [actor.state],
      2000,
    );
    assert.equal(cafes.workTick(actor, 2701)?.ok, false);
    cafes.tick([actor.state], 9000);
    assert.equal(store.orders(c.id)[0].status, "WAITING");
    assert.equal(store.byOwner("a").beans, 12);
    assert.equal(store.byOwner("a").coins, 150);
  } finally {
    f.cafes.shutdown();
  }
});
test("continuous server-timed hold, physical pickup and nearby delivery are required", () => {
  const f = fixture();
  try {
    const { cafes, store, c, actor, order } = f;
    assert.throws(
      () =>
        cafes.request(
          actor,
          request("prepare", "old-button", order.id),
          [actor.state],
          1000,
        ),
      /hold/,
    );
    cafes.request(
      actor,
      request("workStart", "work-0001", order.id),
      [actor.state],
      1000,
    );
    for (let now = 1200; now <= 5000; now += 200) {
      cafes.workPulse(actor, "work-0001", now);
      cafes.workTick(actor, now);
      cafes.tick([actor.state], now);
    }
    assert.equal(store.orders(c.id)[0].status, "READY");
    assert.equal(store.byOwner("a").beans, 11);
    assert.throws(
      () =>
        cafes.request(
          actor,
          request("serve", "serve-0001", order.id),
          [actor.state],
          5100,
        ),
      /Pick up/,
    );
    cafes.request(
      actor,
      request("pickup", "pickup-001", order.id),
      [actor.state],
      5100,
    );
    assert.equal(actor.state.carriedOrderId, order.id);
    assert.throws(
      () =>
        cafes.request(
          actor,
          request("serve", "serve-0002", order.id),
          [actor.state],
          5200,
        ),
      /closer/,
    );
    Object.assign(actor.state, SERVICE_POINTS[order.seat]);
    cafes.request(
      actor,
      request("serve", "serve-0003", order.id),
      [actor.state],
      5300,
    );
    assert.equal(actor.state.carriedOrderId, undefined);
    cafes.tick([actor.state], 8301);
    cafes.tick([actor.state], 8400);
    assert.equal(store.byOwner("a").coins, 178);
    assert.equal(store.byOwner("a").served, 1);
  } finally {
    f.cafes.shutdown();
  }
});
test("remote or visitor work cannot start; moving away cancels a live hold", () => {
  const f = fixture();
  try {
    const { cafes, store, actor, order } = f;
    actor.state.z = 4;
    assert.throws(
      () =>
        cafes.request(
          actor,
          request("workStart", "work-0001", order.id),
          [actor.state],
          1000,
        ),
      /closer/,
    );
    assert.equal(store.byOwner("a").beans, 12);
    Object.assign(actor.state, STATION);
    cafes.request(
      actor,
      request("workStart", "work-0002", order.id),
      [actor.state],
      1000,
    );
    actor.state.x = 4;
    assert.equal(cafes.workTick(actor, 1100)?.ok, false);
    assert.equal(store.byOwner("a").beans, 12);
    const b = cafes.join("b");
    const visitor = { ...actor, state: { ...actor.state, id: "b" } };
    assert.throws(
      () =>
        cafes.request(
          visitor,
          request("workStart", "visitor-01", order.id),
          [actor.state, visitor.state],
          1200,
        ),
      /own café/,
    );
    assert.equal(b.coins, 150);
  } finally {
    f.cafes.shutdown();
  }
});
test("walking commands create bounded routes rather than teleporting players", () => {
  const f = fixture();
  try {
    const { cafes, actor } = f;
    const before = { x: actor.state.x, z: actor.state.z };
    cafes.request(
      actor,
      request("walk", "walking-01", JSON.stringify({ x: 0, z: 4 })),
      [actor.state],
      1000,
    );
    assert.ok(actor.path?.length);
    assert.deepEqual({ x: actor.state.x, z: actor.state.z }, before);
    assert.throws(
      () =>
        cafes.request(
          actor,
          request("walk", "walking-02", JSON.stringify({ x: 999, z: 999 })),
          [actor.state],
          1000,
        ),
      /blocked/,
    );
  } finally {
    f.cafes.shutdown();
  }
});
test("coat selection is durable and invalid designs cannot charge currency", () => {
  const f = fixture();
  try {
    const { store } = f;
    store.buyCatSlot("a","design-slot");
    store.purchase("a", "adopt-design", "adopt", 0);
    store.purchase("a", "adopt-design", "adopt", 0);
    assert.equal(store.byOwner("a").cats[1].coat, 0);
    assert.equal(store.byOwner("a").cats[1].name, "Oyen");
    assert.equal(store.byOwner("a").coins, 40);
    assert.throws(
      () => store.purchase("a", "adopt-invalid", "adopt", 999),
      /available cat/,
    );
    assert.equal(store.byOwner("a").coins, 40);
  } finally {
    f.cafes.shutdown();
  }
});
