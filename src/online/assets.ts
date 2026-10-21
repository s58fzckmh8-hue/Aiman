import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
const cache = new Map<string, Promise<GLTF>>();
/** Files are bundled locally; provenance and hashes live in public/assets/manifest.json. */
export async function model(
  name: string,
  size: { height: number; width?: number; depth?: number },
) {
  let pending = cache.get(name);
  if (!pending) {
    pending = new GLTFLoader().loadAsync(
      `${import.meta.env.BASE_URL}assets/${name}.glb`,
    );
    cache.set(name, pending);
  }
  const gltf = await pending;
  const object = clone(gltf.scene);
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object),
    extent = box.getSize(new THREE.Vector3()),
    center = box.getCenter(new THREE.Vector3());
  const group = new THREE.Group();
  group.add(object);
  object.position.set(-center.x, -box.min.y, -center.z);
  const scale = size.height / Math.max(0.001, extent.y);
  group.scale.set(
    size.width ? size.width / extent.x : scale,
    scale,
    size.depth ? size.depth / extent.z : scale,
  );
  object.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return { group, object, animations: gltf.animations };
}
export function disposeAssets() {
  for (const pending of cache.values())
    void pending
      .then((g) =>
        g.scene.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry.dispose();
            const materials = Array.isArray(o.material)
              ? o.material
              : [o.material];
            for (const m of materials) {
              for (const v of Object.values(m))
                if (v instanceof THREE.Texture) v.dispose();
              m.dispose();
            }
          }
        }),
      )
      .catch(() => {});
  cache.clear();
}
