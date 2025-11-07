import { getAppState } from "@client/state/AppState";
import { SenderType } from "@common/CommonEvent";
import { ClientSocketEvent } from "@common/SocketClientEvent";
import { play, PlayLoad } from "@reducers/player";
import { useDispatch } from "react-redux";

export const usePlay = () => {
  const dispatch = useDispatch();

  return (payload: PlayLoad) => {
    const { outgoing_connection, incoming_connections, ws } = getAppState();

    const is_target = incoming_connections.value.length > 0;
    const is_source = Boolean(outgoing_connection.value);

    if (!is_source) {
      dispatch(play(payload));
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
