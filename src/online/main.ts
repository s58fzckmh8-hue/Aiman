import "./style.css";
import { Network, type Connection } from "./network.ts";
import { World } from "./world.ts";
import type { PublicState } from "../../shared/protocol.ts";
const $ = <T extends HTMLElement = HTMLElement>(s: string) =>
  document.querySelector<T>(s)!;
$("#app").innerHTML =
  `<header><a class="brand" href="./"><span class="brand-icon">🐾</span><div><b>kafe miaw<span style="color:#a0b283">.</span></b><small>A LITTLE COFFEE, A LOT OF CONNECTION</small></div></a><span class="edition">ONLINE FOUNDATION · 01</span></header><main><section class="intro"><div><h1>A small town. A shared beginning.</h1><p>Take a stroll, meet a neighbor, make yourself at home.</p></div><div class="connection" role="status" aria-live="polite"><i id="dot" class="dot"></i><span id="connection-text">Ready when you are.</span></div></section><div class="layout"><section class="world-card"><div class="world-toolbar"><b>✦ <span id="town">Miaw Neighborhood</span></b><small id="location">Shared 3D town · two-player milestone</small></div><div class="scene-wrap"><div id="world"></div><div class="touch-pad" aria-label="Movement controls"><button data-dir="up" aria-label="Move forward">↑</button><button data-dir="left" aria-label="Move left">←</button><button data-dir="down" aria-label="Move backward">↓</button><button data-dir="right" aria-label="Move right">→</button></div><div id="overlay" class="overlay"><div class="welcome"><span class="paw">🐾</span><h2>Your next chapter starts here.</h2><p id="welcome-text">Join a real shared town as a guest. Explore together while we build the next chapter of Kafe Miaw.</p><button class="primary" id="join">Play Online →</button><p style="font-size:10px;margin-bottom:0">Guest identity stays in this browser.<br>No account or cross-device recovery yet.</p></div></div></div><div class="world-footer"><p><b>WASD / arrows</b> to walk · <b>Right-drag</b> to orbit · <b>Scroll</b> to zoom<br>On touch: use the arrows to walk and drag the scene to orbit.</p><div><button id="camera" class="secondary">Reset camera</button> <button id="help" class="secondary">How to play</button></div></div></section><aside><section class="panel"><div class="eyebrow">NEIGHBORS TOGETHER</div><div class="population"><span id="count">0</span> <small>/ <span id="capacity">2</span> connected</small></div><p>Real connections only. Players nearby appear in the town.</p><ul id="roster" class="roster" aria-label="Nearby players"></ul></section><section class="panel"><h2>Your little place</h2><div class="info-row"><span>Guest</span><b id="name">Not connected</b></div><div class="info-row"><span>Town</span><b>Town 001</b></div><div class="info-row"><span>Reserved lot</span><b id="lot">Join to reserve</b></div><p id="identity-note">Your guest profile is saved by the server. A lot is temporary, not your permanent property ID.</p><div id="notice" role="status"></div></section><section class="practice"><h2>A coffee break?</h2><p>Your original café is still here. Serve customers, care for cats and grow your café in a separate offline practice save.</p><a href="./practice.html" class="secondary">Open offline café →</a></section><p class="fine">This build tests two-player movement and reconnection. Twenty lots are reserved for future expansion. Online cafés, cats, shops and account linking are not implemented yet.</p></aside></div><footer><span>KAFE MIAW © 2026 · MULTIPLAYER FOUNDATION</span><span>Little steps. Shared adventures. ♡</span></footer></main><dialog id="how"><h2>Welcome to the neighborhood</h2><p>Choose Play Online to join Town 001. Move with WASD, arrow keys, or the on-screen arrows. Right-drag to rotate and scroll to zoom. Touch users can drag the scene to rotate.</p><p>This milestone supports two guests. Server-controlled movement keeps you inside the map and outside buildings. You can see nearby connected guests move in real time.</p><p>If your connection drops, your spot is held for 15 seconds. Return with this browser to reconnect. A new tab with the same guest replaces the previous connection.</p><p>For coffee, cats and upgrades, open the separate offline café. Its local coins are not an online balance.</p><button id="close-help" class="primary">Let's explore</button></dialog>`;
let world: World | null = null;
let available = true;
try {
  world = new World($("#world"));
} catch {
  available = false;
  $("#world").innerHTML =
    '<p class="fatal">3D rendering is unavailable. Enable hardware acceleration or try a WebGL-compatible browser. You can still open offline café practice.</p>';
  $("#join").setAttribute("disabled", "");
  $("#welcome-text").textContent =
    "This browser could not start the 3D world. Please enable WebGL and reload.";
}
let connection: Connection = "idle",
  selfId = "",
  capacity = 2;
function roster(snapshot: PublicState) {
  const ul = $("#roster");
  ul.replaceChildren();
  for (const p of snapshot.players) {
    const li = document.createElement("li");
    li.dataset.playerId = p.id;
    li.dataset.x = p.x.toFixed(3);
    li.dataset.z = p.z.toFixed(3);
    li.dataset.connected = String(p.connected);
    const icon = document.createElement("span");
    icon.className = "swatch";
    icon.style.background = "#" + p.color.toString(16).padStart(6, "0");
    icon.textContent = "♟";
    const content = document.createElement("div");
    content.textContent = p.name;
    const status = document.createElement("small");
    status.textContent = p.connected
      ? p.moving
        ? "Taking a stroll"
        : "Enjoying the neighborhood"
      : "Reconnecting…";
    content.append(status);
    li.append(icon, content);
    if (p.id === selfId) {
      const tag = document.createElement("span");
      tag.className = "you";
      tag.textContent = "you";
      li.append(tag);
    }
    ul.append(li);
  }
}
const network = new Network({
  status(s, message) {
    connection = s;
    $("#connection-text").textContent = message;
    $("#dot").className = `dot ${s}`;
    $("#overlay").hidden = s === "connected";
    $("#welcome-text").textContent = message;
    const joining = s === "connecting" || s === "reconnecting";
    $("#join").textContent = joining
      ? "Connecting…"
      : s === "replaced"
        ? "Reconnect here →"
        : s === "idle"
          ? "Play Online →"
          : "Try again →";
    ($("#join") as HTMLButtonElement).disabled = joining || !available;
    if (s !== "connected") {
      $("#count").textContent = "0";
      $("#roster").replaceChildren();
      keys.clear();
      touch.clear();
    }
  },
  welcome(w) {
    selfId = w.self.id;
    capacity = w.capacity;
    if (world) world.selfId = selfId;
    $("#app").dataset.selfId = selfId;
    $("#town").textContent = w.town;
    $("#name").textContent = w.self.name;
    $("#lot").textContent = `Lot ${String(w.self.lot + 1).padStart(2, "0")}`;
    $("#capacity").textContent = String(capacity);
    $("#notice").textContent = w.resumed
      ? "Connection restored with the same guest identity."
      : "Guest profile saved. Your first stroll awaits.";
  },
  snapshot(s) {
    world?.snapshot(s);
    if (connection === "connected") {
      $("#count").textContent = String(s.connected);
      roster(s);
    }
  },
});
const keys = new Set<string>(),
  touch = new Set<string>();
const controls = [
  "w",
  "a",
  "s",
  "d",
  "arrowup",
  "arrowleft",
  "arrowdown",
  "arrowright",
];
$("#join").onclick = () => void network.start();
$("#camera").onclick = () => world?.resetCamera();
$("#help").onclick = () => {
  keys.clear();
  touch.clear();
  network.input(0, 0);
  $<HTMLDialogElement>("#how").showModal();
};
$("#close-help").onclick = () => $<HTMLDialogElement>("#how").close();
window.addEventListener("keydown", (e) => {
  if (
    controls.includes(e.key.toLowerCase()) &&
    !$<HTMLDialogElement>("#how").open
  ) {
    e.preventDefault();
    keys.add(e.key.toLowerCase());
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => {
  keys.clear();
  touch.clear();
  network.input(0, 0);
});
document.addEventListener("visibilitychange", () => {
  keys.clear();
  touch.clear();
  network.input(0, 0);
});
for (const b of document.querySelectorAll<HTMLButtonElement>("[data-dir]")) {
  b.onpointerdown = (e) => {
    e.preventDefault();
    touch.add(b.dataset.dir!);
    b.setPointerCapture(e.pointerId);
  };
  b.onpointerup =
    b.onpointercancel =
    b.onlostpointercapture =
      () => touch.delete(b.dataset.dir!);
}
const inputTimer = setInterval(() => {
  if (connection !== "connected") return;
  const has = (...names: string[]) =>
    names.some((n) => keys.has(n) || touch.has(n));
  const x =
    Number(has("d", "arrowright", "right")) -
    Number(has("a", "arrowleft", "left"));
  const z =
    Number(has("s", "arrowdown", "down")) - Number(has("w", "arrowup", "up"));
  const d = world?.direction(x, z) ?? { x, z };
  const length = Math.max(1, Math.hypot(d.x, d.z));
  network.input(d.x / length, d.z / length);
}, 50);
window.addEventListener("pagehide", () => {
  clearInterval(inputTimer);
  network.stop();
  world?.dispose();
});
