import { app_state } from "@client/state/AppState";
import { SenderType } from "@common/CommonEvent";
import { ClientSocketEvent } from "@common/SocketClientEvent";
import { play, PlayLoad } from "@reducers/player";
import { useDispatch } from "react-redux";

export const usePlay = () => {
  const dispatch = useDispatch();

  return (payload: PlayLoad) => {
    const { outgoing_connection, ws } = app_state;

    if (!outgoing_connection.value) {
      return dispatch(play(payload));
    }

    const { cast_info, ...rest } = payload;

    return ws.emit(ClientSocketEvent.PlayerPlay, {
      payload: rest,
      sender: SenderType.Source,
    });
  };
};
