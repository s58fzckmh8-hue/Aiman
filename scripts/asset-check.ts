import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, sep } from "node:path";
const root = resolve("public/assets");
const manifest = JSON.parse(
  await readFile(resolve(root, "manifest.json"), "utf8"),
) as {
  file: string;
  license: string;
  sha256: string;
  bytes: number;
  url: string;
}[];
let bytes = 0;
for (const item of manifest) {
  const path = resolve(root, item.file);
  assert.ok(path.startsWith(root + sep));
  const data = await readFile(path);
  assert.equal(createHash("sha256").update(data).digest("hex"), item.sha256);
  assert.equal(data.length, item.bytes);
  assert.equal(data.toString("ascii", 0, 4), "glTF");
  assert.equal(data.readUInt32LE(4), 2);
  assert.equal(data.readUInt32LE(8), data.length);
  const doc = JSON.parse(
    data.subarray(20, 20 + data.readUInt32LE(12)).toString(),
  );
  assert.ok(
    doc.images?.every(
      (i: { uri?: string; bufferView?: number }) =>
        !i.uri && i.bufferView !== undefined,
    ),
  );
  assert.ok(doc.buffers.every((b: { uri?: string }) => !b.uri));
  assert.equal(item.license, "CC0-1.0");
  assert.match(item.url, /raw.githubusercontent.com\/.*\/[0-9a-f]{40}\//);
  bytes += data.length;
}
assert.equal(manifest.length, 9);
assert.ok(bytes < 500000);
console.log(
  `PASS: ${manifest.length} pinned CC0 models, verified hashes and embedded resources; ${bytes} bytes total.`,
);
