import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { chromium, type Page } from "playwright";
import { createServer } from "vite";
import { createApp } from "../server/app.ts";
const dir = await mkdtemp(join(tmpdir(), "miaw-cafe-browser-")),
  origin = "http://127.0.0.1:5196";
const app = await createApp({
  profilePath: join(dir, "profiles.json"),
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
const a = await browser.newContext({ viewport: { width: 1366, height: 900 } }),
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
  await pa.locator('[data-action="open"]').click();
  await pa.locator('[data-action="prepare"]').first().waitFor();
  await pa.locator('[data-action="prepare"]').first().click();
  await pa.locator('[data-action="serve"]').first().waitFor({ timeout: 25000 });
  await pa.locator('[data-action="serve"]').first().click();
  await wait(
    async () => app.town.cafes!.store.byOwner(aid).served === 1,
    "customer payment was not saved",
  );
  const earned = app.town.cafes!.store.byOwner(aid);
  assert.equal(earned.coins, 178);
  assert.equal(app.town.cafes!.store.byOwner(bid).coins, 150);
  console.log(
    "PASS: prepare → ready → serve → drink → authoritative payment; visitor economy isolated",
  );
  await pa.screenshot({
    path: "test-results/cafe-online-desktop.png",
    fullPage: true,
  });
  await pa.locator('[data-action="close"]').click();
  await pa.locator('[data-action="feed"]').click();
  await wait(
    async () => app.town.cafes!.store.byOwner(aid).food === 4,
    "cat feeding failed",
  );
  await pa.locator("summary").click();
  await pa.locator('[data-action="decor"]').click();
  await wait(
    async () => app.town.cafes!.store.byOwner(aid).level === 2,
    "upgrade failed",
  );
  assert.equal(app.town.cafes!.store.byOwner(aid).coins, 98);
  await pa.reload();
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
  await pa.screenshot({
    path: "test-results/cafe-online-mobile.png",
    fullPage: true,
  });
  await pa.locator('[data-action="exit"]').click();
  await wait(
    async () => (await pa.locator("#app").getAttribute("data-area")) === "town",
    "exit route failed",
  );
  assert.equal(app.town.cafes!.store.byOwner(aid).coins, 98);
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
