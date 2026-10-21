import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { Profiles } from "./profiles.ts";
import { GameStore } from "./game-store.ts";
import { Cafes } from "./cafes.ts";
import { Town } from "./town.ts";
export type Config = {
  profilePath: string;
  origins: string[];
  gamePath?: string;
  secure: boolean;
  capacity?: number;
  graceMs?: number;
  simulationHz?: number;
  replicateEveryTicks?: number;
};
export async function createApp(config: Config) {
  if (config.secure && config.origins.some((o) => !o.startsWith("https://")))
    throw Error("Production origins require HTTPS");
  const simulationHz = config.simulationHz ?? 20;
  const replicateEveryTicks = config.replicateEveryTicks ?? 2;
  if (
    !Number.isInteger(simulationHz) ||
    simulationHz < 10 ||
    simulationHz > 60 ||
    !Number.isInteger(replicateEveryTicks) ||
    replicateEveryTicks < 1 ||
    replicateEveryTicks > 10 ||
    !Number.isFinite(config.graceMs ?? 15000) ||
    (config.graceMs ?? 15000) < 0
  )
    throw Error("Invalid simulation or reconnect configuration");
  const profiles = new Profiles(config.profilePath);
  await profiles.init();
  const cafes = new Cafes(
    new GameStore(config.gamePath ?? config.profilePath + ".game.sqlite"),
  );
  const town = new Town(
    config.capacity ?? 2,
    config.graceMs ?? 15000,
    42,
    replicateEveryTicks,
    cafes,
  );
  const token = (cookie = "") =>
    cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("miaw_guest="))
      ?.slice(11);
  const allowed = (origin: string | undefined) =>
    !!origin && config.origins.includes(origin);
  const limits = new Map<string, { start: number; count: number }>();
  const server = createServer(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/api/health" && req.method === "GET") {
      res.end(JSON.stringify({ ok: true, protocol: 1, town: "Town 001" }));
      return;
    }
    if (req.url !== "/api/session" || req.method !== "POST") {
      res.writeHead(404).end(JSON.stringify({ error: "Not found" }));
      return;
    }
    if (!allowed(req.headers.origin)) {
      res.writeHead(403).end(JSON.stringify({ error: "Origin not allowed" }));
      return;
    }
    const ip = req.socket.remoteAddress ?? "unknown",
      now = Date.now();
    let limit = limits.get(ip);
    if (!limit || now - limit.start > 60000) {
      limit = { start: now, count: 0 };
      limits.set(ip, limit);
    }
    if (++limit.count > 30) {
      res
        .writeHead(429)
        .end(JSON.stringify({ error: "Please wait before trying again." }));
      return;
    }
    try {
      let profile = profiles.find(token(req.headers.cookie));
      if (!profile) {
        const created = await profiles.create();
        profile = created.profile;
        res.setHeader(
          "Set-Cookie",
          `miaw_guest=${created.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${config.secure ? "; Secure" : ""}`,
        );
      }
      res.end(
        JSON.stringify({ id: profile.id, name: profile.name, guest: true }),
      );
    } catch {
      res.writeHead(503).end(
        JSON.stringify({
          error: "Unable to save guest profile. Please try again.",
        }),
      );
    }
  });
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 1024,
    perMessageDeflate: false,
  });
  server.on("upgrade", (req, socket, head) => {
    const reject = (status: number) => {
      socket.end(`HTTP/1.1 ${status} Rejected\r\nConnection: close\r\n\r\n`);
    };
    if (req.url !== "/ws" || !allowed(req.headers.origin)) {
      reject(403);
      return;
    }
    const profile = profiles.find(token(req.headers.cookie));
    if (!profile) {
      reject(401);
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      const resident = town.join(profile, ws);
      if (!resident) return;
      let alive = true;
      ws.on("pong", () => (alive = true));
      const heartbeat = setInterval(() => {
        if (!alive) {
          ws.terminate();
          return;
        }
        alive = false;
        ws.ping();
      }, 10000);
      heartbeat.unref();
      ws.on("message", (data, binary) => {
        if (binary) {
          ws.close(1003, "Text messages only");
          return;
        }
        town.command(profile.id, ws, data.toString());
      });
      ws.on("close", () => {
        clearInterval(heartbeat);
        town.disconnect(profile.id, ws);
      });
      ws.on("error", () => {});
    });
  });
  let last = performance.now();
  const timer = setInterval(() => {
    const now = performance.now();
    town.tick(Math.min((now - last) / 1000, 0.1));
    last = now;
  }, 1000 / simulationHz);
  timer.unref();
  const prune = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of limits) if (now - v.start > 60000) limits.delete(k);
  }, 60000);
  prune.unref();
  return {
    server,
    town,
    profiles,
    close: async () => {
      clearInterval(timer);
      clearInterval(prune);
      for (const ws of wss.clients) ws.terminate();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      await new Promise<void>((resolve) => server.close(() => resolve()));
      cafes.shutdown();
    },
  };
}
