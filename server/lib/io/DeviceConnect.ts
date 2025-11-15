import { ConnectionDirection, ConnectionInfo } from "@common/SocketServerEvent";

export const ConnectionStatus = {
  Requested: "Requested",
  Accepted: "Accepted",
};

export type ConnectionStatus =
  (typeof ConnectionStatus)[keyof typeof ConnectionStatus];

type Connection = {
  source: string;
  target: string;
  status: ConnectionStatus;
};

export class DeviceConnect {
  #connections = new Map<string, Connection>();

  public requestConnection(source: string, target: string) {
    this.#connections.set(source, {
      source,
      target,
      status: ConnectionStatus.Requested,
    });
  }

  public acceptConnection(source: string, target: string) {
    const connection = this.#connections.get(source);

    if (
      !connection ||
      connection.target !== target ||
      connection.status !== ConnectionStatus.Requested
    ) {
      return;
    }

    connection.status = ConnectionStatus.Accepted;
  }

  public disconnect(source: string) {
    this.#connections.delete(source);
  }

  public getConnection(source: string, target: string) {
    const connection = this.#connections.get(source);

    if (!connection || connection?.target !== target) {
      return null;
    }

    return connection;
  }

  /**
   * Find connection(s) for a subject
   *
   * We don't know whether the subject is a source or target because it is
   * reconnecting to the websocket service. One connection found indicates
   * subject is source; multiple connections indicate subject is target.
   **
   * @param subject - session id
   * @returns connection(s) found.
   */
  public inferActiveConnections(subject: string) {
    const source_connection = this.getConnectionBySourceId(subject);

    if (source_connection) {
      return source_connection;
    }

    const target_connections = this.getConnectionsByTargetId(subject);

    return target_connections.length > 0 ? target_connections : null;
  }

  /**
   * Get a connection where the source matches the source_id
   *
   * @param source_id - session id for source device
   * @param is_active - if the connection must be active (by default)
   * @returns found connections
   */
  public getConnectionBySourceId(source_id: string, is_active = true) {
    const connection = this.#connections.get(source_id);

    if (!connection) {
      return null;
    }

    return !is_active || connection.status === ConnectionStatus.Accepted
      ? connection
      : null;
  }

  /**
   * Get connections where the target matches the target_id
   *
   * @param target_id - session if for target device
   * @param is_active - if the connection must be active (by default)
   * @returns found connections
   */
  public getConnectionsByTargetId(target_id: string, is_active = true) {
    // TODO: Make this O(1)
    return this.#connections
      .values()
      .filter(
        ({ target, status }) =>
          target === target_id &&
          (!is_active || status === ConnectionStatus.Accepted),
      )
      .toArray();
  }
}

export const getConnectionInfo = (
  connection: ReturnType<DeviceConnect["inferActiveConnections"]>,
): ConnectionInfo => {
  if (Array.isArray(connection)) {
    return {
      sources: connection.map((conn) => conn.source),
      direction: ConnectionDirection.In,
    };
  }

  if (connection) {
    return {
      target: connection.target,
      direction: ConnectionDirection.Out,
    };
  }

  return {
    direction: ConnectionDirection.None,
  };
};
