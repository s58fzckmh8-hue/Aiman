import * as THREE from "three";
import {
  TABLES,
  SERVICE_POINTS,
  ENTRY,
  type CafeView,
  type Order,
} from "../../shared/cafe.ts";
import { route, type Point } from "../../shared/navigation.ts";
import { BUILDINGS } from "../../shared/world.ts";
import type { PlayerState, PublicState } from "../../shared/protocol.ts";
type Sample = { time: number; state: PlayerState };
type Avatar = {
  group: THREE.Group;
  legs: THREE.Mesh[];
  arms: THREE.Mesh[];
  samples: Sample[];
  label: THREE.Sprite;
  name: string;
};
export class World {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private environment = new THREE.Group();
  private area = "town";
  private decoration = 1;
  private cats = new Map<string, THREE.Group>();
  private customers = new Map<
    string,
    { group: THREE.Group; path: Point[]; leaving: boolean }
  >();
  private camera = new THREE.PerspectiveCamera(45, 1, 0.1, 240);
  private target = new THREE.Vector3(0, 0, 1);
  private avatars = new Map<string, Avatar>();
  private materials = new Map<number, THREE.MeshStandardMaterial>();
  private box = new THREE.BoxGeometry(1, 1, 1);
  private ball = new THREE.SphereGeometry(1, 12, 8);
  private labels: THREE.Sprite[] = [];
  private frame = 0;
  private lastDraw = performance.now();
  private observer: ResizeObserver;
  private angle = Math.PI / 5;
  private zoom = 24;
  private dragging = false;
  private px = 0;
  private disposed = false;
  private motion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  selfId = "";
  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0xeceee2);
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Shared 3D town. Use WASD, arrow keys or the on-screen movement buttons.",
    );
    this.renderer.domElement.setAttribute("role", "img");
    this.host.append(this.renderer.domElement);
    this.scene.fog = new THREE.Fog(0xeceee2, 45, 115);
    this.scene.add(new THREE.HemisphereLight(0xfff6e4, 0x8caa91, 1.8));
    const sun = new THREE.DirectionalLight(0xffe6c5, 1.8);
    sun.position.set(-15, 35, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -45;
    sun.shadow.camera.right = 45;
    sun.shadow.camera.top = 35;
    sun.shadow.camera.bottom = -35;
    sun.shadow.normalBias = 0.06;
    this.scene.add(sun);
    this.scene.add(sun.target);
    this.scene.add(this.environment);
    this.buildTown();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
    const c = this.renderer.domElement;
    c.addEventListener("contextmenu", this.prevent);
    c.addEventListener("pointerdown", this.pointerDown);
    c.addEventListener("pointermove", this.pointerMove);
    c.addEventListener("pointerup", this.pointerUp);
    c.addEventListener("pointercancel", this.pointerUp);
    c.addEventListener("wheel", this.wheel, { passive: false });
    this.draw();
  }
  private material(color: number) {
    let m = this.materials.get(color);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
      this.materials.set(color, m);
    }
    return m;
  }
  private mesh(
    g: THREE.BufferGeometry,
    color: number,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    parent: THREE.Object3D = this.environment,
  ) {
    const m = new THREE.Mesh(g, this.material(color));
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  private cube(
    c: number,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    p?: THREE.Object3D,
  ) {
    return this.mesh(this.box, c, x, y, z, sx, sy, sz, p);
  }
  private sign(text: string, color = "#375948", width = 4) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff9ec";
    ctx.beginPath();
    ctx.roundRect(3, 3, 506, 122, 20);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.font = "bold 38px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 65, 476);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, depthTest: true }),
    );
    sprite.scale.set(width, width / 4, 1);
    return sprite;
  }
  private buildTown() {
    this.cube(0xb8c6a1, 0, -0.25, 0, 100, 0.5, 60);
    this.cube(0xe7ddc5, 0, 0.01, 0, 96, 0.08, 18);
    this.cube(0xcfc7ae, 0, 0.06, 0, 96, 0.06, 6);
    for (let x = -45; x < 48; x += 6)
      this.cube(0xeee7d3, x, 0.1, 0, 2, 0.02, 0.13);
    for (const z of [-9, 9]) this.cube(0xf1e8d2, 0, 0.1, z, 96, 0.16, 2.1);
    for (const x of [-5, 5])
      for (let z = -3; z <= 3; z += 1)
        this.cube(0xf5efdc, x, 0.12, z, 0.65, 0.04, 0.5);
    for (const b of BUILDINGS) {
      const side = b.z < 0 ? 1 : -1;
      this.cube(0xd2c3a5, b.x, 0.1, b.z, 8, 0.2, 10);
      this.cube(b.color, b.x, 2, b.z, b.w, 3.8, b.d);
      this.cube(0x6c8271, b.x, 4.15, b.z, 7, 0.5, 7.6);
      this.cube(0x6e6454, b.x, 1.1, b.z + side * 3.53, 1.25, 2.2, 0.12);
      for (const dx of [-2, 2]) {
        this.cube(0x82a5a0, b.x + dx, 2.1, b.z + side * 3.55, 1.35, 1.35, 0.12);
        this.cube(0xf2e7cf, b.x + dx, 2.1, b.z + side * 3.64, 0.07, 1.4, 0.08);
      }
      this.cube(0xe7d2ae, b.x, 0.16, b.z + side * 5, 2, 0.1, 3);
      const awning = this.cube(
        0xd5a27d,
        b.x,
        2.95,
        b.z + side * 3.95,
        4,
        0.22,
        1.1,
      );
      awning.rotation.x = side * 0.12;
      const sign = this.sign(
        `LOT ${String(b.id + 1).padStart(2, "0")}`,
        "#57705c",
        3,
      );
      sign.position.set(b.x, 5.2, b.z);
      this.environment.add(sign);
      this.labels.push(sign);
    }
    // Low ground-cover decoration has no solid collision; all buildings use shared authoritative footprints.
    for (let i = 0; i < 20; i++) {
      const x = -44 + i * 4.5;
      this.mesh(this.ball, 0x9daf88, x, 0.12, i % 2 ? 26 : -26, 1.6, 0.25, 1.1);
    }
  }
  private avatar(p: PlayerState) {
    const group = new THREE.Group();
    this.scene.add(group);
    const legs: THREE.Mesh[] = [],
      arms: THREE.Mesh[] = [];
    this.cube(p.color, 0, 1.05, 0, 0.64, 0.78, 0.42, group);
    this.mesh(this.ball, 0xe6b98d, 0, 1.75, 0, 0.34, 0.36, 0.31, group);
    this.mesh(this.ball, 0x705443, 0, 1.94, -0.015, 0.35, 0.2, 0.32, group);
    this.cube(0xf3dfc0, 0, 0.95, 0.225, 0.4, 0.48, 0.03, group);
    for (const dx of [-0.18, 0.18]) {
      const leg = this.cube(0x535e61, dx, 0.37, 0, 0.21, 0.6, 0.24, group);
      legs.push(leg);
      this.cube(0xeee4cd, dx, 0.07, 0.07, 0.25, 0.14, 0.38, group);
    }
    for (const dx of [-0.44, 0.44])
      arms.push(this.cube(p.color, dx, 1.05, 0, 0.18, 0.66, 0.24, group));
    for (const dx of [-0.11, 0.11])
      this.mesh(this.ball, 0x483c33, dx, 1.78, 0.28, 0.035, 0.04, 0.025, group);
    const label = this.sign(p.name, "#365b49", 2.8);
    label.position.y = 2.55;
    group.add(label);
    group.position.set(p.x, 0, p.z);
    const a = { group, legs, arms, label, name: p.name, samples: [] };
    this.avatars.set(p.id, a);
    return a;
  }
  private clearEnvironment() {
    this.environment.clear();
    for (const label of this.labels) {
      label.material.map?.dispose();
      label.material.dispose();
    }
    this.labels = [];
    this.cats.clear();
    this.customers.clear();
  }
  private buildRoom(cafe: CafeView) {
    this.cube(0xe7ceaa, 0, -0.1, 0, 12, 0.2, 10);
    for (let z = -4.8; z < 5; z += 0.8)
      this.cube(0xd9ba92, 0, 0.012, z, 12, 0.025, 0.025);
    this.cube(0xf3e8cf, 0, 1.7, -5, 12, 3.4, 0.18);
    this.cube(0xdce2cb, -6, 1.7, 0, 0.18, 3.4, 10);
    this.cube(0x8caa9b, 1.5, 2, -4.86, 3.8, 1.7, 0.1);
    this.cube(0xfaf1d7, 1.5, 2, -4.76, 0.09, 1.7, 0.07);
    this.cube(0xfaf1d7, 1.5, 2, -4.76, 3.8, 0.08, 0.07);
    this.cube(0xb2916b, -3.5, 0.65, -3.8, 3.8, 1.3, 1.5);
    this.cube(0xf0ddba, -3.5, 1.32, -3.8, 4, 0.12, 1.65);
    this.cube(0x456c5c, -3.7, 1.75, -3.8, 0.9, 0.8, 0.65);
    this.cube(0x343d38, -3.7, 1.85, -3.43, 0.65, 0.3, 0.04);
    const label = this.sign(cafe.ownerName + "’s café", "#3a5d48", 4);
    label.position.set(-1, 3.3, -4.7);
    this.environment.add(label);
    this.labels.push(label);
    for (const t of TABLES) {
      this.cube(0xb88f66, t.x, 0.48, 0.3, 0.2, 0.9, 0.2);
      this.cube(0xd6b180, t.x, 0.98, 0.3, 1.6, 0.12, 1.5);
      for (const z of [-0.85, 1.35]) {
        this.cube(0x789582, t.x, 0.5, z, 0.7, 0.15, 0.7);
        this.cube(
          0x789582,
          t.x,
          0.85,
          z + (z < 0 ? -0.3 : 0.3),
          0.7,
          0.75,
          0.1,
        );
      }
    }
    this.mesh(this.ball, 0xcbd5b1, 4, 0.07, 0.2, 1.7, 0.13, 3.5);
    this.cube(0xb99b76, 4, 0.13, -2.5, 1.7, 0.3, 1.4);
    this.cube(0xe9d6b5, 4, 0.32, -2.5, 1.5, 0.18, 1.2);
    this.cube(0x9da991, 4.8, 0.1, 2, 0.5, 0.2, 0.5);
    this.mesh(this.ball, 0x8aabaf, 4.8, 0.23, 2, 0.23, 0.07, 0.23);
    this.cube(0xb8a182, 5, 0.8, -0.8, 0.2, 1.6, 0.2);
    this.cube(0xd9c8a9, 5, 1.65, -0.8, 1, 0.15, 1);
    this.cube(0xaab58d, 0, 0.025, 4.35, 2, 0.04, 0.85);
    if (cafe.level >= 2) {
      for (const x of [-5, 5]) {
        this.cube(0xc2926c, x, 0.2, 3.5, 0.5, 0.4, 0.5);
        this.mesh(this.ball, 0x789e6c, x, 0.85, 3.5, 0.5, 0.7, 0.5);
      }
    }
    if (cafe.level >= 3) {
      this.cube(0xe8bd9e, 2.5, 0.1, 3, 2, 0.15, 1.5);
      const sign = this.sign("A little coffee. A lot of cats.", "#688256", 3);
      sign.position.set(3, 3.1, -4.6);
      this.environment.add(sign);
      this.labels.push(sign);
    }
    this.decoration = cafe.level;
  }
  private catModel(coat: number) {
    const g = new THREE.Group();
    this.environment.add(g);
    const color = [0xdba255, 0xeee5d5, 0x89988b][coat % 3];
    this.mesh(this.ball, color, 0, 0.3, 0, 0.35, 0.25, 0.57, g);
    this.mesh(this.ball, color, 0, 0.65, 0.38, 0.3, 0.28, 0.28, g);
    for (const x of [-0.2, 0.2]) {
      const ear = this.cube(color, x, 0.91, 0.37, 0.16, 0.28, 0.16, g);
      ear.rotation.z = x < 0 ? 0.3 : -0.3;
      this.mesh(
        this.ball,
        0x4f6546,
        x * 0.6,
        0.7,
        0.62,
        0.035,
        0.045,
        0.025,
        g,
      );
      this.cube(color, x, 0.14, 0.25, 0.12, 0.28, 0.12, g);
    }
    const tail = this.cube(color, 0.2, 0.5, -0.6, 0.13, 0.13, 0.65, g);
    tail.rotation.y = 0.4;
    return g;
  }
  private roomEntities(cafe: CafeView, now: number) {
    const liveCats = new Set(cafe.cats.map((c) => c.id));
    for (const [id, g] of this.cats)
      if (!liveCats.has(id)) {
        g.removeFromParent();
        this.cats.delete(id);
      }
    for (const [i, c] of cafe.cats.entries()) {
      let g = this.cats.get(c.id);
      if (!g) {
        g = this.catModel(c.coat);
        g.position.set(3.4 + (i % 2) * 1.1, 0, -0.8 + i * 1.3);
        g.rotation.y = -0.7;
        this.cats.set(c.id, g);
      }
    }
    const active = new Set(cafe.orders.map((o) => o.id));
    for (const [id, customer] of this.customers)
      if (!active.has(id) && !customer.leaving) {
        customer.leaving = true;
        try {
          customer.path = route(
            { x: customer.group.position.x, z: customer.group.position.z },
            ENTRY,
            true,
          );
        } catch {
          customer.path = [ENTRY];
        }
      }
    for (const order of cafe.orders) {
      let customer = this.customers.get(order.id);
      if (!customer) {
        const group = new THREE.Group();
        this.environment.add(group);
        this.cube(0xbf9380, 0, 0.9, 0, 0.52, 0.7, 0.38, group);
        this.mesh(this.ball, 0xe5b58a, 0, 1.5, 0, 0.28, 0.3, 0.27, group);
        this.mesh(this.ball, 0x72543e, 0, 1.68, -0.02, 0.29, 0.17, 0.28, group);
        for (const x of [-0.15, 0.15])
          this.cube(0x666f68, x, 0.3, 0, 0.18, 0.5, 0.2, group);
        const target = TABLES[order.seat];
        const path = [
          ...route(ENTRY, SERVICE_POINTS[order.seat], true),
          target,
        ];
        if (now - order.createdAt > 4000) {
          group.position.set(target.x, 0, target.z);
          customer = { group, path: [], leaving: false };
        } else {
          group.position.set(ENTRY.x, 0, ENTRY.z);
          customer = { group, path, leaving: false };
        }
        this.customers.set(order.id, customer);
      }
      customer.group.userData.status = order.status;
    }
  }
  snapshot(s: PublicState) {
    const self = s.players.find((p) => p.id === this.selfId),
      area = self?.area ?? "town";
    if (area !== this.area || (s.cafe && s.cafe.level !== this.decoration)) {
      const changed = area !== this.area;
      this.clearEnvironment();
      this.area = area;
      if (area === "town") this.buildTown();
      else if (s.cafe) this.buildRoom(s.cafe);
      if (changed) {
        for (const a of this.avatars.values()) this.disposeAvatar(a);
        this.avatars.clear();
        if (self) this.target.set(self.x, 0, self.z);
        this.zoom = area === "town" ? 24 : 13;
      }
    }
    if (s.cafe) this.roomEntities(s.cafe, s.time);

    const now = performance.now();
    const seen = new Set<string>();
    for (const p of s.players) {
      seen.add(p.id);
      const a = this.avatars.get(p.id) ?? this.avatar(p);
      a.samples.push({ time: now, state: p });
      if (a.samples.length > 12) a.samples.shift();
    }
    for (const [id, a] of this.avatars)
      if (!seen.has(id)) {
        this.disposeAvatar(a);
        this.avatars.delete(id);
      }
  }
  private disposeAvatar(a: Avatar) {
    a.group.removeFromParent();
    a.label.material.map?.dispose();
    a.label.material.dispose();
  }
  private resize() {
    const { width, height } = this.host.getBoundingClientRect();
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }
  private prevent = (e: Event) => e.preventDefault();
  private pointerDown = (e: PointerEvent) => {
    if (e.button === 2 || e.pointerType === "touch") {
      this.dragging = true;
      this.px = e.clientX;
      this.renderer.domElement.setPointerCapture(e.pointerId);
    }
  };
  private pointerMove = (e: PointerEvent) => {
    if (this.dragging) {
      this.angle -= (e.clientX - this.px) * 0.008;
      this.px = e.clientX;
    }
  };
  private pointerUp = () => {
    this.dragging = false;
  };
  private wheel = (e: WheelEvent) => {
    e.preventDefault();
    this.zoom = THREE.MathUtils.clamp(this.zoom + e.deltaY * 0.018, 12, 45);
  };
  resetCamera() {
    this.angle = Math.PI / 5;
    this.zoom = this.area === "town" ? 24 : 13;
  }
  direction(x: number, z: number) {
    return {
      x: Math.cos(this.angle) * x + Math.sin(this.angle) * z,
      z: -Math.sin(this.angle) * x + Math.cos(this.angle) * z,
    };
  }
  private draw = () => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.draw);
    const now = performance.now(),
      viewTime = now - 110;
    const deltaDraw = Math.min(0.1, (now - this.lastDraw) / 1000);
    this.lastDraw = now;
    for (const [id, c] of this.customers) {
      const target = c.path[0];
      if (target) {
        const dx = target.x - c.group.position.x,
          dz = target.z - c.group.position.z,
          d = Math.hypot(dx, dz);
        if (d < 0.08) c.path.shift();
        else {
          const stride = Math.min(d, 2 * deltaDraw);
          c.group.position.x += (dx / d) * stride;
          c.group.position.z += (dz / d) * stride;
          c.group.rotation.y = Math.atan2(dx, dz);
        }
      } else if (c.leaving) {
        c.group.removeFromParent();
        this.customers.delete(id);
      }
    }
    for (const [id, g] of this.cats) {
      g.rotation.z = this.motion
        ? 0
        : Math.sin(now * 0.002 + id.length) * 0.025;
    }

    for (const [id, a] of this.avatars) {
      if (!a.samples.length) continue;
      let from = a.samples[0],
        to = a.samples[a.samples.length - 1];
      for (let i = 1; i < a.samples.length; i++)
        if (a.samples[i].time >= viewTime) {
          from = a.samples[i - 1];
          to = a.samples[i];
          break;
        }
      const t = THREE.MathUtils.clamp(
        (viewTime - from.time) / Math.max(1, to.time - from.time),
        0,
        1,
      );
      a.group.position.set(
        THREE.MathUtils.lerp(from.state.x, to.state.x, t),
        0,
        THREE.MathUtils.lerp(from.state.z, to.state.z, t),
      );
      const diff = Math.atan2(
        Math.sin(to.state.rotation - from.state.rotation),
        Math.cos(to.state.rotation - from.state.rotation),
      );
      a.group.rotation.y = from.state.rotation + diff * t;
      a.label.quaternion.copy(a.group.quaternion).invert();
      const phase =
        to.state.moving && !this.motion ? Math.sin(now * 0.012) * 0.5 : 0;
      a.legs.forEach((leg, i) => (leg.rotation.x = phase * (i ? 1 : -1)));
      a.arms.forEach((arm, i) => (arm.rotation.x = phase * (i ? -1 : 1)));
      a.label.material.opacity = to.state.connected ? 1 : 0.5;
      if (id === this.selfId)
        this.target.lerp(
          new THREE.Vector3(a.group.position.x, 0, a.group.position.z),
          0.08,
        );
    }
    this.camera.position.set(
      this.target.x + Math.sin(this.angle) * this.zoom,
      this.zoom * 0.95,
      this.target.z + Math.cos(this.angle) * this.zoom,
    );
    this.camera.lookAt(this.target);
    this.renderer.render(this.scene, this.camera);
  };
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    const c = this.renderer.domElement;
    c.removeEventListener("contextmenu", this.prevent);
    c.removeEventListener("pointerdown", this.pointerDown);
    c.removeEventListener("pointermove", this.pointerMove);
    c.removeEventListener("pointerup", this.pointerUp);
    c.removeEventListener("pointercancel", this.pointerUp);
    c.removeEventListener("wheel", this.wheel);
    for (const a of this.avatars.values()) this.disposeAvatar(a);
    for (const s of this.labels) {
      s.material.map?.dispose();
      s.material.dispose();
    }
    this.box.dispose();
    this.ball.dispose();
    for (const m of this.materials.values()) m.dispose();
    this.renderer.dispose();
    c.remove();
  }
}
