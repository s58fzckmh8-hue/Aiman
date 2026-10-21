import * as THREE from "three";
import { CAT_DESIGNS } from "../../shared/cat-designs.ts";
const sphere = new THREE.SphereGeometry(1, 16, 12),
  cone = new THREE.ConeGeometry(1, 1, 3),
  materials = new Map<number, THREE.MeshStandardMaterial>();
const mat = (color: number) => {
  let m = materials.get(color);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    materials.set(color, m);
  }
  return m;
};
export function catModel(coat: number) {
  const design = CAT_DESIGNS[coat] ?? CAT_DESIGNS[0],
    g = new THREE.Group();
  g.userData.catDesign = design.name;
  const mesh = (
    color: number,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    geometry: THREE.BufferGeometry = sphere,
  ) => {
    const m = new THREE.Mesh(geometry, mat(color));
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };
  const fluffy = design.fluffy ? 1.16 : 1;
  mesh(design.body, 0, 0.38, 0, 0.33 * fluffy, 0.32, 0.55);
  mesh(design.body, 0, 0.84, 0.38, 0.36 * fluffy, 0.33, 0.32);
  for (const x of [-0.25, 0.25]) {
    const e = mesh(
      design.pattern === "pointed" ? design.patch : design.body,
      x,
      1.16,
      0.34,
      0.18,
      0.3,
      0.16,
      cone,
    );
    e.rotation.y = Math.PI;
    e.rotation.z = x < 0 ? 0.22 : -0.22;
    mesh(0xd99d95, x, 1.16, 0.43, 0.08, 0.15, 0.04, cone);
  }
  if (design.pattern === "tuxedo") {
    mesh(design.patch, 0, 0.48, 0.39, 0.24, 0.26, 0.18);
    mesh(design.patch, 0, 0.7, 0.63, 0.23, 0.14, 0.07);
  }
  if (design.pattern === "pointed")
    mesh(design.patch, 0, 0.84, 0.59, 0.32, 0.26, 0.12);
  for (const x of [-0.16, 0.16]) {
    mesh(0xf3e7d3, x, 0.87, 0.664, 0.13, 0.14, 0.04);
    mesh(design.eyes, x, 0.87, 0.699, 0.075, 0.09, 0.025);
    mesh(0x222b2b, x, 0.87, 0.721, 0.025, 0.065, 0.015);
    mesh(0xffffff, x - 0.02, 0.906, 0.734, 0.021, 0.025, 0.008);
    mesh(
      design.pattern === "pointed" || design.pattern === "tuxedo"
        ? design.patch
        : design.body,
      x,
      0.16,
      0.28,
      0.14,
      0.19,
      0.19,
    );
    mesh(design.body, x, 0.17, -0.26, 0.14, 0.18, 0.18);
  }
  mesh(0xd5948f, 0, 0.739, 0.715, 0.055, 0.035, 0.025);
  mesh(0xf0e1c7, -0.07, 0.7, 0.687, 0.085, 0.055, 0.04);
  mesh(0xf0e1c7, 0.07, 0.7, 0.687, 0.085, 0.055, 0.04);
  const tail = new THREE.Group();
  tail.position.set(0, 0.38, -0.44);
  g.add(tail);
  const tailMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.08, 0.58, 4, 8),
    mat(design.pattern === "pointed" ? design.patch : design.body),
  );
  tailMesh.rotation.x = -0.65;
  tailMesh.position.set(0, 0.26, -0.2);
  tail.add(tailMesh);
  g.userData.tail = tail;
  g.userData.ownedTailGeometry = tailMesh.geometry;
  if (design.pattern === "tabby") {
    for (let i = 0; i < 4; i++) {
      const stripe = mesh(
        design.patch,
        0,
        0.61,
        -0.25 + i * 0.16,
        0.32,
        0.06,
        0.035,
      );
      stripe.rotation.x = -0.2;
    }
    for (const x of [-0.16, 0, 0.16])
      mesh(design.patch, x, 1.078, 0.5, 0.035, 0.055, 0.06);
  }
  if (design.pattern === "calico") {
    mesh(0x53545b, 0.22, 0.58, -0.16, 0.15, 0.15, 0.23);
    mesh(design.patch, -0.2, 0.59, 0.14, 0.17, 0.16, 0.25);
    mesh(design.patch, -0.21, 1, 0.5, 0.16, 0.12, 0.11);
    mesh(0x53545b, 0.25, 0.99, 0.45, 0.14, 0.17, 0.13);
  }
  return g;
}
export function disposeCatModel(g: THREE.Group) {
  (g.userData.ownedTailGeometry as THREE.BufferGeometry | undefined)?.dispose();
}
export function disposeCatResources() {
  sphere.dispose();
  cone.dispose();
  for (const m of materials.values()) m.dispose();
  materials.clear();
}
