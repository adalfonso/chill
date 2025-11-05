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

  public getActiveConnectionBySource(source: string) {
    const connection = this.#connections.get(source);

    if (!connection || connection.status !== ConnectionStatus.Accepted) {
      return null;
    }

    return connection;
  }

  public inferActiveConnections(subject: string) {
    const source_connection = this.#connections.get(subject);

    if (source_connection) {
      // Don't infer a connection that hasn't actually resovled
      if (source_connection.status === ConnectionStatus.Requested) {
        return null;
      }

      return source_connection;
    }

    // TODO: Make this O(1)
    const target_connections = this.#connections
      .values()
      .filter(
        ({ target, status }) =>
          target === subject && status === ConnectionStatus.Accepted,
      )
      .toArray();

    return target_connections.length > 0 ? target_connections : null;
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
