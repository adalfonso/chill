import * as player from "@client/state/playerStore";
import { ClientSocketEvent } from "@common/SocketClientEvent";
import { SenderType } from "@common/CommonEvent";
import { getAppState } from "@client/state/AppState";

export const usePrevious = () => {
  return () => {
    const { outgoing_connection, incoming_connections, ws } = getAppState();

    const is_target = incoming_connections.value.length > 0;
    const is_source = Boolean(outgoing_connection.value);

    if (is_source || is_target) {
      ws.emit(ClientSocketEvent.PlayerPrevious, {
        sender: is_target ? SenderType.Target : SenderType.Source,
      });
    }

    if (!is_source) {
      player.previous({});
    }
  };
};
