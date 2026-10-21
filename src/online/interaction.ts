import type { Network } from "./network.ts";
import type { PublicState, PlayerState } from "../../shared/protocol.ts";
import type { ActionResult } from "../../shared/cafe.ts";
import { STATION, SERVICE_POINTS } from "../../shared/cafe.ts";
export type WorldHit = {
  kind: "floor" | "machine" | "customer" | "door" | "exit" | "cat";
  target?: string;
  point?: { x: number; z: number };
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
    else if (this.self?.carriedOrderId) {
      const order = s.cafe?.orders.find(
        (o) => o.id === this.self!.carriedOrderId,
      );
      this.hint.textContent = `Carrying coffee for Table ${(order?.seat ?? 0) + 1}. Walk over and click the customer or press E.`;
    } else if (s.cafe) {
      this.hint.textContent = s.cafe.orders.some((o) => o.status === "READY")
        ? "Coffee ready! Click the machine or press E nearby to pick it up."
        : "Click floor to walk. Hold the machine or E nearby to brew. Release to cancel.";
    } else
      this.hint.textContent =
        "Click the ground to walk. Click an occupied café door to enter.";
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
    if (hit.kind === "cat") {
      this.network.action("pet");
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
      const order = s.cafe?.orders.find((o) => o.status === "WAITING");
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
        this.note("Pick up this customer’s coffee at the machine first.");
        return;
      }
      const point = SERVICE_POINTS[order.seat];
      if (Math.hypot(p.x - point.x, p.z - point.z) > 1.5) {
        this.network.action("approach", order.id);
        this.note("Walking to the customer. Click them again when you arrive.");
      } else this.network.action("serve", order.id);
    }
  }
  key() {
    const p = this.self,
      s = this.snapshot;
    if (!p || !s?.cafe) return;
    if (p.carriedOrderId) {
      const o = s.cafe.orders.find((o) => o.id === p.carriedOrderId);
      if (o) this.handle({ kind: "customer", target: o.id }, "press");
    } else if (Math.hypot(p.x - STATION.x, p.z - STATION.z) <= 1.4)
      this.handle({ kind: "machine" }, "press");
    else
      this.note(
        "Walk to the coffee machine first. Click the floor or use WASD.",
      );
  }
  finish(send = true) {
    if (this.active && send) this.network.work(this.active, "stop");
    clearInterval(this.pulse);
    this.pulse = undefined;
    this.active = undefined;
  }
}
