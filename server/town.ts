import { doorway } from "../shared/world.ts";
import { randomUUID } from "node:crypto";
import { WebSocket } from "ws";
import { step, route, roomBlocked } from "../shared/navigation.ts";
import type { Point } from "../shared/navigation.ts";
import { Cafes, type Actor } from "./cafes.ts";
import type { Action } from "../shared/cafe.ts";
import type { PlayerState } from "../shared/protocol.ts";
import type { Profile } from "./profiles.ts";
type Resident = Actor & {
  state: PlayerState;
  socket: WebSocket | null;
  input: { x: number; z: number; seq: number; at: number; sprint?: boolean };
  expires: number;
  window: number;
  messages: number;
  path?: Point[];
  pending?: Action;
  returnPosition?: Point;
};
export class Town {
  residents = new Map<string, Resident>();
  tickCount = 0;
  constructor(
    readonly capacity = 2,
    readonly graceMs = 15000,
    readonly visibility = 42,
    readonly replicateEveryTicks = 2,
    readonly cafes?: Cafes,
  ) {}
  send(ws: WebSocket, data: unknown) {
    if (ws.readyState !== WebSocket.OPEN) return;
    if (ws.bufferedAmount >= 128000) {
      ws.close(1013, "Client is too slow; reconnect to restore state");
      return;
    }
    ws.send(JSON.stringify(data));
  }
  join(profile: Profile, ws: WebSocket, now = Date.now()) {
    this.expire(now);
    this.cafes?.join(profile.id);
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
          x: this.cafes ? doorway(lot).x + 1.5 : -3 + lot * 3,
          z: this.cafes ? doorway(lot).z + (lot < 10 ? 2.5 : -2.5) : 3,
          rotation: 0,
          moving: false,
          connected: true,
          area: "town",
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
    if (this.cafes)
      this.send(ws, {
        type: "personal",
        cafe: this.cafes.store.byOwner(profile.id),
      });
    this.broadcast(now);
    return r;
  }
  disconnect(id: string, ws: WebSocket, now = Date.now()) {
    const r = this.residents.get(id);
    if (!r || r.socket !== ws) return;
    this.cafes?.cancelWork(r);
    this.cafes?.stand(r);
    if (r.state.carriedCatId && this.cafes) {
      const cafe = this.cafes.store.byOwner(id);
      this.cafes.life.drop(cafe, r.state.carriedCatId, r.state, now);
    }
    r.state.carriedCatId = undefined;
    r.state.carriedOrderId = undefined;
    this.cafes?.disconnect(id);
    r.pending = undefined;
    r.path = [];
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
    if (msg?.type === "work" && this.cafes) {
      if (
        typeof msg.id !== "string" ||
        !/^[a-zA-Z0-9:_-]{8,100}$/.test(msg.id) ||
        !["pulse", "stop"].includes(msg.phase) ||
        Object.keys(msg).some((k) => !["type", "id", "phase"].includes(k))
      )
        return;
      if (r.work?.id !== msg.id) return;
      if (msg.phase === "pulse") this.cafes.workPulse(r, msg.id, now);
      else {
        const stopped = this.cafes.cancelWork(r);
        if (stopped)
          this.send(ws, {
            type: "result",
            requestId: stopped.id,
            ok: false,
            message: stopped.message,
          });
        this.broadcast(now);
      }
      return;
    }
    if (msg?.type === "action" && this.cafes) {
      if (
        typeof msg.requestId !== "string" ||
        !/^[a-zA-Z0-9:_-]{8,100}$/.test(msg.requestId) ||
        typeof msg.action !== "string" ||
        (msg.target !== undefined && typeof msg.target !== "string") ||
        Object.keys(msg).some(
          (k) => !["type", "requestId", "action", "target"].includes(k),
        )
      )
        return;
      if (r.state.doorTransition && now < r.state.doorTransition.endsAt) {
        this.send(ws, {
          type: "result",
          requestId: msg.requestId,
          ok: false,
          message: "Walking through the doorway…",
        });
        return;
      }
      if (r.pending)
        this.send(ws, {
          type: "result",
          requestId: r.pending.requestId,
          ok: false,
          message: "Previous interaction cancelled.",
        });
      r.pending = undefined;
      r.path = [];
      if (r.work) {
        const stopped = this.cafes.cancelWork(r);
        if (stopped)
          this.send(ws, {
            type: "result",
            requestId: stopped.id,
            ok: false,
            message: stopped.message,
          });
      }
      this.execute(r, msg, now);
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
      (msg.sprint !== undefined && typeof msg.sprint !== "boolean") ||
      Object.keys(msg).some(
        (k) => !["type", "seq", "x", "z", "sprint"].includes(k),
      )
    )
      return;
    if ((msg.x !== 0 || msg.z !== 0) && r.pending) {
      this.send(ws, {
        type: "result",
        requestId: r.pending.requestId,
        ok: false,
        message: "Walking cancelled by movement.",
      });
      r.pending = undefined;
      r.path = [];
    }
    if (msg.x !== 0 || msg.z !== 0) {
      this.cafes?.stand(r);
      r.path = [];
      if (r.work) {
        const stopped = this.cafes?.cancelWork(r);
        if (stopped)
          this.send(ws, {
            type: "result",
            requestId: stopped.id,
            ok: false,
            message: stopped.message,
          });
      }
    }
    r.input = {
      x: msg.x,
      z: msg.z,
      seq: msg.seq,
      at: now,
      sprint: msg.sprint === true,
    };
  }
  private execute(r: Resident, msg: Action, now: number) {
    if (!r.socket || !this.cafes) return;
    const previousArea = r.state.area;
    try {
      const result = this.cafes.request(
        r,
        msg,
        [...this.residents.values()].map((p) => p.state),
        now,
      );
      if (previousArea !== r.state.area) {
        r.state.moving = false;
        r.input.x = 0;
        r.input.z = 0;
      }
      this.send(r.socket, result);
      this.send(r.socket, {
        type: "personal",
        cafe: this.cafes.store.byOwner(r.state.id),
      });
    } catch (e) {
      r.pending = undefined;
      r.path = [];
      this.send(r.socket, {
        type: "result",
        requestId: msg.requestId,
        ok: false,
        message: e instanceof Error ? e.message : "Unable to complete action.",
      });
    }
    this.broadcast(now);
  }
  expire(now = Date.now()) {
    for (const [id, r] of this.residents)
      if (!r.socket && r.expires <= now) this.residents.delete(id);
  }
  tick(dt = 0.05, now = Date.now()) {
    this.expire(now);
    this.tickCount++;
    for (const r of this.residents.values()) {
      if (r.state.doorTransition && now >= r.state.doorTransition.endsAt)
        r.state.doorTransition = undefined;
      const workResult = this.cafes?.workTick(r, now);
      if (workResult && r.socket)
        this.send(r.socket, {
          type: "result",
          requestId: workResult.id,
          ok: workResult.ok,
          message: workResult.message,
        });
      const active =
        r.state.connected && now - r.input.at < 350 && !r.state.doorTransition;
      const room =
        this.cafes && r.state.area && r.state.area !== "town"
          ? this.cafes.store.get(r.state.area)
          : undefined;
      if (
        room &&
        r.path?.length &&
        roomBlocked(r.path[0].x, r.path[0].z, room.level, room.layout)
      ) {
        try {
          r.path = route(
            r.state,
            r.path.at(-1)!,
            true,
            room.level,
            room.layout,
          );
        } catch {
          if (r.socket)
            this.send(r.socket, {
              type: "result",
              requestId: r.pending?.requestId ?? `route:${this.tickCount}`,
              ok: false,
              message:
                "That space changed. Choose a clear route and try again.",
            });
          r.path = [];
          r.pending = undefined;
        }
      }
      let x = active ? r.input.x : 0,
        z = active ? r.input.z : 0;
      if (r.state.connected && r.path?.length) {
        const target = r.path[0],
          distance = Math.hypot(target.x - r.state.x, target.z - r.state.z);
        if (distance < 0.18) {
          r.path.shift();
        } else {
          x = (target.x - r.state.x) / distance;
          z = (target.z - r.state.z) / distance;
        }
      }
      const pos = step(
        r.state,
        x,
        z,
        dt,
        !!r.state.area && r.state.area !== "town",
        room?.level ?? 1,
        room?.layout,
        active &&
          r.input.sprint &&
          !r.state.carriedOrderId &&
          !r.state.carriedCatId
          ? 1.6
          : 1,
      );
      r.state.moving = pos.x !== r.state.x || pos.z !== r.state.z;
      if (r.state.moving) r.state.rotation = Math.atan2(x, z);
      Object.assign(r.state, pos);
      if (r.pending && !r.path?.length) {
        const action = r.pending;
        r.pending = undefined;
        this.execute(r, action, now);
      }
    }
    if (this.tickCount % this.replicateEveryTicks === 0) {
      this.cafes?.tick(
        [...this.residents.values()].map((p) => p.state),
        now,
      );
      this.broadcast(now);
    }
    if (this.cafes && this.tickCount % 20 === 0)
      for (const r of this.residents.values())
        if (r.socket)
          this.send(r.socket, {
            type: "personal",
            cafe: this.cafes.store.byOwner(r.state.id),
          });
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
              (p.state.area === r.state.area &&
                Math.hypot(p.state.x - r.state.x, p.state.z - r.state.z) <=
                  this.visibility),
          )
          .map((p) => p.state);
        this.send(r.socket, {
          type: "state",
          tick: this.tickCount,
          time: now,
          connected,
          players,
          ...(this.cafes
            ? {
                properties: [...this.residents.values()].map((p) =>
                  this.cafes!.property(p.state),
                ),
                cafe:
                  r.state.area && r.state.area !== "town"
                    ? this.cafes.view(
                        r.state.area,
                        [...this.residents.values()].find(
                          (p) =>
                            this.cafes!.store.byOwner(p.state.id).id ===
                            r.state.area,
                        )?.state.name ?? "Neighbor",
                      )
                    : undefined,
              }
            : {}),
        });
      }
  }
}
