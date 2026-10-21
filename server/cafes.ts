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
        actor.path = route(actor.state, ENTRY, true);
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
        ),
      );
    if (msg.action === "feed" || msg.action === "pet") {
      if (msg.action === "pet" && now - (this.petAt.get(c.id) ?? 0) < 5000)
        throw Error("Give your cats a moment before petting them again.");
      const point = { x: 4, z: 1.8 };
      if (Math.hypot(actor.state.x - point.x, actor.state.z - point.z) > 1.3) {
        actor.path = route(actor.state, point, true);
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
    if (msg.action === "prepare" || msg.action === "serve") {
      if (!this.open.has(c.id)) throw Error("Open your café first.");
      const order = this.store.orders(c.id).find((o) => o.id === msg.target);
      if (!order) throw Error("This order is no longer available.");
      if (
        (msg.action === "prepare" && order.status !== "WAITING") ||
        (msg.action === "serve" && order.status !== "READY")
      )
        throw Error(
          msg.action === "prepare"
            ? "That order is already being handled."
            : "Wait until the coffee is ready.",
        );
      const point =
        msg.action === "prepare" ? STATION : SERVICE_POINTS[order.seat];
      if (Math.hypot(actor.state.x - point.x, actor.state.z - point.z) > 1.2) {
        actor.path = route(actor.state, point, true);
        actor.pending = msg;
        return reply(
          msg.action === "prepare"
            ? "Walking to the coffee machine…"
            : "Taking coffee to the customer…",
          true,
        );
      }
      return reply(
        msg.action === "prepare"
          ? this.store.prepare(actor.state.id, msg.requestId, order.id, now)
          : this.store.serve(actor.state.id, msg.requestId, order.id, now),
      );
    }
    throw Error("This action is unavailable.");
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
