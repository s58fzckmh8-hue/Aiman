import * as THREE from "three";
import { model, disposeAssets } from "./assets.ts";
import { catModel, disposeCatModel, disposeCatResources } from "./cat-model.ts";
import type { WorldHit } from "./interaction.ts";
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
  mixer?: THREE.AnimationMixer;
  actions?: Record<string, THREE.AnimationAction>;
  animation?: string;
  cup?: THREE.Group;
  badge?: THREE.Mesh;
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
  private cylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
  private torus = new THREE.TorusGeometry(1, 0.3, 6, 12);
  private raycaster = new THREE.Raycaster();
  private pointerHit?: WorldHit;
  private pointerStart = { x: 0, y: 0 };
  private isTouch = false;
  private touchMoved = false;
  private readyCup?: THREE.Group;
  private steam: THREE.Mesh[] = [];
  private brewing = false;
  private assetCount = 0;
  private loadedAssetNames = new Set<string>();
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
  constructor(
    private host: HTMLElement,
    private interact?: (hit: WorldHit, phase: "press" | "release") => void,
  ) {
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
    this.renderer.domElement.tabIndex = 0;
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
  private assetLoaded(name: string) {
    this.assetCount++;
    this.loadedAssetNames.add(name);
    this.renderer.domElement.dataset.assetsLoaded = String(this.assetCount);
    this.renderer.domElement.dataset.modelNames = JSON.stringify([
      ...this.loadedAssetNames,
    ]);
  }
  private asset(
    name: string,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
    rotation = 0,
  ) {
    const root = new THREE.Group();
    root.position.set(x, y, z);
    root.rotation.y = rotation;
    this.environment.add(root);
    const fallback = this.cube(
      0xc7ae83,
      0,
      height / 2,
      0,
      width,
      height,
      depth,
      root,
    );
    void model(name, { width, height, depth })
      .then((asset) => {
        if (root.parent !== this.environment || this.disposed) return;
        fallback.removeFromParent();
        root.add(asset.group);
        this.assetLoaded(name);
      })
      .catch(() => {
        this.renderer.domElement.dataset.assetError =
          "Some artwork could not load. Reload to try again.";
      });
    return root;
  }
  private cup() {
    const g = new THREE.Group();
    this.mesh(this.cylinder, 0xf4eee0, 0, 0, 0, 0.12, 0.13, 0.12, g);
    this.mesh(this.cylinder, 0x765344, 0, 0.135, 0, 0.103, 0.008, 0.103, g);
    const handle = this.mesh(
      this.torus,
      0xf4eee0,
      0.15,
      0.02,
      0,
      0.07,
      0.09,
      0.07,
      g,
    );
    handle.rotation.y = Math.PI / 2;
    return g;
  }
  private coffeeMachine() {
    const g = new THREE.Group();
    g.position.set(-3.5, 1.4, -3.8);
    g.userData.interaction = { kind: "machine" };
    this.environment.add(g);
    this.cube(0x436a5a, 0, 0.38, 0, 1.1, 0.76, 0.68, g);
    this.cube(0xb9b5a4, 0, 0.55, 0.36, 0.8, 0.25, 0.09, g);
    this.cube(0x2f3935, 0, 0.18, 0.36, 0.74, 0.45, 0.1, g);
    this.cube(0xd1aa71, 0, 0.05, 0.5, 0.9, 0.06, 0.44, g);
    this.cube(0xa6aaa4, 0, 0.36, 0.5, 0.1, 0.15, 0.12, g);
    this.mesh(this.ball, 0xd6b889, 0.3, 0.61, 0.425, 0.065, 0.065, 0.025, g);
    this.cube(0x303b35, 0.56, 0.25, 0.2, 0.04, 0.46, 0.05, g);
    this.readyCup = this.cup();
    this.readyCup.position.set(0, 0.19, 0.5);
    g.add(this.readyCup);
    this.readyCup.visible = false;
    this.steam = [];
    for (let i = 0; i < 3; i++) {
      const steam = this.mesh(
        this.ball,
        0xf5efe0,
        -0.17 + i * 0.17,
        0.9,
        0.1,
        0.035,
        0.12,
        0.035,
        g,
      );
      steam.visible = false;
      this.steam.push(steam);
    }
    return g;
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
      this.asset(
        b.id % 2 ? "building_B_withoutBase" : "building_A_withoutBase",
        b.x,
        0.2,
        b.z,
        b.w,
        5,
        b.d,
        b.z < 0 ? 0 : Math.PI,
      );
      const door = this.cube(
        0x6e6454,
        b.x,
        1.1,
        b.z + side * 3.53,
        1.25,
        2.2,
        0.12,
      );
      door.userData.interaction = { kind: "door", target: String(b.id) };
      this.cube(0xe7d2ae, b.x, 0.16, b.z + side * 5, 2, 0.1, 3);
      const sign = this.sign(
        `LOT ${String(b.id + 1).padStart(2, "0")}`,
        "#57705c",
        3,
      );
      sign.position.set(b.x, 5.9, b.z);
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
    const a: Avatar = { group, legs, arms, label, name: p.name, samples: [] };
    this.avatars.set(p.id, a);
    a.badge = this.mesh(
      this.torus,
      p.color,
      0,
      0.04,
      0,
      0.42,
      0.42,
      0.42,
      group,
    );
    a.badge.rotation.x = Math.PI / 2;
    a.cup = this.cup();
    a.cup.position.set(0.44, 1.08, 0.42);
    group.add(a.cup);
    a.cup.visible = false;
    void model("kenney-character", { height: 1.85 })
      .then((asset) => {
        if (this.avatars.get(p.id) !== a || this.disposed) return;
        for (const child of [...group.children])
          if (child !== label && child !== a.cup && child !== a.badge)
            child.removeFromParent();
        group.add(asset.group);
        a.mixer = new THREE.AnimationMixer(asset.object);
        a.actions = {};
        for (const clip of asset.animations)
          a.actions[clip.name] = a.mixer.clipAction(clip);
        this.assetLoaded("kenney-character");
      })
      .catch(() => {
        this.renderer.domElement.dataset.assetError =
          "Some character artwork could not load. Reload to try again.";
      });
    return a;
  }
  private clearEnvironment() {
    for (const g of this.cats.values()) disposeCatModel(g);
    this.environment.clear();
    this.readyCup = undefined;
    this.steam = [];
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
    this.asset("kitchencounter_straight_A", -3.5, 0, -3.8, 3.8, 1.32, 1.5);
    this.coffeeMachine();
    const label = this.sign(cafe.ownerName + "’s café", "#3a5d48", 4);
    label.position.set(-1, 3.3, -4.7);
    this.environment.add(label);
    this.labels.push(label);
    for (const t of TABLES) {
      this.asset("table_round_A", t.x, 0, 0.3, 1.6, 1.02, 1.5);
      for (const z of [-0.85, 1.35])
        this.asset("chair_A", t.x, 0, z, 0.7, 1.22, 0.7, z < 0 ? 0 : Math.PI);
    }
    this.mesh(this.ball, 0xcbd5b1, 4, 0.07, 0.2, 1.7, 0.13, 3.5);
    this.cube(0xb99b76, 4, 0.13, -2.5, 1.7, 0.3, 1.4);
    this.cube(0xe9d6b5, 4, 0.32, -2.5, 1.5, 0.18, 1.2);
    this.asset("bowl_small", 4.8, 0, 2, 0.5, 0.22, 0.5);
    this.cube(0xb8a182, 5, 0.8, -0.8, 0.2, 1.6, 0.2);
    this.cube(0xd9c8a9, 5, 1.65, -0.8, 1, 0.15, 1);
    const exit = this.cube(0xaab58d, 0, 0.025, 4.35, 2, 0.04, 0.85);
    exit.userData.interaction = { kind: "exit" };
    if (cafe.level >= 2) {
      for (const x of [-5, 5]) {
        this.asset("cactus_small_A", x, 0, 3.5, 0.65, 1.1, 0.65);
      }
    }
    if (cafe.level >= 3) {
      this.asset("shelf_B_small_decorated", 5.3, 0, -3.7, 0.6, 1.9, 1.4);
      this.cube(0xe8bd9e, 2.5, 0.1, 3, 2, 0.15, 1.5);
      const sign = this.sign("A little coffee. A lot of cats.", "#688256", 3);
      sign.position.set(3, 3.1, -4.6);
      this.environment.add(sign);
      this.labels.push(sign);
    }
    this.decoration = cafe.level;
  }
  private catModel(coat: number) {
    const g = catModel(coat);
    g.userData.interaction = { kind: "cat" };
    this.environment.add(g);
    return g;
  }
  private roomEntities(cafe: CafeView, now: number) {
    const liveCats = new Set(cafe.cats.map((c) => c.id));
    for (const [id, g] of this.cats)
      if (!liveCats.has(id)) {
        disposeCatModel(g);
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
            cafe.level,
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
        group.userData.interaction = { kind: "customer", target: order.id };
        this.cube(0xbf9380, 0, 0.9, 0, 0.52, 0.7, 0.38, group);
        this.mesh(this.ball, 0xe5b58a, 0, 1.5, 0, 0.28, 0.3, 0.27, group);
        this.mesh(this.ball, 0x72543e, 0, 1.68, -0.02, 0.29, 0.17, 0.28, group);
        for (const x of [-0.15, 0.15])
          this.cube(0x666f68, x, 0.3, 0, 0.18, 0.5, 0.2, group);
        void model("kenney-character", { height: 1.65 })
          .then((asset) => {
            if (group.parent !== this.environment || this.disposed) return;
            group.clear();
            group.add(asset.group);
            group.userData.mixer = new THREE.AnimationMixer(asset.object);
            const actions: Record<string, THREE.AnimationAction> = {};
            for (const clip of asset.animations)
              actions[clip.name] = (
                group.userData.mixer as THREE.AnimationMixer
              ).clipAction(clip);
            group.userData.actions = actions;
            this.assetLoaded("kenney-character");
          })
          .catch(() => {
            this.renderer.domElement.dataset.assetError =
              "Some artwork could not load. Reload to try again.";
          });
        const target = TABLES[order.seat];
        const path = [
          ...route(ENTRY, SERVICE_POINTS[order.seat], true, cafe.level),
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
    if (s.cafe) {
      this.roomEntities(s.cafe, s.time);
      this.brewing = s.players.some((p) => !!p.work);
      if (this.readyCup)
        this.readyCup.visible = s.cafe.orders.some((o) => o.status === "READY");
    }

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
    a.mixer?.stopAllAction();
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
  private hit(e: PointerEvent): WorldHit | undefined {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.raycaster.setFromCamera(
      new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      this.camera,
    );
    const hit = this.raycaster.intersectObject(this.environment, true)[0];
    if (!hit) return;
    let object: THREE.Object3D | null = hit.object;
    while (object && object !== this.environment) {
      if (object.userData.interaction)
        return object.userData.interaction as WorldHit;
      object = object.parent;
    }
    return { kind: "floor", point: { x: hit.point.x, z: hit.point.z } };
  }
  private pointerDown = (e: PointerEvent) => {
    this.renderer.domElement.focus({ preventScroll: true });
    this.pointerStart = { x: e.clientX, y: e.clientY };
    this.px = e.clientX;
    this.isTouch = e.pointerType === "touch";
    this.touchMoved = false;
    this.renderer.domElement.setPointerCapture(e.pointerId);
    if (e.button === 2) {
      this.dragging = true;
      return;
    }
    this.pointerHit = this.hit(e);
    if (
      this.pointerHit &&
      (!this.isTouch || this.pointerHit.kind === "machine")
    )
      this.interact?.(this.pointerHit, "press");
  };
  private pointerMove = (e: PointerEvent) => {
    if (
      this.isTouch &&
      Math.hypot(
        e.clientX - this.pointerStart.x,
        e.clientY - this.pointerStart.y,
      ) > 8
    ) {
      this.touchMoved = true;
      this.dragging = true;
      if (this.pointerHit?.kind === "machine")
        this.interact?.(this.pointerHit, "release");
    }
    if (this.dragging) {
      this.angle -= (e.clientX - this.px) * 0.008;
      this.px = e.clientX;
    } else {
      const hit = this.hit(e);
      this.renderer.domElement.style.cursor =
        hit && hit.kind !== "floor" ? "pointer" : "crosshair";
    }
  };
  private pointerUp = (e: PointerEvent) => {
    if (this.pointerHit) {
      if (
        e.type !== "pointercancel" &&
        this.isTouch &&
        !this.touchMoved &&
        this.pointerHit.kind !== "machine"
      )
        this.interact?.(this.pointerHit, "press");
      this.interact?.(this.pointerHit, "release");
    }
    this.pointerHit = undefined;
    this.dragging = false;
    this.isTouch = false;
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
      const mixer = c.group.userData.mixer as THREE.AnimationMixer | undefined;
      if (mixer) {
        const next = target ? "walk" : "idle";
        if (c.group.userData.animation !== next) {
          const actions = c.group.userData.actions as Record<
            string,
            THREE.AnimationAction
          >;
          actions[c.group.userData.animation]?.fadeOut(0.15);
          actions[next]?.reset().fadeIn(0.15).play();
          c.group.userData.animation = next;
        }
        mixer.update(deltaDraw);
      }

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
      const tail = g.userData.tail as THREE.Group | undefined;
      if (tail)
        tail.rotation.z = this.motion
          ? 0
          : Math.sin(now * 0.003 + id.charCodeAt(0)) * 0.2;
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
      if (a.cup) a.cup.visible = !!to.state.carriedOrderId;
      if (a.mixer) {
        const next = to.state.moving ? "walk" : "idle";
        if (next !== a.animation) {
          if (a.animation) a.actions?.[a.animation]?.fadeOut(0.15);
          a.actions?.[next]?.reset().fadeIn(0.15).play();
          a.animation = next;
        }
        a.mixer.update(deltaDraw);
      }

      if (id === this.selfId)
        this.target.lerp(
          this.area === "town"
            ? new THREE.Vector3(a.group.position.x, 0, a.group.position.z)
            : new THREE.Vector3(0, 0, 0),
          0.08,
        );
    }
    const cameraZoom =
      this.zoom *
      (this.area === "town" ? 1 : Math.max(1, 1 / this.camera.aspect));
    this.camera.position.set(
      this.target.x + Math.sin(this.angle) * cameraZoom,
      cameraZoom * 0.95,
      this.target.z + Math.cos(this.angle) * cameraZoom,
    );
    this.camera.lookAt(this.target);
    for (const [i, steam] of this.steam.entries()) {
      steam.visible = this.brewing;
      steam.position.y = 0.88 + ((now * 0.0006 + i * 0.25) % 1) * 0.4;
    }
    this.renderer.render(this.scene, this.camera);
    // Read-only screen coordinates let pointer tests target rendered objects without bypassing game logic.
    if (import.meta.env.DEV && this.area !== "town") {
      const project = (x: number, y: number, z: number) => {
        const p = new THREE.Vector3(x, y, z).project(this.camera);
        return {
          x: ((p.x + 1) / 2) * this.renderer.domElement.clientWidth,
          y: ((1 - p.y) / 2) * this.renderer.domElement.clientHeight,
        };
      };
      this.renderer.domElement.dataset.machine = JSON.stringify(
        project(-3.5, 1.95, -3.4),
      );
      this.renderer.domElement.dataset.customers = JSON.stringify(
        [...this.customers]
          .filter(([, c]) => !c.leaving)
          .map(([id, c]) => ({
            id,
            ...project(c.group.position.x, 1.1, c.group.position.z),
          })),
      );
    }
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
    this.clearEnvironment();
    disposeCatResources();
    disposeAssets();
    this.cylinder.dispose();
    this.torus.dispose();
    this.box.dispose();
    this.ball.dispose();
    for (const m of this.materials.values()) m.dispose();
    this.renderer.dispose();
    c.remove();
  }
}
