import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";
import { createApp } from "../server/app.ts";
import { roomToTown } from "../shared/portals.ts";
import { STATION } from "../shared/cafe.ts";
const dir = await mkdtemp(join(tmpdir(), "miaw-fpp-")),
  origin = "http://127.0.0.1:5198";
const app = await createApp({
  profilePath: join(dir, "profiles.json"),
  origins: [origin],
  secure: false,
  graceMs: 120000,
});
await new Promise<void>((r) => app.server.listen(0, "127.0.0.1", r));
const port = (app.server.address() as { port: number }).port;
const vite = await createServer({
  configFile: false,
  server: {
    host: "127.0.0.1",
    port: 5198,
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
const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    hasTouch: true,
  }),
  page = await context.newPage(),
  errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
const results: unknown[] = [],
  sent = new Map<string, { action: string; target?: string }>();
page.on("websocket", (socket) => {
  socket.on("framesent", ({ payload }) => {
    try {
      const m = JSON.parse(payload.toString());
      if (m.type === "action")
        sent.set(m.requestId, { action: m.action, target: m.target });
    } catch {}
  });
  socket.on("framereceived", ({ payload }) => {
    try {
      const m = JSON.parse(payload.toString());
      if (m.type === "result")
        results.push({
          ...sent.get(m.requestId),
          ok: m.ok,
          pending: m.pending,
          message: m.message,
        });
    } catch {}
  });
});
const canvas = page.locator("#world canvas");
let aid = "",
  stage = "join";
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function wait(
  predicate: () => boolean | Promise<boolean>,
  label: string,
  timeout = 30000,
) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await predicate()) return;
    await pause(30);
  }
  throw Error(label);
}
const state = () => app.town.residents.get(aid)!.state;
const camera = async () =>
  JSON.parse((await canvas.getAttribute("data-camera")) ?? "{}");
async function aim(x: number, y: number, z: number) {
  const c = await camera(),
    dx = x - c.x,
    dy = y - c.y,
    dz = z - c.z;
  const yaw = Math.atan2(-dx, -dz),
    pitch = Math.atan2(dy, Math.hypot(dx, dz));
  let turn = Math.atan2(Math.sin(yaw - c.yaw), Math.cos(yaw - c.yaw)),
    tilt = pitch - c.pitch;
  const chunks = Math.max(
    1,
    Math.ceil(Math.max(Math.abs(turn), Math.abs(tilt)) / 0.65),
  );
  const box = await canvas.boundingBox();
  assert.ok(box);
  for (let i = 0; i < chunks; i++) {
    const px = box.x + box.width / 2,
      py = box.y + box.height / 2;
    await page.mouse.move(px, py);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(
      px - turn / chunks / 0.004,
      py - tilt / chunks / 0.004,
      { steps: 2 },
    );
    await page.mouse.up({ button: "right" });
  }
  await wait(async () => {
    const v = await camera();
    return (
      Math.abs(Math.atan2(Math.sin(v.yaw - yaw), Math.cos(v.yaw - yaw))) <
        0.04 && Math.abs(v.pitch - pitch) < 0.04
    );
  }, "physical mouse drag aims at target");
}
async function walk(key: string, predicate: () => boolean) {
  await page.keyboard.down(key);
  try {
    await wait(predicate, `WASD ${key} movement`, 5000);
  } finally {
    await page.keyboard.up(key);
  }
  await wait(() => {
    const p = app.town.residents.get(aid)!;
    return p.input.x === 0 && p.input.z === 0 && !p.state.moving;
  }, "released movement reaches the server");
  await wait(async () => {
    const c = await camera(),
      p = state().area === "town" ? state() : roomToTown(state(), state().lot);
    return Math.hypot(c.x - p.x, c.z - p.z) < 0.04;
  }, "rendered eye reaches the stopped player");
}
try {
  await mkdir("test-results", { recursive: true });
  await page.goto(origin);
  await page.locator("#join").click();
  await wait(
    async () =>
      (await page.locator("#dot").getAttribute("class")) === "dot connected",
    "join",
  );
  aid = (await page.locator("#app").getAttribute("data-self-id"))!;
  assert.ok(aid);
  await wait(
    async () => (await camera()).selfHidden === true,
    "first-person hides own head",
  );
  assert.equal(await canvas.getAttribute("data-view"), "first-person");
  let c = await camera();
  assert.ok(Math.abs(c.y - 1.65) < 0.04);
  assert.ok(Math.hypot(c.x - state().x, c.z - state().z) < 0.2);
  assert.equal(await page.locator("#count").textContent(), "1");
  assert.equal(
    c.streetPeople,
    10,
    "ambient pedestrians are not online players",
  );
  await wait(
    async () => {
      const names = JSON.parse(
        (await canvas.getAttribute("data-model-names")) ?? "[]",
      );
      return [
        "npc_male_casual",
        "npc_female_casual",
        "npc_male_hoodie",
        "npc_female_formal",
        "car_hatchback",
        "bench",
        "streetlight",
      ].every((n) => names.includes(n));
    },
    "real imported civilian and street models load",
    60000,
  );
  stage = "street view";
  await aim(state().x + 35, 1.65, 0);
  await page.screenshot({ path: "test-results/fpp-street.png" });
  stage = "pointer lock";
  await page.mouse.click(680, 450);
  await wait(
    () => page.evaluate(() => !!document.pointerLockElement),
    "real pointer capture",
  );
  const before = (await camera()).yaw;
  await page.mouse.move(780, 450);
  await wait(
    async () => Math.abs((await camera()).yaw - before) > 0.03,
    "captured mouse changes yaw",
  );
  await page.keyboard.press("c");
  await wait(
    () => page.evaluate(() => !document.pointerLockElement),
    "phone releases captured mouse",
  );
  const beforePhone = { x: state().x, z: state().z };
  await page.keyboard.down("w");
  await pause(400);
  await page.keyboard.up("w");
  assert.deepEqual(
    { x: state().x, z: state().z },
    beforePhone,
    "phone blocks walking",
  );
  stage = "enter café";
  await page.locator('[data-action="walkHome"]').click();
  await page.keyboard.press("c");
  const cafe = app.town.cafes!.store.byOwner(aid);
  await wait(
    () => state().area === cafe.id && !state().doorTransition,
    "walk through doorway",
  );
  await wait(async () => {
    const c = await camera(),
      p = roomToTown(state(), state().lot);
    return (
      Math.hypot(c.x - p.x, c.z - p.z) < 0.25 && Math.abs(c.y - 1.65) < 0.05
    );
  }, "eye remains at player after entry");
  assert.equal(await canvas.getAttribute("data-view"), "first-person");
  stage = "walk to coffee machine";
  await page.locator("#camera").click();
  await walk("a", () => state().x <= -3.6);
  await walk("w", () => state().z <= -2.2);
  assert.ok(Math.hypot(state().x - STATION.x, state().z - STATION.z) < 1.4);
  const machine = roomToTown({ x: -3.5, z: -3.4 }, state().lot);
  await aim(machine.x, 1.65, machine.z);
  await wait(
    async () => (await camera()).aim === "machine",
    "centre reticle hits coffee machine",
  );
  await page.screenshot({ path: "test-results/fpp-machine.png" });
  stage = "brew cancellation";
  await page.keyboard.press("o");
  await wait(
    () => app.town.cafes!.store.orders(cafe.id).length > 0,
    "open creates real order",
  );
  const order = app.town.cafes!.store.orders(cafe.id)[0];
  await wait(
    async () =>
      JSON.parse((await canvas.getAttribute("data-customers")) ?? "[]").some(
        (c: { id: string }) => c.id === order.id,
      ),
    "waiting order reaches the rendered client",
  );
  await page.keyboard.down("e");
  await wait(
    () => !!app.town.residents.get(aid)!.work,
    "reticle E starts real brewing",
  );
  await page.waitForFunction(
    () => !document.querySelector<HTMLElement>("#brew-progress")!.hidden,
  );
  await pause(500);
  await page.keyboard.up("e");
  await wait(
    () =>
      !app.town.residents.get(aid)!.work &&
      app.town.cafes!.store.get(cafe.id).beans === 12,
    "release refunds bean",
  );
  await page.waitForFunction(
    () => document.querySelector<HTMLElement>("#brew-progress")!.hidden,
  );
  stage = "brew and pickup";
  await page.keyboard.down("e");
  await wait(() => !!app.town.residents.get(aid)!.work, "second hold starts");
  await wait(
    () =>
      app.town.cafes!.store.orders(cafe.id).find((o) => o.id === order.id)
        ?.status === "READY",
    "full timed brew",
  );
  await page.keyboard.up("e");
  await pause(200);
  await page.keyboard.press("e");
  await wait(() => state().carriedOrderId === order.id, "FPP pickup");
  await wait(
    async () => (await camera()).cup === true,
    "cup renders in first-person hands",
  );
  stage = "carry and serve";
  await page.locator("#camera").click();
  await walk("s", () => state().z >= 2.9);
  await walk("d", () => state().x >= -1.7);
  const customer = roomToTown({ x: -1.6, z: 1.35 }, state().lot);
  await aim(customer.x, 1.25, customer.z);
  await wait(async () => {
    const c = await camera();
    return c.aim === "customer" && c.aimTarget === order.id;
  }, "reticle identifies the matching customer");
  await page.keyboard.press("e");
  await wait(
    () => app.town.cafes!.store.get(cafe.id).served === 1,
    "FPP nearby delivery pays once",
  );
  assert.equal(app.town.cafes!.store.get(cafe.id).coins, 178);
  await wait(
    async () => (await page.locator("#hud-wallet").textContent()) === "178 ◈",
    "payment reaches player wallet HUD",
  );
  await page.screenshot({ path: "test-results/fpp-service.png" });
  stage = "design view";
  await page.keyboard.press("o");
  await wait(
    async () =>
      !app.town.cafes!.view(cafe.id, "Owner").open &&
      (await page.locator("#build").isEnabled()),
    "café close reaches design controls",
  );
  await page.keyboard.press("b");
  await wait(
    async () => (await canvas.getAttribute("data-mode")) === "build",
    "B opens overview design",
  );
  assert.equal(await canvas.getAttribute("data-view"), "overview");
  await page.keyboard.press("Escape");
  assert.equal(await canvas.getAttribute("data-view"), "first-person");
  stage = "first-person seated eye height";
  const chair = roomToTown({ x: 1.3, z: 1.35 }, state().lot);
  await aim(chair.x, 1.16, chair.z);
  await wait(
    async () => (await camera()).aim === "chair",
    "reticle reaches a free chair",
  );
  await page.keyboard.press("e");
  await wait(() => !!state().sitting, "E sits on real chair in FPP");
  await wait(
    async () => Math.abs((await camera()).y - 1.4) < 0.04,
    "seated camera follows eye height",
  );
  await page.keyboard.press("e");
  await wait(() => !state().sitting, "E stands in FPP");
  await wait(
    async () => Math.abs((await camera()).y - 1.65) < 0.04,
    "standing restores eye height",
  );
  await wait(async () => {
    const c = await camera(),
      p = roomToTown(state(), state().lot);
    return Math.hypot(c.x - p.x, c.z - p.z) < 0.04;
  }, "standing camera reaches the clear chair approach");
  stage = "first-person cat cuddle";
  await page.locator("#camera").click();
  await walk("d", () => state().x >= 3.3);
  await walk("w", () => state().z <= 1.5);
  await wait(
    () =>
      app.town
        .cafes!.life.poses(app.town.cafes!.store.get(cafe.id))
        .some(
          (c) => c.y < 0.1 && !["walking", "climbing"].includes(c.activity),
        ),
    "cat rests on reachable floor",
  );
  const cat = app.town
    .cafes!.life.poses(app.town.cafes!.store.get(cafe.id))
    .find((c) => c.y < 0.1 && !["walking", "climbing"].includes(c.activity))!;
  const catPoint = roomToTown(cat, state().lot);
  await aim(catPoint.x, 0.3, catPoint.z);
  await wait(
    async () => (await camera()).aim === "cat",
    "reticle reaches actual cat",
  );
  await page.keyboard.press("e");
  await wait(
    () => state().carriedCatId === cat.id,
    "FPP approaches and picks up cat",
  );
  await wait(
    async () => (await camera()).heldCat === cat.id,
    "cat renders in first-person arms",
  );
  await page.screenshot({ path: "test-results/fpp-cuddle.png" });
  await page.keyboard.press("e");
  await wait(() => !state().carriedCatId, "FPP puts cat down");
  stage = "mobile look";
  await page.setViewportSize({ width: 390, height: 844 });
  await pause(200);
  const old = (await camera()).yaw,
    touch = await context.newCDPSession(page);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 190, y: 350 }],
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 260, y: 390 }],
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await wait(
    async () => Math.abs((await camera()).yaw - old) > 0.1,
    "actual touch drag turns FPP",
  );
  await touch.detach();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({ path: "test-results/fpp-mobile.png" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: default human-height FPP, hidden own head, imported civilian/street models, honest player count, mouse capture/look, phone release + input pause, doorway continuity, WASD physical coffee hold/refund/pickup/carry/delivery, design overview return, seated eye height, rendered cat cuddle/put-down, touch look and mobile layout.",
  );
} catch (error) {
  await page
    .screenshot({ path: "test-results/fpp-failure.png" })
    .catch(() => {});
  console.log(
    "FPP failure stage",
    stage,
    "camera",
    await camera().catch(() => null),
    "state",
    aid ? state() : null,
    "path",
    aid ? app.town.residents.get(aid)?.path : undefined,
    "pending",
    aid ? app.town.residents.get(aid)?.pending : undefined,
    "results",
    results.slice(-12),
    "hint",
    await page
      .locator("#interaction-hint")
      .textContent()
      .catch(() => null),
    "JS errors",
    errors,
  );
  throw error;
} finally {
  await browser.close();
  await vite.close();
  await app.close();
  await rm(dir, { recursive: true, force: true });
}
