import { getAppState } from "@client/state/AppState";
import { SenderType } from "@common/CommonEvent";
import { ClientSocketEvent } from "@common/SocketClientEvent";
import * as playerStore from "@client/state/playerStore";

export const usePlay = () => {
  return (payload: playerStore.PlayLoad) => {
    const { outgoing_connection, incoming_connections, ws } = getAppState();

    const is_target = incoming_connections.value.length > 0;
    const is_source = Boolean(outgoing_connection.value);

    if (!is_source) {
      playerStore.play(payload);
    }

    if (is_source || is_target) {
      const { cast_info, ...rest } = payload;

      return ws.emit(ClientSocketEvent.PlayerPlay, {
        payload: rest,
        sender: is_target ? SenderType.Target : SenderType.Source,
      });
    }
  };
};
