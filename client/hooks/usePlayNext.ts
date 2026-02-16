import * as player from "@client/state/playerStore";
import { ClientSocketEvent } from "@common/SocketClientEvent";
import { Maybe, PlayableTrack } from "@common/types";
import { PreCastPayload } from "@client/lib/cast/types";
import { SenderType } from "@common/CommonEvent";
import { getAppState } from "@client/state/AppState";

export const usePlayNext = () => {
  return (payload: {
    tracks: Array<PlayableTrack>;
    cast_info: Maybe<PreCastPayload>;
  }) => {
    const { outgoing_connection, incoming_connections, ws } = getAppState();

    const is_target = incoming_connections.value.length > 0;
    const is_source = Boolean(outgoing_connection.value);

    if (is_source || is_target) {
      ws.emit(ClientSocketEvent.PlayerPlayNext, {
        payload: payload.tracks,
        sender: is_target ? SenderType.Target : SenderType.Source,
      });
    }

    if (!is_source) {
      player.playNext(payload);
    }
  };
};
