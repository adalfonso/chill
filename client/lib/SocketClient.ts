/**
 * WebSocket client for the frontend.
 *
 * Handles automatic reconnects, network and visibility changes,
 * and allows sending/receiving typed events.
 *
 * @template ClientEvent - Events sent from the client to the server.
 * @template ClientData - Payloads corresponding to client events.
 * @template ServerEvent - Events sent from the server to the client.
 * @template ServerData - Payloads corresponding to server events.
 */
export class SocketClient<
  ClientEvent extends string,
  ClientData extends Record<ClientEvent, unknown>,
  ServerEvent extends string,
  ServerData extends Record<ServerEvent, unknown>,
> {
  /** Current WebSocket instance, or null if not connected */
  #ws: WebSocket | null = null;

  /** Does some syncing action when connecting; your choice */
  #syncFn: () => void = () => {};

  /** Handlers for server-sent events */
  #handlers: Partial<{ [K in ServerEvent]: (data: ServerData[K]) => void }> =
    {};

  /** Timeout ID for scheduled reconnect attempts */
  #reconnect_timeout_cb: number | null = null;

  /** Counter for exponential backoff reconnect attempts */
  #reconnect_attempt = 0;

  /**
   * Creates a SocketClient instance and immediately connects.
   * Listens to network and visibility changes to attempt automatic reconnect.
   */
  constructor() {
    this.connect();

    // Reconnect when returning from idle
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        // Clear any reconnections underway we don't need them when we're going idle
        return this.clearReconnectionMeta();
      }

      // visible → reconnect if needed
      this.reconnectIfNeeded();
    });

    // Reconnect when network comes back
    window.addEventListener("online", () => {
      console.info("Online status changed; attempting reconnect");

      this.reconnectIfNeeded();
    });
  }

  /**
   * Establishes a WebSocket connection to the server.
   * Sets up message, open, close, and error handlers.
   */
  private connect() {
    const host = window.location.host;
    const protocol = window.location.protocol === "http:" ? "ws" : "wss";

    this.#ws = new WebSocket(`${protocol}://${host}/ws`);

    this.#ws.onopen = (event) => {
      console.info("Connected to WebSocket", { event });

      this.#syncFn();
      this.clearReconnectionMeta();
    };

    this.#ws.onclose = () => {
      console.warn("WebSocket closed — scheduling reconnect");

      // Ignore closes while idle
      if (document.visibilityState === "hidden") {
        return;
      }

      this.scheduleReconnect();
    };

    this.#ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      this.#ws?.close();
    };

    this.#ws.onmessage = (message) => {
      console.info("Message received over websocket", message.data);

      const { event, data } = JSON.parse(message.data) ?? {};
      const handler = this.#handlers[event as ServerEvent];

      if (handler) {
        return handler(data);
      }

      console.error(`Unregistered server event received: ${event}`);
    };
  }

  /** Clear reconnection metadata */
  private clearReconnectionMeta() {
    if (this.#reconnect_timeout_cb) {
      clearTimeout(this.#reconnect_timeout_cb);
      this.#reconnect_timeout_cb = null;
    }

    this.#reconnect_attempt = 0;
  }

  /**
   * Schedule a reconnect attempt with exponential backoff.
   * Uses a 2s, 4s, 8s, ... up to a maximum of 30s between attempts.
   */
  private scheduleReconnect() {
    // Already scheduled, abort
    if (this.#reconnect_timeout_cb) {
      return;
    }

    const delay = Math.min(500 * this.#reconnect_attempt + 1, 10_000);

    console.info("Scheduling reconnect in", delay, "ms");

    this.#reconnect_timeout_cb = window.setTimeout(() => {
      this.#reconnect_timeout_cb = null;
      this.#reconnect_attempt++;

      this.connect();
    }, delay);
  }

  /**
   * Returns a promise that resolves when the WebSocket is open.
   * Rejects if the connection does not open within 5 seconds.
   *
   * @returns promise
   */
  public async ready(): Promise<void> {
    if (this.#ws?.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      const TIMEOUT_MS = 5_000;
      const handler = () => {
        clearTimeout(timer);
        this.#ws?.removeEventListener("open", handler);
        resolve();
      };

      const timer = setTimeout(() => {
        this.#ws?.removeEventListener("open", handler);
        reject(new Error(`WebSocket did not open within ${TIMEOUT_MS}ms`));
      }, TIMEOUT_MS);

      this.#ws?.addEventListener("open", handler);
    });
  }

  /**
   * Send an event to the server.
   *
   * @param event - The event name
   * @param data - The event payload
   */
  public emit<E extends ClientEvent>(
    event: E,
    ...[data]: ClientData[E] extends undefined ? [] : [ClientData[E]]
  ) {
    if (this.#ws?.readyState === WebSocket.OPEN) {
      this.#ws.send(JSON.stringify({ event, data }));
    } else {
      console.warn("WebSocket not open, cannot send event", event);
    }
  }

  /**
   * Register a handler for a server-sent event.
   *
   * @param event - The server event name
   * @param handler - Callback for when the event is received
   */
  public on<E extends ServerEvent>(
    event: E,
    handler: (data: ServerData[E]) => void,
  ) {
    this.#handlers[event] = handler;
  }

  /**
   * Cause websocket connection to sync to given fn
   *
   * @param fn - function to call
   */
  public onSync(fn: () => void) {
    this.#syncFn = fn;
  }

  /**
   * Reconnect the WebSocket if it is closed or closing.
   * Called automatically on network/visibility changes.
   */
  public reconnectIfNeeded() {
    if (document.visibilityState === "hidden") {
      return; // don't reconnect while idle
    }

    if (!this.#ws || this.#ws.readyState !== WebSocket.OPEN) {
      console.info("WebSocket is closed — reconnecting");
      this.clearReconnectionMeta();
      this.connect();
    }
  }
}
