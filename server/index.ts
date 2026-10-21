import { resolve } from "node:path";
import { createApp } from "./app.ts";
const secure = process.env.NODE_ENV === "production";
if (secure && !process.env.ALLOWED_ORIGINS)
  throw Error("ALLOWED_ORIGINS is required in production");
const app = await createApp({
  profilePath: resolve(process.env.PROFILE_PATH ?? ".local/profiles.json"),
  origins: (
    process.env.ALLOWED_ORIGINS ??
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173"
  )
    .split(",")
    .map((s) => s.trim()),
  secure,
  simulationHz: Number(process.env.SIMULATION_HZ ?? 20),
  replicateEveryTicks: Number(process.env.REPLICATE_EVERY_TICKS ?? 2),
  graceMs: Number(process.env.RECONNECT_GRACE_MS ?? 15000),
});
app.server.listen(
  Number(process.env.PORT ?? 3001),
  process.env.HOST ?? "127.0.0.1",
  () => console.log("Kafe Miaw multiplayer backend is listening."),
);
for (const sig of ["SIGINT", "SIGTERM"] as const)
  process.once(sig, () => {
    void app.close().then(() => process.exit(0));
  });
