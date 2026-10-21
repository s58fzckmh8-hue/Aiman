import { randomBytes, randomUUID, createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
export type Profile = {
  id: string;
  tokenHash: string;
  name: string;
  createdAt: string;
};
const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
/** Single-process guest profile store only. Never used for online balances. */
export class Profiles {
  private entries: Profile[] = [];
  private queue = Promise.resolve();
  constructor(private path: string) {}
  async init() {
    try {
      const data = JSON.parse(await readFile(this.path, "utf8"));
      if (
        data.version !== 1 ||
        !Array.isArray(data.profiles) ||
        !data.profiles.every(
          (p: Profile) =>
            typeof p.id === "string" &&
            typeof p.tokenHash === "string" &&
            p.tokenHash.length === 64 &&
            typeof p.name === "string",
        )
      )
        throw Error("Invalid profile storage; refusing to overwrite");
      this.entries = data.profiles;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
  }
  find(token: string | undefined) {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return;
    return this.entries.find((p) => p.tokenHash === hash(token));
  }
  async create() {
    const token = randomBytes(32).toString("hex");
    const profile = {
      id: randomUUID(),
      tokenHash: hash(token),
      name: `Guest ${randomBytes(2).toString("hex").toUpperCase()}`,
      createdAt: new Date().toISOString(),
    };
    const operation = this.queue.then(async () => {
      const next = [...this.entries, profile];
      await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
      const temp = this.path + ".tmp";
      await writeFile(temp, JSON.stringify({ version: 1, profiles: next }), {
        mode: 0o600,
      });
      await rename(temp, this.path);
      this.entries = next;
    });
    this.queue = operation.catch(() => {});
    await operation;
    return { token, profile };
  }
}
