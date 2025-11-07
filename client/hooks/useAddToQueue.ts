import { useDispatch } from "react-redux";

import { ClientSocketEvent } from "@common/SocketClientEvent";
import { Maybe, PlayableTrack } from "@common/types";
import { PreCastPayload } from "@client/lib/cast/types";
import { SenderType } from "@common/CommonEvent";
import { addToQueue } from "@reducers/player";
import { app_state } from "@client/state/AppState";

export const useAddToQueue = () => {
  const dispatch = useDispatch();

  return (payload: {
    tracks: Array<PlayableTrack>;
    cast_info: Maybe<PreCastPayload>;
  }) => {
    const { outgoing_connection, incoming_connections, ws } = app_state;

    const is_target = incoming_connections.value.length > 0;
    const is_source = Boolean(outgoing_connection.value);

    if (is_source || is_target) {
      ws.emit(ClientSocketEvent.PlayerAddToQueue, {
        payload: payload.tracks,
        sender: is_target ? SenderType.Target : SenderType.Source,
      });
    }

    if (!is_source) {
      dispatch(addToQueue(payload));
    }
  };
};
