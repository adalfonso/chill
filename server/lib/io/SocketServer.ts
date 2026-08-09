import { RawData, WebSocket, WebSocketServer } from "ws";
import { Request } from "express";

import { DeviceClient, DeviceInfo } from "@common/types";
import { DeviceConnect } from "./DeviceConnect";

interface ExtWebSocket extends WebSocket {
  user_id: number;
  session_id: string;
  login_session_id: number;
  device_info: DeviceInfo;
  is_alive: boolean;
}

const CLEANUP_INTERVAL_MS = 30_000;

const PING_INTERVAL_MS = 5_000;

/**
 * Websocket server for BE
 */
export class SocketServer<
  ClientEvent extends string,
  ClientData extends Record<ClientEvent, unknown>,
  ServerEvent extends string,
  ServerData extends Record<ServerEvent, unknown>,
> {
  readonly wss = new WebSocketServer({ noServer: true, path: "/ws" });

  #handlers: Partial<{
    [K in ClientEvent]: (ws: ExtWebSocket, data: ClientData[K]) => void;
  }> = {};

  #pingFn: (ws: ExtWebSocket) => void = () => {};

  public connector = new DeviceConnect();

  constructor() {
    this.wss.on("connection", this.#onConnection.bind(this));

    // Cleanup interval
    setInterval(() => {
      (this.wss.clients as Set<ExtWebSocket>).forEach((ws) => {
        if (!ws.is_alive) {
          console.info(`Dropping stale socket ${ws.user_id}, ${ws.session_id}`);
          return ws.terminate();
        }

        // Set false for next cleanup cycle
        ws.is_alive = false;
      });
    }, CLEANUP_INTERVAL_MS);

    // Ping interval
    setInterval(() => {
      (this.wss.clients as Set<ExtWebSocket>).forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          this.#pingFn(ws);
        }
      });
    }, PING_INTERVAL_MS);
  }

  public emit<E extends ServerEvent>(
    event: E,
    ws: ExtWebSocket,
    ...[data]: ServerData[E] extends undefined ? [] : [ServerData[E]]
  ) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event, data }));
    }
  }

  public on<E extends ClientEvent>(
    event: E,
    handler: (ws: ExtWebSocket, data: ClientData[E]) => void,
  ) {
    this.#handlers[event] = handler;
  }

  /**
   * Designate a function that causes a ping
   *
   * @param fn  ping fn
   */
  public onPing(fn: (ws: ExtWebSocket) => void) {
    this.#pingFn = fn;
  }

  /**
   * Drop a websocket connection
   *
   * @param session_id - device session id
   */
  public drop(session_id: string) {
    this.getClientBySessionId(session_id)?.terminate();
  }

  /**
   * Drop every websocket connection held by one login session
   *
   * Revocation has no next request to check on a live socket, so it has to
   * push the drop instead. `getClientBySessionId` only returns the first
   * match keyed on the unrelated device session, which undercounts here --
   * a login session can hold more than one live socket (ADR-0009 U6).
   *
   * @param login_session_id - the login session being revoked
   */
  public dropByLoginSession(login_session_id: number) {
    (this.wss.clients as Set<ExtWebSocket>).forEach((client) => {
      if (client.login_session_id === login_session_id) {
        client.terminate();
      }
    });
  }

  public identify(ws: ExtWebSocket, data: DeviceInfo) {
    ws.device_info.browser = data.browser ?? ws.device_info.browser;
    ws.device_info.os = data.os ?? ws.device_info.os;
    ws.device_info.type = data.type ?? ws.device_info.type;
    ws.device_info.device_name = data.device_name ?? ws.device_info.device_name;
  }

  public getClientBySessionId(session_id: string) {
    for (const client of this.wss.clients as Set<ExtWebSocket>) {
      if (client.session_id === session_id) return client;
    }

    return null;
  }

  public getClientsByUserId(user_id: number) {
    return (this.wss.clients as Set<ExtWebSocket>)
      .values()
      .filter((client) => client.user_id === user_id)
      .toArray();
  }

  public getClientDevicesByUserId = (
    user_id: number,
    session_id: string,
  ): Array<DeviceClient> => {
    const clients = this.getClientsByUserId(user_id);

    // Dedup by session_id
    const deduped = new Map<string, ExtWebSocket>();

    for (const client of clients) {
      if (!deduped.has(client.session_id)) {
        deduped.set(client.session_id, client);
      }
    }

    return deduped
      .values()
      .toArray()
      .map((client) => ({
        user_id: client.user_id,
        session_id: client.session_id,
        is_this_device: session_id === client.session_id,
        device_name: client.device_info.device_name,
        displayAs: `${client.device_info.type} ${client.device_info.browser} on ${client.device_info.os}`,
      }));
  };

  #onConnection(ws: ExtWebSocket, req: Request) {
    const { id, session_id, login_session_id } = req._user;

    ws.user_id = id;
    ws.session_id = session_id;
    ws.login_session_id = login_session_id;
    ws.device_info = {
      type: "pending",
      browser: "pending",
      os: "pending",
      device_name: "",
    };
    ws.is_alive = true;

    ws.on("pong", () => {
      ws.is_alive = true;
    });

    ws.on("error", console.error);
    ws.on("message", this.#onMessage(ws).bind(this));
  }

  #onMessage =
    (client: ExtWebSocket) =>
    <E extends ClientEvent>(message: RawData) => {
      console.info("Inbound websocket message: %s", message);
      const { event, data } = JSON.parse(message.toString()) as {
        event: E;
        data: ClientData[E];
      };

      const handler = this.#handlers[event];

      if (handler) {
        return handler(client, data);
      }

      console.error(`Unregistered client event received: ${event}`);
    };
}
