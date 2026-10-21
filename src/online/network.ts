import type { Action, ActionResult, Cafe } from "../../shared/cafe.ts";
import type {
  PublicState,
  ServerMessage,
  Welcome,
} from "../../shared/protocol.ts";
export type Connection =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "unavailable"
  | "replaced";
export class Network {
  private socket: WebSocket | null = null;
  private retry: ReturnType<typeof setTimeout> | undefined;
  private attempts = 0;
  private sequence = 0;
  private stopped = true;
  private connecting = false;
  state: Connection = "idle";
  selfId = "";
  constructor(
    private callbacks: {
      status: (s: Connection, message: string) => void;
      welcome: (w: Welcome) => void;
      snapshot: (s: PublicState) => void;
      personal?: (cafe: Cafe) => void;
      result?: (result: ActionResult) => void;
    },
  ) {}
  private status(s: Connection, message: string) {
    this.state = s;
    this.callbacks.status(s, message);
  }
  async start() {
    if (this.connecting || this.state === "connected") return;
    this.stopped = false;
    clearTimeout(this.retry);
    this.attempts = 0;
    await this.connect();
  }
  private async connect() {
    if (this.stopped || this.connecting) return;
    this.connecting = true;
    this.status(
      this.selfId ? "reconnecting" : "connecting",
      this.selfId
        ? "Connection Interrupted. Attempting to Reconnect..."
        : "Connecting to Town...",
    );
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        credentials: "same-origin",
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw Error("Session unavailable");
      const identity = await response.json();
      this.selfId = identity.id;
      if (this.stopped) return;
      const ws = new WebSocket(
        `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`,
      );
      this.socket = ws;
      this.sequence = 0;
      const timeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) ws.close();
      }, 8000);
      ws.onmessage = (event) => {
        if (this.socket !== ws) return;
        let msg: ServerMessage;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }
        if (msg.type === "welcome") {
          clearTimeout(timeout);
          this.attempts = 0;
          this.status(
            "connected",
            msg.resumed ? "Connection Restored." : "Connected Successfully!",
          );
          this.callbacks.welcome(msg);
        }
        if (msg.type === "state") this.callbacks.snapshot(msg);
        if (msg.type === "personal") this.callbacks.personal?.(msg.cafe);
        if (msg.type === "result") this.callbacks.result?.(msg);
        if (msg.type === "error") {
          if (msg.code === "REPLACED" || msg.code === "FULL") {
            this.stopped = true;
            this.status(
              msg.code === "REPLACED" ? "replaced" : "unavailable",
              msg.message,
            );
          } else this.status("unavailable", msg.message);
        }
      };
      ws.onclose = () => {
        clearTimeout(timeout);
        if (this.socket !== ws) return;
        this.socket = null;
        if (!this.stopped) this.schedule();
      };
      ws.onerror = () => {};
    } catch {
      if (!this.stopped) this.schedule();
    } finally {
      this.connecting = false;
    }
  }
  private schedule() {
    this.status(
      "reconnecting",
      "Connection Interrupted. Attempting to Reconnect...",
    );
    clearTimeout(this.retry);
    if (this.attempts++ >= 8) {
      this.status(
        "unavailable",
        "Unable to Join This Town. Check your connection and try again.",
      );
      return;
    }
    this.retry = setTimeout(
      () => void this.connect(),
      Math.min(500 * 2 ** (this.attempts - 1), 4000),
    );
  }
  input(x: number, z: number) {
    if (
      this.state === "connected" &&
      this.socket?.readyState === WebSocket.OPEN
    )
      this.socket.send(
        JSON.stringify({ type: "input", seq: this.sequence++, x, z }),
      );
  }
  action(action: Action["action"], target?: string) {
    if (
      this.state !== "connected" ||
      this.socket?.readyState !== WebSocket.OPEN
    )
      return;
    const requestId = crypto.randomUUID();
    this.socket.send(
      JSON.stringify({
        type: "action",
        action,
        requestId,
        ...(target ? { target } : {}),
      }),
    );
    return requestId;
  }
  work(id: string, phase: "pulse" | "stop") {
    if (
      this.state === "connected" &&
      this.socket?.readyState === WebSocket.OPEN
    )
      this.socket.send(JSON.stringify({ type: "work", id, phase }));
  }
  stop() {
    this.stopped = true;
    clearTimeout(this.retry);
    this.socket?.close();
    this.socket = null;
  }
}
