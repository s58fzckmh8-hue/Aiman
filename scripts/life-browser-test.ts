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
  await p.locator("#view").click();
  await wait(
    async () =>
      (await p.locator("#dot").getAttribute("class")) === "dot connected",
    "connect",
  );
}
try {
  await mkdir("test-results", { recursive: true });
  await connect(pa);
  const aid = await pa.locator("#app").getAttribute("data-self-id");
  assert.ok(aid);
  const c = app.town.cafes!.store.byOwner(aid),
    state = () => app.town.residents.get(aid)!.state;
  assert.equal(
    await pa
      .locator("#app")
      .evaluate((el) => el.classList.contains("management-hidden")),
    true,
  );
  await phone(pa);
  await pa.locator('[data-action="walkHome"]').click();
  await phone(pa, false);
  await wait(
    async () => state().area === c.id && !state().doorTransition,
    "walk through the café doorway",
  );
  async function target(
    name: string,
    id?: string,
    world?: { x: number; z: number },
  ) {
    await phone(pa, false);
    await pa.waitForFunction(
      () =>
        document.querySelector<HTMLElement>("#world canvas")?.dataset
          .cameraSettled === "true",
    );
    const canvas = pa.locator("#world canvas"),
      box = await canvas.boundingBox();
    assert.ok(box);
    const point = await canvas.evaluate(
      (node, args) => {
        const data = JSON.parse(
          (node as HTMLElement).dataset[args.name] ?? "[]",
        );
        if (args.world)
          return data.find(
            (p: any) => p.x === args.world!.x && p.z === args.world!.z,
          )?.screen;
        return data.find((p: any) => p.id === args.id);
      },
      { name, id, world },
    );
    assert.ok(point, `${name} target must exist`);
    return { x: box.x + point.x, y: box.y + point.y };
  }
  let p = await target("chairs", "table-0:back");
  await pa.mouse.click(p.x, p.y);
  try {
    await wait(
      async () => state().sitting?.id === "table-0:back",
      "walk to a real chair and sit",
    );
  } catch (error) {
    await pa.screenshot({ path: "test-results/life-chair-failure.png" });
    console.log(
      "Chair diagnostics",
      JSON.stringify({
        state: state(),
        path: app.town.residents.get(aid)!.path,
        pending: app.town.residents.get(aid)!.pending,
      }),
      await pa.locator("#world canvas").getAttribute("data-last-hit"),
      await pa.locator("#interaction-hint").textContent(),
    );
    throw error;
  }
  await wait(async () => {
    const data = JSON.parse(
      (await pa.locator("#world canvas").getAttribute("data-poses")) ?? "[]",
    );
    return data.some(
      (p: any) =>
        p.id === aid &&
        p.imported &&
        p.knee.z - p.hip.z > 0.2 &&
        p.knee.y - p.foot.y > 0.2,
    );
  }, "renderer must articulate sitting legs");
  await pa.screenshot({ path: "test-results/life-sitting.png" });
  await pa.keyboard.press("e");
  await wait(async () => !state().sitting, "E stands up");
  await wait(
    async () =>
      app.town
        .cafes!.life.poses(app.town.cafes!.store.get(c.id))
        .some((p) => p.y < 0.2 && p.activity !== "climbing"),
    "cat comes down from its perch",
  );
  const cat = app.town
    .cafes!.life.poses(app.town.cafes!.store.get(c.id))
    .find((p) => p.y < 0.2)!;
  p = await target("cats", cat.id);
  await pa.mouse.click(p.x, p.y);
  try {
    await wait(
      async () => state().carriedCatId === cat.id,
      "walk to the chosen cat and pick it up",
    );
  } catch (error) {
    await pa.screenshot({ path: "test-results/life-cat-failure.png" });
    console.log(
      "Cat diagnostics",
      JSON.stringify({
        state: state(),
        path: app.town.residents.get(aid)!.path,
        pending: app.town.residents.get(aid)!.pending,
        cats: app.town.cafes!.life.poses(app.town.cafes!.store.get(c.id)),
      }),
      await pa.locator("#world canvas").getAttribute("data-last-hit"),
      await pa.locator("#interaction-hint").textContent(),
    );
    throw error;
  }
  await wait(
    async () =>
      JSON.parse(
        (await pa.locator("#world canvas").getAttribute("data-poses")) ?? "[]",
      ).some((p: any) => p.id === aid && p.heldCat === cat.id),
    "cat must be rendered in arms",
  );
  await pa.screenshot({ path: "test-results/life-cuddle.png" });
  await pa.keyboard.press("e");
  await wait(async () => !state().carriedCatId, "E puts the cat down");
  assert.equal(
    app.town
      .cafes!.life.poses(app.town.cafes!.store.get(c.id))
      .find((p) => p.id === cat.id)!.y,
    0,
  );
  await pa.keyboard.press("o");
  await wait(async () => app.town.cafes!.view(c.id, "A").open, "O opens shop");
  await wait(
    async () => await pa.locator("#build").isDisabled(),
    "design mode disables after opening the café",
  );
  await pa.keyboard.press("o");
  await wait(
    async () => !app.town.cafes!.view(c.id, "A").open,
    "O closes shop",
  );
  await phone(pa);
  await pa
    .locator("summary")
    .filter({ hasText: "Furniture inventory" })
    .click();
  await pa.locator('[data-action="buyFurniture"][data-target="toy"]').click();
  await wait(
    async () =>
      app.town.cafes!.store.get(c.id).layout.some((f) => f.kind === "toy"),
    "buy a real inventory item",
  );
  const toy = app.town
    .cafes!.store.get(c.id)
    .layout.find((f) => f.kind === "toy")!;
  assert.equal(toy.placed, false);
  await pa.locator(`[data-place="${toy.id}"]`).click();
  await wait(
    async () =>
      (await pa.locator("#world canvas").getAttribute("data-mode")) === "build",
    "inventory opens placement mode",
  );
  p = await target("floor", undefined, { x: -4, z: 1 });
  await pa.mouse.click(p.x, p.y);
  await wait(
    async () =>
      app.town.cafes!.store.get(c.id).layout.find((f) => f.id === toy.id)
        ?.placed === true,
    "click floor to place inventory",
  );
  p = await target("furniture", "table-1");
  await pa.mouse.click(p.x, p.y);
  await pa.keyboard.press("r");
  p = await target("floor", undefined, { x: 1.5, z: 2.5 });
  await pa.mouse.click(p.x, p.y);
  try {
    await wait(async () => {
      const f = app.town
        .cafes!.store.get(c.id)
        .layout.find((f) => f.id === "table-1")!;
      return f.rotation === 1 && f.x === 1.5 && f.z === 2.5;
    }, "rotate and place a dining set with updated collision");
  } catch (error) {
    await pa.screenshot({ path: "test-results/life-design-failure.png" });
    console.log(
      "Design diagnostics",
      app.town.cafes!.store.get(c.id).layout,
      await pa.locator("#interaction-hint").textContent(),
    );
    throw error;
  }
  await pa.screenshot({ path: "test-results/life-design.png" });
  await pa.keyboard.press("Escape");
  await connect(pb);
  await phone(pb);
  await pb.locator('[data-action="visit"]').first().click();
  await phone(pb, false);
  const bid = await pb.locator("#app").getAttribute("data-self-id");
  assert.ok(bid);
  await wait(
    async () =>
      app.town.residents.get(bid)!.state.area === c.id &&
      !app.town.residents.get(bid)!.state.doorTransition,
    "real neighbour enters",
  );
  await phone(pb);
  await pb.locator('[data-action="feed"]').click();
  await wait(
    async () => app.town.cafes!.store.byOwner(bid).food === 4,
    "visitor feeds with their own supply",
  );
  assert.equal(app.town.cafes!.store.get(c.id).food, 5);
  await pa.reload({ waitUntil: "domcontentloaded" });
  await pa.locator("#join").click();
  await pa.locator("#view").click();
  await wait(
    async () =>
      (await pa.locator("#dot").getAttribute("class")) === "dot connected",
    "rejoin saved layout",
  );
  assert.equal(
    app.town.cafes!.store.get(c.id).layout.find((f) => f.id === "table-1")!
      .rotation,
    1,
  );
  assert.equal(app.town.cafes!.store.get(c.id).coins, 105);
  await pa.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await pa.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  await phone(pa);
  await pa.screenshot({ path: "test-results/life-phone-mobile.png" });
  await phone(pa, false);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: full-screen phone, physical chair + articulated sit/stand, cat pickup/put-down + rendered cuddle, O open/close, real furniture inventory/placement/rotation, visitor feeding, persistent layout and mobile phone.",
  );
} finally {
  await browser.close();
  await vite.close();
  await app.close();
  await rm(dir, { recursive: true, force: true });
}
