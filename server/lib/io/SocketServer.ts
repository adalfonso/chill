import { RawData, WebSocket, WebSocketServer } from "ws";
import { TypedRequest } from "./Request";
import { DeviceClient } from "@common/types";

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
    [K in ClientEvent]: (ws: WebSocket, data: ClientData[K]) => void;
  }> = {};

  #clients = {
    //by_ip_address: new Map<string, Map<string, WebSocket>>(),
    by_user_id: new Map<number, Map<string, WebSocket>>(),
  };

  constructor() {
    this.wss.on("connection", this.#onConnection.bind(this));
  }

  public emit<E extends ServerEvent>(
    event: E,
    ws: WebSocket,
    data: ServerData[E],
  ) {
    ws.send(JSON.stringify({ event, data }));
  }

  public on<E extends ClientEvent>(
    event: E,
    handler: (ws: WebSocket, data: ClientData[E]) => void,
  ) {
    this.#handlers[event] = handler;
  }

  public getClients = (
    user_id: number,
    session_id: string,
  ): Array<DeviceClient> => {
    const clients = Array.from(
      this.#clients.by_user_id.get(user_id)?.entries() ?? [],
    );

    return clients?.map(([key, _value]) => ({
      user_id,
      session_id: key,
      displayAs: session_id === key ? `${key} (this device)` : key,
    }));
  };

  #onConnection(ws: WebSocket, req: TypedRequest) {
    const { user, session_id } = req._user;

    let connections_by_user = this.#clients.by_user_id.get(user.id);

    if (connections_by_user) {
      console.info(`Existing websocket connections found for ${user.id}`);
      const existing_connection = connections_by_user.get(session_id);

      if (existing_connection) {
        console.info(
          `Existing websocket connections found for ${user.id} at session ${session_id}`,
        );
        existing_connection.terminate();
      }
    } else {
      connections_by_user = new Map();
      this.#clients.by_user_id.set(user.id, connections_by_user);
    }

    connections_by_user.set(session_id, ws);

    ws.on("error", console.error);

    ws.on("message", this.#onMessage(ws).bind(this));
  }

  #onMessage =
    (client: WebSocket) =>
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
