import { getAppState } from "@client/state/AppState";
import { SenderType } from "@common/CommonEvent";
import { ClientSocketEvent } from "@common/SocketClientEvent";
import { PlayableTrackWithIndex } from "@common/types";
import { shuffle } from "@reducers/player";
import store, { getPlayerState } from "@reducers/store";
import { useDispatch } from "react-redux";

export const useShuffle = () => {
  const dispatch = useDispatch();

  return () => {
    const { outgoing_connection, incoming_connections, ws } = getAppState();

    const is_target = incoming_connections.value.length > 0;
    const is_source = Boolean(outgoing_connection.value);

    if (!is_source) {
      dispatch(shuffle());
    }

    if (is_source || is_target) {
      const player = getPlayerState(store.getState());
      let payload: Array<PlayableTrackWithIndex> = [];

      // Only send (shuffled) tracks in payload if the target took this action
      // Otherwise the target will do this in registerClientSocket
      if (is_target && player.is_shuffled) {
        payload = player.playlist;
      }

      ws.emit(ClientSocketEvent.PlayerShuffle, {
        payload: payload,
        sender: is_target ? SenderType.Target : SenderType.Source,
      });
    }
  };
};
