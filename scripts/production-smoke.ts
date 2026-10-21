import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { preview } from "vite";
import { chromium } from "playwright";
import { createApp } from "../server/app.ts";
const temp = await mkdtemp(join(tmpdir(), "miaw-production-"));
const origin = "http://127.0.0.1:5197";
const app = await createApp({
  profilePath: join(temp, "profiles.json"),
  origins: [origin],
  secure: false,
});
await new Promise<void>((r) => app.server.listen(0, "127.0.0.1", r));
const port = (app.server.address() as { port: number }).port;
const site = await preview({
  configFile: false,
  preview: {
    port: 5197,
    strictPort: true,
    host: "127.0.0.1",
    proxy: {
      "/api": `http://127.0.0.1:${port}`,
      "/ws": { target: `ws://127.0.0.1:${port}`, ws: true },
    },
  },
});
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
  ],
});
try {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(origin);
  await page.locator("#world canvas").waitFor();
  await page.locator("#join").click();
  await page.waitForFunction(
    () => document.querySelector("#dot")?.className === "dot connected",
  );
  assert.equal(await page.locator("#count").textContent(), "1");
  await page.goto(origin + "/practice.html");
  await page.locator("canvas").waitFor();
  await page.locator("#open").click();
  await page.locator("#service").click();
  assert.equal(await page.locator("#money").textContent(), "65");
  assert.deepEqual(errors, []);
  console.log(
    "PASS: production online WebGL + real backend session; production offline café serving; zero JavaScript errors.",
  );
} finally {
  await browser.close();
  await new Promise<void>((r) => site.httpServer.close(() => r()));
  await app.close();
  await rm(temp, { recursive: true, force: true });
}
