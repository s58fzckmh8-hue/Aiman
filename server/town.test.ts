import { test } from "node:test";
import assert from "node:assert/strict";
import { WebSocket } from "ws";
import { Town } from "./town.ts";
import { blocked, move, WORLD } from "../shared/world.ts";
const profile = (id: string) => ({
  id,
  name: `Guest ${id}`,
  tokenHash: "0".repeat(64),
  createdAt: "now",
});
function socket() {
  const messages: unknown[] = [];
  const ws = {
    readyState: WebSocket.OPEN,
    bufferedAmount: 0,
    send: (s: string) => messages.push(JSON.parse(s)),
    close: (code: number) => {
      ws.readyState = WebSocket.CLOSED as typeof WebSocket.OPEN;
      ws.code = code;
    },
    code: 0,
  };
  return { ws: ws as unknown as WebSocket, raw: ws, messages };
}
test("server owns coordinates, normalized speed and rejects teleport/injected currency", () => {
  const town = new Town();
  const { ws } = socket();
  const r = town.join(profile("a"), ws, 1000)!;
  const initial = r.state.x;
  town.command(
    "a",
    ws,
    JSON.stringify({ type: "input", seq: 0, x: 1, z: 0, money: 9999 }),
    1000,
  );
  town.tick(0.05, 1000);
  assert.equal(r.state.x, initial);
  town.command(
    "a",
    ws,
    JSON.stringify({ type: "input", seq: 1, x: 1, z: 1 }),
    1000,
  );
  town.tick(0.05, 1000);
  assert.ok(
    Math.abs(
      Math.hypot(r.state.x - initial, r.state.z - 3) - WORLD.speed * 0.05,
    ) < 1e-8,
  );
  town.command(
    "a",
    ws,
    JSON.stringify({ type: "input", seq: 2, x: 999, z: 0 }),
    1001,
  );
  const x = r.state.x;
  town.tick(0.05, 1400);
  assert.equal(r.state.x, x, "stale input stops movement");
});
test("building and world collision reject walls including long tick movement", () => {
  let p = { x: -40, z: -10 };
  for (let i = 0; i < 50; i++) p = move(p, 0, -1, 0.05);
  assert.ok(p.z > -12.13);
  assert.equal(blocked(p.x, p.z), false);
  let edge = { x: 47, z: 0 };
  for (let i = 0; i < 20; i++) edge = move(edge, 1, 0, 99);
  assert.ok(edge.x <= WORLD.maxX - WORLD.radius);
});
test("reconnect preserves identity and lot, old close/input cannot control replacement", () => {
  const town = new Town(2, 100);
  const a = socket(),
    b = socket(),
    c = socket();
  const r = town.join(profile("a"), a.ws, 1000)!;
  town.disconnect("a", a.ws, 1010);
  assert.equal(r.state.connected, false);
  town.join(profile("a"), b.ws, 1050);
  assert.equal(town.residents.size, 1);
  assert.equal(town.residents.get("a")!.state.sessionId, r.state.sessionId);
  town.join(profile("a"), c.ws, 1051);
  assert.equal(b.raw.code, 4001);
  town.disconnect("a", b.ws, 1052);
  assert.equal(r.state.connected, true);
  town.command(
    "a",
    b.ws,
    JSON.stringify({ type: "input", seq: 0, x: 1, z: 0 }),
    1052,
  );
  assert.equal(r.input.x, 0);
  town.disconnect("a", c.ws, 1060);
  town.expire(1161);
  assert.equal(town.residents.size, 0);
});
test("capacity counts held reservations, expiry frees slots and count is real", () => {
  const town = new Town(2, 100);
  const a = socket(),
    b = socket(),
    c = socket();
  town.join(profile("a"), a.ws, 1000);
  town.join(profile("b"), b.ws, 1000);
  town.disconnect("a", a.ws, 1001);
  assert.equal(town.join(profile("c"), c.ws, 1050), undefined);
  assert.equal(c.raw.code, 4003);
  const d = socket();
  town.join(profile("c"), d.ws, 1102);
  assert.equal(town.residents.size, 2);
  assert.equal(town.residents.get("c")!.state.lot, 0);
});
test("duplicate input sequence cannot replay commands and rate is bounded", () => {
  const town = new Town();
  const a = socket();
  const r = town.join(profile("a"), a.ws, 1000)!;
  town.command(
    "a",
    a.ws,
    JSON.stringify({ type: "input", seq: 5, x: 1, z: 0 }),
    1000,
  );
  town.command(
    "a",
    a.ws,
    JSON.stringify({ type: "input", seq: 4, x: -1, z: 0 }),
    1000,
  );
  assert.equal(r.input.x, 1);
  for (let i = 6; i < 55; i++)
    town.command(
      "a",
      a.ws,
      JSON.stringify({ type: "input", seq: i, x: 0, z: 0 }),
      1000,
    );
  assert.equal(a.raw.code, 4008);
});
test("interest management excludes distant players but preserves real global count", () => {
  const town = new Town();
  const a = socket(),
    b = socket();
  town.join(profile("a"), a.ws);
  const r = town.join(profile("b"), b.ws)!;
  r.state.x = 47;
  r.state.z = 25;
  town.broadcast();
  const state = a.messages.at(-1) as { players: unknown[]; connected: number };
  assert.equal(state.players.length, 1);
  assert.equal(state.connected, 2);
});
