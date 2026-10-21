import { randomUUID } from "node:crypto";
import { WebSocket } from "ws";
import { move } from "../shared/world.ts";
import type { PlayerState } from "../shared/protocol.ts";
import type { Profile } from "./profiles.ts";
type Resident = {
  state: PlayerState;
  socket: WebSocket | null;
  input: { x: number; z: number; seq: number; at: number };
  expires: number;
  window: number;
  messages: number;
};
export class Town {
  residents = new Map<string, Resident>();
  tickCount = 0;
  constructor(
    readonly capacity = 2,
    readonly graceMs = 15000,
    readonly visibility = 42,
    readonly replicateEveryTicks = 2,
  ) {}
  send(ws: WebSocket, data: unknown) {
    if (ws.readyState === WebSocket.OPEN && ws.bufferedAmount < 128000)
      ws.send(JSON.stringify(data));
  }
  join(profile: Profile, ws: WebSocket, now = Date.now()) {
    this.expire(now);
    let r = this.residents.get(profile.id);
    const resumed = !!r;
    if (!r) {
      if (this.residents.size >= this.capacity) {
        this.send(ws, {
          type: "error",
          code: "FULL",
          message: "Town Is Full.",
        });
        ws.close(4003, "Town full");
        return;
      }
      const taken = new Set(
        [...this.residents.values()].map((r) => r.state.lot),
      );
      let lot = 0;
      while (taken.has(lot)) lot++;
      r = {
        state: {
          id: profile.id,
          sessionId: randomUUID(),
          name: profile.name,
          lot,
          x: -3 + lot * 3,
          z: 3,
          rotation: 0,
          moving: false,
          connected: true,
          color: [0x748f78, 0xc68e78, 0x8c9ebb, 0xc6ad72][lot % 4],
        },
        socket: ws,
        input: { x: 0, z: 0, seq: -1, at: now },
        expires: 0,
        window: now,
        messages: 0,
      };
      this.residents.set(profile.id, r);
    } else {
      const old = r.socket;
      r.socket = ws;
      if (old && old !== ws) {
        this.send(old, {
          type: "error",
          code: "REPLACED",
          message: "This guest is active in another tab.",
        });
        old.close(4001, "Session replaced");
      }
      r.state.connected = true;
      r.state.moving = false;
      r.expires = 0;
      r.input = { x: 0, z: 0, seq: -1, at: now };
      r.window = now;
      r.messages = 0;
    }
    this.send(ws, {
      type: "welcome",
      self: r.state,
      town: "Town 001",
      capacity: this.capacity,
      reconnectMs: this.graceMs,
      resumed,
    });
    this.broadcast(now);
    return r;
  }
  disconnect(id: string, ws: WebSocket, now = Date.now()) {
    const r = this.residents.get(id);
    if (!r || r.socket !== ws) return;
    r.socket = null;
    r.state.connected = false;
    r.state.moving = false;
    r.input.x = 0;
    r.input.z = 0;
    r.expires = now + this.graceMs;
    this.broadcast(now);
  }
  command(id: string, ws: WebSocket, raw: string, now = Date.now()) {
    const r = this.residents.get(id);
    if (!r || r.socket !== ws || !r.state.connected) return;
    if (now - r.window >= 1000) {
      r.window = now;
      r.messages = 0;
    }
    if (++r.messages > 45) {
      ws.close(4008, "Input rate exceeded");
      return;
    }
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      ws.close(1008, "Invalid message");
      return;
    }
    if (
      msg?.type !== "input" ||
      !Number.isSafeInteger(msg.seq) ||
      msg.seq <= r.input.seq ||
      typeof msg.x !== "number" ||
      typeof msg.z !== "number" ||
      !Number.isFinite(msg.x) ||
      !Number.isFinite(msg.z) ||
      Math.abs(msg.x) > 1 ||
      Math.abs(msg.z) > 1 ||
      Object.keys(msg).some((k) => !["type", "seq", "x", "z"].includes(k))
    )
      return;
    r.input = { x: msg.x, z: msg.z, seq: msg.seq, at: now };
  }
  expire(now = Date.now()) {
    for (const [id, r] of this.residents)
      if (!r.socket && r.expires <= now) this.residents.delete(id);
  }
  tick(dt = 0.05, now = Date.now()) {
    this.expire(now);
    this.tickCount++;
    for (const r of this.residents.values()) {
      const active = r.state.connected && now - r.input.at < 350;
      const x = active ? r.input.x : 0,
        z = active ? r.input.z : 0;
      const pos = move(r.state, x, z, dt);
      r.state.moving = pos.x !== r.state.x || pos.z !== r.state.z;
      if (r.state.moving) r.state.rotation = Math.atan2(x, z);
      Object.assign(r.state, pos);
    }
    if (this.tickCount % this.replicateEveryTicks === 0) this.broadcast(now);
  }
  broadcast(now = Date.now()) {
    const connected = [...this.residents.values()].filter(
      (r) => r.state.connected,
    ).length;
    for (const r of this.residents.values())
      if (r.socket) {
        const players = [...this.residents.values()]
          .filter(
            (p) =>
              p === r ||
              Math.hypot(p.state.x - r.state.x, p.state.z - r.state.z) <=
                this.visibility,
          )
          .map((p) => p.state);
        this.send(r.socket, {
          type: "state",
          tick: this.tickCount,
          time: now,
          connected,
          players,
        });
      }
  }
}
