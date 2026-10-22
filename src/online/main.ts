import { shell } from "./shell.ts";
import { CafeAudio } from "./audio.ts";
import { reputation } from "../../shared/furniture.ts";
import "./style.css";
import { Interaction } from "./interaction.ts";
import { Network, type Connection } from "./network.ts";
import { CafePanel } from "./cafe-panel.ts";
import { World } from "./world.ts";
import type { PublicState } from "../../shared/protocol.ts";
const $ = <T extends HTMLElement = HTMLElement>(s: string) =>
  document.querySelector<T>(s)!;
$("#app").innerHTML = shell;
$("#app").classList.add("management-hidden");
const audio = new CafeAudio($("#sound"));
let arranging = false;
let latest: PublicState | undefined;
let previousCoins: number | undefined;
let lastMoment = "";
let interaction: Interaction | undefined;
let world: World | null = null;
let available = true;
try {
  world = new World($("#world"), (hit, phase) =>
    interaction?.handle(hit, phase),
  );
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
let cafePanel: CafePanel | undefined;
const network = new Network({
  personal(cafe) {
    cafePanel?.update(cafe);
    $("#hud-wallet").textContent = cafe.coins.toLocaleString() + " ◈";
    if (previousCoins !== undefined && cafe.coins > previousCoins) audio.coin();
    previousCoins = cafe.coins;
    $("#hud-level").textContent = `Reputation ${reputation(cafe.served)}`;
  },
  result(result) {
    cafePanel?.result(result);
    interaction?.result(result);
  },
  status(s, message) {
    connection = s;
    if (s !== "connected") {
      cafePanel?.disconnected();
      interaction?.finish(false);
      audio.brewing(false);
      $("#brew-progress").hidden = true;
    }
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
    latest = s;
    const me = s.players.find((p) => p.id === selfId);
    audio.step(!!me?.moving);
    audio.brewing(!!me?.work);
    const own = s.cafe?.ownerId === selfId;
    const buildButton = $("#build") as HTMLButtonElement;
    buildButton.disabled = !own || !!s.cafe?.open;
    if (arranging && (!own || s.cafe?.open)) setArranging(false);
    const shift = s.cafe?.shift;
    $("#shift-status").textContent =
      shift && s.cafe?.open
        ? `OPEN · ${shift.served} served · ${shift.earned} coins this shift`
        : s.cafe
          ? "Take your time. Make it your own."
          : "Take a stroll. Find your little place.";
    $("#next-step").textContent = arranging
      ? "ARRANGE · Drag furniture · R rotate · Escape finish"
      : me?.area === "town"
        ? "FIRST STOP · Walk to your café and make yourself at home."
        : s.cafe?.open
          ? "CAFÉ OPEN · Choose an order, make the coffee, bring a little joy."
          : "CAFÉ CLOSED · Sit, cuddle a cat, or arrange your space before opening.";
    const event = s.cafe?.events?.at(-1);
    if (event && event.id !== lastMoment && s.time - event.at < 5000) {
      lastMoment = event.id;
      $("#moment").textContent = event.message;
      $("#moment").hidden = false;
      setTimeout(() => {
        $("#moment").hidden = true;
      }, 5000);
    }
    const context = $("#context-action") as HTMLButtonElement;
    context.hidden = !me?.sitting && !me?.carriedCatId;
    context.textContent = me?.sitting ? "Stand up · E" : "Put down cat · E";
    context.onclick = () => network.action(me?.sitting ? "stand" : "putCat");
    const openButton = $("#open-shop") as HTMLButtonElement;
    openButton.disabled = !own || !!me?.doorTransition;
    openButton.textContent = s.cafe?.open ? "O · Close café" : "O · Open café";

    $("#app").dataset.area =
      s.players.find((p) => p.id === selfId)?.area ?? "town";
    world?.snapshot(s);
    cafePanel?.state(s);
    interaction?.state(s);
    const artError = $("#world canvas")?.dataset.assetError;
    if (artError) $("#interaction-hint").textContent = artError;
    if (connection === "connected") {
      $("#count").textContent = String(s.connected);
      roster(s);
    }
  },
});
cafePanel = new CafePanel(
  $("#cafe-controls"),
  () => selfId,
  (action, target) => network.action(action, target),
);
interaction = new Interaction(
  network,
  () => selfId,
  $("#interaction-hint"),
  $("#brew-progress"),
);
$("#credits").onclick = () => {
  interaction?.finish();
  $<HTMLDialogElement>("#art-credits").showModal();
};
$("#close-credits").onclick = () =>
  $<HTMLDialogElement>("#art-credits").close();
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
  "shift",
];
$("#join").onclick = () => {
  audio.unlock();
  void network.start();
};
window.addEventListener("pointerdown", () => audio.unlock(), { once: true });
function setArranging(value: boolean) {
  arranging = value;
  interaction?.finish();
  world?.setBuild(value);
  $("#build").setAttribute("aria-pressed", String(value));
  $("#rotate").hidden = !value;
  $("#build-help").hidden = !value;
  $("#build").textContent = value ? "Finish arranging" : "Arrange furniture";
}
$("#build").onclick = () => setArranging(!arranging);
$("#cafe-controls").addEventListener("click", (e) => {
  const button = (e.target as HTMLElement).closest<HTMLButtonElement>(
    "button[data-place]",
  );
  if (!button || button.disabled) return;
  setPhone(false);
  setArranging(true);
  world?.selectFurniture(button.dataset.place!);
});
$("#rotate").onclick = () => world?.rotateFurniture();
function phoneOpen() {
  return !$("#app").classList.contains("management-hidden");
}
function setPhone(open: boolean) {
  $("#app").classList.toggle("management-hidden", !open);
  $("#manage").setAttribute("aria-expanded", String(open));
  if (open) {
    keys.clear();
    touch.clear();
    interaction?.finish();
    network.input(0, 0);
  }
}
$("#manage").onclick = () => setPhone(!phoneOpen());
$("#close-phone").onclick = () => setPhone(false);
$("#open-shop").onclick = () => {
  const me = latest?.players.find((p) => p.id === selfId);
  if (latest?.cafe?.ownerId === selfId && me?.area !== "town")
    network.action(latest.cafe.open ? "close" : "open");
};
const interactButton = $("#touch-interact") as HTMLButtonElement;
interactButton.onpointerdown = (e) => {
  e.preventDefault();
  if (phoneOpen()) setPhone(false);
  interactButton.setPointerCapture(e.pointerId);
  interaction?.key();
};
interactButton.onpointerup =
  interactButton.onpointercancel =
  interactButton.onlostpointercapture =
    () => interaction?.finish();
const sprintButton = $("#sprint");
sprintButton.onpointerdown = (e) => {
  e.preventDefault();
  touch.add("sprint");
  sprintButton.setPointerCapture(e.pointerId);
};
sprintButton.onpointerup =
  sprintButton.onpointercancel =
  sprintButton.onlostpointercapture =
    () => touch.delete("sprint");
$("#camera").onclick = () => world?.resetCamera();
$("#help").onclick = () => {
  keys.clear();
  touch.clear();
  interaction?.finish();
  network.input(0, 0);
  $<HTMLDialogElement>("#how").showModal();
};
$("#close-help").onclick = () => $<HTMLDialogElement>("#how").close();
window.addEventListener("keydown", (e) => {
  if (
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLTextAreaElement
  )
    return;
  if (e.key === "Escape") {
    setArranging(false);
    setPhone(false);
    return;
  }
  if (
    e.key.toLowerCase() === "c" &&
    !e.repeat &&
    !document.querySelector("dialog[open]")
  ) {
    e.preventDefault();
    setPhone(!phoneOpen());
    return;
  }
  if (
    e.key.toLowerCase() === "o" &&
    !e.repeat &&
    !document.querySelector("dialog[open]")
  ) {
    e.preventDefault();
    $("#open-shop").click();
    return;
  }
  if (
    e.key.toLowerCase() === "b" &&
    !e.repeat &&
    !document.querySelector("dialog[open]")
  ) {
    e.preventDefault();
    setPhone(false);
    if (!($("#build") as HTMLButtonElement).disabled) $("#build").click();
    return;
  }
  if (phoneOpen()) return;
  if (arranging) {
    if (e.key.toLowerCase() === "r") {
      e.preventDefault();
      world?.rotateFurniture();
    }
    return;
  }
  if (e.key === "Tab" && !document.querySelector("dialog[open]")) {
    e.preventDefault();
    $("#manage").click();
    return;
  }

  if (
    e.key.toLowerCase() === "e" &&
    !e.repeat &&
    !document.querySelector("dialog[open]")
  ) {
    e.preventDefault();
    interaction?.key();
  }
  if (
    controls.includes(e.key.toLowerCase()) &&
    !document.querySelector("dialog[open]")
  ) {
    e.preventDefault();
    keys.add(e.key.toLowerCase());
  }
});
window.addEventListener("keyup", (e) => {
  keys.delete(e.key.toLowerCase());
  if (e.key.toLowerCase() === "e") interaction?.finish();
});
window.addEventListener("blur", () => {
  keys.clear();
  touch.clear();
  interaction?.finish();
  network.input(0, 0);
});
document.addEventListener("visibilitychange", () => {
  keys.clear();
  touch.clear();
  interaction?.finish();
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
  network.input(d.x / length, d.z / length, has("shift", "sprint"));
}, 50);
window.addEventListener("pagehide", () => {
  interaction?.finish();
  clearInterval(inputTimer);
  network.stop();
  world?.dispose();
  audio.dispose();
});
