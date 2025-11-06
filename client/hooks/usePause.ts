import { useDispatch } from "react-redux";

import { ClientSocketEvent } from "@common/SocketClientEvent";
import { SenderType } from "@common/CommonEvent";
import { app_state } from "@client/state/AppState";
import { pause } from "@reducers/player";

export const usePause = () => {
  const dispatch = useDispatch();

  return () => {
    const { outgoing_connection, ws } = app_state;

    if (!outgoing_connection.value) {
      return dispatch(pause());
    }

    return ws.emit(ClientSocketEvent.PlayerPause, {
      sender: SenderType.Source,
    });
  };
};
