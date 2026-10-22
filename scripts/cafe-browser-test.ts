import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { chromium, type Page } from "playwright";
import { createServer } from "vite";
import { createApp } from "../server/app.ts";
import { STATION, SERVICE_POINTS } from "../shared/cafe.ts";
const dir = await mkdtemp(join(tmpdir(), "miaw-cafe-browser-")),
  origin = "http://127.0.0.1:5196";
const app = await createApp({
  profilePath: join(dir, "profiles.json"),
  graceMs: 120000,
  origins: [origin],
  secure: false,
});
await new Promise<void>((r) => app.server.listen(0, "127.0.0.1", r));
const port = (app.server.address() as { port: number }).port;
const vite = await createServer({
  configFile: false,
  server: {
    port: 5196,
    host: "127.0.0.1",
    strictPort: true,
    proxy: {
      "/api": `http://127.0.0.1:${port}`,
      "/ws": { target: `ws://127.0.0.1:${port}`, ws: true },
    },
  },
});
await vite.listen();
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH || existsSync("/usr/bin/chromium")
    ? { executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium" }
    : {}),
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
  ],
});
const a = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    hasTouch: true,
  }),
  b = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const pa = await a.newPage(),
  pb = await b.newPage(),
  errors: string[] = [];
for (const p of [pa, pb]) p.on("pageerror", (e) => errors.push(e.message));
async function wait(f: () => Promise<boolean>, label: string, timeout = 30000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await f()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error(label);
}
async function phone(page: Page, open = true) {
  const hidden = await page
    .locator("#app")
    .evaluate((el) => el.classList.contains("management-hidden"));
  if (hidden === open) await page.keyboard.press("c");
}
async function connect(p: Page) {
  await p.goto(origin);
  await p.locator("#join").click();
  await wait(
    async () =>
      (await p.locator("#dot").getAttribute("class")) === "dot connected",
    "connect",
  );
}
try {
  await mkdir("test-results", { recursive: true });
  await connect(pa);
  await connect(pb);
  const aid = (await pa.locator("#app").getAttribute("data-self-id"))!,
    bid = (await pb.locator("#app").getAttribute("data-self-id"))!;
  await phone(pa);
  await pa.locator('[data-action="walkHome"]').click();
  await wait(
    async () => (await pa.locator("#app").getAttribute("data-area")) !== "town",
    "owner did not walk through door",
  );
  const cafeId = await pa.locator("#app").getAttribute("data-area");
  assert.equal(cafeId, app.town.cafes!.store.byOwner(aid).id);
  console.log(
    "PASS: owner walks a server route to their café and enters a 3D interior",
  );
  await phone(pb);
  await pb.locator('[data-action="visit"]').click();
  await wait(
    async () => (await pb.locator("#app").getAttribute("data-area")) === cafeId,
    "visitor did not enter",
  );
  assert.equal(await pb.locator('[data-action="open"]').count(), 0);
  await wait(
    async () => (await pa.locator("#roster li").count()) === 2,
    "players not visible together inside",
  );
  await phone(pa);
  await pa.locator('[data-action="open"]').click();
  assert.equal(await pa.locator('[data-action="prepare"]').count(), 0);
  assert.equal(await pa.locator('[data-action="serve"]').count(), 0);
  const firstOrder = app.town.cafes!.store.orders(cafeId!)[0];
  async function pointerTarget(kind: "machine" | "customer", target?: string) {
    await phone(pa, false);
    await pa.locator("#world").scrollIntoViewIfNeeded();
    const canvas = pa.locator("#world canvas");
    await wait(
      async () =>
        !!(await canvas.getAttribute("data-machine")) &&
        (await canvas.getAttribute("data-camera-settled")) === "true",
      "interaction projection",
    );
    const box = await canvas.boundingBox();
    assert.ok(box);
    const point = await canvas.evaluate(
      (el, options) => {
        const node = el as HTMLElement;
        return options.kind === "machine"
          ? JSON.parse(node.dataset.machine!)
          : JSON.parse(node.dataset.customers ?? "[]").find(
              (p: { id: string }) => p.id === options.target,
            );
      },
      { kind, target },
    );
    assert.ok(point, "rendered interaction target missing");
    return { x: box.x + point.x, y: box.y + point.y };
  }
  let point = await pointerTarget("machine");
  await pa.mouse.click(point.x, point.y);
  await wait(async () => {
    const p = app.town.residents.get(aid)!.state;
    return Math.hypot(p.x - STATION.x, p.z - STATION.z) < 1.4;
  }, "clicking machine should walk to it");
  await pa.waitForTimeout(300);
  point = await pointerTarget("machine");
  await pa.mouse.move(point.x, point.y);
  await pa.mouse.down();
  await pa.waitForTimeout(800);
  await pa.mouse.up();
  await wait(
    async () =>
      app.town.cafes!.store.orders(cafeId!)[0].status === "WAITING" &&
      app.town.cafes!.store.byOwner(aid).beans === 12,
    "early mouse release must refund and reset",
  );
  point = await pointerTarget("machine");
  await pa.mouse.move(point.x, point.y);
  await pa.mouse.down();
  await pa.waitForTimeout(4600);
  await pa.mouse.up();
  await wait(
    async () =>
      app.town
        .cafes!.store.orders(cafeId!)
        .some((o) => o.id === firstOrder.id && o.status === "READY"),
    "continuous mouse hold should finish coffee",
  );
  await pa.waitForTimeout(200);
  point = await pointerTarget("machine");
  await pa.mouse.click(point.x, point.y);
  await wait(
    async () =>
      app.town.residents.get(aid)!.state.carriedOrderId === firstOrder.id,
    "coffee pickup must be physical",
  );
  await pa.waitForTimeout(200);
  point = await pointerTarget("customer", firstOrder.id);
  await pa.mouse.click(point.x, point.y);
  await wait(async () => {
    const p = app.town.residents.get(aid)!.state,
      t = SERVICE_POINTS[firstOrder.seat];
    return Math.hypot(p.x - t.x, p.z - t.z) < 1.5;
  }, "walking coffee to customer");
  await pa.waitForTimeout(300);
  point = await pointerTarget("customer", firstOrder.id);
  await pa.mouse.click(point.x, point.y);
  await wait(
    async () => app.town.cafes!.store.byOwner(aid).served === 1,
    "customer payment was not saved",
  );
  const earned = app.town.cafes!.store.byOwner(aid);
  assert.equal(earned.coins, 178);
  assert.equal(app.town.cafes!.store.byOwner(bid).coins, 150);
  console.log(
    "PASS: physical mouse hold/cancel → ready → pickup → walk → serve → drink → authoritative payment; visitor economy isolated",
  );
  await wait(async () => {
    const names = JSON.parse(
      (await pa.locator("#world canvas").getAttribute("data-model-names")) ??
        "[]",
    );
    return [
      "table_round_A",
      "chair_A",
      "kitchencounter_straight_A",
      "bowl_small",
      "building_A_withoutBase",
      "building_B_withoutBase",
    ].every((name) => names.includes(name));
  }, "CC0 GLB models should load");
  assert.equal(
    await pa.locator("#world canvas").getAttribute("data-asset-error"),
    null,
  );
  await pa.locator("#world").scrollIntoViewIfNeeded();
  await pa.screenshot({
    path: "test-results/cafe-online-desktop.png",
    fullPage: false,
  });
  await phone(pa);
  await pa.locator('[data-action="close"]').click();
  await phone(pa);
  await pa.locator('[data-action="feed"]').click();
  await wait(
    async () => app.town.cafes!.store.byOwner(aid).food === 4,
    "cat feeding failed",
  );
  await phone(pa);
  await pa.locator("summary").first().click();
  await phone(pa);
  await pa.locator('[data-action="decor"]').click();
  await wait(
    async () => app.town.cafes!.store.byOwner(aid).level === 2,
    "upgrade failed",
  );
  assert.equal(app.town.cafes!.store.byOwner(aid).coins, 98);
  await pa.reload({ waitUntil: "domcontentloaded" });
  await pa.locator("#join").click();
  await wait(
    async () =>
      (await pa.locator("#dot").getAttribute("class")) === "dot connected",
    "reload reconnect",
  );
  await wait(
    async () => (await pa.locator(".wallet").textContent()) === "98 ◈",
    "durable coins missing",
  );
  assert.equal(await pa.locator("#app").getAttribute("data-area"), cafeId);
  await pa.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await pa.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  await phone(pa);
  await pa.locator('[data-action="open"]').click();
  const mobileOrder = app.town.cafes!.store.orders(cafeId!)[0];
  const touch = await a.newCDPSession(pa);
  const touchPress = async (point: { x: number; y: number }) =>
    touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [point],
    });
  const touchRelease = async () =>
    touch.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  const tap = async (point: { x: number; y: number }) => {
    await touchPress(point);
    await touchRelease();
  };
  point = await pointerTarget("machine");
  await pa.touchscreen.tap(point.x, point.y);
  await wait(async () => {
    const p = app.town.residents.get(aid)!.state;
    return Math.hypot(p.x - STATION.x, p.z - STATION.z) < 1.4;
  }, "mobile tap should approach the machine");
  await pa.waitForTimeout(300);
  point = await pointerTarget("machine");
  await touchPress(point);
  try {
    await wait(
      async () => !!app.town.residents.get(aid)!.work,
      "touch hold must actually start",
    );
  } catch (error) {
    await pa.screenshot({ path: "test-results/cafe-touch-failure.png" });
    console.log("Touch diagnostics", {
      point,
      state: app.town.residents.get(aid)!.state,
      hint: await pa.locator("#interaction-hint").textContent(),
      hit: await pa.locator("#world canvas").getAttribute("data-last-hit"),
    });
    throw error;
  }
  await pa.waitForTimeout(650);
  await touchRelease();
  await wait(
    async () =>
      app.town.cafes!.store.orders(cafeId!).find((o) => o.id === mobileOrder.id)
        ?.status === "WAITING",
    "touch release should cancel brewing",
  );
  await pa.waitForFunction(
    () => document.querySelector<HTMLElement>("#brew-progress")!.hidden,
  );
  await pa.waitForTimeout(300);
  await pa.keyboard.down("e");
  await pa.waitForTimeout(4600);
  await pa.keyboard.up("e");
  await wait(
    async () =>
      app.town.cafes!.store.orders(cafeId!).find((o) => o.id === mobileOrder.id)
        ?.status === "READY",
    "keyboard E should require a full hold",
  );
  await pa.waitForTimeout(250);
  point = await pointerTarget("machine");
  await tap(point);
  await wait(
    async () =>
      app.town.residents.get(aid)!.state.carriedOrderId === mobileOrder.id,
    "mobile pickup",
  );
  await pa.waitForTimeout(250);
  point = await pointerTarget("customer", mobileOrder.id);
  await tap(point);
  await wait(async () => {
    const p = app.town.residents.get(aid)!.state,
      t = SERVICE_POINTS[mobileOrder.seat];
    return Math.hypot(p.x - t.x, p.z - t.z) < 1.5;
  }, "mobile walk to customer");
  await pa.waitForTimeout(300);
  point = await pointerTarget("customer", mobileOrder.id);
  await tap(point);
  await wait(
    async () => app.town.cafes!.store.byOwner(aid).served === 2,
    "mobile delivery payment",
  );
  assert.equal(app.town.cafes!.store.byOwner(aid).coins, 129);
  await touch.detach();
  await phone(pa);
  await pa.locator('[data-action="close"]').click();
  await phone(pa);
  await pa.locator("summary").first().click();
  await phone(pa);
  await pa.locator("summary").filter({ hasText: "Adopt a cat" }).click();
  await phone(pa);
  await pa.locator('[data-action="catSlot"]').click();
  await pa.locator('[data-action="adopt"][data-target="0"]').click();
  await wait(
    async () => app.town.cafes!.store.byOwner(aid).cats.length === 2,
    "selected cat adoption",
  );
  assert.equal(app.town.cafes!.store.byOwner(aid).cats[1].coat, 0);
  assert.equal(app.town.cafes!.store.byOwner(aid).coins, 19);
  await pa.locator("#world").scrollIntoViewIfNeeded();
  console.log(
    "PASS: emulated touch cancellation/pickup/delivery, keyboard E hold, and paid cat slot and selected basic adoption",
  );
  await pa.screenshot({
    path: "test-results/cafe-online-mobile.png",
    fullPage: true,
  });
  await phone(pa);
  await pa.locator('[data-action="exit"]').click();
  await wait(
    async () => (await pa.locator("#app").getAttribute("data-area")) === "town",
    "exit route failed",
  );
  assert.equal(app.town.cafes!.store.byOwner(aid).coins, 19);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: cat food consumption, decoration purchase, saved coins after reload, mobile layout, exit to correct lot, no JS errors",
  );
} finally {
  await browser.close();
  await vite.close();
  await app.close();
  await rm(dir, { recursive: true, force: true });
}
