import { useDispatch } from "react-redux";

import { ClientSocketEvent } from "@common/SocketClientEvent";
import { SenderType } from "@common/CommonEvent";
import { getAppState } from "@client/state/AppState";
import { playNext } from "@reducers/player";
import { Maybe, PlayableTrack } from "@common/types";
import { PreCastPayload } from "@client/lib/cast/types";

export const usePlayNext = () => {
  const dispatch = useDispatch();

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
      dispatch(playNext(payload));
    }
  };
};
