import { CAT_DESIGNS } from "../../shared/cat-designs.ts";
import type {
  Action,
  ActionResult,
  Cafe,
  Property,
} from "../../shared/cafe.ts";
import type { PublicState } from "../../shared/protocol.ts";
import {
  GOALS,
  RECIPES,
  recipe,
  customerProfile,
  patience,
} from "../../shared/experience.ts";
import { FURNITURE_SHOP, reputation } from "../../shared/furniture.ts";
import {
  RARITIES,
  CAT_PRICES,
  CAT_BONUSES,
  slotCost,
  slotLimit,
} from "../../shared/cat-collection.ts";
export class CafePanel {
  private personal?: Cafe;
  private snapshot?: PublicState;
  private pending = false;
  private traveling = false;
  private last = "";
  private message =
    "Your café is ready. Use E nearby to interact; O opens or closes the café.";
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
    b.disabled = disabled || this.pending || this.traveling;
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
    this.traveling =
      !!self.doorTransition && s.time < self.doorTransition.endsAt;
    const key = JSON.stringify([
      c,
      s.cafe && {
        open: s.cafe.open,
        level: s.cafe.level,
        orders: s.cafe.orders.map((o) => ({
          ...o,
          patience: Math.floor(patience(o, s.time) * 20),
        })),
        shift: s.cafe.shift,
      },
      s.properties,
      self.area,
      this.traveling,
      this.pending,
      this.message,
    ]);
    if (key === this.last) return;
    this.last = key;
    const suppliesOpen = !!this.host.querySelector(
      "details[data-section='supplies'][open]",
    );
    const inventoryOpen = !!this.host.querySelector(
      "details[data-section='inventory'][open]",
    );
    const adoptionOpen = !!this.host.querySelector(
      "details[data-section='adoption'][open]",
    );
    this.host.replaceChildren();
    const inside = self.area && self.area !== "town",
      own = inside && self.area === c.id;
    this.text("div", "YOUR PAWCOINS", this.host, "eyebrow");
    this.text("div", c.coins.toLocaleString() + " ◈", this.host, "wallet");
    this.text(
      "p",
      `Reputation ${reputation(c.served)} · Décor ${c.level} · ${c.served} customers served`,
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
      this.host.append(
        this.button("Pet the cats", "pet"),
        this.button(
          "Share 1 cat food from your bag",
          "feed",
          undefined,
          c.food < 1,
        ),
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
    if (s.cafe?.shift) {
      const shift = s.cafe.shift;
      this.text(
        "p",
        `${open ? "This shift" : "Last shift"}: ${shift.served} served · ${shift.earned} coins · ${shift.missed} missed`,
        this.host,
        "shift-report",
      );
    }
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
      this.text(
        "b",
        `${customerProfile(o.id).name} · Table ${o.seat + 1}`,
        row,
      );
      this.text("small", recipe(o.recipe).name, row);
      this.text(
        "small",
        {
          WAITING: "Waiting for coffee",
          PREPARING: `Brewing · ${recipe(o.recipe).brewMs / 1000} seconds`,
          READY: "Ready to serve",
          CARRIED: "Coffee being carried to the table",
          DRINKING: "Enjoying coffee · payment shortly",
          PAID: "Paid",
          CANCELLED: "Cancelled",
        }[o.status],
        row,
      );
      if (!["DRINKING", "PAID", "CANCELLED"].includes(o.status)) {
        const bar = document.createElement("progress");
        bar.max = 60;
        bar.value = Math.round(patience(o, s.time) * 60);
        bar.setAttribute(
          "aria-label",
          `${customerProfile(o.id).name}'s remaining patience`,
        );
        row.append(bar);
      }
      this.host.append(row);
    }
    this.text("h2", "Your furry family", this.host);
    for (const cat of c.cats) {
      const row = document.createElement("div");
      row.className = "cat-row";
      this.text("b", `🐾 ${cat.name}`, row);
      this.text(
        "small",
        `${RARITIES[cat.coat]} · ${CAT_DESIGNS[cat.coat]?.name ?? "Cat"} · ${cat.happiness}% happy`,
        row,
      );
      row.append(
        this.button(`Cuddle ${cat.name}`, "pickCat", cat.id),
        this.button(`Pet ${cat.name}`, "pet", cat.id),
      );
      this.host.append(row);
    }
    this.host.append(
      this.button("Walk over & pet cats", "pet"),
      this.button("Feed cats · 1 food", "feed", undefined, c.food < 1),
    );
    const details = document.createElement("details");
    details.dataset.section = "supplies";
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
        `Expand & decorate · ${80 * c.level} coins`,
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
    adoption.dataset.section = "adoption";
    adoption.open = adoptionOpen;
    const adoptionSummary = document.createElement("summary");
    adoptionSummary.textContent = `Adopt a cat · ${c.cats.length}/${c.catSlots} slots · max 10 in café`;
    adoption.append(adoptionSummary);
    adoption.append(
      this.button(
        `Add slot ${c.catSlots + 1} · ${slotCost(c.catSlots)} coins`,
        "catSlot",
        undefined,
        c.catSlots >= slotLimit(c.level) || c.coins < slotCost(c.catSlots),
      ),
    );
    this.text(
      "p",
      `Current space supports ${slotLimit(c.level)} slots. Expand to support 6, then 10. Healthy rarer cats improve tips and attract customers.`,
      adoption,
    );
    for (const [i, design] of CAT_DESIGNS.entries())
      adoption.append(
        this.button(
          `${design.name} · ${RARITIES[i]} · ${CAT_PRICES[i]} coins${CAT_BONUSES[i] ? ` · +${CAT_BONUSES[i]} charm` : ""}`,
          "adopt",
          String(i),
          c.coins < CAT_PRICES[i] || c.cats.length >= c.catSlots,
        ),
      );
    details.append(adoption);
    this.host.append(details);
    const inventory = document.createElement("details");
    inventory.dataset.section = "inventory";
    inventory.open = inventoryOpen;
    const invSummary = document.createElement("summary");
    invSummary.textContent = "Furniture inventory & MEOKEA";
    inventory.append(invSummary);
    for (const f of c.layout.filter((f) => f.level <= c.level)) {
      const row = document.createElement("div");
      row.className = "inventory-row";
      this.text(
        "small",
        `${f.kind} · ${f.placed === false ? "In inventory" : "In café"}`,
        row,
      );
      const place = document.createElement("button");
      place.className = "secondary";
      place.textContent = f.placed === false ? "Place in room" : "Rearrange";
      place.dataset.place = f.id;
      place.disabled = !!open;
      row.append(place);
      if (f.placed !== false)
        row.append(
          this.button(
            "Store",
            "moveFurniture",
            JSON.stringify({
              id: f.id,
              x: Math.round(f.x * 2) / 2,
              z: Math.round(f.z * 2) / 2,
              rotation: f.rotation,
              placed: false,
            }),
            !!open,
          ),
        );
      inventory.append(row);
    }
    this.text(
      "p",
      "MEOKEA delivery · owned items go into inventory before placement.",
      inventory,
    );
    for (const item of FURNITURE_SHOP)
      inventory.append(
        this.button(
          `${item.name} · ${item.price} coins`,
          "buyFurniture",
          item.id,
          c.coins < item.price,
        ),
      );
    this.host.append(inventory);
    this.text("h2", "A little something to work towards", this.host);
    for (const goal of GOALS) {
      const row = document.createElement("div");
      row.className = "goal-row";
      this.text("b", goal.title, row);
      this.text(
        "small",
        `${goal.description} · ${Math.min(goal.target, goal.progress(c))}/${goal.target}`,
        row,
      );
      row.append(
        this.button(
          c.claimed.includes(goal.id)
            ? "Collected ✓"
            : `Collect ${goal.reward} coins`,
          "claim",
          goal.id,
          c.claimed.includes(goal.id) || goal.progress(c) < goal.target,
        ),
      );
      this.host.append(row);
    }
    this.text("h2", "Your coffee notebook", this.host);
    for (const drink of RECIPES)
      this.text(
        "p",
        c.served >= drink.unlock
          ? `☕ ${drink.name} · ${drink.brewMs / 1000}s brew`
          : `🔒 ${drink.name} · serve ${drink.unlock} customers to unlock`,
        this.host,
      );
    this.text(
      "p",
      "Leaving or disconnecting closes your café. Unpaid orders are cancelled and reserved beans are returned. Paid orders stay saved.",
      this.host,
      "fine",
    );
  }
}
