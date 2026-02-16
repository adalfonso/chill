import { getAppState } from "@client/state/AppState";
import { SenderType } from "@common/CommonEvent";
import { ClientSocketEvent } from "@common/SocketClientEvent";
import { PlayableTrackWithIndex } from "@common/types";
import * as player from "@client/state/playerStore";

export const useShuffle = () => {
  return () => {
    const { outgoing_connection, incoming_connections, ws } = getAppState();

    const is_target = incoming_connections.value.length > 0;
    const is_source = Boolean(outgoing_connection.value);

    if (!is_source) {
      player.shuffle();
    }

    if (is_source || is_target) {
      let payload: Array<PlayableTrackWithIndex> = [];

      // Only send (shuffled) tracks in payload if the target took this action
      // Otherwise the target will do this in registerClientSocket
      if (is_target && player.is_shuffled.value) {
        payload = player.playlist.value;
      }

      ws.emit(ClientSocketEvent.PlayerShuffle, {
        payload: payload,
        sender: is_target ? SenderType.Target : SenderType.Source,
      });
    }
  };
};
