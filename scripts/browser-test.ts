import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { chromium, type Page } from "playwright";
import { createServer } from "vite";
import { createApp } from "../server/app.ts";
const temp = await mkdtemp(join(tmpdir(), "miaw-browser-"));
const origin = "http://127.0.0.1:5199";
const app = await createApp({
  profilePath: join(temp, "profiles.json"),
  origins: [origin],
  secure: false,
  graceMs: 2200,
});
await new Promise<void>((r) => app.server.listen(0, "127.0.0.1", r));
const port = (app.server.address() as { port: number }).port;
const vite = await createServer({
  configFile: false,
  root: resolve("."),
  server: {
    host: "127.0.0.1",
    port: 5199,
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
const contexts = await Promise.all([
  browser.newContext({
    viewport: { width: 1366, height: 900 },
    hasTouch: true,
  }),
  browser.newContext({ viewport: { width: 1366, height: 900 } }),
]);
const pages = await Promise.all(contexts.map((c) => c.newPage()));
const errors: string[] = [];
for (const page of pages) page.on("pageerror", (e) => errors.push(e.message));
const wait = async (
  fn: () => Promise<boolean>,
  label: string,
  timeout = 12000,
) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 70));
  }
  throw Error(label);
};
async function connect(page: Page) {
  await page.goto(origin);
  await page.locator("#world canvas").waitFor();
  await page.locator("#join").click();
  await wait(
    async () =>
      (await page.locator("#dot").getAttribute("class")) === "dot connected",
    "browser failed to connect",
  );
}
async function playerPosition(page: Page, id: string) {
  return await page.locator(`[data-player-id="${id}"]`).evaluate((el) => ({
    x: Number((el as HTMLElement).dataset.x),
    z: Number((el as HTMLElement).dataset.z),
  }));
}
try {
  await mkdir("test-results", { recursive: true });
  await connect(pages[0]);
  await connect(pages[1]);
  const a = await pages[0].locator("#app").getAttribute("data-self-id"),
    b = await pages[1].locator("#app").getAttribute("data-self-id");
  assert.ok(a && b);
  assert.notEqual(a, b);
  await wait(
    async () =>
      (await pages[0].locator("#count").textContent()) === "2" &&
      (await pages[1].locator("#count").textContent()) === "2",
    "real count should be two",
  );
  const initial = await playerPosition(pages[1], a);
  const before = await pages[1].locator("#world canvas").screenshot();
  await pages[0].keyboard.down("d");
  await pages[0].waitForTimeout(1100);
  await pages[0].keyboard.up("d");
  await wait(async () => {
    const p = await playerPosition(pages[1], a);
    return Math.hypot(p.x - initial.x, p.z - initial.z) > 2;
  }, "second browser did not observe movement");
  await pages[1].waitForTimeout(250);
  const after = await pages[1].locator("#world canvas").screenshot();
  assert.ok(!before.equals(after), "remote 3D scene should visibly change");
  await pages[1].keyboard.down("w");
  await pages[1].waitForTimeout(700);
  await pages[1].keyboard.up("w");
  await wait(async () => {
    const p = await playerPosition(pages[0], b);
    return Math.hypot(p.x, p.z - 3) > 1;
  }, "first browser did not observe second guest");
  await pages[0].screenshot({
    path: "test-results/online-desktop.png",
    fullPage: true,
  });
  const resident = app.town.residents.get(a)!;
  const lot = resident.state.lot,
    sessionId = resident.state.sessionId;
  resident.socket!.close(1012, "Test interrupted connection");
  await wait(
    async () =>
      (await pages[0].locator("#connection-text").textContent()) ===
      "Connection Restored.",
    "automatic reconnect failed",
  );
  assert.equal(app.town.residents.get(a)!.state.lot, lot);
  assert.equal(app.town.residents.get(a)!.state.sessionId, sessionId);
  assert.equal(app.town.residents.size, 2);
  // A second tab is the same guest, not another player. It replaces its old socket once.
  const replacement = await contexts[0].newPage();
  replacement.on("pageerror", (e) => errors.push(e.message));
  await connect(replacement);
  await wait(
    async () =>
      (await pages[0].locator("#connection-text").textContent()) ===
      "This guest is active in another tab.",
    "duplicate tab did not replace old session",
  );
  assert.equal(app.town.residents.size, 2);
  await replacement.close();
  await wait(
    async () => !app.town.residents.has(a),
    "slot should expire after disconnected grace",
  );
  await wait(
    async () => (await pages[1].locator("#count").textContent()) === "1",
    "departure count should be one",
  );
  await pages[0].locator("#join").click();
  await wait(
    async () =>
      (await pages[0].locator("#dot").getAttribute("class")) ===
      "dot connected",
    "return after expiry failed",
  );
  assert.equal(await pages[0].locator("#app").getAttribute("data-self-id"), a);
  assert.equal(app.town.residents.size, 2);
  await pages[0].setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await pages[0].evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  const pad = await pages[0].locator('[data-dir="right"]').boundingBox();
  assert.ok(pad);
  const beforeTouch = await playerPosition(pages[0], a);
  const touchSession = await contexts[0].newCDPSession(pages[0]);
  await touchSession.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: pad.x + pad.width / 2, y: pad.y + pad.height / 2 }],
  });
  await pages[0].waitForTimeout(700);
  await touchSession.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await wait(async () => {
    const p = await playerPosition(pages[0], a);
    return Math.hypot(p.x - beforeTouch.x, p.z - beforeTouch.z) > 0.5;
  }, "touch control did not move the server-owned player");
  await touchSession.detach();
  await pages[0].screenshot({
    path: "test-results/online-mobile.png",
    fullPage: true,
  });
  console.log(
    "PASS: online two-client movement, reconnect, duplicate session, departure, mobile controls",
  );
  await pages[0].goto(origin + "/practice.html", {
    waitUntil: "domcontentloaded",
  });
  await pages[0].locator("canvas").waitFor();
  await pages[0].locator("#open").click();
  await pages[0].locator("#service").click();
  assert.equal(await pages[0].locator("#money").textContent(), "65");
  await pages[0].locator("#food").click();
  assert.equal(await pages[0].locator("#money").textContent(), "50");
  await pages[0].reload({ waitUntil: "domcontentloaded" });
  await pages[0].locator("canvas").waitFor();
  assert.equal(await pages[0].locator("#money").textContent(), "50");
  assert.ok(
    (await pages[0].locator("body").innerText()).includes("Offline practice"),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: two independent browser guests; bidirectional visible 3D movement; automatic reconnect; same-cookie tab replacement; grace expiration; same identity after return; mobile layout; offline serving, feeding and save; no browser JavaScript errors.",
  );
} finally {
  await browser.close();
  await vite.close();
  await app.close();
  await rm(temp, { recursive: true, force: true });
}
