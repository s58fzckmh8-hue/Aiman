import { GameStore } from "./game-store.ts";
import {
  STATION,
  SERVICE_POINTS,
  ENTRY,
  type Action,
  type ActionResult,
  type CafeView,
  type Property,
} from "../shared/cafe.ts";
import { doorway } from "../shared/world.ts";
import { route, type Point } from "../shared/navigation.ts";
import type { PlayerState } from "../shared/protocol.ts";
export type Actor = {
  state: PlayerState;
  path?: Point[];
  pending?: Action;
  returnPosition?: Point;
  work?: {
    id: string;
    orderId: string;
    startedAt: number;
    endsAt: number;
    lastPulse: number;
  };
};
export class Cafes {
  private open = new Set<string>();
  private arrivals = new Map<string, number>();
  private petAt = new Map<string, number>();
  constructor(readonly store: GameStore) {}
  join(id: string) {
    return this.store.ensure(id);
  }
  property(p: PlayerState): Property {
    const c = this.store.byOwner(p.id);
    return {
      cafeId: c.id,
      ownerId: p.id,
      name: p.name,
      lot: p.lot,
      visitors: c.visitors,
      open: this.open.has(c.id),
    };
  }
  view(cafeId: string, ownerName: string): CafeView {
    const c = this.store.get(cafeId);
    return {
      id: c.id,
      ownerId: c.ownerId,
      ownerName,
      level: c.level,
      visitors: c.visitors,
      open: this.open.has(cafeId),
      cats: c.cats,
      orders: this.store.orders(cafeId),
    };
  }
  private owner(actor: Actor) {
    const cafe = this.store.byOwner(actor.state.id);
    if (actor.state.area !== cafe.id)
      throw Error("Enter your own café to manage it.");
    return cafe;
  }
  request(
    actor: Actor,
    msg: Action,
    players: PlayerState[],
    now: number,
  ): ActionResult {
    const reply = (message: string, pending = false): ActionResult => ({
      type: "result",
      requestId: msg.requestId,
      ok: true,
      pending,
      message,
    });
    if (msg.action === "walk") {
      let point;
      try {
        point = JSON.parse(msg.target ?? "");
      } catch {
        throw Error("Choose a spot on the floor.");
      }
      if (
        !point ||
        typeof point.x !== "number" ||
        typeof point.z !== "number" ||
        !Number.isFinite(point.x) ||
        !Number.isFinite(point.z) ||
        Object.keys(point).some((k) => !["x", "z"].includes(k))
      )
        throw Error("Choose a valid floor position.");
      actor.path = route(
        actor.state,
        point,
        actor.state.area !== "town",
        actor.state.area && actor.state.area !== "town"
          ? this.store.get(actor.state.area).level
          : 1,
      );
      return reply("Walking…");
    }
    if (msg.action === "walkHome" || msg.action === "visit") {
      if (actor.state.area !== "town")
        throw Error("Exit the café before walking to another property.");
      const target = msg.action === "walkHome" ? actor.state.id : msg.target;
      const player = players.find((p) => p.id === target);
      if (!player) throw Error("That café is not in this town.");
      const cafe = this.store.byOwner(player.id);
      if (player.id !== actor.state.id && !cafe.visitors)
        throw Error("This café is private.");
      actor.path = route(actor.state, doorway(player.lot));
      actor.pending = { ...msg, action: "enter", target: cafe.id };
      return reply("Walking to the café entrance…", true);
    }
    if (msg.action === "enter") {
      if (actor.state.area !== "town")
        throw Error("You are already inside a café.");
      const owner = players.find(
        (p) => this.store.byOwner(p.id).id === msg.target,
      );
      if (!owner) throw Error("That café is no longer in this town.");
      const c = this.store.byOwner(owner.id),
        door = doorway(owner.lot);
      if (c.ownerId !== actor.state.id && !c.visitors)
        throw Error("This café is private.");
      if (Math.hypot(actor.state.x - door.x, actor.state.z - door.z) > 1.5)
        throw Error("Walk to the café entrance first.");
      actor.returnPosition = door;
      actor.state.area = c.id;
      Object.assign(actor.state, ENTRY);
      actor.path = [];
      return reply(
        c.ownerId === actor.state.id
          ? "Welcome to your café!"
          : "Welcome! You are visiting as a guest.",
      );
    }
    if (msg.action === "exit") {
      if (actor.state.area === "town") throw Error("You are already in town.");
      if (Math.hypot(actor.state.x - ENTRY.x, actor.state.z - ENTRY.z) > 1) {
        actor.path = route(
          actor.state,
          ENTRY,
          true,
          this.store.get(actor.state.area!).level,
        );
        actor.pending = msg;
        return reply("Walking to the exit…", true);
      }
      const own = this.store.byOwner(actor.state.id);
      if (actor.state.area === own.id) this.close(own.id);
      actor.state.area = "town";
      Object.assign(
        actor.state,
        actor.returnPosition ?? doorway(actor.state.lot),
      );
      actor.path = [];
      return reply("Back in the neighborhood.");
    }
    const c = this.owner(actor);
    if (msg.action === "open") {
      if (!this.open.has(c.id)) {
        this.open.add(c.id);
        this.arrivals.set(c.id, now);
        this.store.createOrder(c.id, now);
      }
      return reply(
        "Your café is open! Prepare a coffee for your first customer.",
      );
    }
    if (msg.action === "close") {
      this.close(c.id);
      return reply(
        "Café closed. Unpaid orders cancelled and reserved beans returned.",
      );
    }
    if (msg.action === "privacy")
      return reply(this.store.privacy(actor.state.id, msg.requestId));
    if (["beans", "food", "decor", "adopt"].includes(msg.action))
      return reply(
        this.store.purchase(
          actor.state.id,
          msg.requestId,
          msg.action as "beans" | "food" | "decor" | "adopt",
          msg.action === "adopt" && msg.target !== undefined
            ? Number(msg.target)
            : undefined,
        ),
      );
    if (msg.action === "feed" || msg.action === "pet") {
      if (msg.action === "pet" && now - (this.petAt.get(c.id) ?? 0) < 5000)
        throw Error("Give your cats a moment before petting them again.");
      const point = { x: 4, z: 1.8 };
      if (Math.hypot(actor.state.x - point.x, actor.state.z - point.z) > 1.3) {
        actor.path = route(actor.state, point, true, c.level);
        actor.pending = msg;
        return reply("Walking to your cats…", true);
      }
      const result = this.store.care(
        actor.state.id,
        msg.requestId,
        msg.action === "feed",
      );
      if (msg.action === "pet") this.petAt.set(c.id, now);
      return reply(result);
    }
    if (msg.action === "prepare")
      throw Error(
        "Walk to the coffee machine and hold it, or hold E nearby, to brew.",
      );
    if (msg.action === "approach") {
      const point =
        msg.target === "machine"
          ? STATION
          : SERVICE_POINTS[
              this.store.orders(c.id).find((o) => o.id === msg.target)?.seat ??
                -1
            ];
      if (!point) throw Error("Choose the coffee machine or a customer.");
      actor.path = route(actor.state, point, true, c.level);
      return reply("Walking over. Interact with the object when you arrive.");
    }
    if (msg.action === "workStart" || msg.action === "pickup") {
      if (!this.open.has(c.id)) throw Error("Open your café first.");
      if (
        Math.hypot(actor.state.x - STATION.x, actor.state.z - STATION.z) > 1.4
      )
        throw Error("Walk closer to the coffee machine first.");
      if (actor.state.carriedOrderId)
        throw Error("Serve the coffee you are carrying first.");
      if (actor.work) throw Error("You are already brewing a coffee.");
      const orders = this.store.orders(c.id);
      const order = orders.find((o) =>
        msg.target
          ? o.id === msg.target
          : o.status === (msg.action === "workStart" ? "WAITING" : "READY"),
      );
      if (!order) throw Error("No matching coffee order is available.");
      if (msg.action === "pickup") {
        const message = this.store.pickup(
          actor.state.id,
          msg.requestId,
          order.id,
        );
        actor.state.carriedOrderId = order.id;
        return reply(message);
      }
      this.store.prepare(actor.state.id, msg.requestId, order.id, now);
      const live = this.store.orders(c.id).find((o) => o.id === order.id);
      if (live?.status !== "PREPARING")
        throw Error("Start a fresh brewing interaction.");
      actor.work = {
        id: msg.requestId,
        orderId: order.id,
        startedAt: now,
        endsAt: live.readyAt,
        lastPulse: now,
      };
      actor.state.work = {
        orderId: order.id,
        startedAt: now,
        endsAt: live.readyAt,
      };
      return reply("Keep holding the machine or E to brew your coffee.", true);
    }
    if (msg.action === "serve") {
      if (!this.open.has(c.id)) throw Error("Open your café first.");
      const order = this.store.orders(c.id).find((o) => o.id === msg.target);
      if (
        !order ||
        actor.state.carriedOrderId !== order.id ||
        order.status !== "CARRIED"
      )
        throw Error("Pick up the correct coffee at the machine first.");
      const point = SERVICE_POINTS[order.seat];
      if (Math.hypot(actor.state.x - point.x, actor.state.z - point.z) > 1.5)
        throw Error("Walk closer to the matching customer first.");
      const message = this.store.serve(
        actor.state.id,
        msg.requestId,
        order.id,
        now,
      );
      actor.state.carriedOrderId = undefined;
      return reply(message);
    }
    throw Error("This action is unavailable.");
  }
  cancelWork(
    actor: Actor,
    message = "Brewing stopped. Your bean was returned.",
  ): { id: string; message: string } | undefined {
    const work = actor.work;
    if (!work) return;
    this.store.interruptPreparation(actor.state.id, work.orderId);
    actor.work = undefined;
    actor.state.work = undefined;
    return { id: work.id, message };
  }
  workPulse(actor: Actor, id: string, now: number) {
    if (actor.work?.id === id) actor.work.lastPulse = now;
  }
  workTick(
    actor: Actor,
    now: number,
  ): { id: string; message: string; ok: boolean } | undefined {
    if (
      actor.state.carriedOrderId &&
      !this.store
        .orders(actor.state.area ?? "")
        .some(
          (o) => o.id === actor.state.carriedOrderId && o.status === "CARRIED",
        )
    )
      actor.state.carriedOrderId = undefined;
    const work = actor.work;
    if (!work) return;
    if (
      !actor.state.connected ||
      actor.state.area !== this.store.byOwner(actor.state.id).id ||
      !this.open.has(actor.state.area) ||
      now - work.lastPulse > 700 ||
      Math.hypot(actor.state.x - STATION.x, actor.state.z - STATION.z) > 1.4
    ) {
      const stopped = this.cancelWork(actor);
      return stopped ? { ...stopped, ok: false } : undefined;
    }
    if (
      !this.store
        .orders(actor.state.area ?? "")
        .some((o) => o.id === work.orderId && o.status === "PREPARING")
    ) {
      const stopped = this.cancelWork(
        actor,
        "That order is no longer available.",
      );
      return stopped ? { ...stopped, ok: false } : undefined;
    }
    if (now >= work.endsAt) {
      actor.work = undefined;
      actor.state.work = undefined;
      return {
        id: work.id,
        ok: true,
        message: "Coffee ready! Click the machine or press E to pick it up.",
      };
    }
  }
  close(id: string) {
    this.open.delete(id);
    this.arrivals.delete(id);
    this.store.cancel(id);
  }
  disconnect(id: string) {
    const c = this.store.byOwner(id);
    this.close(c.id);
  }
  tick(players: PlayerState[], now: number) {
    for (const id of this.open) {
      const c = this.store.get(id);
      if (
        !players.some((p) => p.id === c.ownerId && p.connected && p.area === id)
      ) {
        this.close(id);
        continue;
      }
      this.store.advance(id, now);
      if (now - (this.arrivals.get(id) ?? 0) >= 8000) {
        this.arrivals.set(id, now);
        if (c.beans > 0) this.store.createOrder(id, now);
      }
    }
  }
  shutdown() {
    for (const id of [...this.open]) this.close(id);
    this.store.close();
  }
}
