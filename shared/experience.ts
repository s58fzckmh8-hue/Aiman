import type { Cafe, Order } from "./cafe.ts";

export const RECIPES = [
  {
    id: "black",
    name: "Black coffee",
    unlock: 0,
    brewMs: 4000,
    bonus: 0,
    color: 0x634331,
  },
  {
    id: "latte",
    name: "Oat latte",
    unlock: 3,
    brewMs: 5000,
    bonus: 8,
    color: 0xc69b70,
  },
  {
    id: "mocha",
    name: "Cocoa mocha",
    unlock: 8,
    brewMs: 6000,
    bonus: 15,
    color: 0x976847,
  },
] as const;
export type RecipeId = (typeof RECIPES)[number]["id"];
export const recipe = (id: string = "black") =>
  RECIPES.find((r) => r.id === id) ?? RECIPES[0];
export function seed(text: string) {
  let n = 2166136261;
  for (const c of text) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}
const PEOPLE = [
  {
    name: "Amelia",
    style: "bookworm",
    greeting: "A quiet corner and a coffee, please.",
    thanks: "Just what I needed. Thank you!",
  },
  {
    name: "Jules",
    style: "creative",
    greeting: "Your café has such a lovely feeling.",
    thanks: "This is going in my sketchbook.",
  },
  {
    name: "Hana",
    style: "cat lover",
    greeting: "Is that little cat always this curious?",
    thanks: "Coffee and cats. Perfect afternoon.",
  },
  {
    name: "Theo",
    style: "commuter",
    greeting: "A little pick-me-up before I go.",
    thanks: "Ahh, that's better. See you again!",
  },
  {
    name: "Maya",
    style: "gardener",
    greeting: "It smells wonderful in here.",
    thanks: "Lovely. I'll tell my friends.",
  },
  {
    name: "Oliver",
    style: "regular",
    greeting: "My favourite little stop in town.",
    thanks: "You always make me feel welcome.",
  },
] as const;
export const customerProfile = (id: string) => PEOPLE[seed(id) % PEOPLE.length];
export const patience = (o: Order, now: number) =>
  Math.max(0, Math.min(1, 1 - (now - o.createdAt) / 60000));
export const GOALS = [
  {
    id: "first-three",
    title: "Your first regulars",
    description: "Serve 3 customers",
    target: 3,
    reward: 40,
    progress: (c: Cafe) => c.served,
  },
  {
    id: "happy-cat",
    title: "A home full of purrs",
    description: "Raise a cat's happiness to 100%",
    target: 100,
    reward: 25,
    progress: (c: Cafe) => Math.max(...c.cats.map((cat) => cat.happiness), 0),
  },
  {
    id: "cozy-corner",
    title: "Make it your own",
    description: "Decorate your café to level 2",
    target: 2,
    reward: 35,
    progress: (c: Cafe) => c.level,
  },
  {
    id: "cat-family",
    title: "Room for one more",
    description: "Adopt your second cat",
    target: 2,
    reward: 50,
    progress: (c: Cafe) => c.cats.length,
  },
  {
    id: "ten-coffees",
    title: "The neighbourhood favourite",
    description: "Serve 10 customers",
    target: 10,
    reward: 100,
    progress: (c: Cafe) => c.served,
  },
] as const;
export type CatActivity =
  | "watching"
  | "walking"
  | "sleeping"
  | "grooming"
  | "purring"
  | "eating"
  | "climbing"
  | "carried"
  | "playing";
export type CatPose = {
  id: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  activity: CatActivity;
  until: number;
};
export type Shift = {
  startedAt: number;
  served: number;
  earned: number;
  missed: number;
  endedAt?: number;
};
export type CafeEvent = {
  id: string;
  at: number;
  message: string;
  kind: "arrival" | "payment" | "left" | "care";
  amount?: number;
};
