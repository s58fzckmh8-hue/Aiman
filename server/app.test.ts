import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebSocket } from "ws";
import { createApp } from "./app.ts";
import { Profiles } from "./profiles.ts";
const origin = "http://localhost:5198";
const until = async (f: () => boolean) => {
  for (let i = 0; i < 100; i++) {
    if (f()) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw Error("condition timed out");
};
test(
  "HTTP guest identity, real two-socket state, origin/auth checks, restart and reconnection",
  { timeout: 15000 },
  async () => {
    const dir = await mkdtemp(join(tmpdir(), "miaw-integration-"));
    let app = await createApp({
      profilePath: join(dir, "profiles.json"),
      origins: [origin],
      secure: false,
      graceMs: 300,
    });
    const sockets: WebSocket[] = [];
    async function listen() {
      await new Promise<void>((resolve) =>
        app.server.listen(0, "127.0.0.1", resolve),
      );
      return `http://127.0.0.1:${(app.server.address() as { port: number }).port}`;
    }
    let base = await listen();
    async function session(cookie?: string) {
      const r = await fetch(base + "/api/session", {
        method: "POST",
        headers: { origin, ...(cookie ? { cookie } : {}) },
      });
      assert.equal(r.status, 200);
      return {
        body: await r.json(),
        cookie: r.headers.get("set-cookie")?.split(";")[0] ?? cookie!,
      };
    }
    async function connect(cookie: string) {
      const ws = new WebSocket(base.replace("http", "ws") + "/ws", {
        headers: { origin, cookie },
      });
      const messages: any[] = [];
      ws.on("message", (d) => messages.push(JSON.parse(d.toString())));
      sockets.push(ws);
      await until(() => messages.some((m) => m.type === "welcome"));
      return { ws, messages };
    }
    try {
      assert.equal(
        (
          await fetch(base + "/api/session", {
            method: "POST",
            headers: { origin: "https://evil.invalid" },
          })
        ).status,
        403,
      );
      const denied = await new Promise<number>((resolve, reject) => {
        const ws = new WebSocket(base.replace("http", "ws") + "/ws", {
          headers: { origin },
        });
        ws.on("unexpected-response", (_, res) => {
          resolve(res.statusCode!);
          res.resume();
          ws.terminate();
        });
        ws.on("error", () => {});
        setTimeout(() => reject(Error("auth test timed out")), 2000).unref();
      });
      assert.equal(denied, 401);
      const a = await session(),
        b = await session();
      assert.notEqual(a.body.id, b.body.id);
      assert.equal((await session(a.cookie)).body.id, a.body.id);
      const ca = await connect(a.cookie),
        cb = await connect(b.cookie);
      await until(() =>
        cb.messages.some((m) => m.type === "state" && m.connected === 2),
      );
      for (let seq = 0; seq < 8; seq++) {
        ca.ws.send(JSON.stringify({ type: "input", seq, x: 1, z: 0 }));
        await new Promise((r) => setTimeout(r, 50));
      }
      await until(() =>
        cb.messages.some(
          (m) =>
            m.type === "state" &&
            m.players.some((p: any) => p.id === a.body.id && p.x > -2),
        ),
      );
      const oldLot = ca.messages.find((m) => m.type === "welcome").self.lot;
      ca.ws.close();
      await until(
        () => app.town.residents.get(a.body.id)?.state.connected === false,
      );
      const re = await connect(a.cookie);
      assert.equal(re.messages[0].self.lot, oldLot);
      assert.equal(re.messages[0].resumed, true);
      assert.equal(app.town.residents.size, 2);
      re.ws.close();
      await until(() => !app.town.residents.has(a.body.id));
      assert.equal(app.town.residents.size, 1);
      const data = await readFile(join(dir, "profiles.json"), "utf8");
      assert.ok(
        !data.includes(a.cookie.split("=")[1]),
        "raw bearer token must not be stored",
      );
      await app.close();
      app = await createApp({
        profilePath: join(dir, "profiles.json"),
        origins: [origin],
        secure: false,
      });
      base = await listen();
      assert.equal((await session(a.cookie)).body.id, a.body.id);
    } finally {
      for (const ws of sockets) ws.terminate();
      await app.close();
      await rm(dir, { recursive: true, force: true });
    }
  },
);
test("corrupt profiles fail closed instead of erasing existing identity", async () => {
  const dir = await mkdtemp(join(tmpdir(), "miaw-corrupt-"));
  try {
    const path = join(dir, "profiles.json");
    await writeFile(path, "not json");
    await assert.rejects(() => new Profiles(path).init());
    assert.equal(await readFile(path, "utf8"), "not json");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("unsafe simulation settings and insecure production origins fail before starting", async () => {
  const base = {
    profilePath: "/tmp/miaw-unused-validation.json",
    origins: [origin],
    secure: false,
  };
  await assert.rejects(
    () => createApp({ ...base, simulationHz: 0 }),
    /Invalid simulation/,
  );
  await assert.rejects(
    () => createApp({ ...base, replicateEveryTicks: NaN }),
    /Invalid simulation/,
  );
  await assert.rejects(
    () => createApp({ ...base, graceMs: NaN }),
    /Invalid simulation/,
  );
  await assert.rejects(() => createApp({ ...base, secure: true }), /HTTPS/);
});
