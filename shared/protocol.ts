import type { ActionResult, Cafe, CafeView, Property } from "./cafe.ts";
export type PlayerState = {
  id: string;
  sessionId: string;
  name: string;
  lot: number;
  x: number;
  z: number;
  rotation: number;
  moving: boolean;
  connected: boolean;
  color: number;
  area?: string;
};
export type PublicState = {
  type: "state";
  tick: number;
  time: number;
  connected: number;
  players: PlayerState[];
  properties?: Property[];
  cafe?: CafeView;
};
export type Welcome = {
  type: "welcome";
  self: PlayerState;
  town: string;
  capacity: number;
  reconnectMs: number;
  resumed: boolean;
};
export type ServerMessage =
  | PublicState
  | ActionResult
  | { type: "personal"; cafe: Cafe }
  | Welcome
  | { type: "error"; code: string; message: string };
export const PROTOCOL_VERSION = 1;
