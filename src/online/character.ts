import * as THREE from "three";
import { seed } from "../../shared/experience.ts";
import { characterModel } from "./assets.ts";
const sphere = new THREE.SphereGeometry(1, 12, 10);
const materials = new Map<number, THREE.MeshStandardMaterial>();
const material = (color: number) => {
  let m = materials.get(color);
  if (!m)
    materials.set(
      color,
      (m = new THREE.MeshStandardMaterial({ color, roughness: 0.86 })),
    );
  return m;
};
type Imported = Awaited<ReturnType<typeof characterModel>> & {
  active: string;
  upper: THREE.Object3D[];
  lower: THREE.Object3D[];
  feet: THREE.Object3D[];
  arms: THREE.Object3D[];
  forearms: THREE.Object3D[];
  materials: THREE.Material[];
};
export type Human = {
  root: THREE.Group;
  head: THREE.Group;
  eyes: THREE.Mesh[];
  legs: { upper: THREE.Group; lower: THREE.Group }[];
  arms: THREE.Group[];
  phase: number;
  barista: boolean;
  external?: Imported;
  disposed?: boolean;
  lastTime?: number;
};
/** CC0 Quaternius civilians with an original lightweight fallback during loading. */
export function human(
  id: string,
  barista = false,
  shirtOverride?: number,
  onLoad?: (name: string) => void,
): Human {
  const n = seed(id),
    root = new THREE.Group(),
    head = new THREE.Group();
  const skin = [0xe6bc99, 0xc68e6d, 0x9b6448, 0xf0cdb1, 0xbf8a69][n % 5];
  const hair = [0x48362d, 0x734c36, 0x302e30, 0xc09258, 0x6d4d42][
    (n >>> 3) % 5
  ];
  const shirt =
    shirtOverride ??
    [0xa57b73, 0x76928b, 0xbfa064, 0x7d819a, 0x94a177, 0xb38763][(n >>> 5) % 6];
  const mesh = (
    parent: THREE.Object3D,
    color: number,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    geo: THREE.BufferGeometry = sphere,
  ) => {
    const m = new THREE.Mesh(geo, material(color));
    m.layers.set(1);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  mesh(root, shirt, 0, 1.06, 0, 0.38, 0.37, 0.23);
  mesh(root, skin, 0, 1.37, 0, 0.11, 0.13, 0.12);
  root.add(head);
  head.position.y = 1.62;
  mesh(head, skin, 0, 0, 0, 0.29, 0.32, 0.26);
  mesh(head, hair, 0, 0.17, -0.045, 0.3, 0.2, 0.255);
  if (n % 3 === 0) {
    mesh(head, hair, -0.26, -0.01, -0.06, 0.09, 0.25, 0.18);
    mesh(head, hair, 0.26, -0.01, -0.06, 0.09, 0.25, 0.18);
  } else if (n % 3 === 1)
    for (let i = 0; i < 5; i++)
      mesh(
        head,
        hair,
        -0.22 + i * 0.105,
        0.22 + Math.sin(i) * 0.03,
        0.08,
        0.1,
        0.12,
        0.16,
      );
  else mesh(head, hair, 0.11, 0.24, 0.08, 0.23, 0.11, 0.22);
  for (const x of [-0.29, 0.29])
    mesh(head, skin, x, -0.02, 0, 0.06, 0.095, 0.07);
  const eyes: THREE.Mesh[] = [];
  for (const x of [-0.1, 0.1]) {
    eyes.push(mesh(head, 0x352e2a, x, 0.005, 0.249, 0.025, 0.038, 0.018));
    mesh(head, 0xf8eee0, x - 0.007, 0.019, 0.265, 0.008, 0.012, 0.005);
    mesh(head, hair, x, 0.085, 0.239, 0.05, 0.014, 0.018);
    mesh(head, 0xd99887, x * 1.65, -0.08, 0.215, 0.055, 0.026, 0.012);
  }
  mesh(head, skin, 0, -0.045, 0.263, 0.035, 0.045, 0.035);
  mesh(head, 0x9d6254, 0, -0.127, 0.238, 0.045, 0.012, 0.015);
  const legs: { upper: THREE.Group; lower: THREE.Group }[] = [],
    arms: THREE.Group[] = [];
  for (const x of [-0.155, 0.155]) {
    const upper = new THREE.Group();
    upper.position.set(x, 0.82, 0);
    root.add(upper);
    mesh(upper, 0x4b5558, 0, -0.19, 0, 0.115, 0.21, 0.125);
    const lower = new THREE.Group();
    lower.position.y = -0.38;
    upper.add(lower);
    mesh(lower, 0x4b5558, 0, -0.16, 0, 0.1, 0.19, 0.105);
    mesh(lower, 0xeee6d7, 0, -0.35, 0.065, 0.13, 0.075, 0.2);
    legs.push({ upper, lower });
  }
  for (const x of [-0.36, 0.36]) {
    const arm = new THREE.Group();
    arm.position.set(x, 1.26, 0);
    root.add(arm);
    mesh(arm, shirt, 0, -0.115, 0, 0.115, 0.17, 0.13);
    mesh(arm, skin, 0, -0.34, 0, 0.082, 0.19, 0.085);
    mesh(arm, skin, 0, -0.51, 0.01, 0.085, 0.09, 0.08);
    arms.push(arm);
  }
  if (barista) {
    mesh(root, 0xe8d8b9, 0, 0.96, 0.205, 0.29, 0.29, 0.045);
    mesh(root, 0xcfb98f, 0.08, 0.9, 0.25, 0.11, 0.075, 0.015);
    mesh(root, 0x577c65, 0, 1.35, 0.13, 0.2, 0.035, 0.16);
  } else if (n % 2 === 0) {
    mesh(root, 0x9d7957, -0.27, 0.86, 0.13, 0.11, 0.17, 0.16);
    mesh(root, 0x7d664b, -0.28, 1.08, 0.17, 0.025, 0.26, 0.018);
  }
  const person: Human = {
    root,
    head,
    eyes,
    legs,
    arms,
    phase: (n % 1000) / 100,
    barista,
  };
  const modelName = [
    "npc_male_casual",
    "npc_female_casual",
    "npc_male_hoodie",
    "npc_female_formal",
  ][n % 4];
  void characterModel(modelName)
    .then((asset) => {
      if (person.disposed) {
        asset.mixer.stopAllAction();
        asset.mixer.uncacheRoot(asset.object);
        return;
      }
      const materials: THREE.Material[] = [];
      // Quaternius faces -Z; game actors and chair headings use +Z.
      asset.holder.rotation.y = Math.PI;
      asset.object.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.layers.set(1);
          o.castShadow = true;
          o.receiveShadow = true;
          const tint = (original: THREE.Material) => {
            const m = original.clone();
            materials.push(m);
            if (m instanceof THREE.MeshStandardMaterial) {
              m.roughness = 0.85;
              if (/^(Red_Dark|Orange|White)$/.test(m.name))
                m.color.setHex(shirt);
              if (/^Skin/.test(m.name)) m.color.setHex(skin);
              if (/Hair|Eyebrow/.test(m.name)) m.color.setHex(hair);
            }
            return m;
          };
          o.material = Array.isArray(o.material)
            ? o.material.map(tint)
            : tint(o.material);
        }
      });
      const find = (names: string[]) =>
        names
          .map(
            (name) =>
              asset.object.getObjectByName(name.replaceAll(".", "")) ??
              asset.object.getObjectByName(name),
          )
          .filter((b): b is THREE.Object3D => !!b);
      person.external = {
        ...asset,
        active: "",
        upper: find(["UpperLeg.L", "UpperLeg.R"]),
        lower: find(["LowerLeg.L", "LowerLeg.R"]),
        feet: find(["Foot.L", "Foot.R"]),
        arms: find(["UpperArm.L", "UpperArm.R"]),
        forearms: find(["LowerArm.L", "LowerArm.R"]),
        materials,
      };
      for (const child of root.children) child.visible = false;
      root.add(asset.holder);
      onLoad?.(modelName);
    })
    .catch(() => {
      root.userData.artFallback = true;
    });
  return person;
}
export function animateHuman(
  h: Human,
  time: number,
  moving: boolean,
  sitting = false,
  carrying = false,
  working = false,
  look = 0,
) {
  const gait = moving ? Math.sin(time * 0.009 + h.phase) : 0;
  h.root.position.y = sitting
    ? -0.22
    : moving
      ? Math.abs(gait) * 0.035
      : Math.sin(time * 0.0015 + h.phase) * 0.008;
  h.legs.forEach((leg, i) => {
    leg.upper.rotation.x = sitting ? -Math.PI / 2 : gait * (i ? -0.48 : 0.48);
    leg.lower.rotation.x = sitting
      ? Math.PI / 2
      : Math.max(0, -gait * (i ? -1 : 1)) * 0.3;
  });
  h.arms.forEach((arm, i) => {
    arm.rotation.x = carrying
      ? -1.04
      : working
        ? -0.8 + Math.sin(time * 0.014) * 0.08
        : sitting
          ? -0.5
          : gait * (i ? 0.38 : -0.38);
    arm.rotation.z = carrying
      ? i
        ? 0.23
        : -0.23
      : working
        ? i
          ? 0.1
          : -0.1
        : i
          ? -0.06
          : 0.06;
  });
  h.head.rotation.y =
    THREE.MathUtils.clamp(look, -0.45, 0.45) +
    Math.sin(time * 0.0007 + h.phase) * 0.035;
  const blink = (time + h.phase * 500) % 4300 < 110;
  for (const eye of h.eyes) eye.scale.y = blink ? 0.005 : 0.038;
  if (h.external) {
    const e = h.external,
      role = moving ? "Walk" : working ? "Interact" : "Idle_Neutral";
    if (e.active !== role) {
      const next =
        e.animations.find((a) => a.name === role) ??
        e.animations.find((a) => a.name === "Idle")!;
      e.mixer.stopAllAction();
      e.mixer.clipAction(next).reset().play();
      e.active = role;
    }
    e.mixer.update(
      h.lastTime === undefined
        ? 0
        : Math.min(0.15, Math.max(0, (time - h.lastTime) / 1000)),
    );
    h.root.position.y = sitting ? -0.24 : 0;
    e.object.updateMatrixWorld(true);
    const bend = (bone: THREE.Object3D, angle: number) => {
      const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(
        h.root.getWorldQuaternion(new THREE.Quaternion()),
      );
      if (bone.parent)
        axis.applyQuaternion(
          bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert(),
        );
      bone.quaternion.premultiply(
        new THREE.Quaternion().setFromAxisAngle(axis, angle),
      );
      bone.updateMatrixWorld(true);
    };
    if (sitting) {
      // This Quaternius rig uses separate foot controllers under Root.
      const offsets = e.feet.map((foot, i) =>
        foot
          .getWorldPosition(new THREE.Vector3())
          .sub(e.lower[i].getWorldPosition(new THREE.Vector3())),
      );
      e.upper.forEach((b) => bend(b, -Math.PI / 2));
      e.lower.forEach((b) => bend(b, Math.PI / 2));
      e.feet.forEach((foot, i) => {
        const position = e.lower[i]
          .getWorldPosition(new THREE.Vector3())
          .add(offsets[i]);
        foot.position.copy(
          foot.parent ? foot.parent.worldToLocal(position) : position,
        );
        foot.updateMatrixWorld(true);
      });
    }
    if (carrying) {
      e.arms.forEach((b) => bend(b, -0.6));
      e.forearms.forEach((b) => bend(b, -0.7));
    }
  }
  h.lastTime = time;
}
export function disposeHuman(h: Human) {
  h.disposed = true;
  if (h.external) {
    h.external.mixer.stopAllAction();
    h.external.mixer.uncacheRoot(h.external.object);
    for (const m of h.external.materials) m.dispose();
  }
}
export function disposeHumans() {
  sphere.dispose();
  for (const m of materials.values()) m.dispose();
  materials.clear();
}
