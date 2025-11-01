import { RawData, WebSocket, WebSocketServer } from "ws";
import { TypedRequest } from "./Request";
import { DeviceClient, DeviceInfo } from "@common/types";

type WrappedSocket = {
  info: DeviceInfo;
  session_id: string;
  socket: WebSocket;
};

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
    [K in ClientEvent]: (ws: WrappedSocket, data: ClientData[K]) => void;
  }> = {};

  #clients = {
    //by_ip_address: new Map<string, Map<string, WebSocket>>(),
    by_user_id: new Map<number, Map<string, WrappedSocket>>(),
  };

  constructor() {
    this.wss.on("connection", this.#onConnection.bind(this));
  }

  public emit<E extends ServerEvent>(
    event: E,
    ws: WrappedSocket,
    data: ServerData[E],
  ) {
    ws.socket.send(JSON.stringify({ event, data }));
  }

  public on<E extends ClientEvent>(
    event: E,
    handler: (ws: WrappedSocket, data: ClientData[E]) => void,
  ) {
    this.#handlers[event] = handler;
  }

  public identify(ws: WrappedSocket, data: DeviceInfo) {
    ws.info.browser = data.browser ?? ws.info.browser;
    ws.info.os = data.os ?? ws.info.os;
    ws.info.type = data.type ?? ws.info.type;
  }

  public getClients = (
    user_id: number,
    session_id: string,
  ): Array<DeviceClient> => {
    const clients = Array.from(
      this.#clients.by_user_id.get(user_id)?.entries() ?? [],
    );

    return clients?.map(([key, { info }]) => ({
      user_id,
      session_id: key,
      displayAs:
        `${info.type} ${info.browser} on ${info.os}` +
        (session_id === key ? ` (this device)` : ""),
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
        existing_connection.socket.terminate();
      }
    } else {
      connections_by_user = new Map();
      this.#clients.by_user_id.set(user.id, connections_by_user);
    }

    const wrapped_socket: WrappedSocket = {
      info: { type: "pending", browser: "pending", os: "pending" },
      session_id,
      socket: ws,
    };

    connections_by_user.set(session_id, wrapped_socket);

    ws.on("error", console.error);
    ws.on("message", this.#onMessage(wrapped_socket).bind(this));
  }

  #onMessage =
    (client: WrappedSocket) =>
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
