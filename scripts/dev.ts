import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
function portOption(flag: string, fallback: string) {
  const index = args.indexOf(flag);
  const value = Number(index < 0 ? fallback : args[index + 1]);
  if (!Number.isInteger(value) || value < 1024 || value > 65535) {
    throw Error(`${flag} requires a port between 1024 and 65535.`);
  }
  return String(value);
}
const clientPort = portOption("--port", process.env.VITE_PORT ?? "5173");
const serverPort = portOption("--server-port", process.env.PORT ?? "3001");
if (clientPort === serverPort)
  throw Error("Frontend and backend need different ports.");
const env = { ...process.env, VITE_PORT: clientPort, PORT: serverPort };
const tsx = fileURLToPath(import.meta.resolve("tsx/cli"));
const vite = join(
  dirname(fileURLToPath(import.meta.resolve("vite/package.json"))),
  "bin",
  "vite.js",
);
const tasks = [
  [tsx, "watch", "server/index.ts"],
  [vite, "--host", "0.0.0.0"],
].map((command) =>
  spawn(process.execPath, command, { stdio: "inherit", env, shell: false }),
);
let stopping = false;
function stop(code: number) {
  if (stopping) return;
  stopping = true;
  for (const child of tasks) {
    if (process.platform === "win32" && child.pid) {
      // Terminate only this launcher's process trees, including the tsx watcher.
      spawn("taskkill.exe", ["/pid", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        shell: false,
      }).on("error", () => child.kill());
    } else child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 500).unref();
}
for (const child of tasks) {
  child.on("error", (e) => {
    console.error(e.message);
    stop(1);
  });
  child.on("exit", (code) => stop(code ?? 1));
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
