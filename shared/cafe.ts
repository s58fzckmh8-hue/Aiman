export const ROOM = { minX: -6, maxX: 6, minZ: -5, maxZ: 5 };
export const ROOM_OBSTACLES = [
  { x: -3.5, z: -3.8, w: 3.8, d: 1.5 },
  { x: -1.6, z: 0.3, w: 1.6, d: 1.5 },
  { x: 1.3, z: 0.3, w: 1.6, d: 1.5 },
  ...[-1.6, 1.3].flatMap((x) =>
    [-0.85, 1.35].map((z) => ({ x, z, w: 0.7, d: 0.7 })),
  ),
  { x: 4, z: -2.5, w: 1.7, d: 1.4 },
  { x: 5, z: -0.8, w: 0.3, d: 0.3 },
  { x: 4.8, z: 2, w: 0.5, d: 0.5 },
];
export const STATION = { x: -3.5, z: -2.2 };
export const TABLES = [
  { x: -1.6, z: 1.8 },
  { x: 1.3, z: 1.8 },
];
export const SERVICE_POINTS = TABLES.map((t) => ({ x: t.x, z: 2.8 }));
export const ENTRY = { x: 0, z: 4 };
export const CATALOG = {
  beans: { price: 40, quantity: 10 },
  food: { price: 15, quantity: 3 },
  decor: { price: 80, quantity: 1 },
  adopt: { price: 100, quantity: 1 },
} as const;
export type OrderStatus =
  | "WAITING"
  | "PREPARING"
  | "READY"
  | "CARRIED"
  | "DRINKING"
  | "PAID"
  | "CANCELLED";
export type Order = {
  id: string;
  cafeId: string;
  seat: number;
  status: OrderStatus;
  createdAt: number;
  readyAt: number;
  paidAt: number;
  consumed: number;
};
export type Cat = {
  id: string;
  name: string;
  coat: number;
  happiness: number;
  ownerId: string;
};
export type Cafe = {
  id: string;
  ownerId: string;
  coins: number;
  beans: number;
  food: number;
  level: number;
  served: number;
  revenue: number;
  visitors: boolean;
  cats: Cat[];
};
export type CafeView = {
  id: string;
  ownerId: string;
  ownerName: string;
  open: boolean;
  visitors: boolean;
  level: number;
  cats: Cat[];
  orders: Order[];
};
export type Property = {
  cafeId: string;
  ownerId: string;
  name: string;
  lot: number;
  visitors: boolean;
  open: boolean;
};
export type Action = {
  type: "action";
  requestId: string;
  action:
    | "walk"
    | "approach"
    | "workStart"
    | "pickup"
    | "walkHome"
    | "visit"
    | "enter"
    | "exit"
    | "open"
    | "close"
    | "privacy"
    | "prepare"
    | "serve"
    | "beans"
    | "food"
    | "decor"
    | "adopt"
    | "feed"
    | "pet";
  target?: string;
};
export type ActionResult = {
  type: "result";
  requestId: string;
  ok: boolean;
  pending?: boolean;
  message: string;
};
