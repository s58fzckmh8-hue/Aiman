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
};
export type PublicState = {
  type: "state";
  tick: number;
  time: number;
  connected: number;
  players: PlayerState[];
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
  | Welcome
  | { type: "error"; code: string; message: string };
export const PROTOCOL_VERSION = 1;
