export type Furniture = {
  id: string;
  kind: "dining" | "bed" | "tree" | "bowl" | "plant" | "shelf" | "toy" | "sofa";
  x: number;
  z: number;
  rotation: number;
  level: number;
  placed?: boolean;
};
export const FURNITURE_SHOP = [
  { id: "toy", kind: "toy", name: "Play ball & scratching toy", price: 45 },
  { id: "plant", kind: "plant", name: "Little potted cactus", price: 35 },
  { id: "bowl", kind: "bowl", name: "Shared food bowl", price: 25 },
  { id: "bed", kind: "bed", name: "Soft cat bed", price: 80 },
  { id: "tree", kind: "tree", name: "Climbing perch", price: 100 },
  { id: "sofa", kind: "sofa", name: "Cozy two-seat sofa", price: 180 },
  { id: "shelf", kind: "shelf", name: "Decorated bookshelf", price: 120 },
] as const;
export const DEFAULT_FURNITURE: Furniture[] = [
  { id: "table-0", kind: "dining", x: -1.6, z: 0.3, rotation: 0, level: 1 },
  { id: "table-1", kind: "dining", x: 1.3, z: 0.3, rotation: 0, level: 1 },
  { id: "bed", kind: "bed", x: 4, z: -2.5, rotation: 0, level: 1 },
  { id: "tree", kind: "tree", x: 5, z: -0.8, rotation: 0, level: 1 },
  { id: "bowl", kind: "bowl", x: 4.8, z: 2, rotation: 0, level: 1 },
  { id: "plant-left", kind: "plant", x: -5, z: 3.5, rotation: 0, level: 2 },
  { id: "plant-right", kind: "plant", x: 5, z: 3.5, rotation: 0, level: 2 },
  { id: "shelf", kind: "shelf", x: 5.3, z: -3.7, rotation: 0, level: 3 },
];
export function localPoint(f: Furniture, x: number, z: number) {
  const a = (f.rotation * Math.PI) / 2;
  return {
    x: f.x + Math.cos(a) * x + Math.sin(a) * z,
    z: f.z - Math.sin(a) * x + Math.cos(a) * z,
  };
}
export function dining(layout: Furniture[] = DEFAULT_FURNITURE, seat: number) {
  return layout.find((f) => f.id === `table-${seat}`)!;
}
export function servicePoint(
  layout: Furniture[] = DEFAULT_FURNITURE,
  seat: number,
) {
  return localPoint(dining(layout, seat), 0, 2.5);
}
export function chair(layout: Furniture[], id: string) {
  const sofaMatch = /^(.+):([01])$/.exec(id),
    sofa = layout.find(
      (f) => f.kind === "sofa" && f.id === sofaMatch?.[1] && f.placed !== false,
    );
  if (sofa && sofaMatch) {
    const side = Number(sofaMatch[2]);
    return {
      ...localPoint(sofa, side === 0 ? -0.45 : 0.45, 0.05),
      rotation: (sofa.rotation * Math.PI) / 2,
      approach: localPoint(sofa, side === 0 ? -0.45 : 0.45, 1.2),
      table: -1,
      front: false,
    };
  }
  const match = /^(table-[01]):(front|back)$/.exec(id);
  const f = layout.find((f) => f.id === match?.[1]);
  if (!f || !match || f.placed === false) return;
  const front = match[2] === "front";
  return {
    ...localPoint(f, 0, front ? 1.05 : -1.15),
    rotation: (f.rotation * Math.PI) / 2 + (front ? Math.PI : 0),
    approach: localPoint(f, 0, front ? 2.5 : -2.4),
    table: Number(match[1].slice(-1)),
    front,
  };
}
export function footprints(layout: Furniture[] = DEFAULT_FURNITURE, level = 1) {
  const result = [{ id: "counter", x: -3.5, z: -3.8, w: 3.8, d: 1.5 }];
  for (const f of layout.filter(
    (f) => f.level <= level && f.placed !== false,
  )) {
    const add = (x: number, z: number, w: number, d: number) => {
      const p = localPoint(f, x, z),
        rotated = f.rotation % 2 !== 0;
      result.push({ id: f.id, ...p, w: rotated ? d : w, d: rotated ? w : d });
    };
    if (f.kind === "dining") {
      add(0, 0, 1.6, 1.5);
      add(0, -1.15, 0.7, 0.7);
      add(0, 1.05, 0.7, 0.7);
    } else {
      const sizes = {
        bed: [1.7, 1.4],
        tree: [0.3, 0.3],
        bowl: [0.5, 0.5],
        plant: [0.65, 0.65],
        shelf: [0.6, 1.4],
        toy: [0.6, 0.6],
        sofa: [2, 1],
      };
      add(0, 0, ...(sizes[f.kind] as [number, number]));
    }
  }
  return result;
}
export const reputation = (served: number) =>
  Math.floor(Math.sqrt(served / 3)) + 1;
