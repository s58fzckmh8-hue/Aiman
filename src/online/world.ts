import { ROOM_SCALE, roomOrigin, roomToTown } from "../../shared/portals.ts";
import * as THREE from "three";
import { human, animateHuman, disposeHumans, type Human } from "./character.ts";
import {
  recipe,
  customerProfile,
  patience,
  seed,
} from "../../shared/experience.ts";
import {
  DEFAULT_FURNITURE,
  chair,
  servicePoint,
  footprints,
  type Furniture,
} from "../../shared/furniture.ts";
import { model, disposeAssets } from "./assets.ts";
import { catModel, disposeCatModel, disposeCatResources } from "./cat-model.ts";
import type { WorldHit } from "./interaction.ts";
import { roomBounds, ENTRY, type CafeView } from "../../shared/cafe.ts";
import { route, type Point } from "../../shared/navigation.ts";
import { BUILDINGS } from "../../shared/world.ts";
import type { PlayerState, PublicState } from "../../shared/protocol.ts";
type Sample = { time: number; state: PlayerState };
type Avatar = {
  group: THREE.Group;
  samples: Sample[];
  label: THREE.Sprite;
  name: string;
  cup?: THREE.Group;
  badge?: THREE.Mesh;
  human?: Human;
  heldCat?: THREE.Group;
  heldCatId?: string;
};
export class World {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private environment = new THREE.Group();
  private neighbourhood = new THREE.Group();
  private anchorLot = 0;
  private renderedZoom = 24;
  private serverTime = Date.now();
  private snapshotAt = performance.now();
  private previewMaterial = new THREE.MeshBasicMaterial({
    color: 0x79a082,
    wireframe: true,
  });
  private hitMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  private area = "town";
  private decoration = 1;
  private layoutKey = "";
  private cafe?: CafeView;
  private furniture = new Map<string, THREE.Group>();
  private buildEnabled = false;
  private buildSelection?: string;
  private buildPoint?: { x: number; z: number };
  private buildRotation = 0;
  private grid?: THREE.GridHelper;
  private preview?: THREE.Group;
  private cats = new Map<string, THREE.Group>();
  private customers = new Map<
    string,
    {
      group: THREE.Group;
      path: Point[];
      leaving: boolean;
      human: Human;
      bubble: THREE.Sprite;
      cup: THREE.Group;
      seat: number;
      text: string;
    }
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
  private labels: (
    | THREE.Sprite
    | THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>
  )[] = [];
  private frame = 0;
  private lastDraw = performance.now();
  private observer: ResizeObserver;
  private angle = Math.PI / 5;
  private zoom = 24;
  private dragging = false;
  private px = 0;
  private disposed = false;
  private buildDragging = false;
  private hoverTarget?: string;
  private selectedCustomer?: string;
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
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
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
    this.scene.add(this.neighbourhood);
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
    ctx.font = "600 34px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lines = text.split("\n");
    lines.forEach((line, i) =>
      ctx.fillText(line, 256, lines.length === 1 ? 65 : 42 + i * 48, 476),
    );
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        depthTest: true,
        toneMapped: false,
      }),
    );
    sprite.scale.set(width, width / 4, 1);
    return sprite;
  }
  /** Wall boards remain flush with the wall instead of billboarding through it. */
  private wallSign(text: string, color: string, width: number) {
    const sprite = this.sign(text, color, width);
    const material = new THREE.MeshBasicMaterial({
      map: sprite.material.map,
      transparent: true,
      toneMapped: false,
    });
    sprite.material.dispose();
    const board = new THREE.Mesh(this.box, material);
    board.scale.set(width, width / 4, 0.03);
    return board;
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
        if (!root.parent || !this.scene.getObjectById(root.id) || this.disposed)
          return;
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
  private buildTown(skip = -1) {
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
      if (
        b.id === skip ||
        (skip >= 0 &&
          Math.hypot(b.x - BUILDINGS[skip].x, b.z - BUILDINGS[skip].z) < 12)
      )
        continue;
      const side = b.z < 0 ? 1 : -1;
      this.cube(0xd2c3a5, b.x, 0.1, b.z, 8, 0.2, 10);
      const building = this.asset(
        b.id % 2 ? "building_B_withoutBase" : "building_A_withoutBase",
        b.x,
        0.2,
        b.z,
        b.w,
        3.2,
        b.d,
        b.z < 0 ? 0 : Math.PI,
      );
      building.userData.interaction = { kind: "door", target: String(b.id) };
      this.cube(0xe7d2ae, b.x, 0.16, b.z + side * 5, 2, 0.1, 3);
      const sign = this.sign(
        `LOT ${String(b.id + 1).padStart(2, "0")}`,
        "#57705c",
        3,
      );
      sign.position.set(b.x, 3.75, b.z);
      sign.userData.lot = b.id;
      sign.visible = false;
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
    const person = human(p.id, true, p.color);
    group.add(person.root);
    const label = this.sign(
      p.id === this.selfId ? "YOU" : p.name,
      "#365b49",
      1.55,
    );
    label.position.y = 2.25;
    group.add(label);
    group.position.set(p.x, 0, p.z);
    const a: Avatar = {
      group,
      label,
      name: p.name,
      samples: [],
      human: person,
    };
    a.badge = this.mesh(
      this.torus,
      p.color,
      0,
      0.03,
      0,
      0.38,
      0.38,
      0.38,
      group,
    );
    a.badge.rotation.x = Math.PI / 2;
    a.cup = this.cup();
    a.cup.position.set(0.24, 1.04, 0.43);
    group.add(a.cup);
    a.cup.visible = false;
    this.avatars.set(p.id, a);
    return a;
  }
  private clearEnvironment() {
    for (const g of this.cats.values()) disposeCatModel(g);
    for (const customer of this.customers.values()) {
      customer.bubble.material.map?.dispose();
      customer.bubble.material.dispose();
    }
    if (this.grid) {
      this.grid.geometry.dispose();
      for (const material of Array.isArray(this.grid.material)
        ? this.grid.material
        : [this.grid.material])
        material.dispose();
    }
    this.environment.clear();
    this.neighbourhood.clear();
    this.environment.position.set(0, 0, 0);
    this.environment.scale.setScalar(1);
    this.environment.rotation.y = 0;
    this.readyCup = undefined;
    this.steam = [];
    for (const label of this.labels) {
      label.material.map?.dispose();
      label.material.dispose();
    }
    this.labels = [];
    this.furniture.clear();
    this.preview = undefined;
    this.grid = undefined;
    this.buildSelection = undefined;
    this.cats.clear();
    this.customers.clear();
  }
  private buildRoom(cafe: CafeView) {
    const bounds = roomBounds(cafe.level),
      width = bounds.maxX - bounds.minX,
      depth = bounds.maxZ - bounds.minZ,
      cx = (bounds.minX + bounds.maxX) / 2,
      cz = (bounds.minZ + bounds.maxZ) / 2;
    this.cube(0xe7ceaa, cx, -0.1, cz, width, 0.2, depth);
    for (let z = bounds.minZ + 0.2; z < 5; z += 0.8)
      this.cube(0xd9ba92, cx, 0.012, z, width, 0.025, 0.025);
    this.cube(0xf3e8cf, cx, 1.7, bounds.minZ, width, 3.4, 0.18);
    this.cube(0xdce2cb, bounds.minX, 1.7, cz, 0.18, 3.4, depth);
    this.cube(0x8caa9b, 1.5, 2, bounds.minZ + 0.14, 3.8, 1.7, 0.1);
    this.cube(0xfaf1d7, 1.5, 2, bounds.minZ + 0.24, 0.09, 1.7, 0.07);
    this.cube(0xfaf1d7, 1.5, 2, bounds.minZ + 0.24, 3.8, 0.08, 0.07);
    this.asset("kitchencounter_straight_A", -3.5, 0, -3.8, 3.8, 1.32, 1.5);
    this.coffeeMachine();
    const label = this.wallSign(cafe.ownerName + "’s café", "#3a5d48", 2.2);
    label.position.set(1.5, 3.1, bounds.minZ + 0.3);
    this.environment.add(label);
    this.labels.push(label);
    // Movable pieces use the same layout, dimensions and rotations as server navigation.
    const layout = cafe.layout ?? DEFAULT_FURNITURE;
    for (const f of layout.filter(
      (f) => f.level <= cafe.level && f.placed !== false,
    ))
      this.buildFurniture(f);
    this.mesh(this.ball, 0xcbd5b1, 4, 0.018, 0.2, 1.7, 0.025, 3.5);
    // One doorway, one exit target. No second door over an imported door mesh.
    const exit = this.cube(0xb1bd9c, 0, 0.025, 4.35, 1.6, 0.04, 0.7);
    exit.userData.interaction = { kind: "exit" };
    const exitSign = this.sign("↗ TOWN", "#748063", 1.1);
    exitSign.position.set(0, 0.13, 4.4);
    exitSign.rotation.x = -Math.PI / 2;
    this.environment.add(exitSign);
    this.labels.push(exitSign);
    this.cube(0xc4ae87, cx, 0.12, bounds.minZ + 0.15, width - 0.3, 0.22, 0.1);
    this.cube(0xc4ae87, bounds.minX + 0.13, 0.12, cz, 0.1, 0.22, depth - 0.2);
    this.cube(0xe2d3b4, bounds.minX + 0.1, 1.05, cz, 0.07, 0.035, depth - 0.2);
    this.cube(0xe2d3b4, cx, 1.05, bounds.minZ + 0.1, width - 0.3, 0.035, 0.07);
    const menu = this.wallSign(
      "MIAW COFFEE\nBrewed with a little love",
      "#5c7159",
      2.7,
    );
    menu.position.set(-3.5, 2.9, bounds.minZ + 0.18);
    this.environment.add(menu);
    this.labels.push(menu);
    for (const x of [-4.7, -4.25]) {
      this.mesh(this.cylinder, 0xa57f56, x, 1.48, -4.05, 0.12, 0.28, 0.12);
      this.mesh(this.cylinder, 0x6c5542, x, 1.79, -4.05, 0.13, 0.035, 0.13);
    }
    this.grid = new THREE.GridHelper(width, width * 2, 0x8da385, 0xc4cdb4);
    this.grid.scale.z = depth / width;
    this.grid.position.set(cx, 0.035, cz);
    this.grid.visible = this.buildEnabled;
    this.environment.add(this.grid);
    this.decoration = cafe.level;
  }
  private buildFurniture(f: Furniture) {
    const group = new THREE.Group();
    group.position.set(f.x, 0, f.z);
    group.rotation.y = (f.rotation * Math.PI) / 2;
    group.userData.furniture = f.id;
    this.environment.add(group);
    this.furniture.set(f.id, group);
    const asset = (
      name: string,
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      rotation = 0,
    ) => {
      const root = this.asset(name, 0, 0, 0, w, h, d, rotation);
      root.removeFromParent();
      group.add(root);
      root.position.set(x, y, z);
      return root;
    };
    if (f.kind === "dining") {
      asset("table_round_A", 0, 0, 0, 1.6, 1.02, 1.5);
      for (const [which, z, r] of [
        ["back", -1.15, 0],
        ["front", 1.05, Math.PI],
      ] as const) {
        const seat = asset("chair_A", 0, 0, z, 0.7, 1.22, 0.7, r);
        seat.userData.interaction = {
          kind: "chair",
          target: `${f.id}:${which}`,
        };
        const hit = new THREE.Mesh(this.box, this.hitMaterial);
        hit.scale.set(0.7, 1.22, 0.7);
        hit.position.y = 0.61;
        seat.add(hit);
      }
      const label = this.sign(
        `TABLE ${Number(f.id.slice(-1)) + 1}`,
        "#8d7a60",
        0.8,
      );
      label.position.set(0, 1.1, 0);
      group.add(label);
      this.labels.push(label);
    } else if (f.kind === "bed") {
      this.cube(0xb99b76, 0, 0.13, 0, 1.7, 0.3, 1.4, group);
      this.cube(0xe9d6b5, 0, 0.32, 0, 1.5, 0.18, 1.2, group);
      this.mesh(this.ball, 0xd5c4b5, 0, 0.45, 0, 0.6, 0.12, 0.45, group);
    } else if (f.kind === "tree") {
      this.cube(0xb8a182, 0, 0.8, 0, 0.2, 1.6, 0.2, group);
      this.cube(0xd9c8a9, 0, 1.65, 0, 1, 0.15, 1, group);
      this.mesh(this.ball, 0xcdbb9b, 0.32, 1.2, 0.18, 0.1, 0.1, 0.1, group);
    } else if (f.kind === "bowl") {
      const bowl = asset("bowl_small", 0, 0, 0, 0.5, 0.22, 0.5);
      bowl.userData.interaction = { kind: "bowl" };
    } else if (f.kind === "plant")
      asset("cactus_small_A", 0, 0, 0, 0.65, 1.1, 0.65);
    else if (f.kind === "shelf")
      asset("shelf_B_small_decorated", 0, 0, 0, 0.6, 1.9, 1.4);
    else if (f.kind === "toy") {
      this.mesh(this.ball, 0xc59080, -0.12, 0.22, 0, 0.22, 0.22, 0.22, group);
      this.mesh(this.ball, 0x9da97b, 0.19, 0.13, 0.13, 0.12, 0.12, 0.12, group);
      this.cube(0xb8a182, 0.17, 0.2, -0.18, 0.19, 0.4, 0.19, group);
    } else if (f.kind === "sofa") {
      this.cube(0x8c9e86, 0, 0.3, 0, 2, 0.6, 1, group);
      this.cube(0xa9b79b, 0, 0.81, -0.4, 2, 0.68, 0.2, group);
      for (const x of [-0.9, 0.9])
        this.cube(0x8c9e86, x, 0.62, 0, 0.2, 0.5, 0.95, group);
      for (const [i, x] of [-0.45, 0.45].entries()) {
        const seat = this.cube(0xb6c4a9, x, 0.59, 0.03, 0.8, 0.2, 0.78, group);
        seat.userData.interaction = { kind: "chair", target: `${f.id}:${i}` };
      }
    }
  }
  private syncFurniture(cafe: CafeView) {
    const pieces = (cafe.layout ?? DEFAULT_FURNITURE).filter(
      (f) => f.level <= cafe.level && f.placed !== false,
    );
    const visible = new Set(pieces.map((f) => f.id));
    for (const [id, group] of this.furniture)
      if (!visible.has(id)) {
        group.traverse((object) => {
          if (object instanceof THREE.Sprite) {
            object.material.map?.dispose();
            object.material.dispose();
            this.labels = this.labels.filter((label) => label !== object);
          }
        });
        group.removeFromParent();
        this.furniture.delete(id);
      }
    for (const f of pieces) {
      const group = this.furniture.get(f.id);
      if (group) {
        group.position.set(f.x, 0, f.z);
        group.rotation.y = (f.rotation * Math.PI) / 2;
      } else this.buildFurniture(f);
    }
    for (const customer of this.customers.values())
      if (customer.leaving) {
        try {
          customer.path = route(
            { x: customer.group.position.x, z: customer.group.position.z },
            ENTRY,
            true,
            cafe.level,
            cafe.layout,
          );
        } catch {
          customer.path = [];
        }
      }
  }
  private catModel(coat: number) {
    const g = catModel(coat);
    const hit = new THREE.Mesh(this.box, this.hitMaterial);
    hit.scale.set(0.75, 1.25, 1.1);
    hit.position.set(0, 0.62, 0.05);
    g.add(hit);
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
    for (const c of cafe.cats) {
      let g = this.cats.get(c.id);
      if (!g) {
        g = this.catModel(c.coat);
        g.position.set(3.3, 0, 0.7);
        g.userData.interaction = { kind: "cat", target: c.id };
        this.cats.set(c.id, g);
      }
      const pose = cafe.catPoses?.find((p) => p.id === c.id);
      g.visible = pose?.activity !== "carried";
      if (pose) g.userData.pose = pose;
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
            cafe.layout,
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
        const person = human(order.id);
        group.add(person.root);
        const bubble = this.sign(customerProfile(order.id).name, "#68765f", 2);
        bubble.position.y = 2.18;
        group.add(bubble);
        const cup = this.cup();
        cup.position.set(0.2, 1.04, 0.28);
        cup.visible = false;
        group.add(cup);
        const layout = cafe.layout ?? DEFAULT_FURNITURE,
          seat = chair(layout, `table-${order.seat}:front`)!;
        const target = { x: seat.x, z: seat.z };
        const path = [
          ...route(
            ENTRY,
            servicePoint(layout, order.seat),
            true,
            cafe.level,
            layout,
          ),
          target,
        ];
        if (now - order.createdAt > 5000) {
          group.position.set(target.x, 0, target.z);
          customer = {
            group,
            path: [],
            leaving: false,
            human: person,
            bubble,
            cup,
            seat: order.seat,
            text: "",
          };
        } else {
          group.position.set(ENTRY.x, 0, ENTRY.z);
          customer = {
            group,
            path,
            leaving: false,
            human: person,
            bubble,
            cup,
            seat: order.seat,
            text: "",
          };
        }
        this.customers.set(order.id, customer);
      }
      const profile = customerProfile(order.id),
        drink = recipe(order.recipe);
      const text =
        order.status === "DRINKING"
          ? `${profile.name}\nAhh… lovely coffee.`
          : patience(order, now) < 0.25
            ? `${profile.name}\nI have to go soon…`
            : `${profile.name} · ${profile.style}\n${drink.name}, please`;
      if (customer.text !== text) {
        const next = this.sign(
          text,
          patience(order, now) < 0.25 ? "#ae735e" : "#627258",
          2.2,
        );
        next.position.y = 2.05;
        customer.bubble.removeFromParent();
        customer.bubble.material.map?.dispose();
        customer.bubble.material.dispose();
        customer.bubble = next;
        customer.group.add(next);
        customer.text = text;
      }
      customer.cup.visible = order.status === "DRINKING";
      customer.group.userData.status = order.status;
    }
  }
  snapshot(s: PublicState) {
    this.serverTime = s.time;
    this.snapshotAt = performance.now();
    const self = s.players.find((p) => p.id === this.selfId),
      area = self?.area ?? "town";
    const layoutKey = JSON.stringify(s.cafe?.layout ?? []);
    this.cafe = s.cafe;
    if (area !== this.area || (s.cafe && s.cafe.level !== this.decoration)) {
      this.layoutKey = layoutKey;
      const changed = area !== this.area;
      this.clearEnvironment();
      this.area = area;
      if (area === "town") this.buildTown();
      else if (s.cafe) {
        this.anchorLot =
          s.properties?.find((p) => p.ownerId === s.cafe!.ownerId)?.lot ?? 0;
        const env = this.environment;
        this.environment = this.neighbourhood;
        this.buildTown(this.anchorLot);
        this.environment = env;
        const origin = roomOrigin(this.anchorLot);
        this.environment.position.set(origin.x, 0, origin.z);
        this.environment.rotation.y = origin.rotation;
        this.environment.scale.setScalar(ROOM_SCALE);
        this.buildRoom(s.cafe);
      }
      if (changed) {
        for (const a of this.avatars.values()) this.disposeAvatar(a);
        this.avatars.clear();

        this.zoom = area === "town" ? 24 : 13 + 2 * ((s.cafe?.level ?? 1) - 1);
      }
    }
    if (s.cafe && layoutKey !== this.layoutKey) {
      this.syncFurniture(s.cafe);
      this.layoutKey = layoutKey;
    }
    if (s.cafe) {
      this.roomEntities(s.cafe, s.time);
      this.brewing = s.players.some((p) => !!p.work);
      if (this.readyCup)
        this.readyCup.visible = s.cafe.orders.some((o) => o.status === "READY");
    }

    for (const label of this.labels) {
      if (label.userData.lot !== undefined) {
        const property = s.properties?.find(
          (p) => p.lot === label.userData.lot,
        );
        label.visible = !!property;
      }
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
    if (a.heldCat) disposeCatModel(a.heldCat);
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
    const hit = this.raycaster
      .intersectObject(this.environment, true)
      .find((hit) => !(hit.object instanceof THREE.Sprite));
    if (!hit) return;
    let object: THREE.Object3D | null = hit.object;
    if (this.buildEnabled) {
      for (
        let parent: THREE.Object3D | null = object;
        parent && parent !== this.environment;
        parent = parent.parent
      )
        if (parent.userData.furniture)
          return { kind: "furniture", target: parent.userData.furniture };
      return { kind: "floor", point: this.floorPoint(e) };
    }
    while (object && object !== this.environment) {
      if (object.userData.interaction)
        return object.userData.interaction as WorldHit;
      object = object.parent;
    }
    const local = this.environment.worldToLocal(hit.point.clone());
    return { kind: "floor", point: { x: local.x, z: local.z } };
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
    if (this.buildEnabled) {
      const hit = this.hit(e);
      if (hit?.kind === "furniture") {
        this.buildSelection = hit.target;
        const f = this.cafe?.layout?.find((f) => f.id === hit.target);
        this.buildRotation = f?.rotation ?? 0;
        this.buildPoint = f
          ? { x: Math.round(f.x * 2) / 2, z: Math.round(f.z * 2) / 2 }
          : undefined;
        this.buildDragging = true;
        this.updatePreview();
      } else if (this.buildSelection) {
        this.buildPoint = this.floorPoint(e);
        this.updatePreview();
        this.placeFurniture();
      }
      return;
    }
    this.pointerHit = this.hit(e);
    if (import.meta.env.DEV)
      this.renderer.domElement.dataset.lastHit = JSON.stringify(
        this.pointerHit ?? null,
      );
    if (this.pointerHit?.kind === "customer")
      this.selectedCustomer = this.pointerHit.target;
    if (
      this.pointerHit &&
      (!this.isTouch || this.pointerHit.kind === "machine")
    )
      this.interact?.(this.pointerHit, "press");
  };
  private pointerMove = (e: PointerEvent) => {
    if (this.buildEnabled && this.buildDragging && this.buildSelection) {
      this.buildPoint = this.floorPoint(e);
      this.updatePreview();
      return;
    }
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
      this.hoverTarget = hit?.target;
      this.renderer.domElement.style.cursor =
        hit && hit.kind !== "floor" ? "pointer" : "crosshair";
    }
  };
  private pointerUp = (e: PointerEvent) => {
    if (this.buildEnabled && this.buildDragging) {
      const moved =
        Math.hypot(
          e.clientX - this.pointerStart.x,
          e.clientY - this.pointerStart.y,
        ) > 8;
      this.buildDragging = false;
      if (moved && e.type !== "pointercancel") this.placeFurniture();
      this.dragging = false;
      return;
    }
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
  setBuild(enabled: boolean) {
    this.buildEnabled = enabled;
    this.buildSelection = undefined;
    this.buildDragging = false;
    if (this.grid) this.grid.visible = enabled;
    this.preview?.removeFromParent();
    this.preview = undefined;
    this.renderer.domElement.dataset.mode = enabled ? "build" : "play";
  }
  selectFurniture(id: string) {
    const f = this.cafe?.layout?.find((f) => f.id === id);
    if (!f) return;
    this.buildSelection = id;
    this.buildRotation = f.rotation;
    this.buildPoint = {
      x: Math.round(f.x * 2) / 2,
      z: Math.round(f.z * 2) / 2,
    };
    this.updatePreview();
  }
  rotateFurniture() {
    if (!this.buildSelection) return;
    this.buildRotation = (this.buildRotation + 1) % 4;
    this.updatePreview();
  }
  private floorPoint(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.raycaster.setFromCamera(
      new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      this.camera,
    );
    const point = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(
      new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
      point,
    );
    this.environment.worldToLocal(point);
    return { x: Math.round(point.x * 2) / 2, z: Math.round(point.z * 2) / 2 };
  }
  private updatePreview() {
    this.preview?.removeFromParent();
    if (!this.buildPoint || !this.buildSelection || !this.cafe) return;
    const f = this.cafe.layout?.find((f) => f.id === this.buildSelection);
    if (!f) return;
    const selected = { ...f, ...this.buildPoint, rotation: this.buildRotation },
      group = new THREE.Group();
    for (const box of footprints([selected], this.cafe.level).filter(
      (b) => b.id === f.id,
    )) {
      const m = new THREE.Mesh(this.box, this.previewMaterial);
      m.position.set(box.x, 0.3, box.z);
      m.scale.set(box.w, 0.6, box.d);
      group.add(m);
    }
    this.preview = group;
    this.environment.add(group);
  }
  private placeFurniture() {
    if (!this.buildSelection || !this.buildPoint) return;
    this.interact?.(
      {
        kind: "furniture",
        target: this.buildSelection,
        point: this.buildPoint,
        rotation: this.buildRotation,
      },
      "press",
    );
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
      c.bubble.visible =
        this.hoverTarget === id ||
        this.selectedCustomer === id ||
        c.group.userData.status === "DRINKING";
      animateHuman(c.human, now, !!target, !target && !c.leaving, false, false);
      if (!target && !c.leaving) {
        const seat = chair(
          this.cafe?.layout ?? DEFAULT_FURNITURE,
          `table-${c.seat}:front`,
        );
        if (seat) c.group.rotation.y = seat.rotation;
      }
      if (c.group.userData.status === "DRINKING" && !target)
        c.human.arms[1].rotation.x = -1.4 + Math.sin(now * 0.0015) * 0.12;

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
        c.bubble.material.map?.dispose();
        c.bubble.material.dispose();
        this.customers.delete(id);
      }
    }
    for (const [id, g] of this.cats) {
      const pose = g.userData.pose as
        | import("../../shared/experience.ts").CatPose
        | undefined;
      if (pose) {
        g.position.lerp(
          new THREE.Vector3(pose.x, pose.y, pose.z),
          1 - Math.exp(-deltaDraw * 12),
        );
        const diff = Math.atan2(
          Math.sin(pose.rotation - g.rotation.y),
          Math.cos(pose.rotation - g.rotation.y),
        );
        g.rotation.y += diff * Math.min(1, deltaDraw * 10);
        g.scale.y = pose.activity === "sleeping" ? 0.64 : 1;
        g.rotation.x =
          pose.activity === "grooming" ? Math.sin(now * 0.01) * 0.08 : 0;
      }
      const tail = g.userData.tail as THREE.Group | undefined;
      if (tail)
        tail.rotation.z = this.motion
          ? 0
          : Math.sin(now * 0.003 + (seed(id) % 10)) *
            (pose?.activity === "purring" ? 0.45 : 0.15);
      g.rotation.z = this.motion
        ? 0
        : Math.sin(
            now * (pose?.activity === "walking" ? 0.012 : 0.002) +
              (seed(id) % 7),
          ) * 0.018;
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
      const local = {
        x: THREE.MathUtils.lerp(from.state.x, to.state.x, t),
        z: THREE.MathUtils.lerp(from.state.z, to.state.z, t),
      };
      const position =
        this.area === "town" ? local : roomToTown(local, this.anchorLot);
      const transition = to.state.doorTransition;
      const clock = this.serverTime + now - this.snapshotAt;
      let transitionActive = false;
      if (transition && clock < transition.endsAt) {
        const ratio = THREE.MathUtils.clamp(
          (clock - transition.startedAt) /
            (transition.endsAt - transition.startedAt),
          0,
          1,
        );
        position.x = THREE.MathUtils.lerp(transition.fromX, position.x, ratio);
        position.z = THREE.MathUtils.lerp(transition.fromZ, position.z, ratio);
        transitionActive = true;
      }
      a.group.position.set(position.x, 0, position.z);
      a.group.scale.setScalar(ROOM_SCALE);
      const diff = Math.atan2(
        Math.sin(to.state.rotation - from.state.rotation),
        Math.cos(to.state.rotation - from.state.rotation),
      );
      a.group.rotation.y =
        from.state.rotation +
        diff * t +
        (this.area === "town" ? 0 : roomOrigin(this.anchorLot).rotation);
      if (transitionActive && transition)
        a.group.rotation.y = Math.atan2(
          position.x - transition.fromX,
          position.z - transition.fromZ,
        );
      a.label.quaternion.copy(a.group.quaternion).invert();
      if (a.human)
        animateHuman(
          a.human,
          now,
          to.state.moving || transitionActive,
          !!to.state.sitting,
          !!to.state.carriedCatId || !!to.state.carriedOrderId,
          !!to.state.work,
        );
      if (a.heldCatId !== to.state.carriedCatId) {
        if (a.heldCat) {
          disposeCatModel(a.heldCat);
          a.heldCat.removeFromParent();
          a.heldCat = undefined;
        }
        a.heldCatId = to.state.carriedCatId;
        const cat = this.cafe?.cats.find((c) => c.id === a.heldCatId);
        if (cat) {
          a.heldCat = catModel(cat.coat);
          a.heldCat.scale.setScalar(0.7);
          a.heldCat.position.set(0, 0.77, 0.4);
          a.heldCat.rotation.y = Math.PI / 2;
          a.group.add(a.heldCat);
        }
      }
      a.label.material.opacity = to.state.connected ? 1 : 0.5;
      if (a.cup) a.cup.visible = !!to.state.carriedOrderId;

      if (id === this.selfId)
        this.target.lerp(
          this.area === "town"
            ? new THREE.Vector3(a.group.position.x, 0, a.group.position.z)
            : new THREE.Vector3(
                roomToTown(
                  {
                    x: 1 - (this.cafe?.level ?? 1),
                    z: 1 - (this.cafe?.level ?? 1),
                  },
                  this.anchorLot,
                ).x,
                0,
                roomToTown(
                  {
                    x: 1 - (this.cafe?.level ?? 1),
                    z: 1 - (this.cafe?.level ?? 1),
                  },
                  this.anchorLot,
                ).z,
              ),
          1 - Math.exp(-deltaDraw * 8),
        );
    }
    const cameraZoom =
      this.zoom *
      (this.area === "town"
        ? 1
        : ROOM_SCALE * Math.max(1, 1 / this.camera.aspect));
    this.renderedZoom = THREE.MathUtils.lerp(
      this.renderedZoom,
      cameraZoom,
      1 - Math.exp(-deltaDraw * 8),
    );
    const cameraAngle =
      this.angle +
      (this.area === "town" ? 0 : roomOrigin(this.anchorLot).rotation);
    this.camera.position.set(
      this.target.x + Math.sin(cameraAngle) * this.renderedZoom,
      this.renderedZoom * 0.95,
      this.target.z + Math.cos(cameraAngle) * this.renderedZoom,
    );
    this.camera.lookAt(this.target);
    for (const [i, steam] of this.steam.entries()) {
      steam.visible = this.brewing;
      steam.position.y = 0.88 + ((now * 0.0006 + i * 0.25) % 1) * 0.4;
    }
    this.renderer.render(this.scene, this.camera);
    // Read-only screen coordinates let pointer tests target rendered objects without bypassing game logic.
    if (import.meta.env.DEV && this.area !== "town") {
      const focus = roomToTown(
        { x: 1 - (this.cafe?.level ?? 1), z: 1 - (this.cafe?.level ?? 1) },
        this.anchorLot,
      );
      this.renderer.domElement.dataset.cameraSettled = String(
        Math.hypot(this.target.x - focus.x, this.target.z - focus.z) < 0.03 &&
          Math.abs(this.renderedZoom - cameraZoom) < 0.03,
      );
      const project = (x: number, y: number, z: number) => {
        const p = new THREE.Vector3(x, y, z)
          .applyMatrix4(this.environment.matrixWorld)
          .project(this.camera);
        return {
          x: ((p.x + 1) / 2) * this.renderer.domElement.clientWidth,
          y: ((1 - p.y) / 2) * this.renderer.domElement.clientHeight,
        };
      };
      this.renderer.domElement.dataset.machine = JSON.stringify(
        project(-3.5, 1.95, -3.4),
      );
      this.renderer.domElement.dataset.poses = JSON.stringify(
        [...this.avatars].map(([id, a]) => ({
          id,
          x: a.group.position.x,
          z: a.group.position.z,
          leg: a.human?.legs[0].upper.rotation.x,
          heldCat: a.heldCatId,
          sitting: a.samples.at(-1)?.state.sitting?.id,
        })),
      );
      this.renderer.domElement.dataset.floor = JSON.stringify(
        [
          { x: -4, z: 1 },
          { x: 1.5, z: 2.5 },
          { x: 0, z: 4 },
        ].map((p) => ({ ...p, screen: project(p.x, 0.02, p.z) })),
      );
      this.renderer.domElement.dataset.chairs = JSON.stringify(
        (this.cafe?.layout ?? DEFAULT_FURNITURE)
          .filter((f) => f.kind === "dining" && f.placed !== false)
          .flatMap((f) =>
            ["front", "back"].map((which) => {
              const p = chair(
                this.cafe?.layout ?? DEFAULT_FURNITURE,
                `${f.id}:${which}`,
              )!;
              return { id: `${f.id}:${which}`, ...project(p.x, 1.16, p.z) };
            }),
          ),
      );
      this.renderer.domElement.dataset.cats = JSON.stringify(
        [...this.cats].map(([id, g]) => ({
          id,
          ...project(
            g.position.x,
            g.position.y + 0.6 * g.scale.y,
            g.position.z + 0.05,
          ),
        })),
      );
      this.renderer.domElement.dataset.furniture = JSON.stringify(
        [...this.furniture].map(([id, g]) => ({
          id,
          ...project(g.position.x, 0.8, g.position.z),
        })),
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
    this.clearEnvironment();
    disposeCatResources();
    disposeAssets();
    disposeHumans();
    this.previewMaterial.dispose();
    this.hitMaterial.dispose();
    this.cylinder.dispose();
    this.torus.dispose();
    this.box.dispose();
    this.ball.dispose();
    for (const m of this.materials.values()) m.dispose();
    this.renderer.dispose();
    c.remove();
  }
}
