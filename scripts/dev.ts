import { spawn } from "node:child_process";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const tasks = ["dev:server", "dev:client"].map((task) =>
  spawn(npm, ["run", task], {
    stdio: "inherit",
    shell: process.platform === "win32",
  }),
);
let stopping = false;
function stop(code: number) {
  if (stopping) return;
  stopping = true;
  for (const child of tasks) child.kill("SIGTERM");
  setTimeout(() => process.exit(code), 300).unref();
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
