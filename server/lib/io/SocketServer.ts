import { RawData, WebSocket, WebSocketServer } from "ws";
import { TypedRequest } from "./Request";
import { DeviceClient, DeviceInfo } from "@common/types";
import { DeviceConnect } from "./DeviceConnect";

type WrappedSocket = {
  device_info: DeviceInfo;
  session_id: string;
  socket: WebSocket;
  user_id: number;
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
    all: new Map<string, WrappedSocket>(),
    //by_ip_address: new Map<string, Map<string, WebSocket>>(),
    by_user_id: new Map<number, Map<string, WrappedSocket>>(),
  };

  public connector = new DeviceConnect();

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

  /**
   * Drop a websocket connection
   *
   * @param user_id - user's id
   * @param session_id - device session id
   */
  public drop(user_id: number, session_id: string) {
    const connections_by_user = this.#clients.by_user_id.get(user_id);

    const missing_error = `Tried to drop websocket for user ${user_id}, session: ${session_id} but could not locate socket`;

    if (!connections_by_user) {
      return console.info(missing_error);
    }

    const existing_connection = connections_by_user.get(session_id);

    if (!existing_connection) {
      return console.info(missing_error);
    }

    console.info(
      `Existing websocket connections found for user ${user_id} at session ${session_id}; closing`,
    );

    existing_connection.socket.terminate();
    connections_by_user.delete(session_id);
    this.#clients.all.delete(session_id);

    // If this was the last connection for this user, then drop the grouping
    if (connections_by_user.size === 0) {
      this.#clients.by_user_id.delete(user_id);
    }
  }

  public identify(ws: WrappedSocket, data: DeviceInfo) {
    ws.device_info.browser = data.browser ?? ws.device_info.browser;
    ws.device_info.os = data.os ?? ws.device_info.os;
    ws.device_info.type = data.type ?? ws.device_info.type;
  }

  public getAccessibleClients = (user_id: number): Array<WrappedSocket> => {
    return Array.from(this.#clients.by_user_id.get(user_id)?.values() ?? []);
  };

  public getClientDevicesByUserId = (
    user_id: number,
    session_id: string,
  ): Array<DeviceClient> => {
    return this.getAccessibleClients(user_id).map((client) => ({
      user_id: client.user_id,
      session_id: client.session_id,
      is_this_device: session_id === client.session_id,
      displayAs: `${client.device_info.type} ${client.device_info.browser} on ${client.device_info.os}`,
    }));
  };

  public getClientBySessionId(session_id: string) {
    return this.#clients.all.get(session_id);
  }

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
      device_info: { type: "pending", browser: "pending", os: "pending" },
      session_id,
      user_id: user.id,
      socket: ws,
    };

    connections_by_user.set(session_id, wrapped_socket);
    this.#clients.all.set(session_id, wrapped_socket);

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
