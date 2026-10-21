import { CAT_DESIGNS } from "../shared/cat-designs.ts";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { CATALOG, type Cafe, type Cat, type Order } from "../shared/cafe.ts";
export class GameStore {
  private db: DatabaseSync;
  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    const version = Number(
      this.db.prepare("PRAGMA user_version").get()?.user_version ?? 0,
    );
    if (version > 1) {
      this.db.close();
      throw Error("This game database needs a newer server version.");
    }
    this.db.exec(`
 PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;
 CREATE TABLE IF NOT EXISTS cafes(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL UNIQUE,coins INTEGER NOT NULL CHECK(coins>=0),beans INTEGER NOT NULL CHECK(beans>=0),food INTEGER NOT NULL CHECK(food>=0),level INTEGER NOT NULL CHECK(level BETWEEN 1 AND 3),served INTEGER NOT NULL DEFAULT 0,revenue INTEGER NOT NULL DEFAULT 0,visitors INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS cats(id TEXT PRIMARY KEY,cafe_id TEXT NOT NULL REFERENCES cafes(id),name TEXT NOT NULL,coat INTEGER NOT NULL,happiness INTEGER NOT NULL CHECK(happiness BETWEEN 0 AND 100));
 CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,cafe_id TEXT NOT NULL REFERENCES cafes(id),seat INTEGER NOT NULL,status TEXT NOT NULL,created_at INTEGER NOT NULL,ready_at INTEGER NOT NULL DEFAULT 0,paid_at INTEGER NOT NULL DEFAULT 0,consumed INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS ledger(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL,request_id TEXT NOT NULL,fingerprint TEXT NOT NULL,kind TEXT NOT NULL,amount INTEGER NOT NULL,before_balance INTEGER NOT NULL,after_balance INTEGER NOT NULL,message TEXT NOT NULL,created_at INTEGER NOT NULL,UNIQUE(owner_id,request_id));
 PRAGMA user_version=1;`);
    this.atomic(() => {
      for (const row of this.db.prepare("SELECT id FROM cafes").all())
        this.cancelOrders(String(row.id));
    });
  }
  private atomic<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  ensure(ownerId: string) {
    let row = this.db
      .prepare("SELECT id FROM cafes WHERE owner_id=?")
      .get(ownerId);
    if (!row) {
      this.atomic(() => {
        const id = randomUUID();
        this.db
          .prepare(
            "INSERT INTO cafes(id,owner_id,coins,beans,food,level) VALUES (?,?,150,12,5,1)",
          )
          .run(id, ownerId);
        this.db
          .prepare("INSERT INTO cats VALUES (?,?,?,?,?)")
          .run(randomUUID(), id, "Oyen", 0, 80);
      });
    }
    return this.byOwner(ownerId);
  }
  byOwner(id: string) {
    const row = this.db
      .prepare("SELECT id FROM cafes WHERE owner_id=?")
      .get(id);
    if (!row) throw Error("Café not found.");
    return this.get(String(row.id));
  }
  get(id: string): Cafe {
    const r = this.db.prepare("SELECT * FROM cafes WHERE id=?").get(id);
    if (!r) throw Error("Café not found.");
    const cats = this.db
      .prepare("SELECT * FROM cats WHERE cafe_id=? ORDER BY rowid")
      .all(id)
      .map((c) => ({
        id: String(c.id),
        name: String(c.name),
        coat: Number(c.coat),
        happiness: Number(c.happiness),
        ownerId: String(r.owner_id),
      }));
    return {
      id: String(r.id),
      ownerId: String(r.owner_id),
      coins: Number(r.coins),
      beans: Number(r.beans),
      food: Number(r.food),
      level: Number(r.level),
      served: Number(r.served),
      revenue: Number(r.revenue),
      visitors: !!r.visitors,
      cats,
    };
  }
  orders(cafeId: string): Order[] {
    return this.db
      .prepare(
        "SELECT * FROM orders WHERE cafe_id=? AND status NOT IN ('PAID','CANCELLED') ORDER BY created_at",
      )
      .all(cafeId)
      .map((r) => ({
        id: String(r.id),
        cafeId: String(r.cafe_id),
        seat: Number(r.seat),
        status: r.status as Order["status"],
        createdAt: Number(r.created_at),
        readyAt: Number(r.ready_at),
        paidAt: Number(r.paid_at),
        consumed: Number(r.consumed),
      }));
  }
  createOrder(cafeId: string, now: number) {
    const active = this.orders(cafeId);
    if (active.length >= 2) return;
    const seat = active.some((o) => o.seat === 0) ? 1 : 0;
    const id = randomUUID();
    this.db
      .prepare(
        "INSERT INTO orders(id,cafe_id,seat,status,created_at) VALUES (?,?,?,'WAITING',?)",
      )
      .run(id, cafeId, seat, now);
    return id;
  }
  transaction(
    ownerId: string,
    requestId: string,
    fingerprint: string,
    kind: string,
    fn: (cafe: Cafe) => string,
  ) {
    const ledgerId =
      (kind === "CUSTOMER_PAYMENT" ? "server:" : "client:") + requestId;
    return this.atomic(() => {
      const existing = this.db
        .prepare("SELECT * FROM ledger WHERE owner_id=? AND request_id=?")
        .get(ownerId, ledgerId);
      if (existing) {
        if (existing.fingerprint !== fingerprint)
          throw Error("Request ID was already used for another action.");
        return String(existing.message);
      }
      const before = this.byOwner(ownerId);
      const message = fn(before);
      const after = this.byOwner(ownerId);
      this.db
        .prepare("INSERT INTO ledger VALUES (?,?,?,?,?,?,?,?,?,?)")
        .run(
          randomUUID(),
          ownerId,
          ledgerId,
          fingerprint,
          kind,
          after.coins - before.coins,
          before.coins,
          after.coins,
          message,
          Date.now(),
        );
      return message;
    });
  }
  purchase(
    ownerId: string,
    requestId: string,
    item: keyof typeof CATALOG,
    coat?: number,
  ) {
    return this.transaction(
      ownerId,
      requestId,
      item + (coat === undefined ? "" : ":" + coat),
      "PURCHASE",
      (c) => {
        if (
          coat !== undefined &&
          (!Number.isInteger(coat) || coat < 0 || coat >= CAT_DESIGNS.length)
        )
          throw Error("Choose an available cat design.");
        const entry = CATALOG[item];
        const cost =
          entry.price *
          (item === "decor" ? c.level : item === "adopt" ? c.cats.length : 1);
        if (item === "decor" && c.level >= 3)
          throw Error("Your café is already fully decorated.");
        if (item === "adopt" && c.cats.length >= 3)
          throw Error("Your cat home is full.");
        if (c.coins < cost) throw Error("Not enough PawCoins.");
        if (
          (item === "beans" && c.beans > 90) ||
          (item === "food" && c.food > 27)
        )
          throw Error("Your supply storage is full.");
        this.db
          .prepare("UPDATE cafes SET coins=coins-? WHERE id=?")
          .run(cost, c.id);
        if (item === "beans")
          this.db
            .prepare("UPDATE cafes SET beans=beans+10 WHERE id=?")
            .run(c.id);
        if (item === "food")
          this.db.prepare("UPDATE cafes SET food=food+3 WHERE id=?").run(c.id);
        if (item === "decor")
          this.db
            .prepare("UPDATE cafes SET level=level+1 WHERE id=?")
            .run(c.id);
        if (item === "adopt")
          this.db
            .prepare("INSERT INTO cats VALUES (?,?,?,?,?)")
            .run(
              randomUUID(),
              c.id,
              CAT_DESIGNS[coat ?? c.cats.length].defaultName,
              coat ?? c.cats.length,
              80,
            );
        return item === "adopt"
          ? "Your new cat has arrived!"
          : item === "decor"
            ? "Your café has a fresh new look!"
            : "Supplies delivered to your café.";
      },
    );
  }
  care(ownerId: string, requestId: string, feed: boolean) {
    return this.transaction(
      ownerId,
      requestId,
      feed ? "feed" : "pet",
      "CAT_CARE",
      (c) => {
        if (feed && c.food < 1)
          throw Error("Out of cat food. Order supplies first.");
        if (feed)
          this.db.prepare("UPDATE cafes SET food=food-1 WHERE id=?").run(c.id);
        this.db
          .prepare(
            "UPDATE cats SET happiness=MIN(100,happiness+?) WHERE cafe_id=?",
          )
          .run(feed ? 20 : 5, c.id);
        return feed
          ? "Happy cats, full bellies!"
          : "Purrr… your cats love the attention.";
      },
    );
  }
  privacy(ownerId: string, requestId: string) {
    return this.transaction(ownerId, requestId, "privacy", "ACCESS", (c) => {
      this.db
        .prepare("UPDATE cafes SET visitors=? WHERE id=?")
        .run(c.visitors ? 0 : 1, c.id);
      return c.visitors
        ? "New visitors are now blocked. Existing visitors may finish their visit."
        : "Your café welcomes visitors.";
    });
  }
  prepare(ownerId: string, requestId: string, orderId: string, now: number) {
    return this.transaction(
      ownerId,
      requestId,
      "prepare:" + orderId,
      "PREPARATION",
      (c) => {
        const order = this.orders(c.id).find((o) => o.id === orderId);
        if (!order || order.status !== "WAITING")
          throw Error("This order is no longer waiting.");
        if (this.orders(c.id).some((o) => o.status === "PREPARING"))
          throw Error("The coffee machine is in use.");
        if (c.beans < 1)
          throw Error("Out of coffee beans. Order supplies first.");
        this.db.prepare("UPDATE cafes SET beans=beans-1 WHERE id=?").run(c.id);
        this.db
          .prepare(
            "UPDATE orders SET status='PREPARING',ready_at=?,consumed=1 WHERE id=?",
          )
          .run(now + 4000, orderId);
        return "Coffee is brewing. Ready in 4 seconds.";
      },
    );
  }
  interruptPreparation(ownerId: string, orderId: string) {
    return this.atomic(() => {
      const c = this.byOwner(ownerId),
        o = this.orders(c.id).find((o) => o.id === orderId);
      if (!o || o.status !== "PREPARING") return;
      if (o.consumed)
        this.db.prepare("UPDATE cafes SET beans=beans+1 WHERE id=?").run(c.id);
      this.db
        .prepare(
          "UPDATE orders SET status='WAITING',consumed=0,ready_at=0 WHERE id=?",
        )
        .run(o.id);
    });
  }
  pickup(ownerId: string, requestId: string, orderId: string) {
    return this.transaction(
      ownerId,
      requestId,
      "pickup:" + orderId,
      "PICKUP",
      (c) => {
        const o = this.orders(c.id).find((o) => o.id === orderId);
        if (!o || o.status !== "READY")
          throw Error("This coffee is not ready to pick up.");
        if (this.orders(c.id).some((o) => o.status === "CARRIED"))
          throw Error("You are already carrying a coffee.");
        this.db
          .prepare("UPDATE orders SET status='CARRIED' WHERE id=?")
          .run(o.id);
        return "Coffee picked up. Walk to the matching customer.";
      },
    );
  }
  serve(ownerId: string, requestId: string, orderId: string, now: number) {
    return this.transaction(
      ownerId,
      requestId,
      "serve:" + orderId,
      "DELIVERY",
      (c) => {
        const order = this.orders(c.id).find((o) => o.id === orderId);
        if (!order || order.status !== "CARRIED")
          throw Error("This coffee is not ready to serve. Pick it up first.");
        this.db
          .prepare("UPDATE orders SET status='DRINKING',paid_at=? WHERE id=?")
          .run(now + 3000, orderId);
        return "Coffee served! Your customer will pay after enjoying it.";
      },
    );
  }
  advance(cafeId: string, now: number) {
    const c = this.get(cafeId);
    for (const order of this.orders(cafeId)) {
      if (order.status === "PREPARING" && now >= order.readyAt)
        this.db
          .prepare(
            "UPDATE orders SET status='READY' WHERE id=? AND status='PREPARING'",
          )
          .run(order.id);
      if (order.status === "DRINKING" && now >= order.paidAt)
        this.transaction(
          c.ownerId,
          "payment:" + order.id,
          "payment:" + order.id,
          "CUSTOMER_PAYMENT",
          (current) => {
            const live = this.orders(cafeId).find((o) => o.id === order.id);
            if (!live || live.status !== "DRINKING")
              throw Error("Order already settled.");
            const earned =
              20 +
              current.level * 3 +
              (current.cats.some((cat) => cat.happiness >= 60) ? 5 : 0);
            this.db
              .prepare("UPDATE orders SET status='PAID' WHERE id=?")
              .run(order.id);
            this.db
              .prepare(
                "UPDATE cafes SET coins=coins+?,revenue=revenue+?,served=served+1 WHERE id=?",
              )
              .run(earned, earned, cafeId);
            return `Order paid: +${earned} PawCoins.`;
          },
        );
      if (order.status !== "DRINKING" && now - order.createdAt > 60000)
        this.atomic(() => this.cancelOrder(order));
    }
  }
  private cancelOrder(order: Order) {
    if (order.consumed)
      this.db
        .prepare("UPDATE cafes SET beans=beans+1 WHERE id=?")
        .run(order.cafeId);
    this.db
      .prepare("UPDATE orders SET status='CANCELLED',consumed=0 WHERE id=?")
      .run(order.id);
  }
  private cancelOrders(id: string) {
    for (const order of this.orders(id)) this.cancelOrder(order);
  }
  cancel(id: string) {
    this.atomic(() => this.cancelOrders(id));
  }
  close() {
    this.db.close();
  }
}
