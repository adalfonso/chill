/**
 * Websocket client for FE
 */
export class SocketClient<
  ClientEvent extends string,
  ClientData extends Record<ClientEvent, unknown>,
  ServerEvent extends string,
  ServerData extends Record<ServerEvent, unknown>,
> {
  #ws: WebSocket;
  #handlers: Partial<{ [K in ServerEvent]: (data: ServerData[K]) => void }> =
    {};

  public readonly ready: Promise<void>;

  constructor() {
    const host = window.location.host;
    const protocol = window.location.protocol === "http:" ? "ws" : "wss";

    this.#ws = new WebSocket(`${protocol}://${host}/ws`);

    this.ready = new Promise((resolve, reject) => {
      const abort_connection = setTimeout(() => {
        console.error("Websocket failed to connect after 5000ms");
        reject();
      }, 5000);

      this.#ws.onopen = (event) => {
        console.info("Connected to websocket", { event });
        resolve();

        clearTimeout(abort_connection);
      };
    });

    this.#ws.addEventListener("message", (message) => {
      console.info("Message received over websocket", message.data);

      const { event, data } = JSON.parse(message.data) ?? {};

      const handler = this.#handlers[event as ServerEvent];

      if (handler) {
        return handler(data);
      }

      console.error(`Unregistered server event received: ${event}`);
    });
  }

  public emit<E extends ClientEvent>(
    event: E,
    ...[data]: ClientData[E] extends undefined ? [] : [ClientData[E]]
  ) {
    this.instance().send(JSON.stringify({ event, data }));
  }

  public on<E extends ServerEvent>(
    event: E,
    handler: (data: ServerData[E]) => void,
  ) {
    this.#handlers[event] = handler;
  }

  public instance() {
    if (!this.ready) {
      throw new Error("Websocket connection is not ready yet");
    }

    return this.#ws;
  }
}
