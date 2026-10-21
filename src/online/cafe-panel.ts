import { CAT_DESIGNS } from "../../shared/cat-designs.ts";
import type {
  Action,
  ActionResult,
  Cafe,
  Property,
} from "../../shared/cafe.ts";
import type { PublicState } from "../../shared/protocol.ts";
export class CafePanel {
  private personal?: Cafe;
  private snapshot?: PublicState;
  private pending = false;
  private last = "";
  private message = "Walk to your café to begin your first shift.";
  constructor(
    private host: HTMLElement,
    private self: () => string,
    private send: (
      action: Action["action"],
      target?: string,
    ) => string | undefined,
  ) {
    host.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>(
        "button[data-action]",
      );
      if (!b || b.disabled) return;
      const id = this.send(
        b.dataset.action as Action["action"],
        b.dataset.target,
      );
      if (id) {
        this.pending = true;
        if (
          ["open", "walkHome", "visit", "exit"].includes(b.dataset.action ?? "")
        )
          document
            .querySelector("#world")
            ?.scrollIntoView({ block: "center", behavior: "smooth" });
        this.message = "Getting things ready…";
        this.draw();
      }
    });
  }
  update(cafe: Cafe) {
    this.personal = cafe;
    this.draw();
  }
  state(s: PublicState) {
    this.snapshot = s;
    this.draw();
  }
  result(r: ActionResult) {
    this.pending = !!r.pending;
    this.message = r.message;
    this.draw();
  }
  disconnected() {
    this.pending = false;
    this.snapshot = undefined;
    this.last = "";
    this.host.replaceChildren();
  }
  private button(
    label: string,
    action: Action["action"],
    target?: string,
    disabled = false,
  ) {
    const b = document.createElement("button");
    b.className = "secondary action-button";
    b.dataset.action = action;
    if (target) b.dataset.target = target;
    b.textContent = label;
    b.disabled = disabled || this.pending;
    return b;
  }
  private text(tag: string, text: string, parent: HTMLElement, className = "") {
    const el = document.createElement(tag);
    el.textContent = text;
    el.className = className;
    parent.append(el);
    return el;
  }
  private draw() {
    const c = this.personal,
      s = this.snapshot;
    if (!c || !s) return;
    const self = s.players.find((p) => p.id === this.self());
    if (!self) return;
    const key = JSON.stringify([
      c,
      s.cafe,
      s.properties,
      self.area,
      this.pending,
      this.message,
    ]);
    if (key === this.last) return;
    this.last = key;
    const suppliesOpen = !!this.host.querySelector("details[open]");
    this.host.replaceChildren();
    const inside = self.area && self.area !== "town",
      own = inside && self.area === c.id;
    this.text("div", "YOUR PAWCOINS", this.host, "eyebrow");
    this.text("div", c.coins.toLocaleString() + " ◈", this.host, "wallet");
    this.text(
      "p",
      `Level ${c.level} · ${c.served} customers served · ${c.revenue} lifetime revenue`,
      this.host,
    );
    const note = this.text("p", this.message, this.host, "action-notice");
    note.setAttribute("role", "status");
    if (!inside) {
      this.host.append(this.button("Walk to my café →", "walkHome"));
      this.text("h2", "Visit a neighbor", this.host);
      for (const p of s.properties ?? [])
        if (p.ownerId !== this.self())
          this.host.append(
            this.button(
              `${p.name} · ${p.visitors ? "Visit café" : "Private"}`,
              "visit",
              p.ownerId,
              !p.visitors,
            ),
          );
      return;
    }
    this.text(
      "h2",
      own ? "Your café" : `${s.cafe?.ownerName ?? "Neighbor"}’s café`,
      this.host,
    );
    this.host.append(this.button("Walk to exit →", "exit"));
    if (!own) {
      this.text(
        "p",
        "You are a visitor. Look around and meet the cats. Only the owner can manage orders, coins and supplies.",
        this.host,
      );
      for (const cat of s.cafe?.cats ?? [])
        this.text(
          "p",
          `🐾 ${cat.name} · Happiness ${cat.happiness}%`,
          this.host,
        );
      return;
    }
    const open = s.cafe?.open;
    this.host.append(
      this.button(open ? "Close café" : "Open café", open ? "close" : "open"),
    );
    this.text("p", `Coffee beans: ${c.beans} · Cat food: ${c.food}`, this.host);
    this.text("h2", "Customer orders", this.host);
    this.text(
      "p",
      "Walk to the machine and hold it or E to brew. Click it to pick up ready coffee, then click the matching customer nearby.",
      this.host,
    );
    const orders = s.cafe?.orders ?? [];
    if (!orders.length)
      this.text(
        "p",
        open
          ? "Waiting for a new customer…"
          : "Open your café to welcome customers.",
        this.host,
      );
    for (const o of orders) {
      const row = document.createElement("div");
      row.className = "order-row";
      row.dataset.orderId = o.id;
      this.text("b", `Table ${o.seat + 1} · Black coffee`, row);
      this.text(
        "small",
        {
          WAITING: "Waiting for coffee",
          PREPARING: "Brewing · 4 seconds",
          READY: "Ready to serve",
          CARRIED: "Coffee being carried to the table",
          DRINKING: "Enjoying coffee · payment shortly",
          PAID: "Paid",
          CANCELLED: "Cancelled",
        }[o.status],
        row,
      );
      this.host.append(row);
    }
    this.text("h2", "Your furry family", this.host);
    for (const cat of c.cats)
      this.text("p", `🐈 ${cat.name} · Happiness ${cat.happiness}%`, this.host);
    this.host.append(
      this.button("Walk over & pet cats", "pet"),
      this.button("Feed cats · 1 food", "feed", undefined, c.food < 1),
    );
    const details = document.createElement("details");
    details.open = suppliesOpen;
    const summary = document.createElement("summary");
    summary.textContent = "Supplies & café upgrades";
    details.append(summary);
    details.append(
      this.button(
        "10 coffee beans · 40 coins",
        "beans",
        undefined,
        c.coins < 40,
      ),
      this.button("3 cat food · 15 coins", "food", undefined, c.coins < 15),
      this.button(
        `Decorate · ${80 * c.level} coins`,
        "decor",
        undefined,
        c.coins < 80 * c.level || c.level >= 3,
      ),
      this.button(
        c.visitors
          ? "Visitors: welcome · make private"
          : "Visitors: private · open access",
        "privacy",
      ),
    );
    const adoption = document.createElement("details");
    const adoptionSummary = document.createElement("summary");
    adoptionSummary.textContent = `Adopt a cat · ${c.cats.length}/3 slots · ${100 * c.cats.length} coins`;
    adoption.append(adoptionSummary);
    for (const [i, design] of CAT_DESIGNS.entries())
      adoption.append(
        this.button(
          design.name,
          "adopt",
          String(i),
          c.coins < 100 * c.cats.length || c.cats.length >= 3,
        ),
      );
    details.append(adoption);
    this.host.append(details);
    this.text(
      "p",
      "Leaving or disconnecting closes your café. Unpaid orders are cancelled and reserved beans are returned. Paid orders stay saved.",
      this.host,
      "fine",
    );
  }
}
