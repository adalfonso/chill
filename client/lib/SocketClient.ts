/**
 * Ignore forced reconnects that land within this window of the last
 * connect() call. Absorbs bursts of visibility/online events (rapid app
 * switching on mobile) so we don't open several sockets back to back.
 */
const RECONNECT_DEBOUNCE_MS = 1_000;

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

  /** Timestamp (ms) of the last connect() call; used to debounce forceReconnect */
  #last_connect_at = 0;

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
        // Going idle — cancel any pending reconnect. It should not fire in
        // the background, and we force a fresh connection on return anyway.
        return this.clearReconnectionMeta();
      }

      // Visible again — the existing socket may be a zombie (mobile browsers
      // leave readyState at OPEN after freezing the tab), so reconnect
      // unconditionally rather than trusting its state.
      this.forceReconnect();
    });

    // Reconnect when network comes back
    window.addEventListener("online", () => {
      console.info("Online status changed; forcing reconnect");

      this.forceReconnect();
    });
  }

  /**
   * Establishes a WebSocket connection to the server.
   * Sets up message, open, close, and error handlers.
   */
  private connect() {
    // Dispose of any prior socket first. A frozen-then-resumed mobile tab
    // often leaves the old socket reporting readyState OPEN even though the
    // connection is dead and no close event will ever fire; without this it
    // would leak, and a late onclose could race the new connection.
    if (this.#ws) {
      this.#ws.onopen = null;
      this.#ws.onclose = null;
      this.#ws.onerror = null;
      this.#ws.onmessage = null;

      try {
        this.#ws.close();
      } catch {
        // Already closing/closed — nothing to clean up.
      }
    }

    this.#last_connect_at = Date.now();

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
   * Force a fresh WebSocket connection without trusting the current one.
   *
   * Called on visibility and network changes. A mobile browser that froze
   * and later resumed the tab frequently leaves the old socket reporting
   * readyState OPEN even though the underlying connection is dead and no
   * close event will ever arrive. Inspecting readyState (as the old
   * reconnectIfNeeded did) would wrongly treat that zombie as healthy and
   * skip reconnecting, leaving the client silently detached until a full
   * page reload. Instead we always tear down and reconnect; connect()
   * disposes of the previous socket.
   *
   * A short debounce absorbs bursts of events (rapid app switching) so a
   * single wake does not open several sockets in a row.
   */
  private forceReconnect() {
    if (document.visibilityState === "hidden") {
      return; // don't reconnect while idle
    }

    // A burst of visibility/online events right after a connect is not a
    // real wake — ignore it so we don't churn through sockets.
    if (Date.now() - this.#last_connect_at < RECONNECT_DEBOUNCE_MS) {
      return;
    }

    console.info("Forcing WebSocket reconnect");
    this.clearReconnectionMeta();
    this.connect();
  }
}
