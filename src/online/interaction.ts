import type { Network } from "./network.ts";
import type { PublicState, PlayerState } from "../../shared/protocol.ts";
import type { ActionResult } from "../../shared/cafe.ts";
import { STATION } from "../../shared/cafe.ts";
import {
  servicePoint,
  chair,
  DEFAULT_FURNITURE,
} from "../../shared/furniture.ts";
import { recipe, customerProfile } from "../../shared/experience.ts";
import { doorway } from "../../shared/world.ts";
export type WorldHit = {
  kind:
    | "floor"
    | "machine"
    | "customer"
    | "door"
    | "exit"
    | "cat"
    | "chair"
    | "bowl"
    | "furniture";
  target?: string;
  point?: { x: number; z: number };
  rotation?: number;
};
export class Interaction {
  private noticeUntil = 0;
  private note(message: string) {
    this.hint.textContent = message;
    this.noticeUntil = performance.now() + 2500;
  }
  private snapshot?: PublicState;
  private self?: PlayerState;
  private active?: string;
  private selectedOrder?: string;
  private pulse: ReturnType<typeof setInterval> | undefined;
  constructor(
    private network: Network,
    private selfId: () => string,
    private hint: HTMLElement,
    private progress: HTMLElement,
  ) {}
  state(s: PublicState) {
    this.snapshot = s;
    this.self = s.players.find((p) => p.id === this.selfId());
    const task = this.self?.work;
    this.progress.hidden = !task;
    if (task) {
      const ratio = Math.max(
        0,
        Math.min(1, (s.time - task.startedAt) / (task.endsAt - task.startedAt)),
      );
      this.progress.style.setProperty("--progress", `${ratio * 100}%`);
      this.hint.textContent = `Brewing coffee… ${Math.floor(ratio * 100)}% · keep holding`;
    } else if (performance.now() < this.noticeUntil) return;
    else if (this.self?.sitting)
      this.hint.textContent =
        "A little moment to yourself. Press E or move to stand up.";
    else if (this.self?.carriedCatId) {
      const cat = s.cafe?.cats.find((c) => c.id === this.self?.carriedCatId);
      this.hint.textContent = `${cat?.name ?? "Your cat"} is in your arms. Walk together, or press E to put them down.`;
    } else if (this.self?.carriedOrderId) {
      const order = s.cafe?.orders.find(
        (o) => o.id === this.self!.carriedOrderId,
      );
      this.hint.textContent = `Carrying coffee for Table ${(order?.seat ?? 0) + 1}. Walk over and click the customer or press E.`;
    } else if (s.cafe) {
      this.hint.textContent = s.cafe.orders.some((o) => o.status === "READY")
        ? "Coffee ready! Click the machine or press E nearby to pick it up."
        : "WASD to walk. Aim and press E to interact. Hold E at the machine to brew.";
    } else
      this.hint.textContent =
        "WASD to walk · mouse / drag to look · E at your café entrance.";
  }
  result(r: ActionResult) {
    if (r.requestId === this.active && !r.pending) this.finish(false);
    if (!r.pending) this.note(r.message);
  }
  handle(hit: WorldHit, phase: "press" | "release") {
    if (phase === "release") {
      this.finish(true);
      return;
    }
    if (this.network.state !== "connected") {
      this.note("Choose Play Online first.");
      return;
    }
    const p = this.self,
      s = this.snapshot;
    if (!p || !s) return;
    if (hit.kind === "floor" && hit.point) {
      this.network.action("walk", JSON.stringify(hit.point));
      return;
    }
    if (hit.kind === "door") {
      const property = s.properties?.find((v) => v.lot === Number(hit.target));
      if (!property) {
        this.note("This lot is not occupied.");
        return;
      }
      this.network.action(
        property.ownerId === p.id ? "walkHome" : "visit",
        property.ownerId,
      );
      return;
    }
    if (hit.kind === "exit") {
      this.network.action("exit");
      return;
    }
    if (hit.kind === "furniture" && hit.point) {
      this.network.action(
        "moveFurniture",
        JSON.stringify({
          id: hit.target,
          ...hit.point,
          rotation: hit.rotation ?? 0,
          placed: true,
        }),
      );
      return;
    }
    if (hit.kind === "chair") {
      this.network.action(p.sitting ? "stand" : "sit", hit.target);
      return;
    }
    if (hit.kind === "bowl") {
      this.network.action("feed");
      return;
    }
    if (hit.kind === "cat") {
      this.network.action(
        s.cafe?.ownerId !== p.id
          ? "pet"
          : p.carriedCatId
            ? "putCat"
            : "pickCat",
        hit.target,
      );
      return;
    }
    if (s.cafe?.ownerId !== p.id) {
      this.note(
        "Only the café owner can use the coffee machine and serve orders.",
      );
      return;
    }
    if (hit.kind === "machine") {
      if (Math.hypot(p.x - STATION.x, p.z - STATION.z) > 1.4) {
        this.network.action("approach", "machine");
        this.note("Walking to the machine. Hold it again when you arrive.");
        return;
      }
      const ready = s.cafe?.orders.find((o) => o.status === "READY");
      if (ready) {
        this.network.action("pickup", ready.id);
        return;
      }
      if (p.carriedOrderId) {
        this.note("Take the coffee you are carrying to its customer first.");
        return;
      }
      if (this.active) return;
      const order =
        s.cafe?.orders.find(
          (o) => o.id === this.selectedOrder && o.status === "WAITING",
        ) ?? s.cafe?.orders.find((o) => o.status === "WAITING");
      if (!order) {
        this.note(
          "No waiting coffee orders. Open your café to welcome customers.",
        );
        return;
      }
      this.active = this.network.action("workStart", order.id);
      if (this.active) {
        const id = this.active;
        this.pulse = setInterval(() => this.network.work(id, "pulse"), 150);
      }
      return;
    }
    if (hit.kind === "customer") {
      const order = s.cafe?.orders.find((o) => o.id === hit.target);
      if (!order) return;
      if (p.carriedOrderId !== order.id) {
        this.selectedOrder = order.id;
        this.note(
          `${customerProfile(order.id).name} would like ${recipe(order.recipe).name.toLowerCase()}. Hold the machine to make this order.`,
        );
        return;
      }
      const point = servicePoint(s.cafe?.layout, order.seat);
      if (Math.hypot(p.x - point.x, p.z - point.z) > 1.5) {
        this.network.action("approach", order.id);
        this.note("Walking to the customer. Click them again when you arrive.");
      } else this.network.action("serve", order.id);
    }
  }
  key(aim?: WorldHit, firstPerson = false) {
    const p = this.self,
      s = this.snapshot;
    if (!p || !s) return;
    if (p.sitting) {
      this.network.action("stand");
      return;
    }
    if (p.carriedCatId) {
      this.network.action("putCat");
      return;
    }
    if (aim && !["floor", "furniture"].includes(aim.kind)) {
      this.handle(aim, "press");
      return;
    }
    if (firstPerson) {
      if (
        p.area !== "town" &&
        Math.hypot(p.x, p.z - 4) < 0.9 &&
        !p.carriedOrderId
      )
        this.network.action("exit");
      else
        this.note(
          "Aim at an object and press E. Hold E at the coffee machine.",
        );
      return;
    }
    if (p.area === "town") {
      const property = s.properties?.find((prop) => {
        const door = doorway(prop.lot);
        return Math.hypot(p.x - door.x, p.z - door.z) < 2;
      });
      if (property) this.network.action("enter", property.cafeId);
      else this.note("Walk up to an occupied café door and press E.");
      return;
    }
    if (!s.cafe) return;
    if (
      Math.hypot(p.x, p.z - 4) < 0.9 &&
      !p.carriedCatId &&
      !p.carriedOrderId &&
      !p.sitting
    ) {
      this.network.action("exit");
      return;
    }
    if (p.sitting) {
      this.network.action("stand");
      return;
    }
    if (p.carriedCatId) {
      this.network.action("putCat");
      return;
    }
    if (p.carriedOrderId) {
      const o = s.cafe.orders.find((o) => o.id === p.carriedOrderId);
      if (o) this.handle({ kind: "customer", target: o.id }, "press");
    } else if (Math.hypot(p.x - STATION.x, p.z - STATION.z) <= 1.4)
      this.handle({ kind: "machine" }, "press");
    else {
      const layout = s.cafe.layout ?? DEFAULT_FURNITURE;
      const nearby = layout
        .filter(
          (f) =>
            f.placed !== false && (f.kind === "dining" || f.kind === "sofa"),
        )
        .flatMap((f) =>
          (f.kind === "sofa" ? ["0", "1"] : ["front", "back"]).map((which) => ({
            id: `${f.id}:${which}`,
            seat: chair(layout, `${f.id}:${which}`)!,
          })),
        )
        .find(
          (s) =>
            Math.hypot(p.x - s.seat.approach.x, p.z - s.seat.approach.z) < 1.1,
        );
      if (nearby) {
        this.network.action("sit", nearby.id);
        return;
      }
      const cat = s.cafe.catPoses?.find(
        (cat) => cat.y < 1.1 && Math.hypot(p.x - cat.x, p.z - cat.z) < 1.4,
      );
      if (cat) {
        this.network.action(
          s.cafe.ownerId === p.id ? "pickCat" : "pet",
          cat.id,
        );
        return;
      }
      this.note(
        "Click a chair to sit, a cat to pick them up, or walk to the coffee machine.",
      );
    }
  }
  finish(send = true) {
    if (this.active && send) this.network.work(this.active, "stop");
    clearInterval(this.pulse);
    this.pulse = undefined;
    this.active = undefined;
  }
}
