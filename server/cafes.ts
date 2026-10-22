import { GameStore } from "./game-store.ts";
import {
  STATION,
  ENTRY,
  type Action,
  type ActionResult,
  type CafeView,
  type Property,
} from "../shared/cafe.ts";
import { doorway } from "../shared/world.ts";
import { route, type Point } from "../shared/navigation.ts";
import type { PlayerState } from "../shared/protocol.ts";
import { CafeLife } from "./life.ts";
import { changedLayout } from "./layout.ts";
import { chair, servicePoint } from "../shared/furniture.ts";
import {
  customerProfile,
  type Shift,
  type CafeEvent,
} from "../shared/experience.ts";
import { roomBlocked } from "../shared/navigation.ts";
import { roomToTown } from "../shared/portals.ts";
import { activeCatBonus } from "../shared/cat-collection.ts";
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
  readonly life = new CafeLife();
  private shifts = new Map<
    string,
    Shift & { beforeServed: number; beforeRevenue: number }
  >();
  private events = new Map<string, CafeEvent[]>();
  private event(cafeId: string, item: Omit<CafeEvent, "id">) {
    const events = this.events.get(cafeId) ?? [];
    events.push({ ...item, id: `${item.at}:${events.length}:${item.message}` });
    this.events.set(cafeId, events.slice(-8));
  }
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
      layout: c.layout,
      catPoses: this.life.poses(c),
      shift: this.shifts.get(cafeId),
      events: this.events.get(cafeId) ?? [],
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
      this.stand(actor);
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
        actor.state.area && actor.state.area !== "town"
          ? this.store.get(actor.state.area).layout
          : undefined,
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
      if (Math.hypot(actor.state.x - door.x, actor.state.z - door.z) > 1.9)
        throw Error("Walk to the café entrance first.");
      actor.returnPosition = door;
      actor.state.doorTransition = {
        kind: "enter",
        lot: owner.lot,
        fromX: actor.state.x,
        fromZ: actor.state.z,
        startedAt: now,
        endsAt: now + 700,
      };
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
      this.stand(actor);
      actor.state.carriedCatId = undefined;
      if (actor.state.area === "town") throw Error("You are already in town.");
      if (Math.hypot(actor.state.x - ENTRY.x, actor.state.z - ENTRY.z) > 1) {
        actor.path = route(
          actor.state,
          ENTRY,
          true,
          this.store.get(actor.state.area!).level,
          this.store.get(actor.state.area!).layout,
        );
        actor.pending = msg;
        return reply("Walking to the exit…", true);
      }
      const own = this.store.byOwner(actor.state.id);
      const owner = players.find(
        (p) => this.store.byOwner(p.id).id === actor.state.area,
      );
      const lot = owner?.lot ?? actor.state.lot;
      const from = roomToTown(actor.state, lot);
      actor.state.doorTransition = {
        kind: "exit",
        lot,
        fromX: from.x,
        fromZ: from.z,
        startedAt: now,
        endsAt: now + 700,
      };
      if (actor.state.area === own.id) this.close(own.id);
      actor.state.area = "town";
      Object.assign(
        actor.state,
        actor.returnPosition ?? doorway(actor.state.lot),
      );
      actor.path = [];
      return reply("Back in the neighborhood.");
    }
    if (msg.action === "stand") {
      this.stand(actor);
      return reply("Back on your feet.");
    }
    if (msg.action === "sit") {
      if (!actor.state.area || actor.state.area === "town")
        throw Error("Choose a chair inside a café.");
      const cafe = this.store.get(actor.state.area),
        seat = chair(cafe.layout, msg.target ?? "");
      if (!seat) throw Error("Choose a real chair.");
      if (
        cafe.layout.find((f) => f.id === `table-${seat.table}`)?.placed ===
        false
      )
        throw Error("This chair is stored in inventory.");
      if (actor.state.sitting)
        throw Error("Stand up before choosing another chair.");
      if (actor.state.carriedOrderId || actor.work)
        throw Error("Finish serving the coffee first.");
      if (
        players.some(
          (p) => p.area === cafe.id && p.sitting?.id === msg.target,
        ) ||
        (seat.front &&
          this.store.orders(cafe.id).some((o) => o.seat === seat.table))
      )
        throw Error("Someone is using that chair.");
      if (
        Math.hypot(
          actor.state.x - seat.approach.x,
          actor.state.z - seat.approach.z,
        ) > 1.2
      ) {
        actor.path = route(
          actor.state,
          seat.approach,
          true,
          cafe.level,
          cafe.layout,
        );
        actor.pending = msg;
        return reply("Walking to the chair…", true);
      }
      actor.state.sitting = {
        id: msg.target!,
        rotation: seat.rotation,
        returnX: seat.approach.x,
        returnZ: seat.approach.z,
      };
      Object.assign(actor.state, {
        x: seat.x,
        z: seat.z,
        rotation: seat.rotation,
        moving: false,
      });
      actor.path = [];
      return reply("Take a little breather. Press E or move to stand up.");
    }
    if (
      (msg.action === "pet" || msg.action === "feed") &&
      actor.state.area &&
      actor.state.area !== "town" &&
      this.store.byOwner(actor.state.id).id !== actor.state.area
    ) {
      const cafe = this.store.get(actor.state.area),
        cat = msg.target
          ? cafe.cats.find((cat) => cat.id === msg.target)
          : undefined;
      if (msg.target && !cat) throw Error("Choose a cat in this café.");
      const pose = this.life.poses(cafe, now).find((p) => p.id === cat?.id);
      const bowl = cafe.layout.find(
          (f) => f.kind === "bowl" && f.placed !== false,
        )!,
        point = pose && pose.y < 1 ? pose : { x: bowl.x - 0.8, z: bowl.z };
      if (Math.hypot(actor.state.x - point.x, actor.state.z - point.z) > 1.4) {
        if (cat) this.life.hold(cafe, cat.id, now);
        actor.path = route(actor.state, point, true, cafe.level, cafe.layout);
        actor.pending = msg;
        return reply("Walking over to make a furry friend…", true);
      }
      const key = `${actor.state.id}:${cafe.id}`;
      if (msg.action === "pet" && now - (this.petAt.get(key) ?? 0) < 5000)
        throw Error("Give your new friend a little moment.");
      const message = this.store.visitorCare(
        actor.state.id,
        msg.requestId,
        cafe.id,
        msg.action === "feed",
        cat?.id,
      );
      this.petAt.set(key, now);
      for (const cat of cafe.cats)
        if (!msg.target || cat.id === msg.target)
          this.life.hold(
            cafe,
            cat.id,
            now,
            msg.action === "feed" ? "eating" : "purring",
          );
      return reply(message);
    }
    const c = this.owner(actor);
    if (msg.action === "catSlot")
      return reply(this.store.buyCatSlot(actor.state.id, msg.requestId));
    if (msg.action === "buyFurniture")
      return reply(
        this.store.buyFurniture(
          actor.state.id,
          msg.requestId,
          msg.target ?? "",
        ),
      );
    if (msg.action === "putCat") {
      const id = actor.state.carriedCatId;
      if (!id) throw Error("You are not carrying a cat.");
      actor.state.carriedCatId = undefined;
      this.life.drop(
        c,
        id,
        actor.state.sitting
          ? { x: actor.state.sitting.returnX, z: actor.state.sitting.returnZ }
          : actor.state,
        now,
      );
      return reply("Down you go, little friend.");
    }
    if (msg.action === "pickCat") {
      if (
        actor.state.carriedCatId ||
        actor.state.carriedOrderId ||
        actor.work ||
        actor.state.sitting
      )
        throw Error("Keep your hands free before picking up a cat.");
      const cat = c.cats.find((cat) => cat.id === msg.target);
      const pose = this.life.poses(c, now).find((p) => p.id === cat?.id);
      if (!cat || !pose) throw Error("Choose one of your cats.");
      if (pose.y > 1.1)
        throw Error(
          "Your cat is enjoying the high perch. Let them come down first.",
        );
      this.life.hold(c, cat.id, now);
      if (Math.hypot(actor.state.x - pose.x, actor.state.z - pose.z) > 1.4) {
        const point = [
          pose,
          { x: pose.x - 0.9, z: pose.z },
          { x: pose.x, z: pose.z + 0.9 },
          { x: pose.x + 0.9, z: pose.z },
        ].find((p) => !roomBlocked(p.x, p.z, c.level, c.layout));
        if (!point) throw Error("Let your cat come to a clear spot first.");
        actor.path = route(actor.state, point, true, c.level, c.layout);
        actor.pending = msg;
        return reply(`Walking over to ${cat.name}…`, true);
      }
      actor.state.carriedCatId = cat.id;
      this.life.hold(c, cat.id, now, "carried");
      return reply(
        `${cat.name} settles into your arms. Press E to put them down.`,
      );
    }
    if (actor.state.sitting)
      throw Error("Stand up before working in the café.");
    if (msg.action === "moveFurniture") {
      if (this.open.has(c.id))
        throw Error("Close your café before arranging furniture.");
      if (
        players.some(
          (p) =>
            p.area === c.id &&
            (p.sitting || p.carriedCatId || p.carriedOrderId || p.work),
        )
      )
        throw Error(
          "Everyone needs to stand with empty hands before moving furniture.",
        );
      const layout = changedLayout(c, msg.target ?? "");
      if (
        players.some(
          (p) => p.area === c.id && roomBlocked(p.x, p.z, c.level, layout),
        )
      )
        throw Error("A person is standing in that space.");
      const poses = this.life.poses(c, now),
        changed = layout.find(
          (f) =>
            JSON.stringify(f) !==
            JSON.stringify(c.layout.find((old) => old.id === f.id)),
        );
      if (
        poses.some(
          (cat) =>
            cat.y < 0.1 &&
            !roomBlocked(cat.x, cat.z, c.level, c.layout) &&
            roomBlocked(cat.x, cat.z, c.level, layout),
        )
      )
        throw Error(
          "A cat is in that space. Let them move before placing furniture.",
        );
      const previous = c.layout.find((f) => f.id === changed?.id);
      if (
        previous &&
        ["tree", "bed"].includes(previous.kind) &&
        poses.some(
          (cat) =>
            cat.y > 0.1 &&
            Math.hypot(cat.x - previous.x, cat.z - previous.z) < 0.85,
        )
      )
        throw Error(
          "A cat is resting on that furniture. Wait for them to come down.",
        );
      const result = this.store.moveFurniture(
        actor.state.id,
        msg.requestId,
        layout,
        msg.target!,
      );
      this.life.repath(c.id);
      return reply(result);
    }
    if (msg.action === "claim")
      return reply(
        this.store.claim(actor.state.id, msg.requestId, msg.target ?? ""),
      );
    if (msg.action === "open") {
      if (!c.layout.some((f) => f.kind === "dining" && f.placed !== false))
        throw Error("Place at least one dining set before opening the café.");
      if (!this.open.has(c.id)) {
        this.open.add(c.id);
        this.arrivals.set(c.id, now);
        this.store.createOrder(
          c.id,
          now,
          players
            .filter((p) => p.area === c.id && p.sitting?.id.endsWith(":front"))
            .map((p) => Number(p.sitting!.id[6])),
        );
        this.shifts.set(c.id, {
          startedAt: now,
          served: 0,
          earned: 0,
          missed: 0,
          beforeServed: c.served,
          beforeRevenue: c.revenue,
        });
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
      const cat =
        msg.action === "pet" && msg.target
          ? c.cats.find((cat) => cat.id === msg.target)
          : undefined;
      if (msg.action === "pet" && msg.target && !cat)
        throw Error("Choose one of your cats.");
      const pose = cat
        ? this.life.poses(c, now).find((p) => p.id === cat.id)
        : undefined;
      const bowl = c.layout.find(
        (f) => f.kind === "bowl" && f.placed !== false,
      )!;
      const point = pose && pose.y < 1 ? pose : { x: bowl.x - 0.8, z: bowl.z };
      if (Math.hypot(actor.state.x - point.x, actor.state.z - point.z) > 1.3) {
        if (cat) this.life.hold(c, cat.id, now);
        actor.path = route(actor.state, point, true, c.level, c.layout);
        actor.pending = msg;
        return reply("Walking to your cats…", true);
      }
      const result = this.store.care(
        actor.state.id,
        msg.requestId,
        msg.action === "feed",
        cat?.id,
      );
      if (msg.action === "pet") this.petAt.set(c.id, now);
      for (const cat of c.cats)
        if (!msg.target || cat.id === msg.target)
          this.life.hold(
            c,
            cat.id,
            now,
            msg.action === "feed" ? "eating" : "purring",
          );
      this.event(c.id, { at: now, message: result, kind: "care" });
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
          : (() => {
              const order = this.store
                .orders(c.id)
                .find((o) => o.id === msg.target);
              return order ? servicePoint(c.layout, order.seat) : undefined;
            })();
      if (!point) throw Error("Choose the coffee machine or a customer.");
      actor.path = route(actor.state, point, true, c.level, c.layout);
      return reply("Walking over. Interact with the object when you arrive.");
    }
    if (msg.action === "workStart" || msg.action === "pickup") {
      if (actor.state.carriedCatId)
        throw Error("Put your cat down before making coffee.");
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
      const point = servicePoint(c.layout, order.seat);
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
  stand(actor: Actor) {
    const seat = actor.state.sitting;
    if (!seat) return;
    actor.state.x = seat.returnX;
    actor.state.z = seat.returnZ;
    actor.state.sitting = undefined;
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
    const shift = this.shifts.get(id);
    if (shift && !shift.endedAt) shift.endedAt = Date.now();
  }
  disconnect(id: string) {
    const c = this.store.byOwner(id);
    this.close(c.id);
  }
  tick(players: PlayerState[], now: number) {
    for (const id of new Set(
      players
        .filter((p) => p.connected && p.area && p.area !== "town")
        .map((p) => p.area!),
    )) {
      const c = this.store.get(id);
      this.life.sync(c, this.store.orders(id), players, now);
    }
    for (const id of this.open) {
      const c = this.store.get(id);
      if (
        !players.some((p) => p.id === c.ownerId && p.connected && p.area === id)
      ) {
        this.close(id);
        continue;
      }
      const before = this.store.orders(id);
      this.store.advance(id, now);
      const current = this.store.get(id),
        remaining = this.store.orders(id);
      const paid = current.served - c.served;
      if (paid > 0) {
        const profile = customerProfile(
          before.find((o) => o.status === "DRINKING")?.id ?? id,
        );
        this.event(id, {
          at: now,
          kind: "payment",
          amount: current.revenue - c.revenue,
          message: `${profile.name}: “${profile.thanks}” +${current.revenue - c.revenue} coins`,
        });
      }
      const missed = before.filter(
        (o) =>
          o.status !== "DRINKING" &&
          !remaining.some((live) => live.id === o.id),
      ).length;
      if (missed)
        this.event(id, {
          at: now,
          kind: "left",
          message: "A customer had to leave. A fresh start with the next one.",
        });
      const shift = this.shifts.get(id);
      if (shift) {
        shift.served = current.served - shift.beforeServed;
        shift.earned = current.revenue - shift.beforeRevenue;
        shift.missed += missed;
      }
      if (
        now - (this.arrivals.get(id) ?? 0) >=
        8000 - Math.min(2000, activeCatBonus(c.cats) * 100)
      ) {
        this.arrivals.set(id, now);
        if (c.beans > 0) {
          const occupied = players
            .filter((p) => p.area === id && p.sitting?.id.endsWith(":front"))
            .map((p) => Number(p.sitting!.id[6]));
          const orderId = this.store.createOrder(id, now, occupied);
          if (orderId)
            this.event(id, {
              at: now,
              kind: "arrival",
              message: `${customerProfile(orderId).name}: “${customerProfile(orderId).greeting}”`,
            });
        }
      }
    }
  }
  shutdown() {
    for (const id of [...this.open]) this.close(id);
    this.store.close();
  }
}
